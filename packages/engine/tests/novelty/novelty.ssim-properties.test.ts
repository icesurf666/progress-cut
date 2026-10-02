import { describe, it, expect } from 'vitest';
import { computeSSIM } from '../../src/novelty/ssim.js';
import type { Proxy } from '../../src/proxy/createProxy.js';
import {
  createUniformProxy,
  createGradientProxy,
  createReversedGradientProxy,
} from './noveltyFixtures.js';

describe('SSIM properties', () => {
  it('SSIM is symmetric: SSIM(a,b) = SSIM(b,a)', async () => {
    const a = await createGradientProxy('ssim-sym-a.png');
    const b = await createUniformProxy('ssim-sym-b.png', 200);
    expect(computeSSIM(a, b)).toBeCloseTo(computeSSIM(b, a), 10);
  });

  it('SSIM(a, a) = 1 for gradient (non-trivial variance)', async () => {
    const a = await createGradientProxy('ssim-self-grad.png');
    expect(computeSSIM(a, a)).toBeCloseTo(1, 10);
  });

  it('SSIM output stays in [−1, 1] for all test pairs', async () => {
    const u0 = await createUniformProxy('ssim-u0.png', 0);
    const u255 = await createUniformProxy('ssim-u255.png', 255);
    const asc = await createGradientProxy('ssim-asc.png');
    const desc = await createReversedGradientProxy('ssim-desc.png');
    const testPairs: [Proxy, Proxy][] = [
      [u0, u255],
      [u0, asc],
      [u255, desc],
      [asc, desc],
    ];
    for (const [a, b] of testPairs) {
      const s = computeSSIM(a, b);
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});
