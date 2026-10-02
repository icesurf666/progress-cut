import { stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { ingestFrames } from '@progresscut/engine';
import { convertToGif } from '@progresscut/render';
import type { EmitSessionEvent, RerenderOptions } from '../../shared/session.js';
import { renderStory } from './renderStory.js';

export async function runPipeline(options: RerenderOptions, emit: EmitSessionEvent): Promise<void> {
  const { observations } = await ingestFrames(options.framesDir);
  const name = 'progresscut';
  const mp4Path = join(options.outputDir, `${name}.mp4`);
  const outputFormat = options.outputFormat ?? 'both';
  emit({ type: 'pipeline:start', name });
  try {
    const log = (message: string): void => emit({ type: 'pipeline:log', name, message });
    const startedAt = Date.now();
    const result = await renderStory(observations, options.targetMs, mp4Path, log);
    const gifPath = outputFormat === 'mp4' ? '' : `${mp4Path.slice(0, -4)}.gif`;
    if (gifPath) {
      log('converting to GIF…');
      await convertToGif(mp4Path, gifPath);
    }
    const outputPath = outputFormat === 'gif' ? gifPath : mp4Path;
    const fileSizeBytes =
      outputFormat === 'gif' ? (await stat(outputPath)).size : result.fileSizeBytes;
    if (outputFormat === 'gif') await unlink(mp4Path);
    emit({
      ...result,
      type: 'pipeline:result',
      name,
      outputPath,
      gifPath,
      fileSizeBytes,
      processingMs: Date.now() - startedAt,
    });
  } catch (error) {
    emit({ type: 'pipeline:error', name, message: String(error) });
  }
  emit({
    type: 'session:done',
    outputDir: options.outputDir,
    totalObservations: observations.length,
    recordingDurationMs: options.recordingDurationMs ?? 0,
  });
}
