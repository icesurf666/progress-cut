import sharp from 'sharp';
import type { CaptureConfig, CapturedFrame, CaptureProvider } from '@progresscut/capture';

export class MacosCaptureProvider implements CaptureProvider {
  private count = 0;

  async start(_config: CaptureConfig): Promise<void> {}

  async capture(): Promise<CapturedFrame> {
    this.count++;
    const data = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: { r: (this.count * 50) % 255, g: 40, b: 100 },
      },
    })
      .png()
      .toBuffer();
    return { timestampMs: Date.now(), data };
  }

  async stop(): Promise<void> {}
}
