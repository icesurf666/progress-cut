import type { PipelineResult } from '../../shared/session.js';
import { HISTORY_VERSION, type HistoryEntry } from '../../shared/history.js';

export type SessionPhase = 'idle' | 'recording' | 'processing' | 'done';

export class SessionState {
  phase: SessionPhase = 'idle';
  outputDirectory = '';
  framesDirectory = '';
  activeHistoryId = '';
  observations = 0;
  meaningfulChanges = 0;
  selectedMoments = 0;
  recordingDurationMs = 0;
  readonly exports = new Map<string, PipelineResult>();

  beginCapture(): void {
    this.clearExports();
    this.outputDirectory = this.framesDirectory = '';
    this.observations = 0;
    this.meaningfulChanges = 0;
    this.selectedMoments = 0;
    this.recordingDurationMs = 0;
    this.activeHistoryId = '';
  }

  clearExports(): void {
    this.exports.clear();
  }

  acceptResult(result: PipelineResult): void {
    this.exports.set(result.name, result);
    this.meaningfulChanges = result.meaningfulChanges;
    this.selectedMoments = result.selectedMoments;
  }

  loadHistory(entry: HistoryEntry): void {
    this.outputDirectory = entry.outputDir;
    this.framesDirectory = entry.framesDir;
    this.recordingDurationMs = entry.recordingDurationMs;
    this.observations = entry.observations;
    this.meaningfulChanges = entry.meaningfulChanges;
    this.selectedMoments = entry.selectedMoments;
    this.activeHistoryId = entry.id;
    this.clearExports();
    const outputPath = entry.mp4Path || entry.gifPath;
    if (outputPath)
      this.acceptResult({
        name: 'progresscut',
        outputPath,
        gifPath: entry.gifPath,
        thumbnails: entry.thumbnails,
        meaningfulChanges: entry.meaningfulChanges,
        selectedMoments: entry.selectedMoments,
        fileSizeBytes: 0,
        processingMs: 0,
      });
  }

  toHistoryEntry(): HistoryEntry {
    const result = this.exports.get('progresscut');
    return {
      version: HISTORY_VERSION,
      id: this.activeHistoryId || this.outputDirectory.split('/').pop() || this.outputDirectory,
      createdAt: Date.now(),
      outputDir: this.outputDirectory,
      framesDir: this.framesDirectory,
      recordingDurationMs: this.recordingDurationMs,
      observations: this.observations,
      meaningfulChanges: this.meaningfulChanges,
      selectedMoments: this.selectedMoments,
      thumbnails: result?.thumbnails ?? [],
      mp4Path: result?.outputPath.endsWith('.mp4') ? result.outputPath : '',
      gifPath: result?.gifPath ?? '',
    };
  }
}
