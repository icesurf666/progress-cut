import { createProxy, type Proxy } from '../../src/proxy/createProxy.js';
import { createImageFixtures } from '../helpers/imageFixtures.js';

const images = createImageFixtures('novelty');
const PROXY_SIZE = 64;

export const createUniformProxy = async (name: string, value: number): Promise<Proxy> =>
  createProxy(await images.uniform(name, PROXY_SIZE, PROXY_SIZE, value));
export const createGradientProxy = async (name: string): Promise<Proxy> =>
  createProxy(await images.gradient(name, PROXY_SIZE, PROXY_SIZE));
export const createReversedGradientProxy = async (name: string): Promise<Proxy> =>
  createProxy(await images.gradient(name, PROXY_SIZE, PROXY_SIZE, 'horizontal', true));

export async function createPatchProxy(
  base: Proxy,
  name: string,
  patchValue: number,
): Promise<Proxy> {
  const pixels = new Uint8Array(base.pixels);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) pixels[row * PROXY_SIZE + column] = patchValue;
  }
  return createProxy(await images.grayscalePixels(name, pixels, PROXY_SIZE, PROXY_SIZE));
}
