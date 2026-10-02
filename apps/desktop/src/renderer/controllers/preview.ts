import type { DesktopBridge } from '../../shared/bridge.js';
import { fileName, fileUrl, requireElement } from '../lib/dom.js';
import { showToast } from '../components/toast.js';

export function createPreviewController(bridge: DesktopBridge) {
  const dialog = requireElement('preview-lightbox');
  const image = requireElement('preview-img');
  const video = requireElement('preview-vid');
  if (!(image instanceof HTMLImageElement) || !(video instanceof HTMLVideoElement)) {
    throw new Error('Invalid preview media elements');
  }
  const copyButton = requireElement('preview-copy');
  let gifPath = '';
  let outputPath = '';
  let returnFocus: HTMLElement | null = null;
  const close = (): void => {
    dialog.classList.add('hidden');
    video.pause();
    video.removeAttribute('src');
    image.removeAttribute('src');
    returnFocus?.focus();
  };
  requireElement('preview-close').addEventListener('click', close);
  dialog.querySelector('.preview-backdrop')?.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog.classList.contains('hidden')) close();
  });
  requireElement('preview-open').addEventListener('click', () => {
    if (gifPath || outputPath) bridge.openFile(gifPath || outputPath);
  });
  copyButton.addEventListener('click', () => {
    if (!gifPath) return;
    bridge
      .copyImage(gifPath)
      .then(() => {
        copyButton.textContent = 'Copied ✓';
        setTimeout(() => {
          copyButton.textContent = 'Copy GIF';
        }, 1800);
      })
      .catch((error: unknown) => showToast(String(error)));
  });
  return {
    open(gif: string, output: string): void {
      gifPath = gif;
      outputPath = output;
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      image.classList.toggle('hidden', !gif);
      video.classList.toggle('hidden', Boolean(gif));
      video.pause();
      if (gif) image.src = fileUrl(gif);
      else {
        video.src = fileUrl(output);
        void video.play().catch(() => undefined);
      }
      requireElement('preview-label').textContent = fileName(gif || output);
      copyButton.textContent = 'Copy GIF';
      copyButton.classList.toggle('hidden', !gif);
      dialog.classList.remove('hidden');
      requireElement('preview-close').focus();
    },
  };
}
