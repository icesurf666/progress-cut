import type { OutputFormat } from '../../shared/session.js';

export const MANIFEST_VERSION = 1;
type ManifestStatus = 'recording' | 'processing' | 'recoverable';

export interface SessionManifest {
  readonly version: number;
  readonly status: ManifestStatus;
  readonly outputDir: string;
  readonly framesDir: string;
  readonly targetMs: number;
  readonly outputFormat: OutputFormat;
  readonly startedAt: number;
  readonly recordingDurationMs: number;
  readonly updatedAt: number;
}

export function parseManifest(raw: unknown): SessionManifest {
  if (typeof raw !== 'object' || raw === null) throw invalidManifest();
  const value = raw as Record<string, unknown>;
  if (
    value['version'] !== MANIFEST_VERSION ||
    !isStatus(value['status']) ||
    typeof value['outputDir'] !== 'string' ||
    !value['outputDir'] ||
    typeof value['framesDir'] !== 'string' ||
    !value['framesDir'] ||
    !isNonnegativeInteger(value['targetMs']) ||
    value['targetMs'] === 0 ||
    !isOutputFormat(value['outputFormat']) ||
    !isNonnegativeInteger(value['startedAt']) ||
    !isNonnegativeInteger(value['recordingDurationMs']) ||
    !isNonnegativeInteger(value['updatedAt'])
  )
    throw invalidManifest();
  return {
    version: MANIFEST_VERSION,
    status: value['status'],
    outputDir: value['outputDir'],
    framesDir: value['framesDir'],
    targetMs: value['targetMs'],
    outputFormat: value['outputFormat'],
    startedAt: value['startedAt'],
    recordingDurationMs: value['recordingDurationMs'],
    updatedAt: value['updatedAt'],
  };
}

function invalidManifest(): Error {
  return new Error('Recovery metadata is invalid or uses an unsupported version.');
}

function isStatus(value: unknown): value is ManifestStatus {
  return value === 'recording' || value === 'processing' || value === 'recoverable';
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isOutputFormat(value: unknown): value is OutputFormat {
  return value === 'both' || value === 'mp4' || value === 'gif';
}
