import type { DesktopBridge } from '../../shared/bridge.js';
import { requireButton, requireElement } from '../lib/dom.js';

export function bindDependencyNotice(bridge: DesktopBridge): void {
  bridge.onDepsMissing((missing) => {
    requireElement('deps-banner').classList.toggle('hidden', missing.length === 0);
    requireButton('btn-start').disabled = missing.length > 0;
    if (!missing.length) return;
    const captureUnavailable = missing.includes('screencapture');
    requireElement('deps-title').textContent = captureUnavailable
      ? 'screencapture not found'
      : 'FFmpeg required before recording';
    requireElement('deps-body').textContent = captureUnavailable
      ? 'This app requires macOS'
      : 'Install with: brew install ffmpeg';
  });
}
