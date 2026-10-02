import type { DesktopBridge } from '../../shared/bridge.js';
import { requireButton, requireElement } from '../lib/dom.js';

export function bindDependencyNotice(bridge: DesktopBridge): void {
  bridge.onDepsMissing((missing) => {
    requireElement('deps-banner').classList.remove('hidden');
    const captureUnavailable = missing.includes('screencapture');
    requireElement('deps-title').textContent = captureUnavailable
      ? 'screencapture not found'
      : 'ffmpeg not found — video export will fail';
    requireElement('deps-body').textContent = captureUnavailable
      ? 'This app requires macOS'
      : 'Install with: brew install ffmpeg';
    requireButton('btn-start').disabled = captureUnavailable;
  });
}
