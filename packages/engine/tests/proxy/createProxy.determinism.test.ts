import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { createProxy } from '../../src/proxy/createProxy.js';
import { createGradientImage } from './createProxyFixtures.js';

describe('createProxy — determinism', () => {
  it('same file path → identical pixels on repeated calls', async () => {
    const path = await createGradientImage('det-path.png', 200, 100);
    const p1 = await createProxy(path);
    const p2 = await createProxy(path);
    expect(p1.pixels).toEqual(p2.pixels);
  });

  it('same buffer → identical pixels', async () => {
    const path = await createGradientImage('det-buf.png', 200, 100);
    const { data } = await sharp(path).toBuffer({ resolveWithObject: true });
    const p1 = await createProxy(data);
    const p2 = await createProxy(data);
    expect(p1.pixels).toEqual(p2.pixels);
  });

  it('file path and equivalent in-memory buffer produce identical pixels', async () => {
    const path = await createGradientImage('det-equiv.png', 200, 100);
    const buf = await sharp(path).toBuffer();
    const fromPath = await createProxy(path);
    const fromBuf = await createProxy(buf);
    expect(fromPath.pixels).toEqual(fromBuf.pixels);
  });
});
