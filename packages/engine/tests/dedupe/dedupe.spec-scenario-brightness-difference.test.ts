import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { computePixelDiff } from '../../src/dedupe/pixelDiff.js';
import { computeDHash, hammingDistance } from '../../src/dedupe/dHash.js';
import {
  isDuplicateByPixelDiff,
  DEFAULT_PIXEL_DIFF_THRESHOLD,
} from '../../src/dedupe/isDuplicate.js';
import { createHorizontalGradient, createBrightnessVariant } from './dedupeFixtures.js';

describe('spec scenario: brightness difference', () => {
  it('pixelDiff is ABOVE threshold — brightness shift looks like a change', async () => {
    const base = await createHorizontalGradient('bright-base.png', 800, 600);
    const shifted = await createBrightnessVariant(base, 'bright-shift.png', 60);
    const pBase = await createProxy(base);
    const pShifted = await createProxy(shifted);
    const diff = computePixelDiff(pBase, pShifted);
    // 60/255 ≈ 24% MAD — well above 3% threshold
    expect(diff).toBeGreaterThan(DEFAULT_PIXEL_DIFF_THRESHOLD);
    expect(isDuplicateByPixelDiff(diff)).toBe(false);
  });

  it('dHash distance = 0 — gradient direction unchanged by brightness shift', async () => {
    const base = await createHorizontalGradient('bright-dhash-base.png', 800, 600);
    const shifted = await createBrightnessVariant(base, 'bright-dhash-shift.png', 60);
    const hBase = await computeDHash(base);
    const hShifted = await computeDHash(shifted);
    // Adding constant to all pixels preserves gradient directions → same hash
    expect(hammingDistance(hBase, hShifted)).toBe(0);
  });
});
