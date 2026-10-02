import { requireElement, requireInput } from '../lib/dom.js';

export function bindRangeSetting(
  inputId: string,
  outputId: string,
  format: (value: number) => string,
) {
  const input = requireInput(inputId);
  const output = requireElement(outputId);
  const update = (): void => {
    const value = Number(input.value);
    const label = format(value);
    const percentage =
      ((value - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
    output.textContent = label;
    input.style.setProperty('--range-progress', `${percentage}%`);
    input.setAttribute('aria-valuetext', label);
  };
  input.addEventListener('input', update);
  update();
  return {
    value: () => Number(input.value),
    setValue: (value: number): void => {
      input.value = String(value);
      update();
    },
  };
}
