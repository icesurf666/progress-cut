import type { EmitSessionEvent, RerenderOptions, SessionOptions } from '../shared/session.js';
import { captureFrames } from './capture/captureFrames.js';
import { runPipeline } from './pipeline/runPipeline.js';

export interface CaptureHandle {
  cancel(): void;
  forceCapture(): void;
}

export function startSession(options: SessionOptions, emit: EmitSessionEvent): CaptureHandle {
  let stopped = false;
  let snapshotRequested = false;
  const control = {
    isStopped: () => stopped,
    consumeSnapshotRequest: (): boolean => {
      const requested = snapshotRequested;
      snapshotRequested = false;
      return requested;
    },
  };
  void captureFrames(options, emit, control)
    .then((capture) => runPipeline({ ...options, ...capture }, emit))
    .catch((error: unknown) => emit({ type: 'session:error', message: String(error) }));
  return {
    cancel: () => {
      stopped = true;
    },
    forceCapture: () => {
      snapshotRequested = true;
    },
  };
}

export function rerenderSession(options: RerenderOptions, emit: EmitSessionEvent): void {
  void runPipeline(options, emit).catch((error: unknown) =>
    emit({ type: 'session:error', message: String(error) }),
  );
}
