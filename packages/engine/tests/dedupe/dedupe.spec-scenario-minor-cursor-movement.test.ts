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
import { createUniformImage, createCursorVariant } from './dedupeFixtures.js';

describe('spec scenario: minor cursor movement', () => {
  it('pixelDiff is below threshold — flagged as duplicate', async () => {
    const base = await createUniformImage('cursor-base.png', 800, 600, 128);
    const withCur = await createCursorVariant(base, 'cursor-mod.png');
    const pBase = await createProxy(base);
    const pCur = await createProxy(withCur);
    const diff = computePixelDiff(pBase, pCur);
    expect(diff).toBeLessThan(DEFAULT_PIXEL_DIFF_THRESHOLD);
    expect(isDuplicateByPixelDiff(diff)).toBe(true);
  });

  it('dHash distance is 0 — flagged as duplicate', async () => {
    const base = await createUniformImage('cursor-dhash-base.png', 800, 600, 128);
    const withCur = await createCursorVariant(base, 'cursor-dhash-mod.png');
    const hBase = await computeDHash(base);
    const hCur = await computeDHash(withCur);
    const dist = hammingDistance(hBase, hCur);
    expect(dist).toBeLessThanOrEqual(DEFAULT_DHASH_THRESHOLD);
    expect(isDuplicateByDHash(dist)).toBe(true);
  });
});
