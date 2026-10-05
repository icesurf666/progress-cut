import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const environment = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  return { home: mkdtempSync(`${tmpdir()}/progresscut-recovery-`) };
});
vi.mock('node:os', () => ({ homedir: () => environment.home }));

import {
  beginSessionManifest,
  clearSessionManifest,
  findRecoverableSessions,
  markSessionProcessing,
  preserveSessionForRecovery,
} from '../src/main/sessionManifest.js';
import { manifestPath } from '../src/main/recovery/manifestStorage.js';

const options = { intervalMs: 5000, targetMs: 60000, outputFormat: 'gif' as const };
const appDirectory = join(environment.home, 'Library', 'Application Support', 'ProgressCut');
const legacyPath = join(appDirectory, 'active-session.json');

beforeEach(async () => {
  await rm(environment.home, { recursive: true, force: true });
  await mkdir(appDirectory, { recursive: true });
});
afterAll(async () => {
  await rm(environment.home, { recursive: true, force: true });
});

async function createSession(name: string) {
  const outputDir = join(environment.home, name);
  const framesDir = join(outputDir, 'frames');
  await mkdir(framesDir, { recursive: true });
  await writeFile(join(framesDir, '1.png'), 'fixture');
  await beginSessionManifest({ outputDir, framesDir }, options);
  return { outputDir, framesDir };
}

describe('session manifest persistence', () => {
  it('retains multiple unfinished sessions across updates and completion', async () => {
    const first = await createSession('first');
    const second = await createSession('second');
    await markSessionProcessing(first.outputDir, 30000);
    await preserveSessionForRecovery(first.outputDir);
    expect(await findRecoverableSessions()).toEqual([
      { ...first, targetMs: 60000, outputFormat: 'gif', recordingDurationMs: 30000, frameCount: 1 },
      { ...second, targetMs: 60000, outputFormat: 'gif', recordingDurationMs: 0, frameCount: 1 },
    ]);
    await clearSessionManifest(first.outputDir);
    expect(await findRecoverableSessions()).toEqual([
      { ...second, targetMs: 60000, outputFormat: 'gif', recordingDurationMs: 0, frameCount: 1 },
    ]);
    expect(await readFile(join(first.framesDir, '1.png'), 'utf8')).toBe('fixture');
  });

  it('does not overwrite an existing session record', async () => {
    const destination = await createSession('first');
    const original = await readFile(manifestPath(destination.outputDir), 'utf8');
    await expect(beginSessionManifest(destination, options)).rejects.toThrow('already');
    expect(await readFile(manifestPath(destination.outputDir), 'utf8')).toBe(original);
  });

  it('migrates a legacy record without dropping new sessions', async () => {
    const legacy = await createSession('legacy');
    const contents = await readFile(manifestPath(legacy.outputDir), 'utf8');
    await writeFile(legacyPath, contents);
    await clearSessionManifest(legacy.outputDir);
    await createSession('new');
    expect(await findRecoverableSessions()).toHaveLength(2);
    await expect(readFile(legacyPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(manifestPath(legacy.outputDir), 'utf8')).toBe(contents);
    expect(await findRecoverableSessions()).toHaveLength(2);
  });

  it('does not replace newer metadata with a repeated legacy migration', async () => {
    const session = await createSession('first');
    await writeFile(legacyPath, await readFile(manifestPath(session.outputDir), 'utf8'));
    await markSessionProcessing(session.outputDir, 42000);
    expect((await findRecoverableSessions())[0]?.recordingDurationMs).toBe(42000);
  });

  it('removes only stale metadata and ignores directories named like frames', async () => {
    const stale = await createSession('stale');
    await rm(join(stale.framesDir, '1.png'));
    await mkdir(join(stale.framesDir, 'directory.png'));
    const valid = await createSession('valid');
    expect((await findRecoverableSessions()).map((session) => session.outputDir)).toEqual([
      valid.outputDir,
    ]);
    await expect(readFile(manifestPath(stale.outputDir))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readdir(stale.framesDir)).toEqual(['directory.png']);
  });

  it('preserves metadata when the frame location cannot be read as a directory', async () => {
    const session = await createSession('first');
    await rm(session.framesDir, { recursive: true });
    await writeFile(session.framesDir, 'not a directory');
    await expect(findRecoverableSessions()).rejects.toMatchObject({ code: 'ENOTDIR' });
    expect(await readFile(manifestPath(session.outputDir), 'utf8')).toContain('recording');
  });

  it('reports malformed metadata without deleting it or other records', async () => {
    const first = await createSession('first');
    await createSession('second');
    await writeFile(manifestPath(first.outputDir), '{broken');
    await expect(findRecoverableSessions()).rejects.toThrow();
    expect(await readFile(manifestPath(first.outputDir), 'utf8')).toBe('{broken');
    expect(await readdir(join(appDirectory, 'recovery'))).toHaveLength(2);
  });

  it('returns no sessions when recovery metadata is absent', async () => {
    expect(await findRecoverableSessions()).toEqual([]);
  });
});
