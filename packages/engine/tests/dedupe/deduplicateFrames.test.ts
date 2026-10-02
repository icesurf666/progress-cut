import { describe, expect, it } from 'vitest';
import type { FrameObservation } from '@progresscut/domain';
import { createImageFixtures } from '../helpers/imageFixtures.js';
import { deduplicateFrames } from '../../src/dedupe/deduplicateFrames.js';

const images = createImageFixtures('rolling-dedupe');
const observation = (sourcePath: string, timestampMs: number): FrameObservation => ({
  id: String(timestampMs),
  timestampMs,
  sourcePath,
});

describe('deduplicateFrames', () => {
  it('retains one static frame even when its hash is zero', async () => {
    const path = await images.uniform('static.png', 64, 64, 128);
    const frames = Array.from({ length: 12 }, (_, index) => observation(path, index));
    const survivors = await deduplicateFrames(frames, { concurrency: 3 });
    expect(survivors.map((frame) => frame.observation.id)).toEqual(['0']);
  });

  it('compares with the previous survivor rather than the previous input', async () => {
    const paths = await Promise.all(
      [100, 101, 102].map((value) => images.uniform(`${value}.png`, 64, 64, value)),
    );
    const frames = paths.map((path, index) => observation(path, index));
    const survivors = await deduplicateFrames(frames, { concurrency: 2 });
    expect(survivors.map((frame) => frame.observation.id)).toEqual(['0', '2']);
  });

  it('orders input without mutation and gives the same result across batch boundaries', async () => {
    const path = await images.uniform('flat.png', 64, 64, 0);
    const changed = await images.uniform('changed.png', 64, 64, 255);
    const frames = [observation(changed, 3), observation(path, 1), observation(path, 2)];
    const sequential = await deduplicateFrames(frames, { concurrency: 1 });
    const parallel = await deduplicateFrames(frames, { concurrency: 8 });
    expect(parallel).toEqual(sequential);
    expect(parallel.map((frame) => frame.observation.timestampMs)).toEqual([1, 3]);
    expect(frames.map((frame) => frame.timestampMs)).toEqual([3, 1, 2]);
  });

  it('handles empty input and rejects invalid concurrency', async () => {
    expect(await deduplicateFrames([])).toEqual([]);
    await expect(deduplicateFrames([], { concurrency: 0 })).rejects.toThrow(RangeError);
  });
});
