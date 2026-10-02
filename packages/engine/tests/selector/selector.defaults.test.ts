import { describe, it, expect } from 'vitest';
import { DEFAULT_MS_PER_MOMENT } from '../../src/selector/selectStory.js';
import './selectorFixtures.js';

describe('defaults', () => {
  it('DEFAULT_MS_PER_MOMENT is 1 000', () => {
    expect(DEFAULT_MS_PER_MOMENT).toBe(1_000);
  });
});
