import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { segmentCandidates } from '../../src/segmentation/segmentCandidates.js';
import { createCandidate } from './segmentationFixtures.js';
describe('segmentCandidates — ordering', () => {
  it('unsorted input → segments still sorted by startMs', () => {
    const unsorted = [3000, 1000, 2000, 200000, 150000].map((t) => createCandidate(t, `u-${t}`));
    const segs = segmentCandidates(unsorted, { gapThresholdMs: 10000 });
    for (let i = 1; i < segs.length; i++) {
      expect(assertDefined(segs[i]).startMs).toBeGreaterThan(assertDefined(segs[i - 1]).startMs);
    }
  });
  it('frames within each segment are sorted by timestampMs', () => {
    const unsorted = [2000, 0, 1000].map((t) => createCandidate(t, `s-${t}`));
    const [seg] = segmentCandidates(unsorted, { gapThresholdMs: 60000 });
    expect(assertDefined(seg).frames.map((f) => f.timestampMs)).toEqual([0, 1000, 2000]);
  });
});
