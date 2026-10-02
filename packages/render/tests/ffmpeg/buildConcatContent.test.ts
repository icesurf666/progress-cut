import { describe, it, expect } from 'vitest';
import { buildConcatContent } from '../../src/ffmpeg/buildConcatContent.js';

describe('buildConcatContent', () => {
  it('empty frames → header only', () => {
    expect(buildConcatContent([])).toBe('ffconcat version 1.0\n');
  });

  it('starts with ffconcat version 1.0', () => {
    const out = buildConcatContent([{ sourcePath: '/a.png', durationMs: 1_000 }]);
    expect(out.startsWith('ffconcat version 1.0\n')).toBe(true);
  });

  it('single frame → file + duration + file repeated', () => {
    const out = buildConcatContent([{ sourcePath: '/frame.png', durationMs: 2_000 }]);
    const lines = out.trimEnd().split('\n');
    expect(lines).toEqual([
      'ffconcat version 1.0',
      "file '/frame.png'",
      'duration 2.000000',
      "file '/frame.png'",
    ]);
  });

  it('two frames → last file is repeated without duration', () => {
    const out = buildConcatContent([
      { sourcePath: '/a.png', durationMs: 1_000 },
      { sourcePath: '/b.png', durationMs: 1_500 },
    ]);
    const lines = out.trimEnd().split('\n');
    expect(lines).toEqual([
      'ffconcat version 1.0',
      "file '/a.png'",
      'duration 1.000000',
      "file '/b.png'",
      'duration 1.500000',
      "file '/b.png'", // repeated, no duration
    ]);
  });

  it('duration converted from ms to seconds with 6 decimal places', () => {
    const out = buildConcatContent([{ sourcePath: '/f.png', durationMs: 333 }]);
    expect(out).toContain('duration 0.333000');
  });

  it('fractional milliseconds → correct 6-decimal seconds', () => {
    const out = buildConcatContent([{ sourcePath: '/f.png', durationMs: 1_001 }]);
    expect(out).toContain('duration 1.001000');
  });

  it('non-divisible ms value → correct rounding', () => {
    const out = buildConcatContent([{ sourcePath: '/f.png', durationMs: 7_777 }]);
    expect(out).toContain('duration 7.777000');
  });

  it("single quote in path is escaped to '\\'' ", () => {
    const out = buildConcatContent([{ sourcePath: "/it's/here.png", durationMs: 500 }]);
    expect(out).toContain("file '/it'\\''s/here.png'");
  });

  it('multiple single quotes in path are all escaped', () => {
    const out = buildConcatContent([{ sourcePath: "/a'b'c.png", durationMs: 500 }]);
    expect(out).toContain("file '/a'\\''b'\\''c.png'");
  });

  it('path with spaces requires no extra escaping (only quotes matter)', () => {
    const out = buildConcatContent([{ sourcePath: '/my frames/shot 01.png', durationMs: 1_000 }]);
    expect(out).toContain("file '/my frames/shot 01.png'");
  });

  it('three frames → second is not repeated, only last is', () => {
    const frames = [
      { sourcePath: '/a.png', durationMs: 1_000 },
      { sourcePath: '/b.png', durationMs: 1_000 },
      { sourcePath: '/c.png', durationMs: 1_000 },
    ];
    const lines = buildConcatContent(frames).trimEnd().split('\n');
    // Only one trailing repetition of /c.png
    const cLines = lines.filter((l) => l === "file '/c.png'");
    expect(cLines).toHaveLength(2); // one with duration, one repeated
    const bLines = lines.filter((l) => l === "file '/b.png'");
    expect(bLines).toHaveLength(1); // only once
  });

  it('output ends with a newline', () => {
    const out = buildConcatContent([{ sourcePath: '/a.png', durationMs: 500 }]);
    expect(out.endsWith('\n')).toBe(true);
  });
});
