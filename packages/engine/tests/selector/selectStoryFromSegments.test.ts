import { describe, it, expect } from 'vitest';
import type { FrameCandidate } from '@progresscut/domain';
import { segmentCandidates } from '../../src/segmentation/segmentCandidates.js';
import { selectStoryFromSegments } from '../../src/selector/selectStoryFromSegments.js';

function createCandidate(timestampMs: number, novelty: number): FrameCandidate {
  return {
    id: `f-${timestampMs}`,
    timestampMs,
    sourcePath: `/f/${timestampMs}.png`,
    visualDifference: 0.1,
    novelty,
  };
}

function sumDurations(moments: ReturnType<typeof selectStoryFromSegments>): number {
  return moments.reduce((s, m) => s + m.durationMs, 0);
}

// ── basic cases ───────────────────────────────────────────────────────────────

describe('selectStoryFromSegments — basic', () => {
  it('empty segments → empty output', () => {
    expect(selectStoryFromSegments([], 30_000)).toEqual([]);
  });

  it('single segment → same as selectStory', () => {
    const candidates = [
      createCandidate(1_000, 0.5),
      createCandidate(2_000, 0.8),
      createCandidate(3_000, 0.3),
    ];
    const segments = segmentCandidates(candidates);
    const moments = selectStoryFromSegments(segments, 3_000);
    expect(moments.length).toBeGreaterThanOrEqual(1);
    expect(sumDurations(moments)).toBe(3_000);
  });

  it('total duration always equals targetDurationMs', () => {
    const candidates = [
      createCandidate(0, 0.9),
      createCandidate(1_000, 0.3),
      createCandidate(2_000, 0.7),
      // gap > 60 s → new segment
      createCandidate(100_000, 0.6),
      createCandidate(101_000, 0.4),
    ];
    const segments = segmentCandidates(candidates);
    const moments = selectStoryFromSegments(segments, 60_000);
    expect(sumDurations(moments)).toBe(60_000);
  });
});

// ── multi-segment coverage ────────────────────────────────────────────────────

describe('selectStoryFromSegments — segment coverage', () => {
  it('both segments are represented in output', () => {
    const seg1 = [
      createCandidate(0, 0.8),
      createCandidate(1_000, 0.5),
      createCandidate(2_000, 0.9),
    ];
    const seg2 = [createCandidate(200_000, 0.7), createCandidate(201_000, 0.6)];
    const candidates = [...seg1, ...seg2];
    const segments = segmentCandidates(candidates);
    expect(segments).toHaveLength(2);

    const moments = selectStoryFromSegments(segments, 10_000);
    const timestamps = moments.map((m) => m.timestampMs);

    // At least one moment from each segment
    const fromSeg1 = timestamps.some((t) => t < 100_000);
    const fromSeg2 = timestamps.some((t) => t >= 200_000);
    expect(fromSeg1).toBe(true);
    expect(fromSeg2).toBe(true);
  });

  it('3 segments all get at least one moment', () => {
    const candidates = [
      createCandidate(0, 0.8),
      createCandidate(1_000, 0.5),
      createCandidate(200_000, 0.7),
      createCandidate(201_000, 0.4),
      createCandidate(400_000, 0.9),
      createCandidate(401_000, 0.6),
    ];
    const segments = segmentCandidates(candidates);
    expect(segments).toHaveLength(3);

    const moments = selectStoryFromSegments(segments, 6_000);
    const timestamps = moments.map((m) => m.timestampMs);

    expect(timestamps.some((t) => t < 100_000)).toBe(true);
    expect(timestamps.some((t) => t >= 200_000 && t < 300_000)).toBe(true);
    expect(timestamps.some((t) => t >= 400_000)).toBe(true);
  });

  it('moments are in temporal order', () => {
    const candidates = [
      createCandidate(0, 0.8),
      createCandidate(1_000, 0.5),
      createCandidate(200_000, 0.7),
      createCandidate(201_000, 0.9),
    ];
    const segments = segmentCandidates(candidates);
    const moments = selectStoryFromSegments(segments, 4_000);
    const timestamps = moments.map((m) => m.timestampMs);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });

  it('large segment gets more moments than small segment', () => {
    // seg1: 10 frames, seg2: 2 frames
    const seg1 = Array.from({ length: 10 }, (_, i) => createCandidate(i * 1_000, 0.5));
    const seg2 = [createCandidate(300_000, 0.9), createCandidate(301_000, 0.8)];
    const segments = segmentCandidates([...seg1, ...seg2]);
    expect(segments).toHaveLength(2);

    const moments = selectStoryFromSegments(segments, 12_000);
    const fromSeg1 = moments.filter((m) => m.timestampMs < 100_000).length;
    const fromSeg2 = moments.filter((m) => m.timestampMs >= 300_000).length;
    expect(fromSeg1).toBeGreaterThan(fromSeg2);
  });
});
