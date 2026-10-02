import { describe, it, expect } from 'vitest';
import { parseTimestamp } from '../../src/ingestion/parseTimestamp.js';

describe('parseTimestamp', () => {
  describe('valid timestamps', () => {
    it('extracts bare 13-digit timestamp', () => {
      expect(parseTimestamp('1700000000000.png')).toBe(1700000000000);
    });

    it('extracts timestamp with prefix', () => {
      expect(parseTimestamp('frame_1700000000000.png')).toBe(1700000000000);
    });

    it('extracts timestamp with arbitrary prefix and extension', () => {
      expect(parseTimestamp('session_abc_1700000000000.webp')).toBe(1700000000000);
    });

    it('accepts boundary: first 13-digit ms timestamp (2001-09-09)', () => {
      expect(parseTimestamp('1000000000000.png')).toBe(1000000000000);
    });

    it('accepts any realistic future timestamp', () => {
      // 9999999999999 = year 2286 — still 13 digits, accepted
      expect(parseTimestamp('9999999999999.png')).toBe(9999999999999);
    });
  });

  describe('invalid / no timestamp', () => {
    it('returns null for sequential filename', () => {
      expect(parseTimestamp('frame_001.png')).toBeNull();
    });

    it('returns null for 10-digit Unix seconds timestamp', () => {
      // 10-digit = Unix seconds, not ms — should not match
      expect(parseTimestamp('1700000000.png')).toBeNull();
    });

    it('returns null for too-early timestamp (before year 2000)', () => {
      expect(parseTimestamp('0000000000001.png')).toBeNull();
    });

    it('returns null when 13-digit sequence represents pre-2001 date', () => {
      // 0000000000001 is 13 digits but < TS_MIN
      expect(parseTimestamp('frame_0000000000001.png')).toBeNull();
    });

    it('returns null for plain name with no digits', () => {
      expect(parseTimestamp('screenshot.png')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseTimestamp('')).toBeNull();
    });
  });
});
