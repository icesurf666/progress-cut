import type { Proxy } from '../proxy/createProxy.js';

// Standard SSIM stabilization constants for 8-bit images
const C1 = (0.01 * 255) ** 2; // ≈ 6.50
const C2 = (0.03 * 255) ** 2; // ≈ 58.52

/** Global SSIM on a rectangular region extracted from two proxies. */
function regionSSIM(a: Proxy, b: Proxy, x0: number, y0: number, x1: number, y1: number): number {
  const W = a.width;
  const n = (x1 - x0) * (y1 - y0);
  // Single pass: accumulate sums of a, b, a², b², ab — then derive means/variances/cov
  // using the computational formula: Var(X) = E[X²] - E[X]², Cov(X,Y) = E[XY] - E[X]·E[Y].
  // Safe for 8-bit pixels (0-255): no catastrophic cancellation at this scale.
  let sumA = 0, sumB = 0, sumAA = 0, sumBB = 0, sumAB = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * W + x;
      const pa = a.pixels[i] ?? 0;
      const pb = b.pixels[i] ?? 0;
      sumA += pa;
      sumB += pb;
      sumAA += pa * pa;
      sumBB += pb * pb;
      sumAB += pa * pb;
    }
  }

  const muA = sumA / n;
  const muB = sumB / n;
  const varA = sumAA / n - muA * muA;
  const varB = sumBB / n - muB * muB;
  const covAB = sumAB / n - muA * muB;

  return (
    ((2 * muA * muB + C1) * (2 * covAB + C2)) / ((muA ** 2 + muB ** 2 + C1) * (varA + varB + C2))
  );
}

/**
 * Global SSIM between two same-size grayscale proxies.
 * Returns value in [-1, 1].  1 = structurally identical.
 */
export function computeSSIM(a: Proxy, b: Proxy): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Proxy size mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  return regionSSIM(a, b, 0, 0, a.width, a.height);
}

/**
 * Tiled SSIM: divides the proxy into tilesPerAxis×tilesPerAxis regions,
 * computes SSIM per tile, returns the mean.
 *
 * Better than global SSIM for real screen content: a cursor blink affects
 * 1/tilesPerAxis² of the image and contributes proportionally, whereas
 * global SSIM over-weights local high-contrast changes on uniform backgrounds.
 */
export function computeTiledSSIM(a: Proxy, b: Proxy, tilesPerAxis = 4): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Proxy size mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }

  const W = a.width;
  const H = a.height;
  const tW = Math.floor(W / tilesPerAxis);
  const tH = Math.floor(H / tilesPerAxis);

  let sum = 0;
  let count = 0;

  for (let ty = 0; ty < tilesPerAxis; ty++) {
    for (let tx = 0; tx < tilesPerAxis; tx++) {
      const x0 = tx * tW;
      const y0 = ty * tH;
      const x1 = tx === tilesPerAxis - 1 ? W : x0 + tW;
      const y1 = ty === tilesPerAxis - 1 ? H : y0 + tH;
      sum += regionSSIM(a, b, x0, y0, x1, y1);
      count++;
    }
  }

  return sum / count;
}
