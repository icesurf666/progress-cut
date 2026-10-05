import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ingestFrames } from '@progresscut/engine';
import { pipelineA, pipelineB, pipelineC, type PipelineReport } from './pipeline.js';
import { createBlindKit } from './evaluation/createBlindKit.js';

export async function runCompare(
  framesDir: string,
  outputDir: string,
  targetMs: number,
  blind = false,
): Promise<void> {
  console.log(`\nProgressCut M0 — compare`);
  console.log(`  frames dir : ${framesDir}`);
  console.log(`  output dir : ${outputDir}`);
  console.log(`  target     : ${(targetMs / 1000).toFixed(1)} s\n`);

  await mkdir(outputDir, { recursive: true });

  console.log('── ingesting frames ──');
  const t0 = Date.now();
  const { observations, skipped } = await ingestFrames(framesDir);
  console.log(`  loaded  : ${observations.length} frames`);
  if (skipped.length > 0)
    console.log(`  skipped : ${skipped.length} (${skipped.map((s) => s.filename).join(', ')})`);
  if (observations.length === 0) {
    console.error('No valid frames found. Exiting.');
    process.exit(1);
  }
  const first = observations.at(0);
  const last = observations.at(-1);
  if (!first || !last) throw new Error('No frames available for comparison');
  const span = last.timestampMs - first.timestampMs;
  console.log(
    `  session : ${(span / 1000 / 60).toFixed(1)} min  |  ingest: ${Date.now() - t0} ms\n`,
  );

  const runs: [string, () => Promise<PipelineReport>][] = [
    [
      'A — uniform (baseline)',
      () => pipelineA(observations, targetMs, resolve(outputDir, 'A-uniform.mp4')),
    ],
    [
      'B — dedupe + uniform',
      () => pipelineB(observations, targetMs, resolve(outputDir, 'B-dedupe-uniform.mp4')),
    ],
    [
      'C — ProgressCut',
      () => pipelineC(observations, targetMs, resolve(outputDir, 'C-progresscut.mp4')),
    ],
  ];

  const reports: PipelineReport[] = [];
  for (const [label, run] of runs) {
    console.log(`── ${label} ──`);
    try {
      const r = await run();
      reports.push(r);
      console.log(`  → ${r.outputPath}`);
      console.log(
        `     ${(r.fileSizeBytes / 1024 / 1024).toFixed(1)} MB  |  ${r.processingMs} ms\n`,
      );
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  if (blind) {
    const kit = await createBlindKit(reports, outputDir, targetMs);
    console.log(`Reviewer folders: ${kit.reviewerDirectory}`);
    console.log(`Organizer-only key (do not share): ${kit.privateKeyPath}`);
  }
  if (reports.length === 0) return;

  console.log('── summary ──────────────────────────────────────────────────');
  const header = `${'Pipeline'.padEnd(24)} ${'In'.padStart(6)} ${'Deduped'.padStart(14)} ${'Moments'.padStart(8)} ${'MB'.padStart(6)} ${'ms'.padStart(6)}`;
  console.log(header);
  console.log('─'.repeat(header.length));
  for (const r of reports) {
    const deduped = `${r.afterDedupe} (${Math.round((1 - r.afterDedupe / r.inputFrames) * 100)}% off)`;
    console.log(
      `${r.name.padEnd(24)} ${String(r.inputFrames).padStart(6)} ${deduped.padStart(14)} ${String(r.selectedMoments).padStart(8)} ${(r.fileSizeBytes / 1024 / 1024).toFixed(1).padStart(6)} ${String(r.processingMs).padStart(6)}`,
    );
  }
  console.log('\nBlind test: watch all three without knowing which is which.\n');
}
