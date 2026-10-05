import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  beginSessionManifest: vi.fn(),
  clearSessionManifest: vi.fn(),
  markSessionProcessing: vi.fn(),
  preserveSessionForRecovery: vi.fn(),
  captureFrames: vi.fn(),
  createCaptureDestination: vi.fn(),
  runPipeline: vi.fn(),
}));
vi.mock('../src/main/sessionManifest.js', () => mocks);
vi.mock('../src/main/capture/captureFrames.js', () => mocks);
vi.mock('../src/main/pipeline/runPipeline.js', () => mocks);

import { rerenderSession, startSession } from '../src/main/captureSession.js';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createCaptureDestination.mockReturnValue({ outputDir: '/session', framesDir: '/frames' });
  mocks.beginSessionManifest.mockResolvedValue(undefined);
});

it('emits the original error even when recovery persistence also fails', async () => {
  mocks.captureFrames.mockRejectedValue(new Error('capture denied'));
  mocks.preserveSessionForRecovery.mockRejectedValue(new Error('disk full'));
  const emit = vi.fn();
  startSession({ intervalMs: 5000, targetMs: 60000 }, emit);
  await vi.waitFor(() =>
    expect(emit).toHaveBeenCalledWith({
      type: 'session:error',
      message: 'Error: capture denied Recovery metadata could not be saved: Error: disk full',
    }),
  );
  expect(emit).toHaveBeenCalledTimes(1);
  expect(mocks.runPipeline).not.toHaveBeenCalled();
});

it('reports initialization failure without starting capture', async () => {
  mocks.beginSessionManifest.mockRejectedValue(new Error('cannot write manifest'));
  mocks.preserveSessionForRecovery.mockResolvedValue(undefined);
  const emit = vi.fn();
  startSession({ intervalMs: 5000, targetMs: 60000 }, emit);
  await vi.waitFor(() =>
    expect(emit).toHaveBeenCalledWith({
      type: 'session:error',
      message: 'Error: cannot write manifest',
    }),
  );
  expect(mocks.captureFrames).not.toHaveBeenCalled();
  expect(mocks.preserveSessionForRecovery).not.toHaveBeenCalled();
});

it('scopes capture updates and successful cleanup to its own session', async () => {
  mocks.captureFrames.mockResolvedValue({
    outputDir: '/session',
    framesDir: '/frames',
    recordingDurationMs: 1000,
  });
  mocks.runPipeline.mockImplementation(async (_options, _emit, onSuccess: () => Promise<void>) =>
    onSuccess(),
  );
  mocks.clearSessionManifest.mockResolvedValue(undefined);
  startSession({ intervalMs: 5000, targetMs: 60000 }, vi.fn());
  await vi.waitFor(() => expect(mocks.clearSessionManifest).toHaveBeenCalledWith('/session'));
  expect(mocks.markSessionProcessing).toHaveBeenCalledWith('/session', 1000);
  expect(mocks.preserveSessionForRecovery).not.toHaveBeenCalled();
});

it('passes recovery cleanup into the pipeline instead of clearing on result events', async () => {
  const onSuccess = vi.fn();
  mocks.runPipeline.mockRejectedValue(new Error('render failed'));
  const emit = vi.fn();
  const options = { outputDir: '/session', framesDir: '/frames', targetMs: 60000 };
  rerenderSession(options, emit, onSuccess);
  await vi.waitFor(() =>
    expect(emit).toHaveBeenCalledWith({ type: 'session:error', message: 'Error: render failed' }),
  );
  expect(mocks.runPipeline).toHaveBeenCalledWith(options, emit, onSuccess);
  expect(onSuccess).not.toHaveBeenCalled();
});
