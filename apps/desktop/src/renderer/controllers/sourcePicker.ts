import type { DesktopBridge } from '../../shared/bridge.js';
import { createElement, requireElement } from '../lib/dom.js';
import { showToast } from '../components/toast.js';

export function createSourcePicker(bridge: DesktopBridge) {
  const dialog = requireElement('window-picker');
  const grid = requireElement('wp-grid');
  const picker = requireElement('btn-pick-source');
  let windowId = '';
  let requestVersion = 0;
  const close = (): void => {
    dialog.classList.add('hidden');
    picker.focus();
  };
  const select = (id: string, name: string): void => {
    windowId = id;
    requireElement('source-name').textContent = name;
    requireElement('source-type-label').textContent = id ? 'WINDOW' : 'FULL SCREEN';
    picker.classList.toggle('has-window', Boolean(id));
    requireElement('wp-fullscreen').classList.toggle('wp-source--active', !id);
    close();
  };
  requireElement('wp-close').addEventListener('click', close);
  dialog.querySelector('.wp-backdrop')?.addEventListener('click', close);
  requireElement('wp-fullscreen').addEventListener('click', () => select('', 'Full screen'));
  picker.addEventListener('click', () => {
    const version = ++requestVersion;
    dialog.classList.remove('hidden');
    requireElement('wp-close').focus();
    grid.replaceChildren(createElement('p', 'history-empty', 'Loading windows…'));
    bridge
      .listWindows()
      .then((sources) => {
        if (version !== requestVersion) return;
        grid.replaceChildren();
        if (!sources.length) grid.append(createElement('p', 'history-empty', 'No windows found.'));
        for (const source of sources) {
          const button = createElement('button', 'wp-source');
          button.classList.toggle('wp-source--active', source.windowId === windowId);
          button.type = 'button';
          const thumbnail = createElement('div', 'wp-thumb');
          const image = createElement('img', '');
          image.src = source.thumbnail;
          image.alt = source.name;
          thumbnail.append(image);
          const name = createElement('span', 'wp-name', source.name);
          name.title = source.name;
          button.append(thumbnail, name);
          button.addEventListener('click', () => select(source.windowId, source.name));
          grid.append(button);
        }
      })
      .catch((error: unknown) => {
        grid.replaceChildren(createElement('p', 'history-empty', 'Unable to load windows.'));
        showToast(String(error));
      });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog.classList.contains('hidden')) close();
  });
  return { windowId: () => windowId };
}
