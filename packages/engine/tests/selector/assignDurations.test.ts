import { describe, expect, it } from 'vitest';
import type { StoryMoment } from '@progresscut/domain';
import { assignDurations } from '../../src/selector/assignDurations.js';

const moments = (scores: number[]): StoryMoment[] =>
  scores.map((score, index) => ({
    frameId: String(index),
    timestampMs: index,
    score,
    durationMs: 0,
  }));

describe('duration allocation', () => {
  it('never makes a final low-novelty moment negative after minimum-duration allocation', () => {
    const input = moments([...Array.from({ length: 40 }, () => 1), 0.1, 0.1, 0.1, 0.1]);
    const allocated = assignDurations(input, 44000);
    expect(allocated.every((moment) => moment.durationMs >= 250)).toBe(true);
    expect(allocated.reduce((total, moment) => total + moment.durationMs, 0)).toBe(44000);
    expect(input.every((moment) => moment.durationMs === 0)).toBe(true);
  });

  it('preserves non-negative, integer durations for a budget smaller than the moment count', () => {
    const allocated = assignDurations(moments([1, 0.1, 0.1, 0.1]), 2);
    expect(
      allocated.every((moment) => moment.durationMs >= 0 && Number.isInteger(moment.durationMs)),
    ).toBe(true);
    expect(allocated.reduce((total, moment) => total + moment.durationMs, 0)).toBe(2);
  });
});
