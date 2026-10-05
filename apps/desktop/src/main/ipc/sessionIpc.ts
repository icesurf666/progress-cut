import { ipcMain, Notification, type BrowserWindow, type Tray } from 'electron';
import type { RerenderOptions, SessionOptions } from '../../shared/session.js';
import { SessionCoordinator } from '../sessionCoordinator.js';
import { clearSessionManifest, type RecoverableSession } from '../sessionManifest.js';

export interface DesktopSessionController {
  readonly sessions: SessionCoordinator;
  recover(options: RecoverableSession): void;
}

export function registerSessionIpc(window: BrowserWindow, tray: Tray): DesktopSessionController {
  const sessions = new SessionCoordinator((event) => {
    if (event.type === 'capture:frame') tray.setToolTip(`ProgressCut — ${event.count} frames`);
    if (event.type === 'pipeline:result') {
      const megabytes = (event.fileSizeBytes / 1024 / 1024).toFixed(1);
      new Notification({
        title: 'ProgressCut — ready',
        body: `${event.name} · ${megabytes} MB`,
      }).show();
    }
    if (event.type === 'session:done') {
      tray.setToolTip('ProgressCut — done');
    }
    if (event.type === 'session:error') tray.setToolTip('ProgressCut');
    window.webContents.send('session:event', event);
  });
  ipcMain.on('session:start', (_event, options: SessionOptions) => {
    if (sessions.isBusy) return;
    tray.setToolTip('ProgressCut — recording…');
    sessions.start(options);
  });
  ipcMain.on('session:stop', () => {
    if (!sessions.isRecording) return;
    sessions.stop();
    tray.setToolTip('ProgressCut — generating…');
  });
  ipcMain.on('session:rerender', (_event, options: RerenderOptions) => {
    if (sessions.isBusy) return;
    tray.setToolTip('ProgressCut — generating…');
    sessions.rerender(options);
  });
  return {
    sessions,
    recover(options): void {
      if (sessions.isBusy) return;
      tray.setToolTip('ProgressCut — recovering…');
      sessions.rerender(options, () => clearSessionManifest(options.outputDir));
    },
  };
}
