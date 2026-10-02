import { bench, describe, beforeAll } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createProxy } from '../packages/engine/src/proxy/createProxy.js';

const DIR = join(tmpdir(), 'progresscut-bench-proxy');

// Frame sizes representative of real sessions
const SIZES = [
  { label: '1080p', w: 1920, h: 1080 },
  { label: '1440p', w: 2560, h: 1440 },
  { label: '4K', w: 3840, h: 2160 },
] as const;

const frames: Record<string, Buffer> = {};

beforeAll(async () => {
  await mkdir(DIR, { recursive: true });
  for (const { label, w, h } of SIZES) {
    // Gradient image so compression/sharp can't shortcut
    const pixels = Buffer.alloc(w * h * 3);
    for (let i = 0; i < pixels.length; i++) pixels[i] = i % 256;
    frames[label] = await sharp(pixels, { raw: { width: w, height: h, channels: 3 } })
      .png()
      .toBuffer();
  }
});

describe('createProxy throughput', () => {
  for (const { label } of SIZES) {
    bench(`${label} frame → 64×64 proxy`, async () => {
      await createProxy(frames[label]!);
    });
  }

  bench('1080p frame → 32×32 proxy', async () => {
    await createProxy(frames['1080p']!, { width: 32, height: 32 });
  });
});
