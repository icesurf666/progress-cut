import type { DesktopBridge, UpdateEvent } from '../../shared/bridge.js';
import { requireButton, requireElement } from '../lib/dom.js';

export function bindUpdateNotice(bridge: DesktopBridge): void {
  const banner = requireElement('update-banner');
  const text = requireElement('update-text');
  const installBtn = requireButton('btn-install-update');

  const show = (message: string, showInstall: boolean): void => {
    banner.classList.remove('hidden');
    text.textContent = message;
    installBtn.classList.toggle('hidden', !showInstall);
  };

  const handle = (event: UpdateEvent): void => {
    if (event.type === 'available') show(`Update v${event.version} available — downloading…`, false);
    else if (event.type === 'downloading') show(`Downloading update… ${event.percent}%`, false);
    else if (event.type === 'ready') show('Update ready.', true);
  };

  installBtn.addEventListener('click', () => bridge.installUpdate());
  bridge.onUpdateEvent(handle);
}
