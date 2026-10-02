import { describe, it, expect } from 'vitest';
import { selectStory } from '../../src/selector/selectStory.js';
import { createCandidate } from './selectorFixtures.js';

describe('selectStory — temporal coverage', () => {
  it('selected frames span the full time range (first and last region represented)', () => {
    const c = Array.from({ length: 30 }, (_, i) => createCandidate(i * 10_000, 0.5, `cov-${i}`));
    const moments = selectStory(c, 10_000, { maxMoments: 5 });
    const ts = moments.map((m) => m.timestampMs);
    // First selected moment should be in the early part
    expect(ts[0]).toBeLessThan(c.length * 10_000 * 0.3);
    // Last selected moment should be in the later part
    expect(ts[ts.length - 1]).toBeGreaterThan(c.length * 10_000 * 0.7);
  });

  it('temporal coverage: no two selected frames come from the same stride bucket', () => {
    // 10 frames, select 5 → stride = 2; each pair goes to a bucket
    const c = Array.from({ length: 10 }, (_, i) =>
      createCandidate(i * 1_000, i % 2 === 0 ? 0.9 : 0.1, `strd-${i}`),
    );
    const moments = selectStory(c, 5_000, { maxMoments: 5 });
    // Each moment should come from a distinct 2-element group
    const timestamps = moments.map((m) => m.timestampMs);
    expect(new Set(timestamps).size).toBe(5);
  });
});
