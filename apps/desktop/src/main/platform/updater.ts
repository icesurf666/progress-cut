import { app } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';
import type { BrowserWindow } from 'electron';

type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'ready' }
  | { type: 'error'; message: string };

function emit(window: BrowserWindow, event: UpdateEvent): void {
  if (!window.isDestroyed()) window.webContents.send('update:event', event);
}

export function initUpdater(window: BrowserWindow): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => emit(window, { type: 'checking' }));

  autoUpdater.on('update-available', (info: UpdateInfo) =>
    emit(window, { type: 'available', version: info.version }),
  );

  autoUpdater.on('update-not-available', () => emit(window, { type: 'not-available' }));

  autoUpdater.on('download-progress', ({ percent }: { percent: number }) =>
    emit(window, { type: 'downloading', percent: Math.round(percent) }),
  );

  autoUpdater.on('update-downloaded', () => emit(window, { type: 'ready' }));

  autoUpdater.on('error', (err: Error) =>
    emit(window, { type: 'error', message: err.message }),
  );

  void autoUpdater.checkForUpdates().catch(() => undefined);
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}
