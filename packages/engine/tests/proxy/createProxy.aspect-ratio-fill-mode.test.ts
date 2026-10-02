import { describe, it, expect } from 'vitest';
import {
  createProxy,
  DEFAULT_PROXY_WIDTH,
  DEFAULT_PROXY_HEIGHT,
} from '../../src/proxy/createProxy.js';
import { createColorImage } from './createProxyFixtures.js';

describe('createProxy — aspect ratio (fill mode)', () => {
  it('landscape input → correct proxy size', async () => {
    const path = await createColorImage('landscape.png', 1920, 1080);
    const proxy = await createProxy(path);
    expect(proxy.width).toBe(DEFAULT_PROXY_WIDTH);
    expect(proxy.height).toBe(DEFAULT_PROXY_HEIGHT);
  });

  it('portrait input → correct proxy size', async () => {
    const path = await createColorImage('portrait.png', 1080, 1920);
    const proxy = await createProxy(path);
    expect(proxy.width).toBe(DEFAULT_PROXY_WIDTH);
    expect(proxy.height).toBe(DEFAULT_PROXY_HEIGHT);
  });

  it('square input → correct proxy size', async () => {
    const path = await createColorImage('square.png', 500, 500);
    const proxy = await createProxy(path);
    expect(proxy.width).toBe(DEFAULT_PROXY_WIDTH);
    expect(proxy.height).toBe(DEFAULT_PROXY_HEIGHT);
  });

  it('tiny input (1×1) → upscaled to correct size', async () => {
    const path = await createColorImage('tiny.png', 1, 1);
    const proxy = await createProxy(path);
    expect(proxy.width).toBe(DEFAULT_PROXY_WIDTH);
    expect(proxy.height).toBe(DEFAULT_PROXY_HEIGHT);
  });
});
