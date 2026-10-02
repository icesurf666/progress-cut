import type { OutputFormat } from '../../shared/session.js';
import { requireElement } from '../lib/dom.js';

export function bindFormatToggle(id: string): () => OutputFormat {
  const group = requireElement(id);
  let selected: OutputFormat = 'both';
  group.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    const option = event.target.closest<HTMLElement>('[data-fmt]');
    const format = option?.dataset['fmt'];
    if (!option || (format !== 'both' && format !== 'mp4' && format !== 'gif')) return;
    selected = format;
    group.querySelectorAll('[data-fmt]').forEach((button) => {
      const active = button === option;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  });
  return () => selected;
}
