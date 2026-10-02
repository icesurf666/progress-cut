import type { HistoryEntry } from './history.js';
import type { RerenderOptions, SessionEvent, SessionOptions } from './session.js';

export interface CaptureSource {
  windowId: string;
  name: string;
  thumbnail: string;
}

export type ShortcutAction = 'start' | 'stop' | 'snap';

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'ready' }
  | { type: 'error'; message: string };

export interface DesktopBridge {
  startSession(options: SessionOptions): void;
  stopSession(): void;
  rerenderSession(options: RerenderOptions): void;
  openFolder(path: string): void;
  openFile(path: string): void;
  copyText(text: string): void;
  saveHistory(entry: HistoryEntry): Promise<void>;
  listHistory(): Promise<HistoryEntry[]>;
  clearHistory(): Promise<void>;
  copyImage(path: string): Promise<void>;
  pickFolder(): Promise<string | null>;
  listWindows(): Promise<CaptureSource[]>;
  installUpdate(): void;
  onEvent(callback: (event: SessionEvent) => void): void;
  onShortcut(callback: (action: ShortcutAction) => void): void;
  onDepsMissing(callback: (missing: string[]) => void): void;
  onUpdateEvent(callback: (event: UpdateEvent) => void): void;
}
