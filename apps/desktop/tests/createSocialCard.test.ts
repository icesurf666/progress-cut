import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createSocialCards, renderSocialCardSvg } from '../src/main/pipeline/createSocialCard.js';

const input = {
  outputDir: '',
  recordingDurationMs: 90_000,
  observations: 10_847,
  distinctFrames: 1_203,
  moments: 30,
};

describe('social card', () => {
  it('renders ProgressCut metrics into the card SVG', () => {
    expect(renderSocialCardSvg(input)).toContain('10,847');
    expect(renderSocialCardSvg(input)).toContain('99.7% VISUAL COMPRESSION');
  });

  it('writes cards for article, OG, and portrait social formats', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'progresscut-card-'));
    const paths = await createSocialCards({ ...input, outputDir });
    const metadata = await Promise.all(paths.map((path) => sharp(path).metadata()));
    expect(metadata).toMatchObject([
      { width: 1600, height: 900, format: 'png' },
      { width: 1200, height: 630, format: 'png' },
      { width: 1080, height: 1350, format: 'png' },
    ]);
  });
});
