import { requireElement } from '../lib/dom.js';
import type { SessionPhase, SessionState } from '../state/sessionState.js';

type PhaseLabel = { heading: string; status: string };

const PHASE_LABELS: Record<SessionPhase, PhaseLabel> = {
  idle:       { heading: 'New session',         status: '' },
  recording:  { heading: 'Live session',        status: 'Capture active' },
  processing: { heading: 'Processing',          status: 'Building your story' },
  done:       { heading: 'Your stories',        status: 'Export complete' },
};

const PHASES = Object.keys(PHASE_LABELS) as SessionPhase[];

export function createSessionView(state: SessionState) {
  return {
    show(phase: SessionPhase): void {
      state.phase = phase;
      requireElement('app').dataset['state'] = phase;
      const { heading, status } = PHASE_LABELS[phase];
      requireElement('view-label').textContent = heading;
      requireElement('app-status').textContent =
        phase === 'done' && !state.exports.size ? 'No exports' : status;
      for (const p of PHASES) {
        requireElement(`panel-${p}`).classList.toggle('hidden', p !== phase);
      }
    },
  };
}
