import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { HISTORY_VERSION, type HistoryEntry } from '../shared/history.js';

const MAX_ENTRIES = 20;
const APP_DIR = join(homedir(), 'Library', 'Application Support', 'ProgressCut');
const HISTORY_FILE = join(APP_DIR, 'history.json');

// Coerces a raw JSON value into a valid HistoryEntry, filling missing fields
// with safe defaults. Returns null if the value is structurally unrecoverable.
// Add new fields here whenever HistoryEntry grows — old entries get the default.
function migrateEntry(raw: unknown): HistoryEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r['id'] !== 'string' || !r['id']) return null;
  if (typeof r['outputDir'] !== 'string' || !r['outputDir']) return null;
  return {
    version: HISTORY_VERSION,
    id: r['id'],
    createdAt: typeof r['createdAt'] === 'number' ? r['createdAt'] : Date.now(),
    outputDir: r['outputDir'],
    framesDir: typeof r['framesDir'] === 'string' ? r['framesDir'] : '',
    recordingDurationMs:
      typeof r['recordingDurationMs'] === 'number' ? r['recordingDurationMs'] : 0,
    observations: typeof r['observations'] === 'number' ? r['observations'] : 0,
    meaningfulChanges: typeof r['meaningfulChanges'] === 'number' ? r['meaningfulChanges'] : 0,
    selectedMoments: typeof r['selectedMoments'] === 'number' ? r['selectedMoments'] : 0,
    excludedFrameIds: Array.isArray(r['excludedFrameIds'])
      ? r['excludedFrameIds'].filter((id): id is string => typeof id === 'string')
      : [],
    thumbnails: Array.isArray(r['thumbnails'])
      ? r['thumbnails'].filter((t): t is string => typeof t === 'string')
      : [],
    mp4Path: typeof r['mp4Path'] === 'string' ? r['mp4Path'] : '',
    gifPath: typeof r['gifPath'] === 'string' ? r['gifPath'] : '',
  };
}

function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const entry = migrateEntry(item);
    return entry ? [entry] : [];
  });
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return parseHistory(JSON.parse(await readFile(HISTORY_FILE, 'utf8')));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function saveEntry(entry: HistoryEntry): Promise<void> {
  const all = await loadHistory();
  const deduped = all.filter((e) => e.outputDir !== entry.outputDir);
  await mkdir(APP_DIR, { recursive: true });
  await writeFile(HISTORY_FILE, JSON.stringify([entry, ...deduped].slice(0, MAX_ENTRIES), null, 2));
}

export async function clearHistory(): Promise<void> {
  await mkdir(APP_DIR, { recursive: true });
  await writeFile(HISTORY_FILE, '[]');
}
