import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { computePixelDiff } from '../../src/dedupe/pixelDiff.js';
import { computeDHash, hammingDistance } from '../../src/dedupe/dHash.js';
import { isDuplicateByPixelDiff } from '../../src/dedupe/isDuplicate.js';
import { createHorizontalGradient } from './dedupeFixtures.js';

describe('spec scenario: resized equivalent', () => {
  it('pixelDiff near 0 — same content at different input resolutions', async () => {
    const large = await createHorizontalGradient('resize-large.png', 1920, 1080);
    const small = await createHorizontalGradient('resize-small.png', 640, 360);
    const pL = await createProxy(large);
    const pS = await createProxy(small);
    const diff = computePixelDiff(pL, pS);
    // Same gradient content after resize: diff should be tiny (interpolation rounding only)
    expect(diff).toBeLessThan(0.01);
    expect(isDuplicateByPixelDiff(diff)).toBe(true);
  });

  it('dHash distance = 0 — completely resolution-independent', async () => {
    const large = await createHorizontalGradient('resize-dhash-l.png', 1920, 1080);
    const small = await createHorizontalGradient('resize-dhash-s.png', 640, 360);
    const hL = await computeDHash(large);
    const hS = await computeDHash(small);
    expect(hammingDistance(hL, hS)).toBe(0);
  });
});
