import type { DesktopBridge } from '../../shared/bridge.js';
import type { HistoryEntry } from '../../shared/history.js';
import { createElement, requireElement } from '../lib/dom.js';
import { formatDuration, formatRelativeDate } from '../lib/format.js';
import { showToast } from '../components/toast.js';
import type { SessionState } from '../state/sessionState.js';

export function createHistoryController(
  state: SessionState,
  bridge: DesktopBridge,
  select: (entry: HistoryEntry) => void,
) {
  const list = requireElement('history-list');
  let refreshVersion = 0;
  const refresh = async (): Promise<void> => {
    const version = ++refreshVersion;
    try {
      const entries = await bridge.listHistory();
      if (version !== refreshVersion) return;
      list.replaceChildren();
      if (!entries.length) list.append(createElement('p', 'history-empty', 'No sessions yet.'));
      for (const entry of entries) {
        const button = createElement('button', 'history-item');
        button.type = 'button';
        button.classList.toggle('history-item--active', entry.id === state.activeHistoryId);
        button.append(
          createElement('span', 'hi-date', formatRelativeDate(entry.createdAt)),
          createElement(
            'span',
            'hi-meta',
            `${formatDuration(entry.recordingDurationMs)} · ${entry.selectedMoments} moments`,
          ),
        );
        button.addEventListener('click', () => {
          if (state.phase === 'recording' || state.phase === 'processing') return;
          select(entry);
          void refresh();
        });
        list.append(button);
      }
      if (entries.length) {
        const clear = createElement('button', 'history-clear', 'Clear history');
        clear.addEventListener('click', async () => {
          try {
            await bridge.clearHistory();
            state.activeHistoryId = '';
            await refresh();
          } catch (error: unknown) {
            showToast(String(error));
          }
        });
        list.append(clear);
      }
    } catch (error) {
      showToast(`Could not load history: ${String(error)}`);
    }
  };
  return {
    refresh,
    async save(): Promise<void> {
      if (!state.exports.size) return;
      const entry = state.toHistoryEntry();
      state.activeHistoryId = entry.id;
      try {
        await bridge.saveHistory(entry);
        await refresh();
      } catch (error) {
        showToast(`Could not save history: ${String(error)}`);
      }
    },
  };
}
