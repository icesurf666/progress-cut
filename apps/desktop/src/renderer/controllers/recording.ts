import type { SessionEvent } from '../../shared/session.js';
import { ActivityChart } from '../components/activityChart.js';
import { requireElement } from '../lib/dom.js';
import { formatTimer } from '../lib/format.js';

export function createRecordingController(baseInterval: () => number) {
  const timer = requireElement('timer');
  const count = requireElement('frame-count');
  const segments = requireElement('segment-count');
  const interval = requireElement('interval-live');
  const activity = new ActivityChart(requireElement('activity-bar'));
  let timerHandle: ReturnType<typeof setInterval> | undefined;
  let previousCount = 0;
  let previousFrameMs = 0;
  let segmentCount = 1;
  const stop = (): void => {
    clearInterval(timerHandle);
    timerHandle = undefined;
  };
  return {
    start(): void {
      stop();
      previousCount = previousFrameMs = 0;
      segmentCount = 1;
      activity.reset();
      count.textContent = '0';
      segments.textContent = '1';
      interval.textContent = '—';
      interval.style.color = '';
      timer.textContent = '00:00';
      const startedAt = Date.now();
      timerHandle = setInterval(() => {
        timer.textContent = formatTimer(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    },
    stop,
    update(event: Extract<SessionEvent, { type: 'capture:frame' }>): void {
      count.textContent = event.count.toLocaleString();
      interval.textContent = `${(event.intervalMs / 1000).toFixed(1)}s`;
      interval.style.color =
        event.intervalMs < baseInterval() * 0.8
          ? 'var(--success)'
          : event.intervalMs > baseInterval() * 1.5
            ? 'var(--text-dim)'
            : '';
      if (previousFrameMs > 0 && event.elapsedMs - previousFrameMs > 60000) segmentCount++;
      segments.textContent = String(segmentCount);
      previousFrameMs = event.elapsedMs;
      activity.append(Math.max(0, event.count - previousCount));
      previousCount = event.count;
    },
    acknowledgeSnapshot(): void {
      count.style.color = 'var(--success)';
      setTimeout(() => {
        count.style.color = '';
      }, 300);
    },
  };
}
