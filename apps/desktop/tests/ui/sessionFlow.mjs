import { app } from 'electron';
import assert from 'node:assert/strict';
import console from 'node:console';
import { createHarness } from './createHarness.mjs';
import { verifyStartup } from './verifyStartup.mjs';

async function verifySessionFlow() {
  const harness = await createHarness();
  const { evaluate, emit, flush, actions, screenshot, window, mediaPath } = harness;
  const phase = () => evaluate("document.getElementById('app').dataset.state");
  const click = async (selector) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await flush();
  };
  assert.equal(await evaluate('document.images[0].naturalWidth > 0'), true);
  assert.equal(await phase(), 'idle');
  await verifyStartup(harness);
  await screenshot('setup');
  await click('#fmt-rerender [data-fmt=mp4]');
  await click('#fmt-toggle [data-fmt=gif]');
  assert.equal(
    await evaluate("document.querySelector('#fmt-rerender .active').dataset.fmt"),
    'mp4',
  );
  await click('#btn-pick-source');
  await click('#wp-grid .wp-source');
  await click('#btn-pick-folder');
  await click('#btn-start');
  assert.deepEqual(actions.starts[0], {
    intervalMs: 5000,
    targetMs: 60000,
    outputFormat: 'gif',
    outputBaseDir: '/tmp/custom-output',
    windowId: '42',
  });
  assert.equal(await phase(), 'recording');
  await emit({ type: 'capture:frame', count: 128, elapsedMs: 90000, intervalMs: 6250 });
  await evaluate("document.getElementById('timer').textContent = '24:18'");
  await screenshot('recording');
  await click('#btn-stop');
  await emit({ type: 'pipeline:start', name: 'progresscut' });
  await emit({
    type: 'pipeline:log',
    name: 'progresscut',
    message: 'Selecting meaningful changes…',
  });
  await screenshot('processing');
  const result = {
    type: 'pipeline:result',
    name: 'progresscut',
    outputPath: mediaPath,
    gifPath: mediaPath,
    fileSizeBytes: 1280000,
    processingMs: 3200,
    thumbnails: [mediaPath],
    meaningfulChanges: 38,
    selectedMoments: 16,
  };
  await emit(result);
  await emit({
    type: 'session:done',
    outputDir: '/tmp/session',
    totalObservations: 128,
    recordingDurationMs: 1458000,
  });
  assert.equal(await phase(), 'done');
  assert.equal(await evaluate("document.querySelector('.ri-name').textContent"), 'story.gif');
  await screenshot('results');
  await click('.ri-strip');
  assert.equal(
    await evaluate("document.querySelector('#preview-lightbox').classList.contains('hidden')"),
    false,
  );
  await click('#preview-close');
  assert.equal(
    await evaluate("document.querySelector('#preview-lightbox').classList.contains('hidden')"),
    true,
  );
  await click('.ri-play');
  await click('.ri-tag-copy');
  assert.deepEqual(actions.files, [mediaPath]);
  assert.deepEqual(actions.copies, [mediaPath]);
  assert.equal(actions.history[0].mp4Path, '');
  await click('#btn-again');
  await click('.history-item');
  assert.equal(await phase(), 'done');
  assert.equal(await evaluate("document.querySelector('.ri-name').textContent"), 'story.gif');
  await click('#btn-rerender');
  assert.equal(actions.rerenders[0].outputFormat, 'mp4');
  assert.equal(await phase(), 'processing');
  await click('.history-item');
  assert.equal(await phase(), 'processing');
  await emit({ type: 'session:error', message: 'Test error' });
  assert.equal(await phase(), 'idle');
  assert.equal(await evaluate("document.querySelector('#btn-rerender').disabled"), false);
  assert.equal(await evaluate("document.querySelector('.toast-body').textContent"), 'Test error');
  window.setSize(760, 720);
  await screenshot('compact');
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  assert.deepEqual(harness.errors, []);
  console.log(
    `PASS: settings, sources, capture, export, history, re-render, errors and layout. Screenshots: ${harness.screenshotDirectory}`,
  );
}

void app
  .whenReady()
  .then(verifySessionFlow)
  .then(() => app.exit(0))
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
