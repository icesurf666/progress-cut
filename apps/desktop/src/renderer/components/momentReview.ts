import type { SessionState } from '../state/sessionState.js';
import { createElement, fileUrl, requireElement } from '../lib/dom.js';

export function renderMomentReview(
  state: SessionState,
  apply: () => void,
  refresh: () => void,
): void {
  const section = requireElement('moment-review');
  const moments = state.exports.get('progresscut')?.storyMoments ?? [];
  section.replaceChildren();
  section.classList.toggle('hidden', moments.length === 0);
  if (moments.length === 0) return;

  const heading = createElement('div', 'section-heading');
  heading.append(
    createElement('h2', '', 'Review moments'),
    createElement('span', 'micro', 'REMOVE A FRAME · KEEP COVERAGE'),
  );
  const grid = createElement('div', 'moment-grid');
  for (const [index, moment] of moments.entries()) {
    const excluded = state.excludedFrameIds.has(moment.frameId);
    const button = createElement('button', `moment-card${excluded ? ' is-excluded' : ''}`);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(excluded));
    button.setAttribute('aria-label', `Remove story moment ${index + 1}`);
    const image = createElement('img', 'moment-image');
    image.src = fileUrl(moment.sourcePath);
    image.alt = `Story moment ${index + 1}`;
    image.loading = 'lazy';
    button.append(
      image,
      createElement('span', 'moment-number', String(index + 1).padStart(2, '0')),
    );
    button.addEventListener('click', () => {
      state.toggleExcludedFrame(moment.frameId);
      refresh();
    });
    grid.append(button);
  }
  section.append(heading, grid);
  if (state.excludedFrameIds.size > 0) {
    const applyButton = createElement(
      'button',
      'btn btn-rerender',
      `Rebuild without ${state.excludedFrameIds.size} moment${state.excludedFrameIds.size === 1 ? '' : 's'}`,
    );
    applyButton.addEventListener('click', apply);
    section.append(applyButton);
  }
}
