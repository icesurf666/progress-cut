export interface ConcatFrame {
  readonly sourcePath: string;
  readonly durationMs: number;
}

/**
 * Build an ffconcat v1.0 file content for variable-duration frames.
 *
 * The last file is listed twice (without a trailing `duration`) — this is the
 * standard workaround for FFmpeg not displaying the final frame long enough
 * when only a single listing is present.
 */
export function buildConcatContent(frames: readonly ConcatFrame[]): string {
  const lines: string[] = ['ffconcat version 1.0'];

  for (const frame of frames) {
    lines.push(`file '${escapeSingleQuotes(frame.sourcePath)}'`);
    lines.push(`duration ${(frame.durationMs / 1000).toFixed(6)}`);
  }

  const finalFrame = frames.at(-1);
  if (finalFrame) {
    // Repeat last file so FFmpeg honours the final frame's duration.
    lines.push(`file '${escapeSingleQuotes(finalFrame.sourcePath)}'`);
  }

  return lines.join('\n') + '\n';
}

function escapeSingleQuotes(p: string): string {
  // Inside ffconcat single-quoted strings, a literal ' becomes '\''
  return p.replace(/'/g, "'\\''");
}
