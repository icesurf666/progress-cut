import { Buffer } from 'node:buffer';
import { BrowserWindow, ipcMain } from 'electron';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

export async function createHarness() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const screenshotDirectory = await mkdtemp(join(tmpdir(), 'progresscut-ui-'));
  const window = new BrowserWindow({
    width: 980,
    height: 820,
    show: false,
    webPreferences: {
      preload: join(root, 'dist/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const mediaPath = join(screenshotDirectory, 'story.gif');
  await writeFile(
    mediaPath,
    Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
  );
  const errors = [];
  const actions = { starts: [], rerenders: [], files: [], copies: [], history: [], folders: [] };
  window.webContents.on('console-message', (_event, level, message) => {
    if (level >= 3) errors.push(message);
  });
  ipcMain.on('session:start', (_event, options) => actions.starts.push(options));
  ipcMain.on('session:stop', () => undefined);
  ipcMain.on('session:rerender', (_event, options) => actions.rerenders.push(options));
  ipcMain.on('file:open', (_event, path) => actions.files.push(path));
  ipcMain.on('folder:open', (_event, path) => actions.folders.push(path));
  ipcMain.on('text:copy', (_event, path) => actions.copies.push(path));
  ipcMain.handle('image:copy', (_event, path) => actions.copies.push(path));
  ipcMain.handle('history:list', () => actions.history);
  ipcMain.handle('history:save', (_event, entry) => {
    actions.history = [entry, ...actions.history.filter((previous) => previous.id !== entry.id)];
  });
  ipcMain.handle('history:clear', () => {
    actions.history = [];
  });
  ipcMain.handle('folder:pick', () => '/tmp/custom-output');
  ipcMain.handle('windows:list', () => [
    {
      windowId: '42',
      name: 'Editor',
      thumbnail: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    },
  ]);
  const evaluate = (script) => window.webContents.executeJavaScript(script);
  const flush = () =>
    evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await window.loadFile(join(root, 'src/renderer/index.html'));
  return {
    window,
    mediaPath,
    actions,
    errors,
    screenshotDirectory,
    evaluate,
    flush,
    async emit(event) {
      window.webContents.send('session:event', event);
      await flush();
    },
    async screenshot(name) {
      await flush();
      const image = await window.webContents.capturePage();
      await writeFile(join(screenshotDirectory, `${name}.png`), image.toPNG());
    },
  };
}
