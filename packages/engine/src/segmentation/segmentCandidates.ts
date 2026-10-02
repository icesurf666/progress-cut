import type { FrameCandidate, Segment } from '@progresscut/domain';

export const DEFAULT_GAP_THRESHOLD_MS = 60000;
export const DEFAULT_MIN_FRAMES = 1;

export interface SegmentOptions {
  /** Start a new segment when consecutive timestamps differ by more than this interval. */
  gapThresholdMs?: number;
  /** Discard segments smaller than this frame count. */
  minFrames?: number;
}

export function segmentCandidates(
  candidates: readonly FrameCandidate[],
  options: SegmentOptions = {},
): Segment[] {
  const sorted = [...candidates].sort((left, right) => left.timestampMs - right.timestampMs);
  const segments: Segment[] = [];
  let bucket: FrameCandidate[] = [];
  let previous: FrameCandidate | undefined;
  const gapThresholdMs = options.gapThresholdMs ?? DEFAULT_GAP_THRESHOLD_MS;
  const flush = (): void => {
    const first = bucket.at(0);
    const last = bucket.at(-1);
    if (first && last && bucket.length >= (options.minFrames ?? DEFAULT_MIN_FRAMES)) {
      segments.push({
        frames: Object.freeze(bucket),
        startMs: first.timestampMs,
        endMs: last.timestampMs,
        durationMs: last.timestampMs - first.timestampMs,
      });
    }
    bucket = [];
  };
  for (const candidate of sorted) {
    if (previous && candidate.timestampMs - previous.timestampMs > gapThresholdMs) flush();
    bucket.push(candidate);
    previous = candidate;
  }
  flush();
  return segments;
}
