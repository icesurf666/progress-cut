import { globalShortcut, type BrowserWindow } from 'electron';
import type { SessionCoordinator } from '../sessionCoordinator.js';

export function registerShortcuts(window: BrowserWindow, sessions: SessionCoordinator): void {
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (sessions.isRecording) window.webContents.send('shortcut:stop');
    else if (!sessions.isBusy) {
      window.show();
      window.focus();
      window.webContents.send('shortcut:start');
    }
  });
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (!sessions.isRecording) return;
    sessions.snapshot();
    window.webContents.send('shortcut:snap');
  });
}
