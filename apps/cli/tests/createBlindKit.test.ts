import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PipelineReport } from '../src/pipeline.js';
import { createBlindKit } from '../src/evaluation/createBlindKit.js';

let directory: string;
let reports: PipelineReport[];
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'progresscut-blind-test-'));
  reports = await Promise.all(
    ['A-uniform', 'B-dedupe-uniform', 'C-progresscut'].map(async (name) => {
      const outputPath = join(directory, `${name}.mp4`);
      await writeFile(outputPath, name);
      return {
        name,
        outputPath,
        inputFrames: 10,
        afterDedupe: 5,
        selectedMoments: 3,
        fileSizeBytes: 100,
        processingMs: 10,
      };
    }),
  );
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('blind evaluation kit', () => {
  it('copies anonymous clips with balanced viewing positions and a separate key', async () => {
    const originalReports = structuredClone(reports);
    const kit = await createBlindKit(reports, directory, 3000);
    const keyText = await readFile(kit.privateKeyPath, 'utf8');
    const positions: string[][] = [[], [], []];
    const assignments: { reviewerId: string; mapping: Record<string, string> }[] = [];
    for (let reviewerIndex = 0; reviewerIndex < 3; reviewerIndex++) {
      const folder = join(kit.reviewerDirectory, `reviewer-${reviewerIndex + 1}`);
      expect((await readdir(folder)).sort()).toEqual([
        'INSTRUCTIONS.md',
        'clip-1.mp4',
        'clip-2.mp4',
        'clip-3.mp4',
        'ratings.csv',
      ]);
      const names: string[] = [];
      const mapping: Record<string, string> = {};
      for (let clipIndex = 0; clipIndex < 3; clipIndex++) {
        const filename = `clip-${clipIndex + 1}.mp4`;
        const name = await readFile(join(folder, filename), 'utf8');
        names.push(name);
        positions[clipIndex]?.push(name);
        mapping[filename] = name;
      }
      assignments.push({ reviewerId: `reviewer-${reviewerIndex + 1}`, mapping });
      expect(new Set(names).size).toBe(3);
      const instructions = await readFile(join(folder, 'INSTRUCTIONS.md'), 'utf8');
      expect(instructions).toContain('ties are allowed');
      expect(instructions).not.toContain(directory);
      for (const report of reports) expect(instructions).not.toContain(report.name);
      expect(await readFile(join(folder, 'ratings.csv'), 'utf8')).toBe(
        'clip,progress_rank,share_rank,notes\nclip-1.mp4,,,\nclip-2.mp4,,,\nclip-3.mp4,,,\n',
      );
    }
    for (const position of positions) expect(new Set(position).size).toBe(3);
    expect(JSON.parse(keyText)).toMatchObject({
      version: 1,
      targetDurationMs: 3000,
      reports,
      assignments,
    });
    expect(reports).toEqual(originalReports);
    expect((await stat(dirname(kit.privateKeyPath))).mode & 0o777).toBe(0o700);
    expect((await stat(kit.privateKeyPath)).mode & 0o777).toBe(0o600);
  });

  it('rejects incomplete or duplicated exports before creating a kit', async () => {
    for (const invalid of [reports.slice(0, 2), [...reports.slice(0, 2), ...reports.slice(0, 1)]]) {
      await expect(createBlindKit(invalid, directory, 3000)).rejects.toThrow('all three');
    }
    expect(
      (await readdir(directory)).filter((name) => name.startsWith('blind-evaluation-')),
    ).toEqual([]);
  });

  it('cleans partial kits when a source cannot be copied without deleting originals', async () => {
    const invalid = reports.map((report) => ({
      ...report,
      outputPath: join(directory, 'missing.mp4'),
    }));
    await expect(createBlindKit(invalid, directory, 3000)).rejects.toThrow();
    expect((await readdir(directory)).sort()).toEqual(
      reports.map((report) => `${report.name}.mp4`).sort(),
    );
  });

  it('creates separate runs without overwriting an existing organizer key', async () => {
    const first = await createBlindKit(reports, directory, 3000);
    const originalKey = await readFile(first.privateKeyPath, 'utf8');
    const second = await createBlindKit(reports, directory, 3000);
    expect(second.reviewerDirectory).not.toBe(first.reviewerDirectory);
    expect(await readFile(first.privateKeyPath, 'utf8')).toBe(originalKey);
  });
});
