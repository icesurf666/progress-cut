import {
  deduplicateFrames,
  scoreFrames,
  sampleUniformStory,
  segmentCandidates,
  selectStoryFromSegments,
  buildStory,
  buildFrameMap,
} from '@progresscut/engine';
import { FfmpegRenderer } from '@progresscut/render';
import type { FrameCandidate, FrameObservation } from '@progresscut/domain';

export interface PipelineReport {
  name: string;
  inputFrames: number;
  afterDedupe: number;
  selectedMoments: number;
  outputPath: string;
  fileSizeBytes: number;
  processingMs: number;
}

type SelectionStrategy = 'uniform' | 'deduplicated' | 'novelty';
const renderer = new FfmpegRenderer();
const pipelineNames: Record<SelectionStrategy, string> = {
  uniform: 'A-uniform',
  deduplicated: 'B-dedupe-uniform',
  novelty: 'C-progresscut',
};

async function runPipeline(
  strategy: SelectionStrategy,
  observations: readonly FrameObservation[],
  targetDurationMs: number,
  outputPath: string,
): Promise<PipelineReport> {
  const startedAt = Date.now();
  const candidates = await prepareCandidates(strategy, observations);
  const moments =
    strategy === 'novelty'
      ? selectStoryFromSegments(segmentCandidates(candidates), targetDurationMs)
      : sampleUniformStory(candidates, targetDurationMs);
  const name = pipelineNames[strategy];
  console.log(
    `  [${name}] ${candidates.length}/${observations.length} frames; ${moments.length} moments`,
  );
  const result = await renderer.render(
    buildStory(moments, 'm0-validation'),
    buildFrameMap(observations),
    { outputPath },
  );
  return {
    name,
    inputFrames: observations.length,
    afterDedupe: candidates.length,
    selectedMoments: moments.length,
    outputPath: result.outputPath,
    fileSizeBytes: result.fileSizeBytes,
    processingMs: Date.now() - startedAt,
  };
}

async function prepareCandidates(
  strategy: SelectionStrategy,
  observations: readonly FrameObservation[],
): Promise<FrameCandidate[]> {
  if (strategy === 'uniform')
    return observations.map((observation) => ({
      ...observation,
      visualDifference: 0,
      novelty: 0.5,
    }));
  const survivors = await deduplicateFrames(observations, {
    ...(strategy === 'deduplicated'
      ? {
          onComparison: (comparison) => {
            const mark = comparison.duplicate ? '✗ dup' : '✓ keep';
            console.log(
              `    ${mark}  pixelDiff=${(comparison.visualDifference * 100).toFixed(2)}%  hamming=${comparison.hammingDistance}/64`,
            );
          },
        }
      : {}),
  });
  if (strategy === 'novelty') return scoreFrames(survivors);
  return survivors.map(({ observation, visualDifference }) => ({
    ...observation,
    visualDifference,
    novelty: 0.5,
  }));
}

export const pipelineA = (
  observations: readonly FrameObservation[],
  targetMs: number,
  outputPath: string,
) => runPipeline('uniform', observations, targetMs, outputPath);
export const pipelineB = (
  observations: readonly FrameObservation[],
  targetMs: number,
  outputPath: string,
) => runPipeline('deduplicated', observations, targetMs, outputPath);
export const pipelineC = (
  observations: readonly FrameObservation[],
  targetMs: number,
  outputPath: string,
) => runPipeline('novelty', observations, targetMs, outputPath);
