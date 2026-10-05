import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmitSessionEvent } from '../src/shared/session.js';
import { SessionCoordinator } from '../src/main/sessionCoordinator.js';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  rerender: vi.fn(),
  cancel: vi.fn(),
  snapshot: vi.fn(),
}));
vi.mock('../src/main/captureSession.js', () => ({
  startSession: mocks.start,
  rerenderSession: mocks.rerender,
}));
let forward: EmitSessionEvent;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.start.mockImplementation((_options, emit: EmitSessionEvent) => {
    forward = emit;
    return { cancel: mocks.cancel, forceCapture: mocks.snapshot };
  });
  mocks.rerender.mockImplementation((_options, emit: EmitSessionEvent) => {
    forward = emit;
  });
});

const options = { intervalMs: 1000, targetMs: 60000 };

describe('session coordinator', () => {
  it('blocks new captures and re-renders until the active pipeline completes', () => {
    const sessions = new SessionCoordinator(vi.fn());
    sessions.start(options);
    sessions.start(options);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    sessions.stop();
    sessions.start(options);
    sessions.rerender({ framesDir: '/frames', outputDir: '/output', targetMs: 1000 });
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.rerender).not.toHaveBeenCalled();
    expect(sessions.isBusy).toBe(true);
    forward({
      type: 'session:done',
      outputDir: '/output',
      totalObservations: 1,
      recordingDurationMs: 1000,
    });
    sessions.start(options);
    expect(mocks.start).toHaveBeenCalledTimes(2);
  });

  it('releases capture ownership after an error and only snapshots live captures', () => {
    const sessions = new SessionCoordinator(vi.fn());
    sessions.start(options);
    sessions.snapshot();
    forward({ type: 'session:error', message: 'Permission denied' });
    expect(sessions.isBusy).toBe(false);
    sessions.snapshot();
    expect(mocks.snapshot).toHaveBeenCalledTimes(1);
    sessions.start(options);
    expect(mocks.start).toHaveBeenCalledTimes(2);
  });

  it('forwards recovery completion cleanup and keeps ownership until terminal events', () => {
    const sessions = new SessionCoordinator(vi.fn());
    const onSuccess = vi.fn();
    const recovery = { framesDir: '/frames', outputDir: '/output', targetMs: 1000 };
    sessions.rerender(recovery, onSuccess);
    expect(mocks.rerender).toHaveBeenCalledWith(recovery, expect.any(Function), onSuccess);
    expect(sessions.isBusy).toBe(true);
    forward({ type: 'session:error', message: 'render failed' });
    expect(sessions.isBusy).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
