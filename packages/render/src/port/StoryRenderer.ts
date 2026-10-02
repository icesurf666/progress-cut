import type { FrameId, Story } from '@progresscut/domain';

export interface RenderOutput {
  readonly outputPath: string;
  readonly maxWidthPx?: number;
  readonly maxHeightPx?: number;
  readonly fps?: number;
}

export interface RenderResult {
  readonly outputPath: string;
  readonly durationMs: number;
  readonly fileSizeBytes: number;
}

export interface StoryRenderer {
  render(
    story: Story,
    /** frameId → absolute source path */
    frameMap: ReadonlyMap<FrameId, string>,
    output: RenderOutput,
  ): Promise<RenderResult>;
}
