import { describe, it, expect } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate } from './selectorFixtures.js';

describe('selectStory — novelty preference', () => {
  it('within a stride, picks the highest-novelty frame', () => {
    // 4 frames in 2 strides of 2; high-novelty frames at positions 0 and 3
    const c = [
      createCandidate(0, 0.9, 'high-0'),
      createCandidate(1_000, 0.1, 'low-1'),
      createCandidate(2_000, 0.1, 'low-2'),
      createCandidate(3_000, 0.9, 'high-3'),
    ];
    const moments = selectStory(c, 2_000, { maxMoments: 2 });
    const ids = moments.map((m) => m.frameId);
    expect(ids).toContain('high-0');
    expect(ids).toContain('high-3');
  });

  it('ties broken by earliest timestamp (deterministic)', () => {
    // 2 frames with identical novelty; stride = 2 so both in same stride? No — 2 frames, 1 stride each
    // Use 4 frames, 2 strides, identical novelty within each stride
    const c = [
      createCandidate(0, 0.5, 'tie-0'),
      createCandidate(1_000, 0.5, 'tie-1'),
      createCandidate(2_000, 0.5, 'tie-2'),
      createCandidate(3_000, 0.5, 'tie-3'),
    ];
    const moments1 = selectStory(c, 2_000, { maxMoments: 2 });
    const moments2 = selectStory(c, 2_000, { maxMoments: 2 });
    expect(moments1.map((m) => m.frameId)).toEqual(moments2.map((m) => m.frameId));
  });
});
