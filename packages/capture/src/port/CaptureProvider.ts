export interface CaptureConfig {
  readonly intervalMs: number;
  readonly outputDir: string;
  readonly windowId?: string; // CGWindowID — if set, captures only that window
}

export interface CapturedFrame {
  readonly timestampMs: number;
  readonly data: Buffer;
}

export interface CaptureProvider {
  start(config: CaptureConfig): Promise<void>;
  capture(): Promise<CapturedFrame>;
  stop(): Promise<void>;
}
