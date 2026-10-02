import { unlink } from 'node:fs/promises';
import { runFfmpeg } from './runFfmpeg.js';

/** Two-pass encoding uses a generated palette to retain detail in screen captures. */
export async function convertToGif(inputPath: string, outputPath: string): Promise<void> {
  const palettePath = outputPath.replace(/\.gif$/, '-palette.png');
  try {
    await runFfmpeg([
      '-i',
      inputPath,
      '-vf',
      'fps=10,scale=640:-1:flags=lanczos,palettegen=stats_mode=diff',
      '-y',
      palettePath,
    ]);
    await runFfmpeg([
      '-i',
      inputPath,
      '-i',
      palettePath,
      '-lavfi',
      'fps=10,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer',
      '-y',
      outputPath,
    ]);
  } finally {
    await unlink(palettePath).catch(() => undefined);
  }
}
