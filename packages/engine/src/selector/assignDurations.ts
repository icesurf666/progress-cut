import type { StoryMoment } from '@progresscut/domain';

// Each moment gets at least this fraction of the average duration.
// Prevents low-novelty frames from getting zero screen time.
const MIN_DURATION_FRACTION = 0.25;
const MIN_WEIGHT = 0.1; // floor so every frame contributes to total

/**
 * Reserve a minimum duration per moment, then distribute the remaining
 * budget proportionally to novelty scores.
 */
export function assignDurations(
  moments: readonly StoryMoment[],
  targetDurationMs: number,
): StoryMoment[] {
  if (!moments.length) return [];

  const averageDurationMs = Math.floor(targetDurationMs / moments.length);
  const minimumDuration = Math.floor(averageDurationMs * MIN_DURATION_FRACTION);
  const remainingBudget = targetDurationMs - minimumDuration * moments.length;

  const weights = moments.map((m) => Math.max(MIN_WEIGHT, Math.min(1, m.score)));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const durations = weights.map((w) => minimumDuration + Math.floor((w / totalWeight) * remainingBudget));
  const allocated = durations.reduce((sum, d) => sum + d, 0);

  return moments.map((moment, index) => ({
    ...moment,
    durationMs: (durations[index] ?? 0) + (index === moments.length - 1 ? targetDurationMs - allocated : 0),
  }));
}
