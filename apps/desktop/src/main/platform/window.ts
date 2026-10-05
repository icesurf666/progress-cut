import { BrowserWindow, app } from 'electron';
import { join } from 'node:path';

export function createWindow(bundleDirectory: string): BrowserWindow {
  const window = new BrowserWindow({
    icon: join(app.getAppPath(), 'build/icon.png'),
    width: 980,
    minWidth: 760,
    height: 820,
    minHeight: 720,
    resizable: true,
    title: 'ProgressCut',
    backgroundColor: '#09090B',
    show: false,
    webPreferences: {
      preload: join(bundleDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void window.loadFile(join(bundleDirectory, '../src/renderer/index.html'));
  window.once('ready-to-show', () => window.show());
  window.on('close', (event) => {
    event.preventDefault();
    window.hide();
  });
  return window;
}
