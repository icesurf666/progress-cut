import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionEvent } from '../src/shared/session.js';
import { runPipeline } from '../src/main/pipeline/runPipeline.js';
import { rerenderSession } from '../src/main/captureSession.js';

const mocks = vi.hoisted(() => ({
  gif: vi.fn(),
  unlink: vi.fn(),
  stat: vi.fn(),
  render: vi.fn(),
  ingest: vi.fn(),
}));
vi.mock('@progresscut/engine', () => ({ ingestFrames: mocks.ingest }));
vi.mock('@progresscut/render', () => ({ convertToGif: mocks.gif }));
vi.mock('../src/main/pipeline/renderStory.js', () => ({ renderStory: mocks.render }));
vi.mock('../src/main/capture/captureFrames.js', () => ({ captureFrames: vi.fn() }));
vi.mock('node:fs/promises', () => ({ stat: mocks.stat, unlink: mocks.unlink }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.ingest.mockResolvedValue({ observations: [{ id: 'frame' }] });
  mocks.render.mockResolvedValue({
    outputPath: '/session/progresscut.mp4',
    fileSizeBytes: 100,
    thumbnails: [],
    meaningfulChanges: 1,
    selectedMoments: 1,
  });
  mocks.stat.mockResolvedValue({ size: 200 });
  mocks.gif.mockResolvedValue(undefined);
  mocks.unlink.mockResolvedValue(undefined);
});

const options = { framesDir: '/session/frames', outputDir: '/session', targetMs: 1000 };

describe('desktop export pipeline', () => {
  it('reports the actual GIF path and file size after removing intermediate MP4', async () => {
    const events: SessionEvent[] = [];
    await runPipeline({ ...options, outputFormat: 'gif' }, (event) => events.push(event));
    expect(events.find((event) => event.type === 'pipeline:result')).toMatchObject({
      outputPath: '/session/progresscut.gif',
      gifPath: '/session/progresscut.gif',
      fileSizeBytes: 200,
    });
    expect(mocks.unlink).toHaveBeenCalledWith('/session/progresscut.mp4');
    expect(events.filter((event) => event.type === 'session:done')).toHaveLength(1);
  });

  it('does not expose a GIF action for an MP4-only export', async () => {
    const events: SessionEvent[] = [];
    await runPipeline({ ...options, outputFormat: 'mp4' }, (event) => events.push(event));
    expect(events.find((event) => event.type === 'pipeline:result')).toMatchObject({ gifPath: '' });
    expect(mocks.gif).not.toHaveBeenCalled();
    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it('emits one completion during re-render, including the actual observation count', async () => {
    const events: SessionEvent[] = [];
    rerenderSession(options, (event) => events.push(event));
    await vi.waitFor(() =>
      expect(events.filter((event) => event.type === 'session:done')).toHaveLength(1),
    );
    expect(events.at(-1)).toMatchObject({ type: 'session:done', totalObservations: 1 });
  });

  it('retains the intermediate video and emits an error when GIF conversion fails', async () => {
    mocks.gif.mockRejectedValue(new Error('encoding failed'));
    const events: SessionEvent[] = [];
    await runPipeline({ ...options, outputFormat: 'gif' }, (event) => events.push(event));
    expect(events.some((event) => event.type === 'pipeline:error')).toBe(true);
    expect(events.some((event) => event.type === 'pipeline:result')).toBe(false);
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
});
