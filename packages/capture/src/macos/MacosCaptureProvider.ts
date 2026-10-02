import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CaptureConfig, CapturedFrame, CaptureProvider } from '../port/CaptureProvider.js';

const execFileAsync = promisify(execFile);

/**
 * Screen capture adapter for macOS using the built-in `screencapture` CLI.
 *
 * Requires Screen Recording permission in System Preferences → Privacy & Security.
 * On first run macOS will prompt for it; grant it and re-run.
 */
export class MacosCaptureProvider implements CaptureProvider {
  private started = false;
  private windowId = '';

  async start(config: CaptureConfig): Promise<void> {
    await mkdir(config.outputDir, { recursive: true });
    this.windowId = config.windowId ?? '';
    this.started = true;
  }

  async capture(): Promise<CapturedFrame> {
    if (!this.started) throw new Error('MacosCaptureProvider: call start() first');

    const timestampMs = Date.now();
    const tempPath = join(tmpdir(), `progresscut-${timestampMs}.png`);

    const args = ['-x', '-t', 'png'];
    if (this.windowId) args.push('-l', this.windowId);
    args.push(tempPath);

    await execFileAsync('screencapture', args);

    const data = await readFile(tempPath);
    await unlink(tempPath).catch(() => undefined);

    return { timestampMs, data };
  }

  async stop(): Promise<void> {
    this.started = false;
    this.windowId = '';
  }
}
