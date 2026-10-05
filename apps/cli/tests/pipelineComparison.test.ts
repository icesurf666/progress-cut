import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FrameObservation, Story } from '@progresscut/domain';
import type { RenderOutput } from '@progresscut/render';

const renderer = vi.hoisted(() => ({ render: vi.fn(), report: vi.fn() }));
vi.mock('@progresscut/render', () => ({
  FfmpegRenderer: class {
    render = renderer.render;
  },
  writeStoryLabReport: renderer.report,
}));

import { pipelineA, pipelineB, pipelineC } from '../src/pipeline.js';
import { renderStory } from '../../desktop/src/main/pipeline/renderStory.js';

let directory: string | undefined;
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('comparison pipelines', () => {
  it('uses real uniform baselines and exactly matches desktop C selection', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    directory = await mkdtemp(join(tmpdir(), 'progresscut-compare-'));
    const outputDirectory = directory;
    const levels = [10, 10, 10, 90, 150, 150, 240];
    const observations: FrameObservation[] = await Promise.all(
      levels.map(async (level, index) => {
        const sourcePath = join(outputDirectory, `${index}.png`);
        await sharp({
          create: {
            width: 64,
            height: 64,
            channels: 3,
            background: { r: level, g: level, b: level },
          },
        })
          .png()
          .toFile(sourcePath);
        return {
          id: `frame-${index}`,
          timestampMs: index < 4 ? index * 1000 : 90000 + index * 1000,
          sourcePath,
        };
      }),
    );
    renderer.render.mockImplementation(
      async (_story: Story, _frames: unknown, output: RenderOutput) => ({
        outputPath: output.outputPath,
        fileSizeBytes: 100,
      }),
    );
    renderer.report.mockResolvedValue({
      htmlPath: '/report/index.html',
      metricsPath: '/report/metrics.json',
    });

    const targetMs = 3000;
    const reportA = await pipelineA(observations, targetMs, '/A.mp4');
    const reportB = await pipelineB(observations, targetMs, '/B.mp4');
    const reportC = await pipelineC(observations, targetMs, '/C.mp4');
    await renderStory(observations, targetMs, '/desktop.mp4', () => undefined);

    const stories = renderer.render.mock.calls.map((call) => call[0] as Story);
    expect(stories[0]?.moments.map((moment) => moment.frameId)).toEqual([
      'frame-0',
      'frame-3',
      'frame-6',
    ]);
    expect(stories[1]?.moments.map((moment) => moment.frameId)).toEqual([
      'frame-0',
      'frame-4',
      'frame-6',
    ]);
    expect(stories[2]?.moments).toEqual(stories[3]?.moments);
    expect(reportA.afterDedupe).toBe(7);
    expect(reportB.afterDedupe).toBe(4);
    expect(reportC.afterDedupe).toBe(4);
    for (const story of stories) {
      expect(story.totalDurationMs).toBe(targetMs);
      expect(new Set(story.moments.map((moment) => moment.frameId)).size).toBe(
        story.moments.length,
      );
    }
    for (const story of stories.slice(0, 2)) {
      expect(story.moments.map((moment) => moment.durationMs)).toEqual([1000, 1000, 1000]);
    }
    expect(renderer.render.mock.calls.map((call) => call[2])).toEqual([
      { outputPath: '/A.mp4' },
      { outputPath: '/B.mp4' },
      { outputPath: '/C.mp4' },
      { outputPath: '/desktop.mp4' },
    ]);
  });
});
