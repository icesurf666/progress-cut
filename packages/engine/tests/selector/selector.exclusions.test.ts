import { describe, expect, it } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate, sumDurations } from './selectorFixtures.js';

describe('manual story exclusions', () => {
  it('replaces an excluded stride winner without losing temporal coverage', () => {
    const candidates = [
      createCandidate(0, 0.1, 'first-low'),
      createCandidate(100, 0.9, 'first-picked'),
      createCandidate(200, 0.8, 'first-replacement'),
      createCandidate(300, 0.2, 'second-low'),
      createCandidate(400, 0.9, 'second-picked'),
      createCandidate(500, 0.7, 'second-replacement'),
    ];
    const moments = selectStory(candidates, 2000, { excludeFrameIds: ['first-picked'] });
    expect(moments.map((moment) => moment.frameId)).toEqual([
      'first-replacement',
      'second-replacement',
    ]);
    expect(sumDurations(moments)).toBe(2000);
  });

  it('never returns an excluded frame ID', () => {
    const candidates = [createCandidate(0, 1, 'a'), createCandidate(100, 0.5, 'b')];
    const moments = selectStory(candidates, 1000, { excludeFrameIds: ['a'] });
    expect(moments.map((moment) => moment.frameId)).toEqual(['b']);
  });
});
