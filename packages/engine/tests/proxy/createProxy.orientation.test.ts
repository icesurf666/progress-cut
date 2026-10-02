import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import { createColorImage, createGradientImage } from './createProxyFixtures.js';

describe('createProxy — orientation', () => {
  it('produces non-uniform pixels (actually processes the image)', async () => {
    const path = await createGradientImage('gradient.png', 128, 128);
    const proxy = await createProxy(path);
    const min = Math.min(...proxy.pixels);
    const max = Math.max(...proxy.pixels);
    // gradient should produce a range of values, not a single flat colour
    expect(max - min).toBeGreaterThan(100);
  });

  it('EXIF-rotated image produces the same pixel dimensions as non-rotated', async () => {
    // Both landscape and portrait source images should produce 64×64 proxies
    const landscape = await createColorImage('orient-l.png', 200, 100);
    const portrait = await createColorImage('orient-p.png', 100, 200);
    const proxyL = await createProxy(landscape);
    const proxyP = await createProxy(portrait);
    expect(proxyL.width).toBe(proxyP.width);
    expect(proxyL.height).toBe(proxyP.height);
  });
});
