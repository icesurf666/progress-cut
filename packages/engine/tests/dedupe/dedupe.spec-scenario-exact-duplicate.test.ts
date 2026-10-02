import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { computePixelDiff } from '../../src/dedupe/pixelDiff.js';
import { computeDHash, hammingDistance } from '../../src/dedupe/dHash.js';
import { isDuplicateByPixelDiff, isDuplicateByDHash } from '../../src/dedupe/isDuplicate.js';
import { createHorizontalGradient } from './dedupeFixtures.js';

describe('spec scenario: exact duplicate', () => {
  it('pixelDiff = 0', async () => {
    const path = await createHorizontalGradient('dup-grad.png', 800, 600);
    const p = await createProxy(path);
    expect(computePixelDiff(p, p)).toBe(0);
    expect(isDuplicateByPixelDiff(computePixelDiff(p, p))).toBe(true);
  });

  it('dHash hamming = 0', async () => {
    const path = await createHorizontalGradient('dup-grad2.png', 800, 600);
    const h = await computeDHash(path);
    expect(hammingDistance(h, h)).toBe(0);
    expect(isDuplicateByDHash(0)).toBe(true);
  });
});
