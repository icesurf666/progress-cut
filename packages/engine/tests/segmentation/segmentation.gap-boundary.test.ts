import { describe, it, expect } from 'vitest';
import { segmentCandidates } from '../../src/segmentation/segmentCandidates.js';
import { createCandidate } from './segmentationFixtures.js';

describe('segmentCandidates — gap boundary', () => {
  it('gap exactly at threshold → same segment (gap must be strictly greater to split)', () => {
    const threshold = 30_000;
    const segs = segmentCandidates([createCandidate(0), createCandidate(threshold)], {
      gapThresholdMs: threshold,
    });
    expect(segs).toHaveLength(1);
  });

  it('gap one ms above threshold → new segment', () => {
    const threshold = 30_000;
    const segs = segmentCandidates([createCandidate(0), createCandidate(threshold + 1)], {
      gapThresholdMs: threshold,
    });
    expect(segs).toHaveLength(2);
  });

  it('gap one ms below threshold → same segment', () => {
    const threshold = 30_000;
    const segs = segmentCandidates([createCandidate(0), createCandidate(threshold - 1)], {
      gapThresholdMs: threshold,
    });
    expect(segs).toHaveLength(1);
  });
});
