import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { ingestFrames } from '../../src/ingestion/ingestFrames.js';

// Creates a valid minimal PNG in the given directory
async function createFrame(dir: string, filename: string): Promise<string> {
  const path = join(dir, filename);
  await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toFile(path);
  return path;
}

// Creates a file that sharp cannot parse
async function createCorruptedFrame(dir: string, filename: string): Promise<string> {
  const path = join(dir, filename);
  await writeFile(path, Buffer.from('this is not an image'));
  return path;
}

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `progresscut-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('ingestFrames', () => {
  it('returns empty result for empty directory', async () => {
    const result = await ingestFrames(testDir);
    expect(result.observations).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('ingests a single valid frame', async () => {
    await createFrame(testDir, 'frame_001.png');
    const result = await ingestFrames(testDir);
    expect(result.observations).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.observations[0]?.id).toBe('frame_001');
  });

  it('uses filename stem as frame ID', async () => {
    await createFrame(testDir, 'my-session-capture.png');
    const { observations } = await ingestFrames(testDir);
    expect(observations[0]?.id).toBe('my-session-capture');
  });

  it('sets sourcePath to the resolved file path', async () => {
    await createFrame(testDir, 'frame_001.png');
    const { observations } = await ingestFrames(testDir);
    expect(observations[0]?.sourcePath).toBe(join(testDir, 'frame_001.png'));
  });

  it('sorts frames lexicographically — deterministic ordering', async () => {
    await createFrame(testDir, 'frame_003.png');
    await createFrame(testDir, 'frame_001.png');
    await createFrame(testDir, 'frame_002.png');
    const { observations } = await ingestFrames(testDir);
    expect(observations.map((o) => o.id)).toEqual(['frame_001', 'frame_002', 'frame_003']);
  });

  it('produces the same result on repeated calls (deterministic)', async () => {
    await createFrame(testDir, 'b.png');
    await createFrame(testDir, 'a.png');
    const r1 = await ingestFrames(testDir);
    const r2 = await ingestFrames(testDir);
    expect(r1.observations.map((o) => o.id)).toEqual(r2.observations.map((o) => o.id));
  });

  describe('timestamp extraction', () => {
    it('uses 13-digit timestamp from filename', async () => {
      await createFrame(testDir, '1700000000000.png');
      const { observations } = await ingestFrames(testDir);
      expect(observations[0]?.timestampMs).toBe(1700000000000);
    });

    it('uses 13-digit timestamp embedded in longer filename', async () => {
      await createFrame(testDir, 'frame_1700000005000.png');
      const { observations } = await ingestFrames(testDir);
      expect(observations[0]?.timestampMs).toBe(1700000005000);
    });

    it('falls back to sequential index × intervalMs when no timestamp', async () => {
      await createFrame(testDir, 'frame_001.png');
      await createFrame(testDir, 'frame_002.png');
      await createFrame(testDir, 'frame_003.png');
      const { observations } = await ingestFrames(testDir);
      expect(observations[0]?.timestampMs).toBe(0); // index 0
      expect(observations[1]?.timestampMs).toBe(1000); // index 1
      expect(observations[2]?.timestampMs).toBe(2000); // index 2
    });

    it('respects custom sequentialIntervalMs', async () => {
      await createFrame(testDir, 'frame_001.png');
      await createFrame(testDir, 'frame_002.png');
      const { observations } = await ingestFrames(testDir, { sequentialIntervalMs: 500 });
      expect(observations[0]?.timestampMs).toBe(0);
      expect(observations[1]?.timestampMs).toBe(500);
    });
  });

  describe('corrupted frame handling', () => {
    it('skips a corrupted file and keeps valid frames', async () => {
      await createFrame(testDir, 'frame_001.png');
      await createCorruptedFrame(testDir, 'frame_002.png');
      await createFrame(testDir, 'frame_003.png');
      const { observations, skipped } = await ingestFrames(testDir);
      expect(observations).toHaveLength(2);
      expect(skipped).toHaveLength(1);
      expect(skipped[0]?.filename).toBe('frame_002.png');
      expect(observations.map((o) => o.id)).toEqual(['frame_001', 'frame_003']);
    });

    it('preserves position-based timestamps even when frames are skipped', async () => {
      await createFrame(testDir, 'frame_001.png'); // index 0
      await createCorruptedFrame(testDir, 'frame_002.png'); // index 1 — skipped
      await createFrame(testDir, 'frame_003.png'); // index 2
      const { observations } = await ingestFrames(testDir);
      expect(observations[0]?.timestampMs).toBe(0);
      expect(observations[1]?.timestampMs).toBe(2000); // position 2 in sorted list
    });

    it('skipped entry includes a non-empty reason', async () => {
      await createCorruptedFrame(testDir, 'bad.png');
      const { skipped } = await ingestFrames(testDir);
      expect(skipped[0]?.reason.length).toBeGreaterThan(0);
    });

    it('returns only skipped when all frames are corrupted', async () => {
      await createCorruptedFrame(testDir, 'a.png');
      await createCorruptedFrame(testDir, 'b.png');
      const { observations, skipped } = await ingestFrames(testDir);
      expect(observations).toHaveLength(0);
      expect(skipped).toHaveLength(2);
    });
  });

  describe('file type filtering', () => {
    it('ignores non-image files', async () => {
      await createFrame(testDir, 'frame_001.png');
      await writeFile(join(testDir, 'README.txt'), 'not an image');
      await writeFile(join(testDir, 'meta.json'), '{}');
      const { observations } = await ingestFrames(testDir);
      expect(observations).toHaveLength(1);
    });

    it('accepts .jpg, .jpeg, .webp, .png extensions', async () => {
      for (const ext of ['a.png', 'b.jpg', 'c.jpeg', 'd.webp']) {
        await createFrame(testDir, ext);
      }
      const { observations } = await ingestFrames(testDir);
      expect(observations).toHaveLength(4);
    });

    it('is case-insensitive for extensions', async () => {
      await createFrame(testDir, 'frame.PNG');
      const { observations } = await ingestFrames(testDir);
      expect(observations).toHaveLength(1);
    });
  });

  it('throws when directory does not exist', async () => {
    await expect(ingestFrames('/nonexistent/path/xyz')).rejects.toThrow();
  });
});
