import type { FrameCandidate, Segment } from '@progresscut/domain';

export function createCandidate(
  timestampMs: number,
  id = `frame-${timestampMs}`,
  novelty = 0.5,
): FrameCandidate {
  return {
    id,
    timestampMs,
    sourcePath: `/frames/${id}.png`,
    visualDifference: 0.1,
    novelty,
  };
}

export function collectFrameIds(segments: Segment[]): string[] {
  return segments.flatMap((s) => s.frames.map((f) => f.id));
}
