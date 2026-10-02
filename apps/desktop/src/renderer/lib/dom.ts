export function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: ${id}`);
  return element;
}

export function requireInput(id: string): HTMLInputElement {
  const element = requireElement(id);
  if (!(element instanceof HTMLInputElement)) throw new Error(`Expected input: ${id}`);
  return element;
}

export function requireButton(id: string): HTMLButtonElement {
  const element = requireElement(id);
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Expected button: ${id}`);
  return element;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function fileUrl(path: string): string {
  return `file://${path.split('/').map(encodeURIComponent).join('/')}`;
}

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
