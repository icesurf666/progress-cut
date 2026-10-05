import { randomInt } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PipelineReport } from '../pipeline.js';

export interface BlindKit {
  readonly reviewerDirectory: string;
  readonly privateKeyPath: string;
}

export async function createBlindKit(
  reports: readonly PipelineReport[],
  outputDir: string,
  targetDurationMs: number,
): Promise<BlindKit> {
  const expectedNames = ['A-uniform', 'B-dedupe-uniform', 'C-progresscut'];
  if (
    reports.length !== 3 ||
    expectedNames.some((name) => reports.filter((report) => report.name === name).length !== 1)
  ) {
    throw new Error('Blind evaluation requires all three successful A/B/C exports.');
  }
  const ordered = shuffle(reports);
  await mkdir(outputDir, { recursive: true });
  const directory = await mkdtemp(join(outputDir, 'blind-evaluation-'));
  const reviewerDirectory = join(directory, 'reviewers');
  const privateDirectory = join(directory, 'private');
  const privateKeyPath = join(privateDirectory, 'key.json');
  try {
    await mkdir(reviewerDirectory);
    await mkdir(privateDirectory, { mode: 0o700 });
    const assignments = [];
    for (let reviewerIndex = 0; reviewerIndex < 3; reviewerIndex++) {
      const reviewerId = `reviewer-${reviewerIndex + 1}`;
      const folder = join(reviewerDirectory, reviewerId);
      await mkdir(folder);
      const mapping: Record<string, string> = {};
      for (let clipIndex = 0; clipIndex < ordered.length; clipIndex++) {
        const report = ordered[(clipIndex + reviewerIndex) % ordered.length];
        if (!report) throw new Error('Missing blind evaluation export');
        const filename = `clip-${clipIndex + 1}.mp4`;
        await copyFile(report.outputPath, join(folder, filename));
        mapping[filename] = report.name;
      }
      await writeFile(join(folder, 'INSTRUCTIONS.md'), instructions());
      await writeFile(
        join(folder, 'ratings.csv'),
        'clip,progress_rank,share_rank,notes\nclip-1.mp4,,,\nclip-2.mp4,,,\nclip-3.mp4,,,\n',
      );
      assignments.push({ reviewerId, mapping });
    }
    await writeFile(
      privateKeyPath,
      JSON.stringify(
        {
          version: 1,
          generatedAt: new Date().toISOString(),
          targetDurationMs,
          reports,
          assignments,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    return { reviewerDirectory, privateKeyPath };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

function shuffle(reports: readonly PipelineReport[]): PipelineReport[] {
  const result = [...reports];
  for (let index = result.length - 1; index > 0; index--) {
    const selectedIndex = randomInt(index + 1);
    const current = result[index];
    const selected = result[selectedIndex];
    if (!current || !selected) throw new Error('Missing shuffle element');
    result[index] = selected;
    result[selectedIndex] = current;
  }
  return result;
}

function instructions(): string {
  return `# Visual story evaluation

Watch clip-1.mp4, clip-2.mp4 and clip-3.mp4 in that order. You may replay them.
Do not discuss your choices with other reviewers before submitting your ratings.

Fill ratings.csv:

- progress_rank: which video best communicates how the work progressed?
- share_rank: which video would you prefer to share as a build update?
- Use ranks 1 (best), 2 and 3; ties are allowed by assigning the same rank.
- notes: missed milestone, repetitive scene, unreadable frame, or other failure.

Return the completed ratings.csv to the organizer. Do not rename the clips.
`;
}
