import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FrameCandidate, StoryLabReport } from '@progresscut/domain';

const WIDTH = 1080;
const HEIGHT = 220;

export interface StoryLabFiles {
  readonly htmlPath: string;
  readonly metricsPath: string;
}

export async function writeStoryLabReport(
  report: StoryLabReport,
  outputDir: string,
  selectedFrames: readonly FrameCandidate[],
  extraMetrics: Readonly<Record<string, unknown>> = {},
): Promise<StoryLabFiles> {
  const reportDir = join(outputDir, 'story-lab');
  const htmlPath = join(reportDir, 'index.html');
  const metricsPath = join(reportDir, 'metrics.json');
  await mkdir(reportDir, { recursive: true });
  await Promise.all([
    writeFile(htmlPath, renderStoryLabHtml(report, selectedFrames)),
    writeFile(
      metricsPath,
      JSON.stringify(
        {
          generatedAt: report.generatedAt,
          targetDurationMs: report.targetDurationMs,
          session: report.session,
          counts: report.counts,
          ...extraMetrics,
        },
        null,
        2,
      ),
    ),
  ]);
  return { htmlPath, metricsPath };
}

export function renderStoryLabHtml(
  report: StoryLabReport,
  selectedFrames: readonly FrameCandidate[],
): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProgressCut — Story Lab</title><style>${styles()}</style></head><body><main>
<header><p class="eyebrow">PROGRESSCUT / STORY LAB</p><h1>How a work session<br>became a story.</h1><p class="lede">${duration(report.session.durationMs)} of work compressed into ${report.counts.moments} visual moments.</p></header>
<section><p class="eyebrow">COMPRESSION / 01</p><div class="funnel">${funnel(report)}</div></section>
<section><div class="heading"><div><p class="eyebrow">ACTIVITY / 02</p><h2>Visual novelty over time</h2></div><p>Violet bars show change intensity. Lime marks are moments kept for the final story.</p></div>${timeline(report)}</section>
<section><div class="heading"><div><p class="eyebrow">MOMENTS / 03</p><h2>The final contact sheet</h2></div><p>${report.counts.moments} moments selected across ${report.counts.segments} activity windows.</p></div><div class="sheet">${contactSheet(selectedFrames, report)}</div></section>
<footer><span>LOCAL-FIRST · DETERMINISTIC · NO CLOUD</span><span>Generated ${escapeHtml(report.generatedAt)}</span></footer></main></body></html>`;
}

function funnel(report: StoryLabReport): string {
  const stages: readonly (readonly [string, number, string])[] = [
    ['Observed', report.counts.observations, 'Screenshots captured during work.'],
    ['Distinct', report.counts.distinctFrames, 'Near-duplicates rejected.'],
    ['Segments', report.counts.segments, 'Activity windows found.'],
    ['Story', report.counts.moments, 'Moments selected for coverage.'],
  ];
  return stages
    .map(
      ([label, count, description], index) =>
        `<article><span>0${index + 1}</span><strong>${count.toLocaleString()}</strong><h3>${label}</h3><p>${description}</p></article>`,
    )
    .join('');
}

function timeline(report: StoryLabReport): string {
  const values = normalizedNovelty(report.candidates, 120);
  const barWidth = WIDTH / Math.max(values.length, 1);
  const bars = values
    .map((value, index) => {
      const height = Math.max(3, value * (HEIGHT - 28));
      return `<rect x="${(index * barWidth).toFixed(2)}" y="${(HEIGHT - height).toFixed(2)}" width="${Math.max(1, barWidth - 2).toFixed(2)}" height="${height.toFixed(2)}" rx="2"/>`;
    })
    .join('');
  const span = Math.max(report.session.durationMs, 1);
  const markers = report.moments
    .map((moment) => {
      const position = (moment.timestampMs - report.session.startedAtMs) / span;
      const x = Math.max(0, Math.min(WIDTH, position * WIDTH));
      return `<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${HEIGHT}"/>`;
    })
    .join('');
  return `<div class="chart"><svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Visual novelty over time"><g class="bars">${bars}</g><g class="markers">${markers}</g></svg><div class="labels"><span>START</span><span>${duration(report.session.durationMs)}</span><span>END</span></div></div>`;
}

function contactSheet(frames: readonly FrameCandidate[], report: StoryLabReport): string {
  return frames
    .map(
      (frame, index) =>
        `<figure><img loading="lazy" src="${pathToFileURL(frame.sourcePath).href}" alt="Story moment ${index + 1}"><figcaption><span>${String(index + 1).padStart(2, '0')}</span><span>${duration(frame.timestampMs - report.session.startedAtMs)} · novelty ${frame.novelty.toFixed(2)}</span></figcaption></figure>`,
    )
    .join('');
}

function normalizedNovelty(candidates: readonly FrameCandidate[], limit: number): number[] {
  const count = Math.min(candidates.length, limit);
  const buckets = Array.from({ length: count }, () => ({ total: 0, count: 0 }));
  for (let index = 0; index < candidates.length; index++) {
    const bucket = buckets[Math.min(count - 1, Math.floor((index / candidates.length) * count))];
    if (!bucket) continue;
    bucket.total += candidates[index]?.novelty ?? 0;
    bucket.count++;
  }
  const values = buckets.map((bucket) => (bucket.count ? bucket.total / bucket.count : 0));
  const maximum = Math.max(...values, 0.0001);
  return values.map((value) => value / maximum);
}

function duration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 59
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m ${seconds % 60}s`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });
}

function styles(): string {
  return `:root{color-scheme:dark;--bg:#09090b;--ink:#f4f4f5;--muted:#a1a1aa;--line:#27272a;--violet:#8b5cf6;--lime:#b7ff5a}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}main{width:min(1180px,calc(100% - 48px));margin:auto;padding:72px 0}header{min-height:440px;display:grid;align-content:center;border-bottom:1px solid var(--line)}.eyebrow{font:600 11px/1.2 ui-monospace,monospace;letter-spacing:.12em;color:var(--lime);margin:0 0 16px}h1{font-size:clamp(48px,8vw,104px);line-height:.91;letter-spacing:-.07em;margin:0}h2{font-size:32px;letter-spacing:-.04em;margin:0}.lede{font-size:20px;line-height:1.5;color:var(--muted);max-width:600px;margin:28px 0 0}section{padding:72px 0;border-bottom:1px solid var(--line)}.funnel{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line)}article{min-height:220px;background:var(--bg);padding:24px}article span{font:12px ui-monospace;color:var(--muted)}article strong{display:block;font-size:54px;letter-spacing:-.07em;margin:44px 0 8px}article h3{margin:0;font-size:18px}article p,.heading>p{color:var(--muted);font-size:14px;line-height:1.5}.heading{display:flex;justify-content:space-between;gap:32px;align-items:end;margin-bottom:36px}.heading>p{max-width:300px;margin:0}.chart{border:1px solid var(--line);padding:24px}.chart svg{display:block;width:100%;height:auto}.bars rect{fill:var(--violet);opacity:.85}.markers line{stroke:var(--lime);stroke-width:3}.labels{display:flex;justify-content:space-between;margin-top:16px;font:11px ui-monospace;color:var(--muted)}.sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.sheet figure{margin:0;background:#151518;border:1px solid var(--line)}.sheet img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}.sheet figcaption{display:flex;justify-content:space-between;gap:8px;padding:10px;font:11px ui-monospace;color:var(--muted)}.sheet figcaption span:first-child{color:var(--lime)}footer{padding:28px 0;display:flex;justify-content:space-between;font:11px ui-monospace;color:var(--muted)}@media(max-width:700px){main{width:min(100% - 32px,1180px);padding:40px 0}.funnel{grid-template-columns:repeat(2,1fr)}.heading{display:block}.heading>p{margin-top:16px}.sheet{grid-template-columns:repeat(2,1fr)}footer{display:block}footer span{display:block;margin:8px 0}}`;
}
