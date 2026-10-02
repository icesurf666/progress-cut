import { describe, it, expect } from 'vitest';
import {
  createProxy,
  DEFAULT_PROXY_WIDTH,
  DEFAULT_PROXY_HEIGHT,
} from '../../src/proxy/createProxy.js';
import { createColorImage } from './createProxyFixtures.js';

describe('createProxy — dimensions', () => {
  it('returns default 64×64 proxy', async () => {
    const path = await createColorImage('default.png', 200, 100);
    const proxy = await createProxy(path);
    expect(proxy.width).toBe(DEFAULT_PROXY_WIDTH);
    expect(proxy.height).toBe(DEFAULT_PROXY_HEIGHT);
  });

  it('pixels.length equals width × height (single grayscale channel)', async () => {
    const path = await createColorImage('channel.png', 200, 100);
    const proxy = await createProxy(path);
    expect(proxy.pixels.length).toBe(proxy.width * proxy.height);
  });

  it('honours custom width and height', async () => {
    const path = await createColorImage('custom.png', 200, 100);
    const proxy = await createProxy(path, { width: 32, height: 32 });
    expect(proxy.width).toBe(32);
    expect(proxy.height).toBe(32);
    expect(proxy.pixels.length).toBe(32 * 32);
  });

  it('can produce a non-square proxy', async () => {
    const path = await createColorImage('nonsquare.png', 200, 100);
    const proxy = await createProxy(path, { width: 16, height: 8 });
    expect(proxy.width).toBe(16);
    expect(proxy.height).toBe(8);
  });

  it('returns Uint8Array for pixels', async () => {
    const path = await createColorImage('type.png', 50, 50);
    const proxy = await createProxy(path);
    expect(proxy.pixels).toBeInstanceOf(Uint8Array);
  });
});
