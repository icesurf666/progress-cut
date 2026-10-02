import type { DesktopBridge } from '../../shared/bridge.js';
import { bindRangeSetting } from '../components/rangeSetting.js';
import { bindFormatToggle } from '../components/formatToggle.js';
import { requireElement } from '../lib/dom.js';
import { formatStoryLength } from '../lib/format.js';
import { showToast } from '../components/toast.js';

export function createSettingsController(bridge: DesktopBridge) {
  const interval = bindRangeSetting('slider-interval', 'val-interval', (value) => `${value}s`);
  const target = bindRangeSetting('slider-target', 'val-target', formatStoryLength);
  const format = bindFormatToggle('fmt-toggle');
  let outputDirectory = '';
  requireElement('btn-pick-folder').addEventListener('click', () => {
    bridge
      .pickFolder()
      .then((directory) => {
        if (directory === null) return;
        outputDirectory = directory;
        const parts = directory.replace(/\/$/, '').split('/');
        requireElement('output-label').textContent =
          parts.slice(-2, -1)[0]?.toUpperCase() ?? 'CUSTOM';
        requireElement('output-path').textContent = parts.at(-1) ?? directory;
      })
      .catch((error: unknown) => showToast(String(error)));
  });
  return {
    intervalMs: () => interval.value() * 1000,
    targetSeconds: target.value,
    options: () => ({
      intervalMs: interval.value() * 1000,
      targetMs: target.value() * 1000,
      outputFormat: format(),
      ...(outputDirectory ? { outputBaseDir: outputDirectory } : {}),
    }),
  };
}
