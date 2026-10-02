import type { Proxy } from '../proxy/createProxy.js';

/**
 * Mean Absolute Difference between two same-size grayscale proxies.
 * Returns a value in [0, 1]: 0 = identical, 1 = maximally different.
 */
export function computePixelDiff(a: Proxy, b: Proxy): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Proxy size mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  let sum = 0;
  for (let i = 0; i < a.pixels.length; i++) {
    sum += Math.abs((a.pixels[i] ?? 0) - (b.pixels[i] ?? 0));
  }
  return sum / (a.pixels.length * 255);
}
