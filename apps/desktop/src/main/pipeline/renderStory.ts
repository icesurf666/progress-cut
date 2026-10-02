import {
  deduplicateFrames,
  scoreFrames,
  segmentCandidates,
  selectStoryFromSegments,
  buildStory,
  buildFrameMap,
} from '@progresscut/engine';
import { FfmpegRenderer } from '@progresscut/render';
import type { FrameObservation } from '@progresscut/domain';

const renderer = new FfmpegRenderer();

export async function renderStory(
  observations: readonly FrameObservation[],
  targetMs: number,
  outputPath: string,
  log: (message: string) => void,
) {
  const survivors = await deduplicateFrames(observations);
  log(`${survivors.length}/${observations.length} frames after dedupe`);
  const candidates = scoreFrames(survivors);
  const moments = selectStoryFromSegments(segmentCandidates(candidates), targetMs);
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
  return {
    ...result,
    thumbnails,
    meaningfulChanges: survivors.length,
    selectedMoments: moments.length,
  };
}
