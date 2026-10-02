import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate } from './selectorFixtures.js';
describe('selectStory — basic cases', () => {
  it('empty candidates → empty output', () => {
    expect(selectStory([], 30000)).toEqual([]);
  });
  it('single candidate → one moment', () => {
    const moments = selectStory([createCandidate(1000, 0.8)], 5000);
    expect(moments).toHaveLength(1);
  });
  it('single candidate → moment carries all of targetDurationMs', () => {
    const [m] = selectStory([createCandidate(1000, 0.8)], 5000);
    expect(assertDefined(m).durationMs).toBe(5000);
  });
  it('single candidate → score = novelty', () => {
    const [m] = selectStory([createCandidate(1000, 0.75)], 3000);
    expect(assertDefined(m).score).toBe(0.75);
  });
  it('candidates fewer than requested moments → use all', () => {
    const c = [0, 1000, 2000].map((t) => createCandidate(t, 0.5));
    const moments = selectStory(c, 60000, { maxMoments: 20 });
    expect(moments).toHaveLength(3);
  });
});
