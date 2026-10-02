import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { MacosCaptureProvider } from '@progresscut/capture';
import { computeDHash } from '@progresscut/engine';
import type { EmitSessionEvent, SessionOptions } from '../../shared/session.js';
import { AdaptiveInterval } from './adaptiveInterval.js';

export interface CaptureControl {
  isStopped(): boolean;
  consumeSnapshotRequest(): boolean;
}

async function waitForCapture(milliseconds: number, control: CaptureControl): Promise<void> {
  const deadline = Date.now() + milliseconds;
  while (!control.isStopped() && Date.now() < deadline) {
    if (control.consumeSnapshotRequest()) return;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(100, Math.max(0, deadline - Date.now()))),
    );
  }
}

export async function captureFrames(
  options: SessionOptions,
  emit: EmitSessionEvent,
  control: CaptureControl,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = join(
    options.outputBaseDir ?? join(homedir(), 'Desktop'),
    `progresscut-${timestamp}`,
  );
  const framesDir = join(outputDir, 'frames');
  await mkdir(framesDir, { recursive: true });
  const provider = new MacosCaptureProvider();
  const adaptiveInterval = new AdaptiveInterval(options.intervalMs);
  const startedAt = Date.now();
  let count = 0;
  try {
    await provider.start({
      outputDir: framesDir,
      intervalMs: options.intervalMs,
      ...(options.windowId ? { windowId: options.windowId } : {}),
    });
    while (!control.isStopped()) {
      const frameStartedAt = Date.now();
      const frame = await provider.capture();
      const framePath = join(framesDir, `${frame.timestampMs}.png`);
      await writeFile(framePath, frame.data);
      count++;
      const hash = await computeDHash(framePath).catch(() => null);
      const intervalMs = adaptiveInterval.update(hash);
      emit({ type: 'capture:frame', count, elapsedMs: Date.now() - startedAt, intervalMs });
      await waitForCapture(Math.max(0, intervalMs - (Date.now() - frameStartedAt)), control);
    }
  } finally {
    await provider.stop();
  }
  if (!count) throw new Error('No frames captured.');
  return { framesDir, outputDir, recordingDurationMs: Date.now() - startedAt };
}
