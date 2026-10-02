import { spawn } from 'node:child_process';

/**
 * Run `ffmpeg` with the given args.
 * Resolves on exit code 0; rejects with the last 2 KB of stderr otherwise.
 */
export function runFfmpeg(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    const chunks: Buffer[] = [];

    proc.stderr?.on('data', (chunk: Buffer) => chunks.push(chunk));

    proc.on('error', reject);

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const tail = Buffer.concat(chunks).toString('utf8').slice(-2_000);
        reject(new Error(`ffmpeg exited with code ${code ?? 'null'}:\n${tail}`));
      }
    });
  });
}
