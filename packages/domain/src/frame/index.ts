export type FrameId = string;

export interface FrameObservation {
  readonly id: FrameId;
  readonly timestampMs: number;
  readonly sourcePath: string;
}

export interface FrameCandidate extends FrameObservation {
  readonly visualDifference: number;
  readonly novelty: number;
}
