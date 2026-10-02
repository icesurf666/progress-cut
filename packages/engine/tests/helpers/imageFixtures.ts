import { beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

type Color = { r: number; g: number; b: number };

export function createImageFixtures(prefix: string) {
  let directory = '';
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), `progresscut-${prefix}-`));
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return {
    async uniform(
      name: string,
      width: number,
      height: number,
      color: number | Color = 128,
    ): Promise<string> {
      const path = join(directory, name);
      const background = typeof color === 'number' ? { r: color, g: color, b: color } : color;
      await sharp({ create: { width, height, channels: 3, background } })
        .png()
        .toFile(path);
      return path;
    },
    async gradient(
      name: string,
      width: number,
      height: number,
      axis: 'horizontal' | 'vertical' = 'horizontal',
      reverse = false,
    ): Promise<string> {
      const pixels = Buffer.alloc(width * height * 3);
      for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) {
          const fraction = axis === 'horizontal' ? column / (width - 1) : row / (height - 1);
          const value = Math.round((reverse ? 1 - fraction : fraction) * 255);
          const offset = (row * width + column) * 3;
          pixels.fill(value, offset, offset + 3);
        }
      }
      const path = join(directory, name);
      await sharp(pixels, { raw: { width, height, channels: 3 } })
        .png()
        .toFile(path);
      return path;
    },
    async brightness(source: string, name: string, shift: number): Promise<string> {
      const path = join(directory, name);
      await sharp(source).linear(1, shift).toFile(path);
      return path;
    },
    async cursor(source: string, name: string): Promise<string> {
      const path = join(directory, name);
      const cursor = await sharp({
        create: {
          width: 12,
          height: 20,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      await sharp(source)
        .composite([{ input: cursor, top: 100, left: 200 }])
        .toFile(path);
      return path;
    },
    async grayscalePixels(
      name: string,
      pixels: Uint8Array,
      width: number,
      height: number,
    ): Promise<string> {
      const path = join(directory, name);
      await sharp(Buffer.from(pixels), { raw: { width, height, channels: 1 } })
        .png()
        .toFile(path);
      return path;
    },
  };
}
