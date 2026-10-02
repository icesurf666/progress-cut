import type { DesktopBridge } from '../../shared/bridge.js';
import type { PipelineResult } from '../../shared/session.js';
import { createElement, fileName, fileUrl } from '../lib/dom.js';
import { showToast } from './toast.js';

export function createStoryExport(
  result: PipelineResult,
  bridge: DesktopBridge,
  preview: (gif: string, output: string) => void,
): HTMLElement {
  const item = createElement('div', 'result-item');
  const header = createElement('div', 'ri-header');
  const openButton = createElement('button', 'ri-play', 'Open ↗');
  openButton.addEventListener('click', () => bridge.openFile(result.outputPath));
  header.append(
    createElement('span', 'ri-dot'),
    createElement('span', 'ri-name', fileName(result.outputPath)),
    openButton,
  );
  if (result.gifPath) {
    const gifButton = createElement('button', 'ri-tag ri-tag-gif', 'GIF');
    gifButton.addEventListener('click', () => bridge.openFile(result.gifPath));
    header.append(gifButton);
  }
  const copyButton = createElement('button', 'ri-tag ri-tag-copy', 'copy');
  copyButton.addEventListener('click', async () => {
    try {
      if (result.gifPath) await bridge.copyImage(result.gifPath);
      else bridge.copyText(result.outputPath);
      copyButton.textContent = 'copied ✓';
      setTimeout(() => { copyButton.textContent = 'copy'; }, 1500);
    } catch (error: unknown) {
      showToast(String(error));
    }
  });
  header.append(copyButton);
  item.append(header);
  if (result.thumbnails.length) {
    const strip = createElement('button', 'ri-strip');
    strip.type = 'button';
    strip.setAttribute('aria-label', `Preview ${fileName(result.outputPath)}`);
    strip.addEventListener('click', () => preview(result.gifPath, result.outputPath));
    result.thumbnails.forEach((path, index) => {
      const image = createElement('img', 'ri-thumb');
      image.alt = `Selected moment ${index + 1}`;
      image.src = fileUrl(path);
      image.loading = 'lazy';
      strip.append(image);
    });
    strip.append(createElement('div', 'ri-strip-hint', '▶ Preview'));
    item.append(strip);
  }
  return item;
}
