import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate } from './selectorFixtures.js';
describe('selectStory — ordering', () => {
  it('output is sorted by timestampMs', () => {
    const c = [30000, 10000, 50000, 20000, 40000].map((t) => createCandidate(t, 0.5, `ord-${t}`));
    const moments = selectStory(c, 5000, { maxMoments: 5 });
    for (let i = 1; i < moments.length; i++) {
      expect(assertDefined(moments[i]).timestampMs).toBeGreaterThan(
        assertDefined(moments[i - 1]).timestampMs,
      );
    }
  });
  it('unsorted input → same result as sorted input (deterministic)', () => {
    const sorted = [0, 1000, 2000, 3000, 4000].map((t) => createCandidate(t, 0.5, `det-${t}`));
    const shuffled = [4000, 0, 3000, 1000, 2000].map((t) => createCandidate(t, 0.5, `det-${t}`));
    expect(selectStory(sorted, 5000, { maxMoments: 3 })).toEqual(
      selectStory(shuffled, 5000, { maxMoments: 3 }),
    );
  });
});
