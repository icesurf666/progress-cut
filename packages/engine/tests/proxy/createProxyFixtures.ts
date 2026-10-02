import { createImageFixtures } from '../helpers/imageFixtures.js';

const images = createImageFixtures('proxy');
export const createColorImage = (
  name: string,
  width: number,
  height: number,
  red = 128,
  green = 64,
  blue = 32,
) => images.uniform(name, width, height, { r: red, g: green, b: blue });
export const createGradientImage = images.gradient;
