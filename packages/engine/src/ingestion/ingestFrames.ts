import { readdir, open } from 'node:fs/promises';
import { join, parse } from 'node:path';
import type { FrameObservation } from '@progresscut/domain';
import { parseTimestamp } from './parseTimestamp.js';

const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// Magic bytes for each supported format — validated without decoding pixel data
const MAGIC_PNG  = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAGIC_JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const MAGIC_RIFF = Buffer.from('RIFF');
const MAGIC_WEBP = Buffer.from('WEBP');
const HEADER_BYTES = 12;

async function hasValidImageHeader(filePath: string): Promise<boolean> {
  const fh = await open(filePath, 'r');
  try {
    const buf = Buffer.allocUnsafe(HEADER_BYTES);
    const { bytesRead } = await fh.read(buf, 0, HEADER_BYTES, 0);
    if (bytesRead < 3) return false;
    if (buf.subarray(0, 8).equals(MAGIC_PNG)) return true;
    if (buf.subarray(0, 3).equals(MAGIC_JPEG)) return true;
    if (bytesRead >= 12 && buf.subarray(0, 4).equals(MAGIC_RIFF) && buf.subarray(8, 12).equals(MAGIC_WEBP)) return true;
    return false;
  } finally {
    await fh.close();
  }
}

export interface IngestOptions {
  readonly sequentialIntervalMs?: number;
}

export interface SkippedFrame {
  readonly filename: string;
  readonly reason: string;
}

export interface IngestResult {
  readonly observations: readonly FrameObservation[];
  readonly skipped: readonly SkippedFrame[];
}

export async function ingestFrames(
  framesDir: string,
  options: IngestOptions = {},
): Promise<IngestResult> {
  const { sequentialIntervalMs = 1000 } = options;

  const entries = await readdir(framesDir);
  const imageFiles = entries
    .filter((f) => SUPPORTED_EXTENSIONS.has(parse(f).ext.toLowerCase()))
    .sort(); // lexicographic → deterministic

  const observations: FrameObservation[] = [];
  const skipped: SkippedFrame[] = [];

  for (const [index, filename] of imageFiles.entries()) {
    const sourcePath = join(framesDir, filename);
    try {
      if (!(await hasValidImageHeader(sourcePath))) throw new Error('Unrecognized image format');
      const ts = parseTimestamp(filename);
      observations.push({
        id: parse(filename).name,
        timestampMs: ts ?? index * sequentialIntervalMs,
        sourcePath,
      });
    } catch (err) {
      skipped.push({
        filename,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { observations, skipped };
}
