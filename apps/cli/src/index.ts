#!/usr/bin/env tsx
/**
 * ProgressCut CLI
 *
 * Subcommands:
 *   capture  — record a coding session as timestamped PNG frames
 *   compare  — generate A/B/C comparison MP4s from a frames directory
 *   report   — generate a visual Story Lab report from a frames directory
 *
 * Usage:
 *   pnpm tsx apps/cli/src/index.ts capture <outputDir> [--interval=5000] [--duration=3600000]
 *   pnpm tsx apps/cli/src/index.ts compare <framesDir> [outputDir] [--duration=60000]
 *   pnpm tsx apps/cli/src/index.ts report <framesDir> [outputDir] [--duration=60000]
 *
 * If no subcommand is given, `compare` is assumed.
 */
import { resolve } from 'node:path';
import { runCapture } from './capture.js';
import { runCompare } from './compare.js';
import { writeStoryLab } from './report/index.js';

// ── CLI arg helpers ───────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

function flag(name: string, defaultVal: number): number {
  const found = rawArgs.find((a) => a.startsWith(`--${name}=`));
  if (!found) return defaultVal;
  const v = parseInt(found.split('=')[1] ?? '', 10);
  return isNaN(v) || v <= 0 ? defaultVal : v;
}

function positionals(): string[] {
  return rawArgs.filter((a) => !a.startsWith('--'));
}

function printHelp(): void {
  console.log(
    `
ProgressCut CLI

  capture <outputDir> [--interval=<ms>] [--duration=<ms>]
    Record a coding session as timestamped PNG frames.
    --interval  Screenshot interval in ms (default: 5000)
    --duration  Max recording duration in ms (default: 3600000 = 1 h)
    Press Ctrl+C to stop early.

  compare <framesDir> [outputDir] [--duration=<ms>] [--blind]
    Generate A-uniform, B-dedupe-uniform, C-progresscut MP4s.
    --duration  Target story length in ms (default: 60000 = 1 min)
    --blind     Create neutral video kits for three reviewers and a private mapping key

  report <framesDir> [outputDir] [--duration=<ms>]
    Generate an HTML Story Lab report, timeline chart and metrics JSON.
    --duration  Target story length in ms (default: 60000 = 1 min)
`.trim(),
  );
}

// ── dispatch ──────────────────────────────────────────────────────────────────

const [sub, ...rest] = positionals();

if (!sub || sub === '--help' || sub === '-h') {
  printHelp();
  process.exit(0);
}

if (sub === 'capture') {
  const outputDir = resolve(rest[0] ?? './frames');
  const intervalMs = flag('interval', 5_000);
  const maxDurationMs = flag('duration', 60 * 60_000);

  console.log(`\nProgressCut — capture`);
  console.log(`  output  : ${outputDir}`);
  console.log(`  interval: ${intervalMs} ms`);
  console.log(`  max dur : ${(maxDurationMs / 60_000).toFixed(0)} min`);
  console.log(`  Press Ctrl+C to stop early.\n`);
  console.log(`  NOTE: Screen Recording permission required.`);
  console.log(`        System Preferences → Privacy & Security → Screen Recording\n`);

  runCapture({ outputDir, intervalMs, maxDurationMs })
    .then((count) => {
      console.log(`\nCapture complete. ${count} frames saved to ${outputDir}`);
      console.log(`Run: pnpm tsx apps/cli/src/index.ts compare ${outputDir}\n`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else if (sub === 'report') {
  const framesDir = resolve(rest[0] ?? '.');
  const outputDir = resolve(rest[1] ?? './output');
  const targetMs = flag('duration', 60_000);
  writeStoryLab(framesDir, outputDir, targetMs)
    .then((result) => {
      console.log(`\nStory Lab ready:\n  ${result.htmlPath}\n  ${result.dataPath}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  const isExplicit = sub === 'compare';
  const framesDir = resolve(isExplicit ? (rest[0] ?? '.') : sub);
  const outputDir = resolve(isExplicit ? (rest[1] ?? './output') : (rest[0] ?? './output'));
  const targetMs = flag('duration', 60_000);

  runCompare(framesDir, outputDir, targetMs, rawArgs.includes('--blind')).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
