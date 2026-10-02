import { describe, it, expect } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate } from './selectorFixtures.js';

describe('selectStory — moment count bounds', () => {
  it('maxMoments caps the number of output moments', () => {
    const c = Array.from({ length: 20 }, (_, i) => createCandidate(i * 1_000, 0.5, `cap-${i}`));
    const moments = selectStory(c, 30_000, { maxMoments: 5 });
    expect(moments).toHaveLength(5);
  });

  it('minMoments floors the number of output moments', () => {
    // targetDurationMs = 500 → default count = round(500/1000) = 1
    // but minMoments = 3 forces 3
    const c = Array.from({ length: 10 }, (_, i) => createCandidate(i * 1_000, 0.5, `min-${i}`));
    const moments = selectStory(c, 500, { minMoments: 3 });
    expect(moments.length).toBeGreaterThanOrEqual(3);
  });

  it('output count never exceeds candidates.length', () => {
    const c = [0, 1_000, 2_000].map((t) => createCandidate(t, 0.5, `cnt-${t}`));
    const moments = selectStory(c, 60_000, { maxMoments: 100 });
    expect(moments.length).toBeLessThanOrEqual(c.length);
  });
});
