import type { FrameCandidate, FrameId } from '../frame/index.js';
import type { SessionId } from '../session/index.js';

export interface StoryMoment {
  readonly frameId: FrameId;
  readonly timestampMs: number;
  readonly durationMs: number;
  readonly score: number;
}

export interface Story {
  readonly sessionId: SessionId;
  readonly moments: readonly StoryMoment[];
  readonly totalDurationMs: number;
  readonly builtAt: number;
}

export interface Segment {
  readonly frames: readonly FrameCandidate[];
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
}
