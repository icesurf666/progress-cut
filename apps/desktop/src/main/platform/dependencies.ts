import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);

export async function findMissingDependencies(): Promise<string[]> {
  const checks = await Promise.all(
    ['ffmpeg', 'screencapture'].map(async (binary) => {
      try {
        await executeFile('which', [binary]);
        return '';
      } catch {
        return binary;
      }
    }),
  );
  return checks.filter(Boolean);
}
