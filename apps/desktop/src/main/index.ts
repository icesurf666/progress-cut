import { app, globalShortcut, ipcMain } from 'electron';
import { createWindow } from './platform/window.js';
import { createTray } from './platform/tray.js';
import { findMissingDependencies } from './platform/dependencies.js';
import { registerShortcuts } from './platform/shortcuts.js';
import { initUpdater, installUpdate } from './platform/updater.js';
import { registerSessionIpc } from './ipc/sessionIpc.js';
import { registerWorkspaceIpc } from './ipc/workspaceIpc.js';

declare const __dirname: string;

void app.whenReady().then(async () => {
  const window = createWindow(__dirname);
  const tray = createTray(window, __dirname);
  const sessions = registerSessionIpc(window, tray);
  registerWorkspaceIpc(window);
  registerShortcuts(window, sessions);
  initUpdater(window);
  ipcMain.on('update:install', () => installUpdate());
  app.on('activate', () => {
    window.show();
    window.focus();
  });
  const missing = await findMissingDependencies();
  if (missing.length) {
    const notify = (): void => window.webContents.send('deps:missing', missing);
    if (window.webContents.isLoading()) window.webContents.once('did-finish-load', notify);
    else notify();
  }
});

app.on('will-quit', () => globalShortcut.unregisterAll());
// Closing the window hides it; the menu bar keeps the application available.
app.on('window-all-closed', () => undefined);
