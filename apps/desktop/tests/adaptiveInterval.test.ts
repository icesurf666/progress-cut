import { describe, expect, it } from 'vitest';
import { AdaptiveInterval } from '../src/main/capture/adaptiveInterval.js';

describe('adaptive capture interval', () => {
  it('accepts zero hashes and caps static-screen delays at three times the base', () => {
    const interval = new AdaptiveInterval(1000);
    expect(interval.update(0n)).toBe(1000);
    expect(interval.update(0n)).toBe(1250);
    for (let index = 0; index < 20; index++) interval.update(0n);
    expect(interval.update(0n)).toBe(3000);
  });

  it('recovers on activity and retains the reference across a failed hash', () => {
    const interval = new AdaptiveInterval(1000);
    interval.update(0n);
    expect(interval.update(null)).toBe(1000);
    expect(interval.update((1n << 64n) - 1n)).toBe(750);
    expect(interval.update(0n)).toBe(563);
    expect(interval.update((1n << 64n) - 1n)).toBe(500);
  });
});
