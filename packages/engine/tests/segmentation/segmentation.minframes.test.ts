import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { segmentCandidates } from '../../src/segmentation/segmentCandidates.js';
import { createCandidate } from './segmentationFixtures.js';
describe('segmentCandidates — minFrames', () => {
  it('minFrames = 1 (default): keeps single-frame segments', () => {
    const segs = segmentCandidates([createCandidate(0)], { minFrames: 1 });
    expect(segs).toHaveLength(1);
  });
  it('minFrames = 2: drops single-frame segment, keeps 2-frame segment', () => {
    const solo = [createCandidate(0, 'solo')];
    const pair = [createCandidate(200000, 'p1'), createCandidate(201000, 'p2')];
    const segs = segmentCandidates([...solo, ...pair], { gapThresholdMs: 10000, minFrames: 2 });
    expect(segs).toHaveLength(1);
    expect(assertDefined(segs[0]).frames.map((f) => f.id)).toEqual(['p1', 'p2']);
  });
  it('minFrames = 3: keeps only segments with ≥ 3 frames', () => {
    const small = [createCandidate(0, 's1'), createCandidate(1000, 's2')];
    const large = [
      createCandidate(300000, 'l1'),
      createCandidate(301000, 'l2'),
      createCandidate(302000, 'l3'),
    ];
    const segs = segmentCandidates([...small, ...large], { gapThresholdMs: 10000, minFrames: 3 });
    expect(segs).toHaveLength(1);
    expect(assertDefined(segs[0]).frames).toHaveLength(3);
  });
  it('minFrames > all segment sizes → empty output', () => {
    const candidates = [createCandidate(0), createCandidate(100000)];
    const segs = segmentCandidates(candidates, { gapThresholdMs: 10000, minFrames: 99 });
    expect(segs).toHaveLength(0);
  });
});
