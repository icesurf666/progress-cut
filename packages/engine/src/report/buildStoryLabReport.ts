import type { FrameCandidate, FrameObservation, StoryLabReport } from '@progresscut/domain';
import { deduplicateFrames } from '../dedupe/deduplicateFrames.js';
import { scoreFrames } from '../novelty/scoreFrames.js';
import { segmentCandidates } from '../segmentation/segmentCandidates.js';
import { selectStoryFromSegments } from '../selector/selectStoryFromSegments.js';

export async function buildStoryLabReport(
  observations: readonly FrameObservation[],
  targetDurationMs: number,
): Promise<StoryLabReport> {
  if (observations.length === 0) throw new Error('Story Lab needs at least one frame.');
  const ordered = [...observations].sort((left, right) => left.timestampMs - right.timestampMs);
  const first = ordered.at(0);
  const last = ordered.at(-1);
  if (!first || !last) throw new Error('Could not establish session boundaries.');
  const candidates = scoreFrames(await deduplicateFrames(ordered));
  const segments = segmentCandidates(candidates);
  const moments = selectStoryFromSegments(segments, targetDurationMs);
  return {
    generatedAt: new Date().toISOString(),
    targetDurationMs,
    session: {
      startedAtMs: first.timestampMs,
      endedAtMs: last.timestampMs,
      durationMs: last.timestampMs - first.timestampMs,
    },
    counts: {
      observations: ordered.length,
      distinctFrames: candidates.length,
      segments: segments.length,
      moments: moments.length,
    },
    candidates,
    segments,
    moments,
  };
}

export function selectedStoryLabFrames(report: StoryLabReport): FrameCandidate[] {
  const byId = new Map(report.candidates.map((candidate) => [candidate.id, candidate]));
  return report.moments.flatMap((moment) => {
    const candidate = byId.get(moment.frameId);
    return candidate ? [candidate] : [];
  });
}
