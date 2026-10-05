import type { EmitSessionEvent, RerenderOptions, SessionOptions } from '../shared/session.js';
import { startSession, rerenderSession, type CaptureHandle } from './captureSession.js';

export class SessionCoordinator {
  private capture: CaptureHandle | null = null;
  private processing = false;

  constructor(private readonly emit: EmitSessionEvent) {}

  get isRecording(): boolean {
    return this.capture !== null;
  }
  get isBusy(): boolean {
    return this.isRecording || this.processing;
  }

  start(options: SessionOptions): void {
    if (this.isBusy) return;
    this.capture = startSession(options, this.forward);
  }

  stop(): void {
    if (!this.capture) return;
    this.capture.cancel();
    this.capture = null;
    this.processing = true;
  }

  snapshot(): void {
    this.capture?.forceCapture();
  }

  rerender(options: RerenderOptions, onSuccess?: () => Promise<void>): void {
    if (this.isBusy) return;
    this.processing = true;
    rerenderSession(options, this.forward, onSuccess);
  }

  private readonly forward: EmitSessionEvent = (event) => {
    if (event.type === 'pipeline:start') this.processing = true;
    if (event.type === 'session:done' || event.type === 'session:error') {
      this.capture = null;
      this.processing = false;
    }
    this.emit(event);
  };
}
