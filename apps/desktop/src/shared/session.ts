export type OutputFormat = 'both' | 'mp4' | 'gif';

export interface SessionOptions {
  intervalMs: number;
  targetMs: number;
  outputFormat?: OutputFormat;
  outputBaseDir?: string;
  windowId?: string;
}

export interface RerenderOptions {
  framesDir: string;
  outputDir: string;
  targetMs: number;
  outputFormat?: OutputFormat;
  recordingDurationMs?: number;
}

export interface PipelineResult {
  name: string;
  outputPath: string;
  gifPath: string;
  fileSizeBytes: number;
  processingMs: number;
  thumbnails: string[];
  meaningfulChanges: number;
  selectedMoments: number;
}

export type SessionEvent =
  | { type: 'capture:frame'; count: number; elapsedMs: number; intervalMs: number }
  | { type: 'pipeline:start'; name: string }
  | { type: 'pipeline:log'; name: string; message: string }
  | ({ type: 'pipeline:result' } & PipelineResult)
  | { type: 'pipeline:error'; name: string; message: string }
  | {
      type: 'session:done';
      outputDir: string;
      totalObservations: number;
      recordingDurationMs: number;
    }
  | { type: 'session:error'; message: string };

export type EmitSessionEvent = (event: SessionEvent) => void;
