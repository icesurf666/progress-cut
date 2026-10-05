import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));
vi.mock('node:fs/promises', () => mocks);
vi.mock('node:os', () => ({ homedir: () => '/test-home' }));

import {
  listManifestPaths,
  manifestPath,
  writeManifest,
} from '../src/main/recovery/manifestStorage.js';
const manifest = {
  version: 1,
  status: 'recording' as const,
  outputDir: '/session',
  framesDir: '/frames',
  targetMs: 60000,
  outputFormat: 'both' as const,
  startedAt: 1,
  recordingDurationMs: 0,
  updatedAt: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
});

it('does not replace committed metadata when an atomic rename fails', async () => {
  const failure = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
  mocks.rename.mockRejectedValue(failure);
  await expect(writeManifest(manifest)).rejects.toBe(failure);
  const temporaryPath: unknown = mocks.writeFile.mock.calls[0]?.[0];
  expect(temporaryPath).toEqual(expect.stringMatching(/\.tmp$/));
  expect(mocks.writeFile).toHaveBeenCalledWith(temporaryPath, expect.any(String), { mode: 0o600 });
  expect(mocks.rename).toHaveBeenCalledWith(temporaryPath, manifestPath('/session'));
  expect(mocks.rm).toHaveBeenCalledTimes(1);
  expect(mocks.rm).toHaveBeenCalledWith(temporaryPath, { force: true });
});

it('keeps the legacy manifest if migration cannot be committed', async () => {
  mocks.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
  mocks.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));
  mocks.rename.mockRejectedValue(new Error('disk full'));
  await expect(listManifestPaths()).rejects.toThrow('disk full');
  expect(mocks.rm).not.toHaveBeenCalledWith(
    '/test-home/Library/Application Support/ProgressCut/active-session.json',
    expect.anything(),
  );
});

it('exposes permission failures rather than treating metadata as absent', async () => {
  mocks.readFile.mockRejectedValue(Object.assign(new Error('denied'), { code: 'EACCES' }));
  await expect(listManifestPaths()).rejects.toMatchObject({ code: 'EACCES' });
  expect(mocks.rm).not.toHaveBeenCalled();
});
