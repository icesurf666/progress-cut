import { buildStoryLabReport, ingestFrames, selectedStoryLabFrames } from '@progresscut/engine';
import { writeStoryLabReport } from '@progresscut/render';

export interface StoryLabResult {
  readonly htmlPath: string;
  readonly dataPath: string;
}

export async function writeStoryLab(
  framesDir: string,
  outputDir: string,
  targetDurationMs: number,
): Promise<StoryLabResult> {
  const { observations, skipped } = await ingestFrames(framesDir);
  if (observations.length === 0) throw new Error('No valid frames found for Story Lab.');
  const report = await buildStoryLabReport(observations, targetDurationMs);
  const files = await writeStoryLabReport(report, outputDir, selectedStoryLabFrames(report), {
    skippedFrames: skipped.length,
  });
  return { htmlPath: files.htmlPath, dataPath: files.metricsPath };
}
