import type { DesktopBridge } from '../shared/bridge.js';

declare global {
  interface Window {
    progresscut: DesktopBridge;
  }
}
