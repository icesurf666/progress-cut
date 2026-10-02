import { createElement, requireElement } from '../lib/dom.js';

type PipelineRow = { status: HTMLElement; log: HTMLElement };

export function createPipelineController() {
  const container = requireElement('pipeline-list');
  const rows = new Map<string, PipelineRow>();
  return {
    reset(): void {
      rows.clear();
      container.replaceChildren();
      requireElement('proc-status').textContent = 'Analysing frames…';
    },
    start(name: string): void {
      const item = createElement('div', 'pipeline-item');
      const left = createElement('div', 'pi-left');
      const log = createElement('div', 'pi-log', '—');
      const status = createElement('div', 'pi-status running', 'running');
      left.append(createElement('div', 'pi-name', name), log);
      item.append(left, status);
      container.append(item);
      rows.set(name, { log, status });
    },
    log(name: string, message: string): void {
      const row = rows.get(name);
      if (row) row.log.textContent = message;
      requireElement('proc-status').textContent = message;
    },
    setStatus(name: string, message: string, status: 'done' | 'error'): void {
      const row = rows.get(name);
      if (!row) return;
      row.status.textContent = message;
      row.status.className = `pi-status ${status}`;
    },
    failureDetails(): Node {
      const details = container.cloneNode(true);
      if (details instanceof HTMLElement) details.removeAttribute('id');
      return details;
    },
  };
}
