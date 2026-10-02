import type { FrameObservation, Story, StoryMoment } from '@progresscut/domain';

export function buildStory(moments: readonly StoryMoment[], sessionId: string): Story {
  return {
    sessionId,
    moments,
    totalDurationMs: moments.reduce((duration, moment) => duration + moment.durationMs, 0),
    builtAt: Date.now(),
  };
}

export function buildFrameMap(observations: readonly FrameObservation[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const { id, sourcePath } of observations) map.set(id, sourcePath);
  return map;
}
