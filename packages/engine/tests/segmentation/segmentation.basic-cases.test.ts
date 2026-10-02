import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { segmentCandidates } from '../../src/segmentation/segmentCandidates.js';
import { createCandidate } from './segmentationFixtures.js';
describe('segmentCandidates — basic cases', () => {
  it('empty input → empty output', () => {
    expect(segmentCandidates([])).toEqual([]);
  });
  it('single candidate → one segment containing that frame', () => {
    const c = createCandidate(1000);
    const [seg] = segmentCandidates([c]);
    expect(seg).toBeDefined();
    expect(assertDefined(seg).frames).toHaveLength(1);
    expect(assertDefined(assertDefined(seg).frames[0]).id).toBe(c.id);
  });
  it('single candidate → segment startMs = endMs = timestampMs', () => {
    const c = createCandidate(5000);
    const [seg] = segmentCandidates([c]);
    expect(assertDefined(seg).startMs).toBe(5000);
    expect(assertDefined(seg).endMs).toBe(5000);
    expect(assertDefined(seg).durationMs).toBe(0);
  });
  it('tight cluster → one segment', () => {
    const candidates = [0, 1000, 2000, 3000].map((t) => createCandidate(t));
    const segs = segmentCandidates(candidates, { gapThresholdMs: 60000 });
    expect(segs).toHaveLength(1);
    expect(assertDefined(segs[0]).frames).toHaveLength(4);
  });
  it('two clusters separated by large gap → two segments', () => {
    const cluster1 = [0, 1000, 2000].map((t) => createCandidate(t, `c1-${t}`));
    const cluster2 = [120000, 121000, 122000].map((t) => createCandidate(t, `c2-${t}`));
    const segs = segmentCandidates([...cluster1, ...cluster2], { gapThresholdMs: 60000 });
    expect(segs).toHaveLength(2);
    expect(assertDefined(segs[0]).frames).toHaveLength(3);
    expect(assertDefined(segs[1]).frames).toHaveLength(3);
  });
  it('three clusters → three segments', () => {
    const t = (base: number) =>
      [0, 1000, 2000].map((d) => createCandidate(base + d, `f-${base + d}`));
    const all = [...t(0), ...t(300000), ...t(600000)];
    const segs = segmentCandidates(all, { gapThresholdMs: 60000 });
    expect(segs).toHaveLength(3);
    for (const s of segs) expect(s.frames).toHaveLength(3);
  });
});
