import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { buildPostTemplates } from './sharePackCopy.js';

export interface SharePackInput {
  readonly outputDir: string;
  readonly outputPath: string;
  readonly gifPath: string;
  readonly storyLabPath?: string;
  readonly socialCardPaths?: readonly string[];
  readonly recordingDurationMs: number;
  readonly observations: number;
  readonly distinctFrames: number;
  readonly moments: number;
}

export async function createSharePack(input: SharePackInput): Promise<string> {
  const directory = join(input.outputDir, 'share-pack');
  const copyDirectory = join(directory, 'copy');
  await mkdir(directory, { recursive: true });
  await mkdir(copyDirectory, { recursive: true });
  const media = new Set([input.outputPath, input.gifPath].filter(Boolean));
  await Promise.all([...media].map((path) => copyFile(path, join(directory, basename(path)))));
  if (input.storyLabPath) {
    const metricsPath = join(dirname(input.storyLabPath), 'metrics.json');
    await copyFile(metricsPath, join(directory, 'metrics.json'));
  }
  if (input.socialCardPaths) {
    await Promise.all(
      input.socialCardPaths.map((path) => copyFile(path, join(directory, basename(path)))),
    );
  }
  await Promise.all([
    writeFile(join(directory, 'BUILD_UPDATE.md'), buildUpdate(input)),
    writeFile(join(directory, 'README.txt'), readme()),
    ...Object.entries(buildPostTemplates(input)).map(([filename, content]) =>
      writeFile(join(copyDirectory, filename), content),
    ),
  ]);
  return directory;
}

function readme(): string {
  return `ProgressCut Share Pack

Assets:
- story-card.png: article/X cover (1600×900)
- story-card-og.png: Open Graph preview (1200×630)
- story-card-portrait.png: LinkedIn portrait post (1080×1350)
- copy/: facts-first publication templates

This pack contains exported media and metrics only. Review media and replace every [placeholder] before publishing.
`;
}

export function buildUpdate(input: SharePackInput): string {
  const compression = input.observations
    ? `${Math.round((1 - input.moments / input.observations) * 100)}%`
    : 'n/a';
  return `# ProgressCut build update

${duration(input.recordingDurationMs)} of work → ${input.moments} visual moments.

- ${input.observations.toLocaleString()} observed frames
- ${input.distinctFrames.toLocaleString()} distinct visual states
- ${input.moments} selected story moments
- ${compression} visual compression

Built with ProgressCut — local-first visual story compression.
`;
}

function duration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 59
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m ${seconds % 60}s`;
}
