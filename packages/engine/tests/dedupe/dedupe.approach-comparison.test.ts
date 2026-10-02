import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { computePixelDiff } from '../../src/dedupe/pixelDiff.js';
import { computeDHash, hammingDistance } from '../../src/dedupe/dHash.js';
import { isDuplicateByPixelDiff, isDuplicateByDHash } from '../../src/dedupe/isDuplicate.js';
import {
  createHorizontalGradient,
  createReversedGradient,
  createBrightnessVariant,
} from './dedupeFixtures.js';

describe('approach comparison', () => {
  it('pixelDiff and dHash both agree: exact duplicate is duplicate', async () => {
    const path = await createHorizontalGradient('cmp-dup.png', 800, 600);
    const p = await createProxy(path);
    const h = await computeDHash(path);
    expect(isDuplicateByPixelDiff(computePixelDiff(p, p))).toBe(true);
    expect(isDuplicateByDHash(hammingDistance(h, h))).toBe(true);
  });

  it('pixelDiff and dHash both agree: meaningful change is not duplicate', async () => {
    const ascending = await createHorizontalGradient('cmp-asc.png', 800, 600);
    const descending = await createReversedGradient('cmp-desc.png', 800, 600);
    const pA = await createProxy(ascending);
    const pD = await createProxy(descending);
    const hA = await computeDHash(ascending);
    const hD = await computeDHash(descending);
    // pixelDiff: average value is the same but distribution differs; MAD ≈ 0.5
    expect(isDuplicateByPixelDiff(computePixelDiff(pA, pD))).toBe(false);
    // dHash: all 64 bits flipped
    expect(isDuplicateByDHash(hammingDistance(hA, hD))).toBe(false);
  });

  it('dHash is brightness-invariant; pixelDiff is not — key tradeoff', async () => {
    const base = await createHorizontalGradient('cmp-bright-base.png', 800, 600);
    const shifted = await createBrightnessVariant(base, 'cmp-bright-shifted.png', 60);
    const pBase = await createProxy(base);
    const pShifted = await createProxy(shifted);
    const hBase = await computeDHash(base);
    const hShifted = await computeDHash(shifted);
    // pixelDiff sees a change; dHash does not
    expect(isDuplicateByPixelDiff(computePixelDiff(pBase, pShifted))).toBe(false); // pixelDiff sensitive
    expect(isDuplicateByDHash(hammingDistance(hBase, hShifted))).toBe(true); // dHash invariant
  });
});
