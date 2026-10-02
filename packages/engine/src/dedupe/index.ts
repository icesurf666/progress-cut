export { computePixelDiff } from './pixelDiff.js';
export { computeDHash, hammingDistance, normalizedHammingDistance, DHASH_BITS } from './dHash.js';
export type { DHash } from './dHash.js';
export {
  isDuplicateByPixelDiff,
  isDuplicateByDHash,
  DEFAULT_PIXEL_DIFF_THRESHOLD,
  DEFAULT_DHASH_THRESHOLD,
} from './isDuplicate.js';
export { deduplicateFrames } from './deduplicateFrames.js';
export type {
  AnalyzedFrame,
  DeduplicationOptions,
  DuplicateComparison,
} from './deduplicateFrames.js';
