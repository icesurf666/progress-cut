import { describe, expect, it } from 'vitest';
import { renderStoryLabHtml } from '@progresscut/render';
import type { StoryLabReport } from '@progresscut/domain';
import { selectedStoryLabFrames } from '@progresscut/engine';

const model: StoryLabReport = {
  generatedAt: '2026-10-05T12:00:00.000Z',
  targetDurationMs: 1000,
  session: { startedAtMs: 1000, endedAtMs: 5000, durationMs: 4000 },
  counts: { observations: 20, distinctFrames: 8, segments: 2, moments: 2 },
  candidates: [
    {
      id: 'first',
      timestampMs: 1000,
      sourcePath: '/tmp/first frame.png',
      visualDifference: 0,
      novelty: 1,
    },
    {
      id: 'second',
      timestampMs: 5000,
      sourcePath: '/tmp/second.png',
      visualDifference: 0.4,
      novelty: 0.8,
    },
  ],
  segments: [],
  moments: [
    { frameId: 'first', timestampMs: 1000, durationMs: 500, score: 1 },
    { frameId: 'second', timestampMs: 5000, durationMs: 500, score: 0.8 },
  ],
};

describe('Story Lab HTML', () => {
  it('uses selected moments for the contact sheet in chronological order', () => {
    expect(selectedStoryLabFrames(model).map((candidate) => candidate.id)).toEqual([
      'first',
      'second',
    ]);
    const html = renderStoryLabHtml(model, selectedStoryLabFrames(model));
    expect(html).toContain('file:///tmp/first%20frame.png');
    expect(html).toContain('file:///tmp/second.png');
    expect(html).toContain('01');
    expect(html).toContain('02');
  });

  it('renders the compression stages and visual selection timeline', () => {
    const html = renderStoryLabHtml(model, selectedStoryLabFrames(model));
    expect(html).toContain('Observed');
    expect(html).toContain('Distinct');
    expect(html).toContain('Segments');
    expect(html).toContain('Story');
    expect(html).toContain('class="bars"');
    expect(html).toContain('class="markers"');
  });
});
