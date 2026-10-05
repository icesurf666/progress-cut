export const HISTORY_VERSION = 2;

export interface HistoryEntry {
  version: number;
  id: string;
  createdAt: number;
  outputDir: string;
  framesDir: string;
  recordingDurationMs: number;
  observations: number;
  meaningfulChanges: number;
  selectedMoments: number;
  excludedFrameIds: string[];
  thumbnails: string[];
  mp4Path: string;
  gifPath: string;
}
