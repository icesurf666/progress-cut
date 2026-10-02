import { describe, it, expect } from 'vitest';
import {
  computeDHash,
  hammingDistance,
  normalizedHammingDistance,
  DHASH_BITS,
} from '../../src/dedupe/dHash.js';
import { createHorizontalGradient, createVerticalGradient } from './dedupeFixtures.js';

describe('computeDHash + hammingDistance', () => {
  it('same file → hamming distance 0', async () => {
    const path = await createHorizontalGradient('dh-same.png', 200, 100);
    const h1 = await computeDHash(path);
    const h2 = await computeDHash(path);
    expect(hammingDistance(h1, h2)).toBe(0);
  });

  it('same file read twice → identical hash', async () => {
    const path = await createHorizontalGradient('dh-det.png', 200, 100);
    const h1 = await computeDHash(path);
    const h2 = await computeDHash(path);
    expect(h1).toBe(h2);
  });

  it('hash is a bigint', async () => {
    const path = await createHorizontalGradient('dh-type.png', 200, 100);
    const h = await computeDHash(path);
    expect(typeof h).toBe('bigint');
  });

  it('hash uses exactly 64 bits (all bits in range)', async () => {
    const path = await createHorizontalGradient('dh-bits.png', 200, 100);
    const h = await computeDHash(path);
    expect(h).toBeGreaterThanOrEqual(0n);
    expect(h).toBeLessThan(1n << BigInt(DHASH_BITS));
  });

  it('normalizedHammingDistance is in [0, 1]', async () => {
    const a = await computeDHash(await createHorizontalGradient('dh-norm-a.png', 200, 100));
    const b = await computeDHash(await createVerticalGradient('dh-norm-b.png', 200, 100));
    const d = normalizedHammingDistance(a, b);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(1);
  });
});
