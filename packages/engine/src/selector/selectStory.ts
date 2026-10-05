import type { FrameCandidate, StoryMoment } from '@progresscut/domain';
import { assignDurations } from './assignDurations.js';

export const DEFAULT_MS_PER_MOMENT = 1_000;

export interface SelectOptions {
  minMoments?: number;
  maxMoments?: number;
  /** Frame IDs rejected during manual story review. */
  excludeFrameIds?: readonly string[];
}

/**
 * Select `n` frames from `candidates` that best represent the session,
 * then assign playback durations so their sum equals `targetDurationMs`.
 *
 * Selection strategy — stride sampling with local novelty peak:
 *   1. Sort candidates by timestampMs (temporal order).
 *   2. Divide the sorted array into n equal-count strides.
 *   3. From each stride, pick the highest-novelty candidate
 *      (tie-break: earliest timestamp for determinism).
 *   4. Sort selected moments by timestampMs.
 *   5. Weight playback durations by novelty; retain the exact target duration.
 *
 * This guarantees temporal coverage by construction: each stride covers
 * a distinct slice of the session timeline.
 */
export function selectStory(
  candidates: readonly FrameCandidate[],
  targetDurationMs: number,
  options: SelectOptions = {},
): StoryMoment[] {
  if (candidates.length === 0) return [];

  const { minMoments = 1, maxMoments } = options;
  const n = resolveCount(candidates.length, targetDurationMs, minMoments, maxMoments);

  const sorted = [...candidates].sort(
    (a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id),
  );

  const excluded = new Set(options.excludeFrameIds);
  const selected =
    n >= sorted.length
      ? sorted.filter((candidate) => !excluded.has(candidate.id))
      : strideSample(sorted, n, excluded);

  const moments: StoryMoment[] = selected.map((f): StoryMoment => ({
    frameId: f.id,
    timestampMs: f.timestampMs,
    durationMs: 0, // placeholder; overwritten below
    score: f.novelty,
  }));

  return assignDurations(moments, targetDurationMs);
}

// ── internals ─────────────────────────────────────────────────────────────────

function resolveCount(
  available: number,
  targetDurationMs: number,
  minMoments: number,
  maxMoments: number | undefined,
): number {
  const defaultCount = Math.max(1, Math.round(targetDurationMs / DEFAULT_MS_PER_MOMENT));
  const raw = Math.min(available, maxMoments ?? defaultCount);
  return Math.max(minMoments, Math.min(raw, available));
}

/** Divide sorted array into n equal strides; pick the settled state per stride.
 *
 * "Settled" = last frame whose novelty exceeds the stride's median novelty.
 * This avoids picking the first frame of an edit burst (highest novelty but
 * mid-change) and instead captures the final state once the change has landed.
 * Falls back to the max-novelty frame if no frame clears the median threshold.
 */
function strideSample(
  sorted: FrameCandidate[],
  n: number,
  excluded: ReadonlySet<string>,
): FrameCandidate[] {
  const stride = sorted.length / n;
  const result: FrameCandidate[] = [];

  for (let i = 0; i < n; i++) {
    const lo = Math.floor(i * stride);
    const hi = Math.floor((i + 1) * stride);
    const group = sorted.slice(lo, hi).filter((candidate) => !excluded.has(candidate.id));
    if (group.length === 0) continue;

    const novelties = group.map((c) => c.novelty).sort((a, b) => a - b);
    const median = novelties[Math.floor(novelties.length / 2)] ?? 0;

    // Last frame above the median novelty — the settled end-state of the burst.
    const active = group.filter((c) => c.novelty >= median);
    const pick = active.at(-1) ?? group.reduce((best, c) => (c.novelty > best.novelty ? c : best));

    result.push(pick);
  }

  result.sort((a, b) => a.timestampMs - b.timestampMs);
  return result;
}
