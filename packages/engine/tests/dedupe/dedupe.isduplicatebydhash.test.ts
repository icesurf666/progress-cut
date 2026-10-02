import { describe, it, expect } from 'vitest';
import { isDuplicateByDHash, DEFAULT_DHASH_THRESHOLD } from '../../src/dedupe/isDuplicate.js';
import './dedupeFixtures.js';

describe('isDuplicateByDHash', () => {
  it('distance = 0 → duplicate', () => expect(isDuplicateByDHash(0)).toBe(true));
  it('distance = threshold → duplicate (inclusive)', () =>
    expect(isDuplicateByDHash(DEFAULT_DHASH_THRESHOLD)).toBe(true));
  it('distance above threshold → not duplicate', () =>
    expect(isDuplicateByDHash(DEFAULT_DHASH_THRESHOLD + 1)).toBe(false));
});
