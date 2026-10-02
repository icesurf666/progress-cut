import { describe, it, expect } from 'vitest';
import {
  isDuplicateByPixelDiff,
  DEFAULT_PIXEL_DIFF_THRESHOLD,
} from '../../src/dedupe/isDuplicate.js';
import './dedupeFixtures.js';

describe('isDuplicateByPixelDiff', () => {
  it('diff = 0 → duplicate', () => expect(isDuplicateByPixelDiff(0)).toBe(true));
  it('diff = threshold → duplicate (inclusive)', () =>
    expect(isDuplicateByPixelDiff(DEFAULT_PIXEL_DIFF_THRESHOLD)).toBe(true));
  it('diff above threshold → not duplicate', () =>
    expect(isDuplicateByPixelDiff(DEFAULT_PIXEL_DIFF_THRESHOLD + 0.001)).toBe(false));
  it('custom threshold respected', () => expect(isDuplicateByPixelDiff(0.05, 0.1)).toBe(true));
});
