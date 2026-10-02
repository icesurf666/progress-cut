import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { createColorImage, createGradientImage } from './createProxyFixtures.js';

describe('createProxy — pixel values', () => {
  it('all pixels are in range 0–255', async () => {
    const path = await createGradientImage('range.png', 200, 100);
    const proxy = await createProxy(path);
    for (const v of proxy.pixels) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });

  it('uniform bright image produces high pixel values', async () => {
    const path = await createColorImage('bright.png', 50, 50, 255, 255, 255);
    const proxy = await createProxy(path);
    const avg = proxy.pixels.reduce((s, v) => s + v, 0) / proxy.pixels.length;
    expect(avg).toBeGreaterThan(200);
  });

  it('uniform dark image produces low pixel values', async () => {
    const path = await createColorImage('dark.png', 50, 50, 0, 0, 0);
    const proxy = await createProxy(path);
    const avg = proxy.pixels.reduce((s, v) => s + v, 0) / proxy.pixels.length;
    expect(avg).toBeLessThan(55);
  });
});
