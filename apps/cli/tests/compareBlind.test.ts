import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ingest: vi.fn(),
  pipelineA: vi.fn(),
  pipelineB: vi.fn(),
  pipelineC: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  mkdir: mocks.mkdir,
}));
vi.mock('@progresscut/engine', () => ({ ingestFrames: mocks.ingest }));
vi.mock('../src/pipeline.js', () => ({
  pipelineA: mocks.pipelineA,
  pipelineB: mocks.pipelineB,
  pipelineC: mocks.pipelineC,
}));

import { runCompare } from '../src/compare.js';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.ingest.mockResolvedValue({
    observations: [{ id: 'one', timestampMs: 0, sourcePath: '/one.png' }],
    skipped: [],
  });
  for (const [pipeline, name] of [
    [mocks.pipelineA, 'A-uniform'],
    [mocks.pipelineB, 'B-dedupe-uniform'],
    [mocks.pipelineC, 'C-progresscut'],
  ] as const) {
    pipeline.mockResolvedValue({
      name,
      inputFrames: 1,
      afterDedupe: 1,
      selectedMoments: 1,
      outputPath: `/unused/${name}.mp4`,
      fileSizeBytes: 1,
      processingMs: 0,
    });
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

it('fails blind comparison rather than sharing an incomplete evaluation', async () => {
  mocks.pipelineB.mockRejectedValue(new Error('render failed'));
  await expect(runCompare('/frames', '/output', 3000, true)).rejects.toThrow('all three');
  expect(mocks.pipelineC).toHaveBeenCalled();
  expect(mocks.mkdir).toHaveBeenCalledTimes(1);
});

it('preserves partial comparison behavior when blind mode is disabled', async () => {
  mocks.pipelineB.mockRejectedValue(new Error('render failed'));
  await expect(runCompare('/frames', '/output', 3000)).resolves.toBeUndefined();
  expect(mocks.mkdir).toHaveBeenCalledTimes(1);
});
