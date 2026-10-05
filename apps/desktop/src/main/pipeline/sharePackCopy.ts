export interface ShareCopyMetrics {
  readonly recordingDurationMs: number;
  readonly observations: number;
  readonly distinctFrames: number;
  readonly moments: number;
}

export function buildPostTemplates(metrics: ShareCopyMetrics): Record<string, string> {
  const summary = sessionSummary(metrics);
  return {
    'x.md': `I turned ${summary}.

The algorithm rejected near-duplicates, kept the meaningful visual changes, and produced a short GIF/MP4 — locally, with no cloud upload.

[Add what you built in this session]

#buildinpublic #opensource #typescript
`,
    'linkedin.md': `Today’s build update:

${summary}.

Instead of recording every second, ProgressCut keeps the visual states that explain how the work progressed. The result is a short story you can actually share.

[Add what you built, learned, or changed]

Built locally. No account. No cloud upload.
`,
    'dev-to-outline.md': `# From a work session to a progress story

## Hook

${summary}.

## What I built

[Describe the task and its final outcome]

## What ProgressCut kept

- ${metrics.observations.toLocaleString()} observed frames
- ${metrics.distinctFrames.toLocaleString()} distinct visual states
- ${metrics.moments} selected story moments

## What the algorithm got wrong

[Include one rejected or manually removed moment]

## Assets

- Attach story-card.png as the cover
- Embed the GIF or MP4
- Include metrics.json or the Story Lab timeline
`,
  };
}

function sessionSummary(metrics: ShareCopyMetrics): string {
  return `${duration(metrics.recordingDurationMs)} of work into ${metrics.moments} visual moments (${metrics.observations.toLocaleString()} observed frames → ${metrics.distinctFrames.toLocaleString()} distinct states)`;
}

function duration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 59
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m ${seconds % 60}s`;
}
