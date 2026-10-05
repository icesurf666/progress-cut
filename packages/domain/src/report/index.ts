import type { FrameCandidate } from '../frame/index.js';
import type { Segment, StoryMoment } from '../story/index.js';

export interface StoryLabReport {
  readonly generatedAt: string;
  readonly targetDurationMs: number;
  readonly session: {
    readonly startedAtMs: number;
    readonly endedAtMs: number;
    readonly durationMs: number;
  };
  readonly counts: {
    readonly observations: number;
    readonly distinctFrames: number;
    readonly segments: number;
    readonly moments: number;
  };
  readonly candidates: readonly FrameCandidate[];
  readonly segments: readonly Segment[];
  readonly moments: readonly StoryMoment[];
}
