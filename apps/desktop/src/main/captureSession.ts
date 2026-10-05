import type { EmitSessionEvent, RerenderOptions, SessionOptions } from '../shared/session.js';
import { captureFrames, createCaptureDestination } from './capture/captureFrames.js';
import { runPipeline } from './pipeline/runPipeline.js';
import {
  beginSessionManifest,
  clearSessionManifest,
  markSessionProcessing,
  preserveSessionForRecovery,
} from './sessionManifest.js';

export interface CaptureHandle {
  cancel(): void;
  forceCapture(): void;
}

export function startSession(options: SessionOptions, emit: EmitSessionEvent): CaptureHandle {
  let stopped = false;
  let snapshotRequested = false;
  let manifestCreated = false;
  const control = {
    isStopped: () => stopped,
    consumeSnapshotRequest: (): boolean => {
      const requested = snapshotRequested;
      snapshotRequested = false;
      return requested;
    },
  };
  const destination = createCaptureDestination(options);
  void beginSessionManifest(destination, options)
    .then(() => {
      manifestCreated = true;
      return captureFrames(options, emit, control, destination);
    })
    .then(async (capture) => {
      await markSessionProcessing(destination.outputDir, capture.recordingDurationMs);
      await runPipeline({ ...options, ...capture }, emit, () =>
        clearSessionManifest(destination.outputDir),
      );
    })
    .catch(async (error: unknown) => {
      let message = String(error);
      try {
        if (manifestCreated) await preserveSessionForRecovery(destination.outputDir);
      } catch (recoveryError: unknown) {
        message += ` Recovery metadata could not be saved: ${String(recoveryError)}`;
      }
      emit({ type: 'session:error', message });
    });
  return {
    cancel: () => {
      stopped = true;
    },
    forceCapture: () => {
      snapshotRequested = true;
    },
  };
}

export function rerenderSession(
  options: RerenderOptions,
  emit: EmitSessionEvent,
  onSuccess?: () => Promise<void>,
): void {
  void runPipeline(options, emit, onSuccess).catch((error: unknown) =>
    emit({ type: 'session:error', message: String(error) }),
  );
}
