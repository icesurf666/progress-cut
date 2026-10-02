import type { DesktopBridge } from '../../shared/bridge.js';
import type { SessionState } from '../state/sessionState.js';
import type { createSessionView } from './sessionView.js';
import type { createRecordingController } from './recording.js';
import type { createPipelineController } from './pipeline.js';
import type { createResultsController } from './results.js';
import type { createHistoryController } from './history.js';
import type { createRerenderController } from './rerender.js';
import { showToast } from '../components/toast.js';

interface SessionControllers {
  state: SessionState;
  view: ReturnType<typeof createSessionView>;
  recording: ReturnType<typeof createRecordingController>;
  pipeline: ReturnType<typeof createPipelineController>;
  results: ReturnType<typeof createResultsController>;
  history: ReturnType<typeof createHistoryController>;
  rerender: ReturnType<typeof createRerenderController>;
}

export function bindSessionEvents(bridge: DesktopBridge, controllers: SessionControllers): void {
  const { state, view, recording, pipeline, results, history, rerender } = controllers;
  bridge.onEvent((event) => {
    switch (event.type) {
      case 'capture:frame':
        recording.update(event);
        break;
      case 'pipeline:start':
        recording.stop();
        view.show('processing');
        pipeline.start(event.name);
        break;
      case 'pipeline:log':
        pipeline.log(event.name, event.message);
        break;
      case 'pipeline:result':
        pipeline.setStatus(
          event.name,
          `${(event.fileSizeBytes / 1024 / 1024).toFixed(1)} MB · ${(event.processingMs / 1000).toFixed(1)}s`,
          'done',
        );
        state.acceptResult(event);
        break;
      case 'pipeline:error':
        pipeline.setStatus(event.name, event.message.slice(0, 50), 'error');
        showToast(`Pipeline error: ${event.message}`);
        break;
      case 'session:done':
        recording.stop();
        state.outputDirectory = event.outputDir;
        state.framesDirectory = `${event.outputDir}/frames`;
        state.observations = event.totalObservations;
        state.recordingDurationMs = event.recordingDurationMs;
        results.render();
        rerender.reset();
        view.show('done');
        void history.save();
        break;
      case 'session:error':
        recording.stop();
        rerender.reset();
        view.show('idle');
        showToast(event.message);
        break;
    }
  });
}
