import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MacosCaptureProvider } from '@progresscut/capture';

interface CaptureOptions {
  outputDir: string;
  intervalMs: number;
  maxDurationMs: number;
}

/**
 * Capture a coding session as a directory of timestamped PNG frames.
 *
 * Runs until `maxDurationMs` has elapsed or SIGINT is received.
 * Returns the number of frames saved.
 */
export async function runCapture(opts: CaptureOptions): Promise<number> {
  const { outputDir, intervalMs, maxDurationMs } = opts;
  const provider = new MacosCaptureProvider();

  await provider.start({ outputDir, intervalMs });

  let count = 0;
  let stopped = false;

  const stopHandler = (): void => {
    stopped = true;
  };
  process.once('SIGINT', stopHandler);

  const endTime = Date.now() + maxDurationMs;

  try {
    while (!stopped && Date.now() < endTime) {
      const t0 = Date.now();

      const frame = await provider.capture();
      await writeFile(join(outputDir, `${frame.timestampMs}.png`), frame.data);
      count++;

      const captureMs = Date.now() - t0;
      const remainingMs = endTime - Date.now();
      const waitMs = Math.max(0, Math.min(intervalMs - captureMs, remainingMs));

      printStatus(count, remainingMs, outputDir);

      if (waitMs > 0 && !stopped) {
        await sleep(waitMs);
      }
    }
  } finally {
    process.removeListener('SIGINT', stopHandler);
    await provider.stop();
  }

  process.stdout.write('\n'); // end inline status line
  return count;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function printStatus(count: number, remainingMs: number, dir: string): void {
  const remaining = formatDuration(Math.max(0, remainingMs));
  process.stdout.write(
    `\r  capturing… ${remaining} remaining | ${count} frame${count === 1 ? '' : 's'} → ${dir}   `,
  );
}

function formatDuration(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
