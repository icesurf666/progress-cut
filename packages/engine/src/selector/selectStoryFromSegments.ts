import type { StoryMoment } from '@progresscut/domain';
import type { Segment } from '@progresscut/domain';
import { selectStory } from './selectStory.js';
import type { SelectOptions } from './selectStory.js';
import { assignDurations } from './assignDurations.js';

export interface SegmentSelectOptions extends SelectOptions {
  /** Minimum moments to allocate per segment regardless of its size. Default 1. */
  minMomentsPerSegment?: number;
}

/**
 * Segment-aware story selection.
 *
 * Distributes `n` story moments across segments proportionally to each
 * segment's frame count, guaranteeing at least one moment per segment.
 * Within each segment, uses the same novelty-peak stride sampling as
 * `selectStory`.
 *
 * Why this matters: a uniform stride across all candidates ignores temporal
 * gaps. A 3-period session (code → break → code → break → code) with uneven
 * frame counts would over-represent the longest period and possibly drop
 * short but important bursts entirely.
 */
export function selectStoryFromSegments(
  segments: readonly Segment[],
  targetDurationMs: number,
  options: SegmentSelectOptions = {},
): StoryMoment[] {
  const nonEmpty = segments.filter((s) => s.frames.length > 0);
  if (nonEmpty.length === 0) return [];

  const { minMomentsPerSegment = 1 } = options;
  const n = Math.max(1, Math.round(targetDurationMs / 1_000));

  const totalFrames = nonEmpty.reduce((s, seg) => s + seg.frames.length, 0);

  // First pass: proportional allocation with floor
  const raw = nonEmpty.map((seg) =>
    Math.max(minMomentsPerSegment, Math.round((seg.frames.length / totalFrames) * n)),
  );

  // Second pass: trim or pad the last segment to hit exactly n total
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const diff = n - rawSum;
  raw[raw.length - 1] = Math.max(minMomentsPerSegment, (raw[raw.length - 1] ?? 1) + diff);

  // Select per segment and merge
  const allMoments: StoryMoment[] = [];
  for (const [index, seg] of nonEmpty.entries()) {
    const count = raw[index] ?? minMomentsPerSegment;
    const moments = selectStory(seg.frames, targetDurationMs, {
      ...options,
      minMoments: minMomentsPerSegment,
      maxMoments: count,
    });
    allMoments.push(...moments);
  }

  return assignDurations(
    allMoments.sort((a, b) => a.timestampMs - b.timestampMs),
    targetDurationMs,
  );
}
