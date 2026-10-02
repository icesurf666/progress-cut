import { describe, expect, it } from 'vitest';
import { SessionState } from '../src/renderer/state/sessionState.js';
import { HISTORY_VERSION, type HistoryEntry } from '../src/shared/history.js';

const entry: HistoryEntry = {
  version: HISTORY_VERSION,
  id: 'test',
  createdAt: 1,
  outputDir: '/session',
  framesDir: '/session/frames',
  recordingDurationMs: 5000,
  observations: 10,
  meaningfulChanges: 4,
  selectedMoments: 2,
  thumbnails: ['/frame.png'],
  mp4Path: '',
  gifPath: '/session/story.gif',
};

describe('session state', () => {
  it('loads a GIF-only history entry as a usable export', () => {
    const state = new SessionState();
    state.loadHistory(entry);
    expect(state.exports.get('progresscut')?.outputPath).toBe(entry.gifPath);
    expect(state.toHistoryEntry()).toMatchObject({ mp4Path: '', gifPath: entry.gifPath });
  });

  it('starts a fresh capture without inheriting previous duration or history identity', () => {
    const state = new SessionState();
    state.loadHistory(entry);
    state.beginCapture();
    expect(state.exports.size).toBe(0);
    expect(state.activeHistoryId).toBe('');
    expect(state.recordingDurationMs).toBe(0);
    expect(state.selectedMoments).toBe(0);
  });
});
