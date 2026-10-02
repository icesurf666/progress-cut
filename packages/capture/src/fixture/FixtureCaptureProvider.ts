import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CaptureConfig, CapturedFrame, CaptureProvider } from '../port/CaptureProvider.js';

const SUPPORTED = /\.(png|jpg|jpeg|webp)$/i;

export class FixtureCaptureProvider implements CaptureProvider {
  private frames: string[] = [];
  private index = 0;

  constructor(private readonly framesDir: string) {}

  async start(_config: CaptureConfig): Promise<void> {
    const entries = await readdir(this.framesDir);
    this.frames = entries
      .filter((f) => SUPPORTED.test(f))
      .sort()
      .map((f) => join(this.framesDir, f));
    this.index = 0;
  }

  async capture(): Promise<CapturedFrame> {
    const framePath = this.frames[this.index];
    if (framePath === undefined) {
      throw new Error('FixtureCaptureProvider: no more frames');
    }
    this.index++;
    return {
      timestampMs: this.index * 1000,
      data: await readFile(framePath),
    };
  }

  get remaining(): number {
    return this.frames.length - this.index;
  }

  async stop(): Promise<void> {
    this.frames = [];
    this.index = 0;
  }
}
