import { createElement } from '../lib/dom.js';

export class ActivityChart {
  private readonly samples: number[];
  private readonly columns: HTMLElement[];
  private head = 0;

  constructor(
    private readonly container: HTMLElement,
    capacity = 32,
  ) {
    this.samples = Array.from({ length: capacity }, () => 0);
    this.columns = this.samples.map(() => createElement('div', 'spark-col'));
    container.replaceChildren(...this.columns);
    this.reset();
  }

  reset(): void {
    this.samples.fill(0);
    this.head = 0;
    this.render();
  }

  append(value: number): void {
    this.samples[this.head] = value;
    this.head = (this.head + 1) % this.samples.length;
    this.render();
  }

  private render(): void {
    const maximum = Math.max(1, ...this.samples);
    const height = this.container.clientHeight - 8;
    this.columns.forEach((column, index) => {
      const sample = this.samples[(this.head + index) % this.samples.length] ?? 0;
      column.style.height = `${Math.max(2, Math.round((sample / maximum) * height))}px`;
      column.style.background = sample > 0 ? 'var(--violet)' : 'var(--violet-muted)';
    });
  }
}
