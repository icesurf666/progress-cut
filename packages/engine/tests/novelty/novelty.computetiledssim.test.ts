import { describe, it, expect } from 'vitest';
import { computeSSIM, computeTiledSSIM } from '../../src/novelty/ssim.js';
import {
  createUniformProxy,
  createGradientProxy,
  createReversedGradientProxy,
  createPatchProxy,
} from './noveltyFixtures.js';

describe('computeTiledSSIM', () => {
  it('identical proxies → tiled SSIM = 1', async () => {
    const a = await createUniformProxy('tiled-same.png', 128);
    expect(computeTiledSSIM(a, a)).toBeCloseTo(1, 5);
  });

  it('fully different (black vs white) → tiled SSIM near 0', async () => {
    const black = await createUniformProxy('tiled-black.png', 0);
    const white = await createUniformProxy('tiled-white.png', 255);
    expect(computeTiledSSIM(black, white)).toBeLessThan(0.005);
  });

  it('3×3 patch: tiled novelty much lower than global novelty', async () => {
    const base = await createUniformProxy('tiled-base.png', 180);
    const patched = await createPatchProxy(base, 'tiled-patched.png', 0);
    const globalN = 1 - computeSSIM(base, patched);
    const tiledN = 1 - computeTiledSSIM(base, patched);
    expect(tiledN).toBeLessThan(globalN * 0.5); // tiled is significantly lower
  });

  it('half-screen swap → tiled novelty near 0.5 (proportional to changed area)', async () => {
    // Left half white, right half black vs inverse — large change, high novelty
    const asc = await createGradientProxy('tiled-asc.png');
    const desc = await createReversedGradientProxy('tiled-desc.png');
    const n = 1 - computeTiledSSIM(asc, desc);
    expect(n).toBeGreaterThan(0.8);
  });
});
