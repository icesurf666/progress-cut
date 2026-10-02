import { describe, it, expect } from 'vitest';
import { computeSSIM } from '../../src/novelty/ssim.js';
import type { Proxy } from '../../src/proxy/createProxy.js';
import {
  createUniformProxy,
  createGradientProxy,
  createReversedGradientProxy,
} from './noveltyFixtures.js';

describe('computeSSIM', () => {
  it('identical proxies → SSIM = 1', async () => {
    const a = await createUniformProxy('ssim-uniform-128.png', 128);
    const ssim = computeSSIM(a, a);
    expect(ssim).toBeCloseTo(1, 10);
  });

  it('identical grayscale proxies built independently → SSIM = 1', async () => {
    const a = await createUniformProxy('ssim-u128a.png', 128);
    const b = await createUniformProxy('ssim-u128b.png', 128);
    const ssim = computeSSIM(a, b);
    expect(ssim).toBeCloseTo(1, 5);
  });

  it('black vs white uniform → SSIM near 0 (max luminance diff, zero variance)', async () => {
    const black = await createUniformProxy('ssim-black.png', 0);
    const white = await createUniformProxy('ssim-white.png', 255);
    const ssim = computeSSIM(black, white);
    // Expected: C1 / (255² + C1) ≈ 0.0001
    expect(ssim).toBeGreaterThanOrEqual(0);
    expect(ssim).toBeLessThan(0.005);
  });

  it('ascending vs descending horizontal gradient → SSIM near −1 (max anti-correlation)', async () => {
    const asc = await createGradientProxy('ssim-hgrad-asc.png');
    const desc = await createReversedGradientProxy('ssim-hgrad-desc.png');
    const ssim = computeSSIM(asc, desc);
    // Mean is the same, covariance is ≈ −variance → numerator negative
    expect(ssim).toBeLessThan(-0.9);
  });

  it('same structure, different brightness → SSIM reduced but positive', async () => {
    const mid = await createUniformProxy('ssim-mid.png', 128);
    const dark = await createUniformProxy('ssim-dark.png', 40);
    const ssim = computeSSIM(mid, dark);
    // Different means, same (zero) variance: SSIM = 2*128*40+C1 / (128²+40²+C1) ≈ 0.55
    expect(ssim).toBeGreaterThan(0.3);
    expect(ssim).toBeLessThan(0.9);
  });

  it('throws on size mismatch', () => {
    const a: Proxy = { width: 64, height: 64, pixels: new Uint8Array(64 * 64) };
    const b: Proxy = { width: 32, height: 32, pixels: new Uint8Array(32 * 32) };
    expect(() => computeSSIM(a, b)).toThrow(/size mismatch/i);
  });
});
