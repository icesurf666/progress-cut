import { describe, expect, it } from 'vitest';
import { sampleUniformStory } from '../../src/selector/sampleUniformStory.js';
import { createCandidate, sumDurations } from './selectorFixtures.js';

describe('uniform baseline sampling', () => {
  it('samples evenly by sequence index and includes both endpoints', () => {
    const frames = Array.from({ length: 9 }, (_, index) =>
      createCandidate(index * 1000, index / 9),
    );
    const moments = sampleUniformStory([...frames].reverse(), 3001);
    expect(moments.map((moment) => moment.timestampMs)).toEqual([0, 4000, 8000]);
    expect(moments.map((moment) => moment.durationMs)).toEqual([1000, 1000, 1001]);
    expect(sumDurations(moments)).toBe(3001);
  });

  it('ignores novelty and preserves the input', () => {
    const frames = [createCandidate(0, 0), createCandidate(1000, 1), createCandidate(2000, 0)];
    const before = structuredClone(frames);
    expect(sampleUniformStory(frames, 2000).map((moment) => moment.timestampMs)).toEqual([0, 2000]);
    expect(frames).toEqual(before);
    expect(sampleUniformStory(frames, 2000)).toEqual(sampleUniformStory(frames, 2000));
  });

  it('defines empty, single-frame and single-moment sessions', () => {
    expect(sampleUniformStory([], 1000)).toEqual([]);
    const frames = [createCandidate(0, 1), createCandidate(1000, 0)];
    expect(sampleUniformStory(frames, 1)).toMatchObject([{ timestampMs: 0, durationMs: 1 }]);
    expect(sampleUniformStory(frames.slice(0, 1), 9000)).toHaveLength(1);
    expect(sumDurations(sampleUniformStory(frames.slice(0, 1), 9000))).toBe(9000);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid duration %s', (duration) => {
    expect(() => sampleUniformStory([], duration)).toThrow(RangeError);
  });
});
