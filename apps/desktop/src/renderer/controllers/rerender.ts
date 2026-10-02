import type { DesktopBridge } from '../../shared/bridge.js';
import { bindRangeSetting } from '../components/rangeSetting.js';
import { bindFormatToggle } from '../components/formatToggle.js';
import { requireButton } from '../lib/dom.js';
import { formatStoryLength } from '../lib/format.js';
import type { SessionState } from '../state/sessionState.js';

export function createRerenderController(
  state: SessionState,
  bridge: DesktopBridge,
  begin: () => void,
) {
  const duration = bindRangeSetting('slider-rerender', 'val-rerender', formatStoryLength);
  const format = bindFormatToggle('fmt-rerender');
  const button = requireButton('btn-rerender');
  const reset = (): void => {
    button.disabled = false;
    button.innerHTML = 'Re-render <span>↻</span>';
  };
  button.addEventListener('click', () => {
    if (!state.framesDirectory || !state.outputDirectory || state.phase !== 'done') return;
    button.disabled = true;
    button.textContent = 'Generating…';
    begin();
    bridge.rerenderSession({
      framesDir: state.framesDirectory,
      outputDir: state.outputDirectory,
      targetMs: duration.value() * 1000,
      outputFormat: format(),
      recordingDurationMs: state.recordingDurationMs,
    });
  });
  return { reset, setDuration: duration.setValue };
}
