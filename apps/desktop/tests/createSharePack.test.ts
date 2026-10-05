import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildUpdate, createSharePack } from '../src/main/pipeline/createSharePack.js';

describe('share pack', () => {
  it('copies publishable exports and metrics without copying raw frames', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'progresscut-share-'));
    const mp4Path = join(outputDir, 'progresscut.mp4');
    const gifPath = join(outputDir, 'progresscut.gif');
    const storyLabDir = join(outputDir, 'story-lab');
    const storyLabPath = join(storyLabDir, 'index.html');
    const socialCardPaths = [
      join(outputDir, 'story-card.png'),
      join(outputDir, 'story-card-og.png'),
      join(outputDir, 'story-card-portrait.png'),
    ];
    await mkdir(storyLabDir);
    await Promise.all([
      writeFile(mp4Path, 'video'),
      writeFile(gifPath, 'gif'),
      writeFile(storyLabPath, '<html>report</html>'),
      writeFile(join(storyLabDir, 'metrics.json'), '{"moments":3}'),
      ...socialCardPaths.map((path) => writeFile(path, 'png')),
    ]);
    const directory = await createSharePack({
      outputDir,
      outputPath: mp4Path,
      gifPath,
      storyLabPath,
      socialCardPaths,
      recordingDurationMs: 90_000,
      observations: 100,
      distinctFrames: 12,
      moments: 3,
    });
    await expect(readdir(directory)).resolves.toEqual(
      expect.arrayContaining([
        'BUILD_UPDATE.md',
        'README.txt',
        'metrics.json',
        'progresscut.gif',
        'progresscut.mp4',
        'story-card.png',
        'story-card-og.png',
        'story-card-portrait.png',
        'copy',
      ]),
    );
    await expect(readFile(join(directory, 'BUILD_UPDATE.md'), 'utf8')).resolves.toContain(
      '97% visual compression',
    );
    await expect(readFile(join(directory, 'copy', 'x.md'), 'utf8')).resolves.toContain(
      '1m 30s of work into 3 visual moments',
    );
  });

  it('writes a useful text update for a content post', () => {
    expect(
      buildUpdate({
        outputDir: '/tmp',
        outputPath: '/tmp/story.mp4',
        gifPath: '',
        recordingDurationMs: 65_000,
        observations: 50,
        distinctFrames: 8,
        moments: 5,
      }),
    ).toContain('1m 5s of work → 5 visual moments');
  });
});
