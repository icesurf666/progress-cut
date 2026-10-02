import { createImageFixtures } from '../helpers/imageFixtures.js';

const images = createImageFixtures('dedupe');
export const createUniformImage = images.uniform;
export const createHorizontalGradient = images.gradient;
export const createVerticalGradient = (name: string, width: number, height: number) =>
  images.gradient(name, width, height, 'vertical');
export const createReversedGradient = (name: string, width: number, height: number) =>
  images.gradient(name, width, height, 'horizontal', true);
export const createBrightnessVariant = images.brightness;
export const createCursorVariant = images.cursor;
