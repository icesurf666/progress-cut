import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseManifest, type SessionManifest } from './manifestSchema.js';

const APP_DIRECTORY = join(homedir(), 'Library', 'Application Support', 'ProgressCut');
const RECOVERY_DIRECTORY = join(APP_DIRECTORY, 'recovery');
const LEGACY_PATH = join(APP_DIRECTORY, 'active-session.json');

export function manifestPath(outputDir: string): string {
  const key = createHash('sha256').update(resolve(outputDir)).digest('hex');
  return join(RECOVERY_DIRECTORY, `${key}.json`);
}

export async function readManifest(path: string): Promise<SessionManifest | null> {
  try {
    const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
    return parseManifest(raw);
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

export async function writeManifest(manifest: SessionManifest): Promise<void> {
  await mkdir(RECOVERY_DIRECTORY, { recursive: true, mode: 0o700 });
  const path = manifestPath(manifest.outputDir);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function listManifestPaths(): Promise<string[]> {
  const legacy = await readManifest(LEGACY_PATH);
  if (legacy) {
    const existing = await readManifest(manifestPath(legacy.outputDir));
    if (!existing) await writeManifest(legacy);
    await rm(LEGACY_PATH, { force: true });
  }
  try {
    const entries = await readdir(RECOVERY_DIRECTORY, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /^[a-f0-9]{64}\.json$/.test(entry.name))
      .map((entry) => join(RECOVERY_DIRECTORY, entry.name))
      .sort();
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

export function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
