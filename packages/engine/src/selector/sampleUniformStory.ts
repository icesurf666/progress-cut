import type { FrameObservation, StoryMoment } from '@progresscut/domain';
import { DEFAULT_MS_PER_MOMENT } from './selectStory.js';

export function sampleUniformStory(
  observations: readonly FrameObservation[],
  targetDurationMs: number,
): StoryMoment[] {
  if (!Number.isSafeInteger(targetDurationMs) || targetDurationMs < 1) {
    throw new RangeError('Target duration must be a positive integer in milliseconds');
  }
  if (observations.length === 0) return [];
  const ordered = [...observations].sort(
    (left, right) => left.timestampMs - right.timestampMs || left.id.localeCompare(right.id),
  );
  const count = Math.min(
    ordered.length,
    Math.max(1, Math.round(targetDurationMs / DEFAULT_MS_PER_MOMENT)),
  );
  const durationMs = Math.floor(targetDurationMs / count);
  return Array.from({ length: count }, (_, index) => {
    const position = count === 1 ? 0 : Math.round((index * (ordered.length - 1)) / (count - 1));
    const observation = ordered[position];
    if (!observation) throw new Error('Uniform sample index is outside the frame sequence');
    return {
      frameId: observation.id,
      timestampMs: observation.timestampMs,
      score: 0,
      durationMs: durationMs + (index === count - 1 ? targetDurationMs % count : 0),
    };
  });
}
