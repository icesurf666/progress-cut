import type { DesktopBridge } from '../../shared/bridge.js';
import { createStoryExport } from '../components/storyExport.js';
import { createElement, requireElement } from '../lib/dom.js';
import { formatDuration } from '../lib/format.js';
import type { SessionState } from '../state/sessionState.js';

export function createResultsController(
  state: SessionState,
  bridge: DesktopBridge,
  preview: (gif: string, output: string) => void,
  failureDetails: () => Node,
) {
  return {
    render(): void {
      const summary = requireElement('done-summary');
      summary.textContent = state.exports.size
        ? `${formatDuration(state.recordingDurationMs)} of work. ${state.selectedMoments.toLocaleString()} selected moments. Your story is ready.`
        : 'No stories were exported. Check the pipeline details and try a new session.';
      const statistics = requireElement('session-stats');
      statistics.replaceChildren();
      const items = [
        [formatDuration(state.recordingDurationMs), 'session duration'],
        [state.observations.toLocaleString(), 'observations'],
        [state.meaningfulChanges.toLocaleString(), 'meaningful changes'],
        [state.selectedMoments.toLocaleString(), 'story moments'],
      ];
      for (const [value, label] of items) {
        const statistic = createElement('div', 'stat');
        statistic.append(
          createElement('div', 'stat-val', value),
          createElement('div', 'stat-key', label),
        );
        statistics.append(statistic);
      }
      const exports = requireElement('result-list');
      exports.replaceChildren();
      if (!state.exports.size) exports.append(failureDetails());
      for (const result of state.exports.values())
        exports.append(createStoryExport(result, bridge, preview));
    },
  };
}
