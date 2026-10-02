import shell from './shell.html';
import setup from './setup.html';
import recording from './recording.html';
import processing from './processing.html';
import results from './results.html';
import sourceDialog from './source-dialog.html';
import previewDialog from './preview-dialog.html';
import { requireElement } from '../lib/dom.js';

export function mountApplication(): void {
  // Only bundled, static templates enter innerHTML. Runtime values use textContent.
  requireElement('root').innerHTML = shell;
  const main = document.querySelector('main');
  if (!main) throw new Error('Missing application content slot');
  main.innerHTML = [setup, recording, processing, results].join('');
  requireElement('root').insertAdjacentHTML('beforeend', sourceDialog + previewDialog);
  const notifications = document.createElement('div');
  notifications.id = 'toast-container';
  notifications.className = 'toast-container';
  notifications.setAttribute('aria-live', 'assertive');
  notifications.setAttribute('aria-atomic', 'true');
  requireElement('root').append(notifications);
}
