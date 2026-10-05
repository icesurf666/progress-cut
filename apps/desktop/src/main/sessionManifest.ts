import { readdir, rm } from 'node:fs/promises';
import type { RerenderOptions, SessionOptions } from '../shared/session.js';
import { MANIFEST_VERSION, type SessionManifest } from './recovery/manifestSchema.js';
import {
  isMissingFile,
  listManifestPaths,
  manifestPath,
  readManifest,
  writeManifest,
} from './recovery/manifestStorage.js';

export interface RecoverableSession extends RerenderOptions {
  readonly frameCount: number;
}

export interface CaptureDestination {
  readonly outputDir: string;
  readonly framesDir: string;
}

export async function beginSessionManifest(
  destination: CaptureDestination,
  options: SessionOptions,
): Promise<void> {
  if (await readManifest(manifestPath(destination.outputDir))) {
    throw new Error('This session already has recovery metadata. Choose a new session folder.');
  }
  const now = Date.now();
  await writeManifest({
    version: MANIFEST_VERSION,
    status: 'recording',
    ...destination,
    targetMs: options.targetMs,
    outputFormat: options.outputFormat ?? 'both',
    startedAt: now,
    recordingDurationMs: 0,
    updatedAt: now,
  });
}

export async function markSessionProcessing(
  outputDir: string,
  recordingDurationMs: number,
): Promise<void> {
  await updateManifest(outputDir, { status: 'processing', recordingDurationMs });
}

export async function preserveSessionForRecovery(outputDir: string): Promise<void> {
  await updateManifest(outputDir, { status: 'recoverable' });
}

export async function clearSessionManifest(outputDir: string): Promise<void> {
  await rm(manifestPath(outputDir), { force: true });
}

export async function findRecoverableSessions(): Promise<RecoverableSession[]> {
  const sessions: { manifest: SessionManifest; frameCount: number }[] = [];
  for (const path of await listManifestPaths()) {
    const manifest = await readManifest(path);
    if (!manifest) continue;
    const frameCount = await countFrames(manifest.framesDir);
    if (frameCount === 0) {
      await rm(path, { force: true });
      continue;
    }
    sessions.push({ manifest, frameCount });
  }
  sessions.sort(
    (first, second) =>
      first.manifest.startedAt - second.manifest.startedAt ||
      first.manifest.outputDir.localeCompare(second.manifest.outputDir),
  );
  return sessions.map(({ manifest, frameCount }) => ({
    outputDir: manifest.outputDir,
    framesDir: manifest.framesDir,
    targetMs: manifest.targetMs,
    outputFormat: manifest.outputFormat,
    recordingDurationMs: manifest.recordingDurationMs,
    frameCount,
  }));
}

async function updateManifest(outputDir: string, update: Partial<SessionManifest>): Promise<void> {
  const manifest = await readManifest(manifestPath(outputDir));
  if (!manifest) throw new Error('Recovery metadata for this session is missing.');
  await writeManifest({ ...manifest, ...update, updatedAt: Date.now() });
}

async function countFrames(framesDir: string): Promise<number> {
  try {
    const entries = await readdir(framesDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.png')).length;
  } catch (error) {
    if (isMissingFile(error)) return 0;
    throw error;
  }
}
