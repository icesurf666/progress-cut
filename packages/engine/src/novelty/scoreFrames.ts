import type { FrameCandidate } from '@progresscut/domain';
import type { AnalyzedFrame } from '../dedupe/deduplicateFrames.js';
import { computeNovelty } from './computeNovelty.js';

export function scoreFrames(frames: readonly AnalyzedFrame[]): FrameCandidate[] {
  const candidates: FrameCandidate[] = [];
  let previous: AnalyzedFrame | undefined;
  for (const frame of frames) {
    const novelty = previous ? computeNovelty(frame.proxy, previous.proxy) : 1;
    candidates.push({ ...frame.observation, visualDifference: frame.visualDifference, novelty });
    previous = frame;
  }
  return candidates;
}
