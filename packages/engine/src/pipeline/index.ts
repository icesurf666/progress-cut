import type { FrameObservation, Story } from '@progresscut/domain';

export interface StoryOptions {
  readonly targetDurationMs: number;
  readonly minMoments?: number;
  readonly maxMoments?: number;
}

export interface PipelineStats {
  readonly inputFrames: number;
  readonly afterDedupe: number;
  readonly afterScoring: number;
  readonly selectedMoments: number;
  readonly processingMs: number;
}

export interface StoryResult {
  readonly story: Story;
  readonly stats: PipelineStats;
}

export interface StoryEngine {
  analyze(observations: readonly FrameObservation[], options: StoryOptions): Promise<StoryResult>;
}
