import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect } from 'vitest';
import { segmentCandidates } from '../../src/segmentation/segmentCandidates.js';
import { createCandidate, collectFrameIds } from './segmentationFixtures.js';
describe('segmentCandidates — coverage invariants', () => {
  it('every input frame appears in exactly one segment (no loss, no duplication)', () => {
    const timestamps = [0, 500, 1000, 90000, 91000, 200000, 200500, 201000];
    const candidates = timestamps.map((t) => createCandidate(t, `inv-${t}`));
    const segs = segmentCandidates(candidates, { gapThresholdMs: 60000 });
    const outputIds = collectFrameIds(segs);
    const inputIds = candidates.map((c) => c.id);
    expect(outputIds.sort()).toEqual(inputIds.sort());
  });
  it('no frame id appears more than once across all segments', () => {
    const candidates = [0, 1000, 2000, 100000, 101000].map((t) => createCandidate(t, `dup-${t}`));
    const ids = collectFrameIds(segmentCandidates(candidates, { gapThresholdMs: 60000 }));
    expect(ids.length).toBe(new Set(ids).size);
  });
  it('segments are non-overlapping: endMs[i] < startMs[i+1]', () => {
    const timestamps = [0, 1000, 2000, 100000, 101000, 200000];
    const segs = segmentCandidates(
      timestamps.map((t) => createCandidate(t, `no-${t}`)),
      { gapThresholdMs: 60000 },
    );
    for (let i = 1; i < segs.length; i++) {
      expect(assertDefined(segs[i - 1]).endMs).toBeLessThan(assertDefined(segs[i]).startMs);
    }
  });
  it('minFrames: all surviving segments satisfy frames.length ≥ minFrames', () => {
    const timestamps = [0, 1000, 100000, 200000, 201000, 202000];
    const segs = segmentCandidates(
      timestamps.map((t) => createCandidate(t, `mf-${t}`)),
      { gapThresholdMs: 60000, minFrames: 2 },
    );
    for (const s of segs) {
      expect(s.frames.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('frames array on segment is frozen (immutable)', () => {
    const [seg] = segmentCandidates([createCandidate(0), createCandidate(1000)]);
    expect(Object.isFrozen(assertDefined(seg).frames)).toBe(true);
  });
});
