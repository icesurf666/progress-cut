import { describe, it, expect } from 'vitest';
import { computeNovelty } from '../../src/novelty/computeNovelty.js';
import type { Proxy } from '../../src/proxy/createProxy.js';
import {
  createUniformProxy,
  createGradientProxy,
  createReversedGradientProxy,
  createPatchProxy,
} from './noveltyFixtures.js';

describe('computeNovelty', () => {
  it('identical proxies → novelty = 0', async () => {
    const a = await createUniformProxy('nov-same.png', 128);
    expect(computeNovelty(a, a)).toBeCloseTo(0, 10);
  });

  it('same content, separate instances → novelty ≈ 0', async () => {
    const a = await createUniformProxy('nov-eq-a.png', 100);
    const b = await createUniformProxy('nov-eq-b.png', 100);
    expect(computeNovelty(a, b)).toBeLessThan(0.001);
  });

  it('black vs white → novelty near 1 (max luminance difference)', async () => {
    const black = await createUniformProxy('nov-black.png', 0);
    const white = await createUniformProxy('nov-white.png', 255);
    expect(computeNovelty(black, white)).toBeGreaterThan(0.995);
  });

  it('ascending vs descending gradient → novelty = 1 (anti-correlated, clamp applied)', async () => {
    const asc = await createGradientProxy('nov-hgrad-asc.png');
    const desc = await createReversedGradientProxy('nov-hgrad-desc.png');
    // SSIM ≈ −0.99 → 1 − (−0.99) = 1.99, clamped to 1
    expect(computeNovelty(asc, desc)).toBe(1);
  });

  it('tiny near-value patch (cursor blink, same base tone) → low novelty', async () => {
    const base = await createUniformProxy('nov-base.png', 180);
    // Patch value close to base so variance stays near-zero
    const patched = await createPatchProxy(base, 'nov-patched.png', 175);
    const novelty = computeNovelty(patched, base);
    expect(novelty).toBeLessThan(0.1);
  });

  it('tiled SSIM: uniform base + high-contrast 3×3 patch → low novelty (correctly localised)', async () => {
    // Tiled SSIM (4×4 grid) weights the 3×3 patch as 1/16 of the image.
    // The single affected tile has variance shift, but 15/16 tiles are identical → mean stays low.
    const base = await createUniformProxy('nov-base-lim.png', 180);
    const patched = await createPatchProxy(base, 'nov-patched-lim.png', 0);
    const novelty = computeNovelty(patched, base);
    expect(novelty).toBeLessThan(0.15);
  });

  it('novelty is in [0, 1] for all pairs', async () => {
    const pairs: [Proxy, Proxy][] = await Promise.all([
      Promise.all([createUniformProxy('nov-r1a.png', 0), createUniformProxy('nov-r1b.png', 255)]),
      Promise.all([createUniformProxy('nov-r2a.png', 128), createUniformProxy('nov-r2b.png', 200)]),
      Promise.all([createGradientProxy('nov-r3a.png'), createReversedGradientProxy('nov-r3b.png')]),
    ]);
    for (const [a, b] of pairs) {
      const n = computeNovelty(a, b);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it('novelty is symmetric', async () => {
    const a = await createGradientProxy('nov-sym-a.png');
    const b = await createUniformProxy('nov-sym-b.png', 64);
    expect(computeNovelty(a, b)).toBeCloseTo(computeNovelty(b, a), 10);
  });

  it('ordering: uniform→big shift has higher novelty than uniform→small shift', async () => {
    const base = await createUniformProxy('nov-ord-base.png', 128);
    const close = await createUniformProxy('nov-ord-close.png', 135);
    const far = await createUniformProxy('nov-ord-far.png', 10);
    expect(computeNovelty(close, base)).toBeLessThan(computeNovelty(far, base));
  });

  it('gradient has higher novelty against uniform than against itself', async () => {
    const grad = await createGradientProxy('nov-grad.png');
    const uniform = await createUniformProxy('nov-unif.png', 128);
    const selfNovelty = computeNovelty(grad, grad);
    const crossNovelty = computeNovelty(grad, uniform);
    expect(selfNovelty).toBeCloseTo(0, 10);
    expect(crossNovelty).toBeGreaterThan(0.8);
  });
});
