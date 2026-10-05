import {
  deduplicateFrames,
  scoreFrames,
  segmentCandidates,
  selectStoryFromSegments,
  buildStory,
  buildFrameMap,
} from '@progresscut/engine';
import { FfmpegRenderer, writeStoryLabReport } from '@progresscut/render';
import type { FrameObservation, StoryLabReport } from '@progresscut/domain';
import { dirname } from 'node:path';

const renderer = new FfmpegRenderer();

export async function renderStory(
  observations: readonly FrameObservation[],
  targetMs: number,
  outputPath: string,
  log: (message: string) => void,
  excludedFrameIds: readonly string[] = [],
) {
  const survivors = await deduplicateFrames(observations);
  log(`${survivors.length}/${observations.length} frames after dedupe`);
  const candidates = scoreFrames(survivors);
  const segments = segmentCandidates(candidates);
  const moments = selectStoryFromSegments(segments, targetMs, {
    excludeFrameIds: excludedFrameIds,
  });
  const frameMap = buildFrameMap(observations);
  const result = await renderer.render(buildStory(moments, 'desktop-session'), frameMap, {
    outputPath,
  });
  const step = Math.max(1, Math.floor(moments.length / 5));
  const thumbnails = moments
    .filter((_, index) => index % step === 0)
    .slice(0, 5)
    .map((moment) => frameMap.get(moment.frameId) ?? '')
    .filter(Boolean);
  log('building Story Lab report…');
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selectedFrames = moments.flatMap((moment) => {
    const frame = candidatesById.get(moment.frameId);
    return frame ? [frame] : [];
  });
  const report: StoryLabReport = {
    generatedAt: new Date().toISOString(),
    targetDurationMs: targetMs,
    session: {
      startedAtMs: observations[0]?.timestampMs ?? 0,
      endedAtMs: observations.at(-1)?.timestampMs ?? 0,
      durationMs: (observations.at(-1)?.timestampMs ?? 0) - (observations[0]?.timestampMs ?? 0),
    },
    counts: {
      observations: observations.length,
      distinctFrames: candidates.length,
      segments: segments.length,
      moments: moments.length,
    },
    candidates,
    segments,
    moments,
  };
  const storyLab = await writeStoryLabReport(report, dirname(outputPath), selectedFrames);
  return {
    ...result,
    thumbnails,
    meaningfulChanges: survivors.length,
    selectedMoments: moments.length,
    storyLabPath: storyLab.htmlPath,
    storyMoments: selectedFrames.map((frame) => ({
      frameId: frame.id,
      sourcePath: frame.sourcePath,
      timestampMs: frame.timestampMs,
    })),
  };
}
