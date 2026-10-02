import {
  ipcMain,
  shell,
  clipboard,
  nativeImage,
  dialog,
  desktopCapturer,
  type BrowserWindow,
} from 'electron';
import type { HistoryEntry } from '../../shared/history.js';
import { clearHistory, loadHistory, saveEntry } from '../sessionHistory.js';

export function registerWorkspaceIpc(window: BrowserWindow): void {
  ipcMain.on('folder:open', (_event, path: string) => {
    void shell.openPath(path);
  });
  ipcMain.on('file:open', (_event, path: string) => {
    void shell.openPath(path);
  });
  ipcMain.on('text:copy', (_event, text: string) => clipboard.writeText(text));
  ipcMain.handle('history:list', () => loadHistory());
  ipcMain.handle('history:save', (_event, entry: HistoryEntry) => saveEntry(entry));
  ipcMain.handle('history:clear', () => clearHistory());
  ipcMain.handle('image:copy', (_event, path: string) =>
    clipboard.writeImage(nativeImage.createFromPath(path)),
  );
  ipcMain.handle('folder:pick', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Save here',
      title: 'Choose output folder',
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
  ipcMain.handle('windows:list', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 160, height: 100 },
      fetchWindowIcons: false,
    });
    return sources
      .filter((source) => source.name.trim() !== '')
      .map((source) => ({
        windowId: source.id.split(':')[1] ?? '',
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      }));
  });
}
