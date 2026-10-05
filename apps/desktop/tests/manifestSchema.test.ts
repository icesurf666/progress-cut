import { expect, it } from 'vitest';
import { parseManifest } from '../src/main/recovery/manifestSchema.js';

const valid = {
  version: 1,
  status: 'recording',
  outputDir: '/session',
  framesDir: '/frames',
  targetMs: 60000,
  outputFormat: 'both',
  startedAt: 1,
  recordingDurationMs: 0,
  updatedAt: 1,
};

it('validates unknown recovery metadata without changing valid values', () => {
  expect(parseManifest(valid)).toEqual(valid);
  for (const value of [null, [], 'string', { ...valid, version: 999 }]) {
    expect(() => parseManifest(value)).toThrow('invalid');
  }
});

it('rejects unsafe times, invalid statuses, paths and output formats', () => {
  for (const invalid of [
    { targetMs: 0 },
    { targetMs: -1 },
    { targetMs: 0.5 },
    { targetMs: Infinity },
    { targetMs: NaN },
    { recordingDurationMs: -1 },
    { startedAt: null },
    { updatedAt: 'yesterday' },
    { status: 'done' },
    { outputFormat: 'jpeg' },
    { framesDir: '' },
    { outputDir: '' },
  ]) {
    expect(() => parseManifest({ ...valid, ...invalid })).toThrow('invalid');
  }
});
