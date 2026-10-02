/**
 * Benchmark: sequential vs parallel proxy+hash precomputation
 *
 * Usage:
 *   pnpm tsx bench/dedup-parallel.ts [frame-count]
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createProxy, computeDHash } from '../packages/engine/src/index.js';

const N = parseInt(process.argv[2] ?? '80', 10);
const BATCH = 8;

function hms(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

async function time<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ elapsed: number; result: T }> {
  const t0 = performance.now();
  const result = await fn();
  return { elapsed: performance.now() - t0, result };
}

async function createFrames(dir: string, n: number): Promise<string[]> {
  await mkdir(dir, { recursive: true });
  const paths: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = join(dir, `${Date.now() + i}.png`);
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    // Retina MacBook 13" native: 2560x1600 → use 1920x1200 as a practical stand-in
    const buf = await sharp({
      create: { width: 1920, height: 1200, channels: 3, background: { r, g, b } },
    })
      .png()
      .toBuffer();
    await writeFile(p, buf);
    paths.push(p);
  }
  return paths;
}

async function runSequential(paths: string[]) {
  for (const p of paths) {
    await createProxy(p);
    await computeDHash(p);
  }
}

async function runParallel(paths: string[]) {
  for (let i = 0; i < paths.length; i += BATCH) {
    await Promise.all(
      paths.slice(i, i + BATCH).map(async (p) => {
        await createProxy(p);
        await computeDHash(p);
      }),
    );
  }
}

const dir = join(tmpdir(), `progresscut-bench-${Date.now()}`);

try {
  console.log(`\nProgressCut dedup benchmark — ${N} frames, batch=${BATCH}\n`);

  process.stdout.write('Creating frames… ');
  const paths = await createFrames(dir, N);
  console.log('done\n');

  // Warm up
  await createProxy(paths[0]!);
  await computeDHash(paths[0]!);

  const seq = await time('sequential', () => runSequential(paths));
  console.log(
    `  sequential  ${hms(seq.elapsed).padEnd(10)}  (${(seq.elapsed / N).toFixed(1)}ms/frame)`,
  );

  const par = await time('parallel×8', () => runParallel(paths));
  console.log(
    `  parallel×8  ${hms(par.elapsed).padEnd(10)}  (${(par.elapsed / N).toFixed(1)}ms/frame)`,
  );

  const speedup = seq.elapsed / par.elapsed;
  console.log(`\n  speedup     ${speedup.toFixed(2)}×`);
  console.log(`  saved       ${hms(seq.elapsed - par.elapsed)} on ${N} frames\n`);

  // Extrapolate to larger sessions
  for (const n of [200, 400, 800]) {
    if (n <= N) continue;
    const seqEst = (seq.elapsed / N) * n;
    const parEst = (par.elapsed / N) * n;
    console.log(
      `  @${n} frames   seq≈${hms(seqEst).padEnd(8)}  par≈${hms(parEst).padEnd(8)}  saved≈${hms(seqEst - parEst)}`,
    );
  }
  console.log();
} finally {
  await rm(dir, { recursive: true, force: true });
}
