import type { Proxy } from '../proxy/createProxy.js';
import { computeTiledSSIM } from './ssim.js';

/**
 * Structural novelty of `current` relative to `reference`.
 * 0 = structurally identical.  1 = maximally novel.
 *
 * Uses tiled SSIM (4×4 grid) so local changes (cursor, small edits) are
 * weighted proportionally to the area they cover rather than inflating
 * global novelty via variance shift on a uniform background.
 */
export function computeNovelty(current: Proxy, reference: Proxy): number {
  return Math.max(0, Math.min(1, 1 - computeTiledSSIM(current, reference)));
}
