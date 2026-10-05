import { writeFile, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { FrameId, Story } from '@progresscut/domain';
import type { StoryRenderer, RenderOutput, RenderResult } from '../port/StoryRenderer.js';
import { buildConcatContent } from './buildConcatContent.js';
import { runFfmpeg } from './runFfmpeg.js';

export class FfmpegRenderer implements StoryRenderer {
  async render(
    story: Story,
    frameMap: ReadonlyMap<FrameId, string>,
    output: RenderOutput,
  ): Promise<RenderResult> {
    const { outputPath, maxWidthPx = 1920, maxHeightPx = 1080, fps = 24 } = output;

    const frames = story.moments.map((m) => {
      const sourcePath = frameMap.get(m.frameId);
      if (sourcePath === undefined) {
        throw new Error(`frameId not found in frameMap: ${m.frameId}`);
      }
      return { sourcePath, durationMs: m.durationMs };
    });

    const concatContent = buildConcatContent(frames);
    const concatFile = join(tmpdir(), `progresscut-${Date.now()}.ffconcat`);

    await writeFile(concatFile, concatContent, 'utf8');

    try {
      await runFfmpeg([
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatFile,
        '-vf',
        videoFilter(maxWidthPx, maxHeightPx, fps),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-t',
        (story.totalDurationMs / 1000).toString(),
        '-y',
        outputPath,
      ]);
    } finally {
      await unlink(concatFile).catch(() => undefined);
    }

    const { size } = await stat(outputPath);
    return { outputPath, durationMs: story.totalDurationMs, fileSizeBytes: size };
  }
}

function videoFilter(w: number, h: number, fps: number): string {
  // Scale to fit within the target box, letterbox/pillarbox with black,
  // then enforce the target fps.
  return (
    `scale=${w}:${h}:flags=lanczos:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,` +
    `fps=${fps}`
  );
}
