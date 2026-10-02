import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GAP_THRESHOLD_MS,
  DEFAULT_MIN_FRAMES,
} from '../../src/segmentation/segmentCandidates.js';
import './segmentationFixtures.js';

describe('defaults', () => {
  it('DEFAULT_GAP_THRESHOLD_MS is 60 000', () => {
    expect(DEFAULT_GAP_THRESHOLD_MS).toBe(60_000);
  });

  it('DEFAULT_MIN_FRAMES is 1', () => {
    expect(DEFAULT_MIN_FRAMES).toBe(1);
  });
});
