// Extracts a Unix millisecond timestamp from a frame filename.
// Matches the first 13-digit sequence that falls within year 2000–2100.
const MS_TIMESTAMP_RE = /(\d{13})/;
// First valid 13-digit ms timestamp: 2001-09-09T01:46:40.000Z
const TS_MIN = 1_000_000_000_000;

export function parseTimestamp(filename: string): number | null {
  const match = MS_TIMESTAMP_RE.exec(filename);
  if (match?.[1] === undefined) return null;
  const ts = parseInt(match[1], 10);
  // Reject timestamps before 2001 — they indicate the filename isn't using ms precision
  return ts >= TS_MIN ? ts : null;
}
