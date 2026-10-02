/**
 * Thresholds are conservative starting points from perceptual-hash literature.
 * Do NOT tune these to a specific session — see docs/adr/0002-no-ml-in-v0.md.
 */
export const DEFAULT_PIXEL_DIFF_THRESHOLD = 0.03; // 3% MAD
export const DEFAULT_DHASH_THRESHOLD = 10; // ≤10/64 bits different

export function isDuplicateByPixelDiff(
  diff: number,
  threshold = DEFAULT_PIXEL_DIFF_THRESHOLD,
): boolean {
  return diff <= threshold;
}

export function isDuplicateByDHash(distance: number, threshold = DEFAULT_DHASH_THRESHOLD): boolean {
  return distance <= threshold;
}
