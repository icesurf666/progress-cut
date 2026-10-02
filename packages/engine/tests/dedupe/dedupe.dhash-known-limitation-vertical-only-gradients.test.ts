import { describe, it, expect } from 'vitest';
import { computeDHash, hammingDistance } from '../../src/dedupe/dHash.js';
import { createHorizontalGradient, createVerticalGradient } from './dedupeFixtures.js';

describe('dHash known limitation: vertical-only gradients', () => {
  it('hGradient and vGradient produce the same dHash (both have no left>right transitions)', async () => {
    // dHash only measures horizontal gradient direction within each row.
    // A vertical gradient has uniform pixel values per row → same as ascending hGradient (all 0-bits).
    // This is expected and documented — do not rely on dHash alone for vertical-content images.
    const hg = await createHorizontalGradient('limit-hg.png', 200, 100);
    const vg = await createVerticalGradient('limit-vg.png', 200, 100);
    const hH = await computeDHash(hg);
    const hV = await computeDHash(vg);
    expect(hammingDistance(hH, hV)).toBe(0);
  });
});
