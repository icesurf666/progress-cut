import { describe, it, expect } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate } from './selectorFixtures.js';

describe('selectStory — frame identity', () => {
  it('all output frameIds exist in input', () => {
    const c = Array.from({ length: 15 }, (_, i) =>
      createCandidate(i * 1_000, Math.random(), `id-${i}`),
    );
    const inputIds = new Set(c.map((x) => x.id));
    for (const m of selectStory(c, 10_000, { maxMoments: 7 })) {
      expect(inputIds.has(m.frameId)).toBe(true);
    }
  });

  it('no duplicate frameIds in output', () => {
    const c = Array.from({ length: 20 }, (_, i) => createCandidate(i * 1_000, 0.5, `nodup-${i}`));
    const moments = selectStory(c, 10_000, { maxMoments: 10 });
    const ids = moments.map((m) => m.frameId);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
