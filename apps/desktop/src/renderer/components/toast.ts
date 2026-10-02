import { createElement, requireElement } from '../lib/dom.js';

export function showToast(
  message: string,
  type: 'error' | 'info' = 'error',
  durationMs = 5000,
): void {
  const toast = createElement('div', `toast toast--${type}`);
  const icon = createElement('span', 'toast-icon', type === 'error' ? '⚠' : 'ℹ');
  const body = createElement('span', 'toast-body', message);
  const dismiss = createElement('button', 'toast-dismiss', '✕');
  dismiss.setAttribute('aria-label', 'Dismiss notification');
  const remove = (): void => {
    toast.classList.add('toast--leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 250);
  };
  dismiss.addEventListener('click', remove);
  toast.append(icon, body, dismiss);
  requireElement('toast-container').append(toast);
  setTimeout(remove, durationMs);
}
