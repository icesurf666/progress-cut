import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { computePixelDiff } from '../../src/dedupe/pixelDiff.js';
import { createUniformImage, createHorizontalGradient } from './dedupeFixtures.js';

describe('computePixelDiff', () => {
  it('identical proxies → 0', async () => {
    const path = await createHorizontalGradient('pd-same.png', 200, 100);
    const p = await createProxy(path);
    expect(computePixelDiff(p, p)).toBe(0);
  });

  it('same file read twice → 0', async () => {
    const path = await createHorizontalGradient('pd-twice.png', 200, 100);
    const p1 = await createProxy(path);
    const p2 = await createProxy(path);
    expect(computePixelDiff(p1, p2)).toBe(0);
  });

  it('result is in [0, 1]', async () => {
    const a = await createProxy(await createUniformImage('pd-range-a.png', 100, 100, 0));
    const b = await createProxy(await createUniformImage('pd-range-b.png', 100, 100, 255));
    const diff = computePixelDiff(a, b);
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThanOrEqual(1);
  });

  it('maximally different images → diff near 1', async () => {
    const a = await createProxy(await createUniformImage('pd-max-a.png', 100, 100, 0));
    const b = await createProxy(await createUniformImage('pd-max-b.png', 100, 100, 255));
    expect(computePixelDiff(a, b)).toBeCloseTo(1, 2);
  });

  it('throws when proxy dimensions differ', async () => {
    const a = await createProxy(await createUniformImage('pd-mismatch-a.png', 50, 50), {
      width: 32,
      height: 32,
    });
    const b = await createProxy(await createUniformImage('pd-mismatch-b.png', 50, 50), {
      width: 64,
      height: 64,
    });
    expect(() => computePixelDiff(a, b)).toThrow(/mismatch/i);
  });
});
