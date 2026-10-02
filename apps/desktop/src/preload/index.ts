import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge, CaptureSource, UpdateEvent } from '../shared/bridge.js';
import type { HistoryEntry } from '../shared/history.js';
import type { SessionEvent } from '../shared/session.js';

const bridge: DesktopBridge = {
  startSession: (options) => ipcRenderer.send('session:start', options),
  stopSession: () => ipcRenderer.send('session:stop'),
  rerenderSession: (options) => ipcRenderer.send('session:rerender', options),
  openFolder: (path) => ipcRenderer.send('folder:open', path),
  openFile: (path) => ipcRenderer.send('file:open', path),
  copyText: (text) => ipcRenderer.send('text:copy', text),
  saveHistory: (entry) => ipcRenderer.invoke('history:save', entry) as Promise<void>,
  listHistory: () => ipcRenderer.invoke('history:list') as Promise<HistoryEntry[]>,
  clearHistory: () => ipcRenderer.invoke('history:clear') as Promise<void>,
  copyImage: (path) => ipcRenderer.invoke('image:copy', path) as Promise<void>,
  pickFolder: () => ipcRenderer.invoke('folder:pick') as Promise<string | null>,
  listWindows: () => ipcRenderer.invoke('windows:list') as Promise<CaptureSource[]>,
  installUpdate: () => ipcRenderer.send('update:install'),
  onEvent: (callback) => {
    ipcRenderer.on('session:event', (_event, payload: SessionEvent) => callback(payload));
  },
  onShortcut: (callback) => {
    for (const action of ['start', 'stop', 'snap'] as const) {
      ipcRenderer.on(`shortcut:${action}`, () => callback(action));
    }
  },
  onDepsMissing: (callback) => {
    ipcRenderer.on('deps:missing', (_event, missing: string[]) => callback(missing));
  },
  onUpdateEvent: (callback) => {
    ipcRenderer.on('update:event', (_event, payload: UpdateEvent) => callback(payload));
  },
};

contextBridge.exposeInMainWorld('progresscut', bridge);
