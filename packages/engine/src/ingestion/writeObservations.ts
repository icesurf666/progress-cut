import { writeFile } from 'node:fs/promises';
import type { FrameObservation } from '@progresscut/domain';
import type { SkippedFrame } from './ingestFrames.js';

interface ObservationsFile {
  readonly version: '1';
  readonly createdAt: string;
  readonly sourceDir: string;
  readonly count: number;
  readonly skippedCount: number;
  readonly observations: readonly FrameObservation[];
  readonly skipped: readonly SkippedFrame[];
}

export async function writeObservations(
  outputPath: string,
  sourceDir: string,
  observations: readonly FrameObservation[],
  skipped: readonly SkippedFrame[],
): Promise<void> {
  const file: ObservationsFile = {
    version: '1',
    createdAt: new Date().toISOString(),
    sourceDir,
    count: observations.length,
    skippedCount: skipped.length,
    observations,
    skipped,
  };
  await writeFile(outputPath, JSON.stringify(file, null, 2), 'utf-8');
}
