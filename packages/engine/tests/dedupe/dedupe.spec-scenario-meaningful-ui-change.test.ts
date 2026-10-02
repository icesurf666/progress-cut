import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { computePixelDiff } from '../../src/dedupe/pixelDiff.js';
import { computeDHash, hammingDistance } from '../../src/dedupe/dHash.js';
import {
  isDuplicateByPixelDiff,
  isDuplicateByDHash,
  DEFAULT_PIXEL_DIFF_THRESHOLD,
  DEFAULT_DHASH_THRESHOLD,
} from '../../src/dedupe/isDuplicate.js';
import {
  createHorizontalGradient,
  createVerticalGradient,
  createReversedGradient,
} from './dedupeFixtures.js';

describe('spec scenario: meaningful UI change', () => {
  it('pixelDiff is above threshold — not a duplicate', async () => {
    const hg = await createHorizontalGradient('ui-change-hg.png', 800, 600);
    const vg = await createVerticalGradient('ui-change-vg.png', 800, 600);
    const pH = await createProxy(hg);
    const pV = await createProxy(vg);
    const diff = computePixelDiff(pH, pV);
    expect(diff).toBeGreaterThan(DEFAULT_PIXEL_DIFF_THRESHOLD);
    expect(isDuplicateByPixelDiff(diff)).toBe(false);
  });

  it('dHash distance is above threshold — not a duplicate', async () => {
    // Ascending gradient (left=dark, right=light) → hash ≈ 0
    // Descending gradient (left=light, right=dark) → hash ≈ all-ones
    // These are maximally different according to dHash (all 64 bits flipped)
    const ascending = await createHorizontalGradient('ui-change-dh-asc.png', 800, 600);
    const descending = await createReversedGradient('ui-change-dh-desc.png', 800, 600);
    const hA = await computeDHash(ascending);
    const hD = await computeDHash(descending);
    const dist = hammingDistance(hA, hD);
    expect(dist).toBeGreaterThan(DEFAULT_DHASH_THRESHOLD);
    expect(isDuplicateByDHash(dist)).toBe(false);
  });
});
