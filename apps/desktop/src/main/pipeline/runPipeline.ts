import { stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { ingestFrames } from '@progresscut/engine';
import { convertToGif } from '@progresscut/render';
import type { EmitSessionEvent, RerenderOptions } from '../../shared/session.js';
import { renderStory } from './renderStory.js';
import { createSharePack } from './createSharePack.js';
import { createSocialCards } from './createSocialCard.js';

export async function runPipeline(
  options: RerenderOptions,
  emit: EmitSessionEvent,
  onSuccess?: () => Promise<void>,
): Promise<void> {
  const { observations } = await ingestFrames(options.framesDir);
  const name = 'progresscut';
  const mp4Path = join(options.outputDir, `${name}.mp4`);
  const outputFormat = options.outputFormat ?? 'both';
  emit({ type: 'pipeline:start', name });
  try {
    const log = (message: string): void => emit({ type: 'pipeline:log', name, message });
    const startedAt = Date.now();
    const result = await renderStory(
      observations,
      options.targetMs,
      mp4Path,
      log,
      options.excludedFrameIds,
    );
    const gifPath = outputFormat === 'mp4' ? '' : `${mp4Path.slice(0, -4)}.gif`;
    if (gifPath) {
      log('converting to GIF…');
      await convertToGif(mp4Path, gifPath);
    }
    const outputPath = outputFormat === 'gif' ? gifPath : mp4Path;
    const fileSizeBytes =
      outputFormat === 'gif' ? (await stat(outputPath)).size : result.fileSizeBytes;
    if (outputFormat === 'gif') await unlink(mp4Path);
    const socialCardPaths = await buildSocialCards(
      {
        outputDir: options.outputDir,
        recordingDurationMs: options.recordingDurationMs ?? 0,
        observations: observations.length,
        distinctFrames: result.meaningfulChanges,
        moments: result.selectedMoments,
      },
      log,
    );
    log('building Share Pack…');
    const sharePackPath = await createSharePack({
      outputDir: options.outputDir,
      outputPath,
      gifPath,
      ...(result.storyLabPath ? { storyLabPath: result.storyLabPath } : {}),
      ...(socialCardPaths ? { socialCardPaths } : {}),
      recordingDurationMs: options.recordingDurationMs ?? 0,
      observations: observations.length,
      distinctFrames: result.meaningfulChanges,
      moments: result.selectedMoments,
    });
    emit({
      ...result,
      type: 'pipeline:result',
      name,
      outputPath,
      gifPath,
      fileSizeBytes,
      processingMs: Date.now() - startedAt,
      sharePackPath,
    });
    await onSuccess?.();
  } catch (error) {
    emit({ type: 'pipeline:error', name, message: String(error) });
    throw error;
  }
  emit({
    type: 'session:done',
    outputDir: options.outputDir,
    totalObservations: observations.length,
    recordingDurationMs: options.recordingDurationMs ?? 0,
  });
}

async function buildSocialCards(
  input: Parameters<typeof createSocialCards>[0],
  log: (message: string) => void,
): Promise<string[] | undefined> {
  try {
    log('building social cards…');
    return await createSocialCards(input);
  } catch (error) {
    log(`social cards skipped: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}
