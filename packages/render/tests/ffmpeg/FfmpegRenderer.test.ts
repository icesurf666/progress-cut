import { assertDefined } from '../../../../tests/helpers/assertDefined.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { FfmpegRenderer } from '../../src/ffmpeg/FfmpegRenderer.js';
import type { Story, StoryMoment } from '@progresscut/domain';
// ── ffmpeg availability ───────────────────────────────────────────────────────
function ffmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const FFMPEG = ffmpegAvailable();
// ── fixtures ─────────────────────────────────────────────────────────────────
let dir: string;
beforeAll(async () => {
  dir = join(tmpdir(), `progresscut-render-${Date.now()}`);
  await mkdir(dir, { recursive: true });
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});
async function makeFrame(name: string, r: number, g: number, b: number): Promise<string> {
  const p = join(dir, name);
  await sharp({
    create: { width: 320, height: 240, channels: 3, background: { r, g, b } },
  })
    .png()
    .toFile(p);
  return p;
}
function makeStory(moments: StoryMoment[]): Story {
  return {
    sessionId: 'test-session',
    moments,
    totalDurationMs: moments.reduce((s, m) => s + m.durationMs, 0),
    builtAt: Date.now(),
  };
}
// ── error cases (no ffmpeg needed) ───────────────────────────────────────────
describe('FfmpegRenderer — error cases', () => {
  it('throws when a frameId is missing from the frameMap', async () => {
    const renderer = new FfmpegRenderer();
    const story = makeStory([{ frameId: 'ghost', timestampMs: 0, durationMs: 1000, score: 0.5 }]);
    await expect(renderer.render(story, new Map(), { outputPath: '/dev/null' })).rejects.toThrow(
      /frameId not found in frameMap: ghost/,
    );
  });
});
// ── integration (requires ffmpeg) ────────────────────────────────────────────
describe.skipIf(!FFMPEG)('FfmpegRenderer — integration (ffmpeg required)', () => {
  it('produces an MP4 file for a 3-frame story', async () => {
    const [red, green, blue] = await Promise.all([
      makeFrame('red.png', 255, 0, 0),
      makeFrame('green.png', 0, 255, 0),
      makeFrame('blue.png', 0, 0, 255),
    ]);
    const frameMap = new Map([
      ['red', assertDefined(red)],
      ['green', assertDefined(green)],
      ['blue', assertDefined(blue)],
    ]);
    const story = makeStory([
      { frameId: 'red', timestampMs: 0, durationMs: 500, score: 0.9 },
      { frameId: 'green', timestampMs: 1000, durationMs: 500, score: 0.7 },
      { frameId: 'blue', timestampMs: 2000, durationMs: 1000, score: 0.8 },
    ]);
    const outputPath = join(dir, 'out.mp4');
    const renderer = new FfmpegRenderer();
    const result = await renderer.render(story, frameMap, {
      outputPath,
      maxWidthPx: 320,
      maxHeightPx: 240,
      fps: 24,
    });
    expect(result.outputPath).toBe(outputPath);
    expect(result.durationMs).toBe(2000);
    expect(result.fileSizeBytes).toBeGreaterThan(0);
  });
  it('result.fileSizeBytes matches the file on disk', async () => {
    const { stat } = await import('node:fs/promises');
    const framePath = await makeFrame('single.png', 100, 100, 100);
    const frameMap = new Map([['f0', framePath]]);
    const story = makeStory([{ frameId: 'f0', timestampMs: 0, durationMs: 1000, score: 0.5 }]);
    const outputPath = join(dir, 'single.mp4');
    const renderer = new FfmpegRenderer();
    const result = await renderer.render(story, frameMap, {
      outputPath,
      maxWidthPx: 160,
      maxHeightPx: 120,
    });
    const { size } = await stat(outputPath);
    expect(result.fileSizeBytes).toBe(size);
  });
});
