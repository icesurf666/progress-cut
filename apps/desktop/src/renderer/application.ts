import type { DesktopBridge } from '../shared/bridge.js';
import { mountApplication } from './views/mountApplication.js';
import { SessionState } from './state/sessionState.js';
import { createSettingsController } from './controllers/settings.js';
import { createSourcePicker } from './controllers/sourcePicker.js';
import { createRecordingController } from './controllers/recording.js';
import { createPipelineController } from './controllers/pipeline.js';
import { createPreviewController } from './controllers/preview.js';
import { createResultsController } from './controllers/results.js';
import { createHistoryController } from './controllers/history.js';
import { createSessionView } from './controllers/sessionView.js';
import { createRerenderController } from './controllers/rerender.js';
import { bindSessionEvents } from './controllers/sessionEvents.js';
import { bindDependencyNotice } from './controllers/dependencies.js';
import { bindUpdateNotice } from './controllers/updater.js';
import { requireButton, requireElement } from './lib/dom.js';

export function initializeApplication(bridge: DesktopBridge): void {
  mountApplication();
  const state = new SessionState();
  const view = createSessionView(state);
  const settings = createSettingsController(bridge);
  const source = createSourcePicker(bridge);
  const recording = createRecordingController(settings.intervalMs);
  const pipeline = createPipelineController();
  const preview = createPreviewController(bridge);
  const rerender = createRerenderController(state, bridge, () => {
    state.clearExports();
    pipeline.reset();
    view.show('processing');
  });
  const results = createResultsController(
    state,
    bridge,
    preview.open,
    pipeline.failureDetails,
    rerender.applyReview,
  );
  const history = createHistoryController(state, bridge, (entry) => {
    state.loadHistory(entry);
    rerender.reset();
    rerender.setDuration(settings.targetSeconds());
    results.render();
    view.show('done');
  });
  const start = (): void => {
    if (state.phase !== 'idle' || requireButton('btn-start').disabled) return;
    state.beginCapture();
    pipeline.reset();
    requireElement('result-list').replaceChildren();
    requireElement('session-stats').replaceChildren();
    rerender.setDuration(settings.targetSeconds());
    view.show('recording');
    recording.start();
    const windowId = source.windowId();
    bridge.startSession({ ...settings.options(), ...(windowId ? { windowId } : {}) });
  };
  const stop = (): void => {
    if (state.phase !== 'recording') return;
    recording.stop();
    view.show('processing');
    bridge.stopSession();
  };
  requireElement('btn-start').addEventListener('click', start);
  requireElement('btn-stop').addEventListener('click', stop);
  requireElement('btn-open').addEventListener('click', () => {
    if (state.outputDirectory) bridge.openFolder(state.outputDirectory);
  });
  requireElement('btn-again').addEventListener('click', () => view.show('idle'));
  requireElement('nav-home').addEventListener('click', () => {
    if (state.phase === 'done') view.show('idle');
  });
  bridge.onShortcut((action) => {
    if (action === 'start' && !requireElement('btn-start').hasAttribute('disabled')) start();
    else if (action === 'stop') stop();
    else if (action === 'snap' && state.phase === 'recording') recording.acknowledgeSnapshot();
  });
  bindDependencyNotice(bridge);
  bindUpdateNotice(bridge);
  bindSessionEvents(bridge, { state, view, recording, pipeline, results, history, rerender });
  view.show('idle');
  void history.refresh();
}
