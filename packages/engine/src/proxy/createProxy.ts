import sharp from 'sharp';

export const DEFAULT_PROXY_WIDTH = 64;
export const DEFAULT_PROXY_HEIGHT = 64;

export interface ProxyOptions {
  readonly width?: number;
  readonly height?: number;
}

export interface Proxy {
  readonly width: number;
  readonly height: number;
  /** Grayscale pixels, row-major, uint8 (0–255). Length = width × height. */
  readonly pixels: Uint8Array;
}

export async function createProxy(
  input: string | Buffer,
  options: ProxyOptions = {},
): Promise<Proxy> {
  const width = options.width ?? DEFAULT_PROXY_WIDTH;
  const height = options.height ?? DEFAULT_PROXY_HEIGHT;

  const { data, info } = await sharp(input)
    .rotate() // honour EXIF orientation before anything else
    .resize(width, height, { fit: 'fill' }) // exact target dimensions, stretches if needed
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    width: info.width,
    height: info.height,
    pixels: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
}
