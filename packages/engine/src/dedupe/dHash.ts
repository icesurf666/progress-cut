import { createProxy } from '../proxy/createProxy.js';

// Standard dHash: 9×8 image → 8 horizontal gradient comparisons per row → 64 bits
const DHASH_W = 9;
const DHASH_H = 8;
export const DHASH_BITS = 64;

export type DHash = bigint;

/**
 * Compute a 64-bit difference hash (dHash) for an image.
 * Resistant to minor brightness shifts and resize — compares gradient directions.
 */
export async function computeDHash(input: string | Buffer): Promise<DHash> {
  const { pixels } = await createProxy(input, { width: DHASH_W, height: DHASH_H });

  let hash = 0n;
  for (let y = 0; y < DHASH_H; y++) {
    for (let x = 0; x < DHASH_W - 1; x++) {
      const left = pixels[y * DHASH_W + x] ?? 0;
      const right = pixels[y * DHASH_W + x + 1] ?? 0;
      if (left > right) {
        hash |= 1n << BigInt(y * (DHASH_W - 1) + x);
      }
    }
  }
  return hash;
}

/** Number of bits that differ between two hashes. Range: [0, 64]. */
export function hammingDistance(a: DHash, b: DHash): number {
  // Kernighan's trick: each iteration clears the lowest set bit — O(set_bits) not O(64).
  let diff = a ^ b;
  let count = 0;
  while (diff > 0n) {
    diff &= diff - 1n;
    count++;
  }
  return count;
}

/** Hamming distance normalised to [0, 1]. */
export function normalizedHammingDistance(a: DHash, b: DHash): number {
  return hammingDistance(a, b) / DHASH_BITS;
}
