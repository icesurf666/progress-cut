import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate, sumDurations } from './selectorFixtures.js';
describe('selectStory — duration invariant', () => {
  it('sum(durationMs) = targetDurationMs (evenly divisible)', () => {
    const c = [0, 5000, 10000, 15000, 20000].map((t) => createCandidate(t, 0.5));
    expect(sumDurations(selectStory(c, 5000, { maxMoments: 5 }))).toBe(5000);
  });
  it('sum(durationMs) = targetDurationMs (non-divisible)', () => {
    const c = [0, 1000, 2000].map((t) => createCandidate(t, 0.5));
    expect(sumDurations(selectStory(c, 7777, { maxMoments: 3 }))).toBe(7777);
  });
  it('sum(durationMs) = targetDurationMs for many moments', () => {
    const c = Array.from({ length: 100 }, (_, i) => createCandidate(i * 1000, Math.random()));
    const target = 33333;
    expect(sumDurations(selectStory(c, target, { maxMoments: 17 }))).toBe(target);
  });
  it('last moment absorbs remainder when target is not divisible by count', () => {
    // 3 moments, target = 10 → base = 3, remainder = 1 → last gets 4
    const c = [0, 5000, 10000].map((t) => createCandidate(t, 0.5, `eq-${t}`));
    const moments = selectStory(c, 10, { maxMoments: 3 });
    expect(moments).toHaveLength(3);
    const last = assertDefined(moments[moments.length - 1]);
    const others = moments.slice(0, -1);
    expect(others.every((m) => m.durationMs === 3)).toBe(true);
    expect(last.durationMs).toBe(4);
  });
});
