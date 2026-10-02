import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { segmentCandidates } from '../../src/segmentation/segmentCandidates.js';
import { createCandidate } from './segmentationFixtures.js';
describe('segmentCandidates — segment shape', () => {
  it('startMs = first frame timestamp, endMs = last frame timestamp', () => {
    const segs = segmentCandidates(
      [1000, 2000, 5000].map((t) => createCandidate(t)),
      { gapThresholdMs: 60000 },
    );
    expect(assertDefined(segs[0]).startMs).toBe(1000);
    expect(assertDefined(segs[0]).endMs).toBe(5000);
  });
  it('durationMs = endMs − startMs', () => {
    const segs = segmentCandidates(
      [1000, 4000, 7000].map((t) => createCandidate(t)),
      { gapThresholdMs: 60000 },
    );
    expect(assertDefined(segs[0]).durationMs).toBe(
      assertDefined(segs[0]).endMs - assertDefined(segs[0]).startMs,
    );
  });
  it('durationMs = 0 for a single-frame segment', () => {
    const [seg] = segmentCandidates([createCandidate(42000)]);
    expect(assertDefined(seg).durationMs).toBe(0);
  });
});
