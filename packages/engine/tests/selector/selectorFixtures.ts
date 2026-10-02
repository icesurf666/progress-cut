import type { FrameCandidate, StoryMoment } from '@progresscut/domain';

export function createCandidate(
  timestampMs: number,
  novelty: number,
  id = `f-${timestampMs}-${novelty}`,
): FrameCandidate {
  return { id, timestampMs, sourcePath: `/f/${id}.png`, visualDifference: 0.1, novelty };
}

export function sumDurations(moments: StoryMoment[]): number {
  return moments.reduce((s, m) => s + m.durationMs, 0);
}
