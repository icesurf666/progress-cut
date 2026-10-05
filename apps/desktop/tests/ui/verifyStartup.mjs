import assert from 'node:assert/strict';

export async function verifyStartup(harness) {
  const { window, evaluate, flush, emit, actions } = harness;
  window.webContents.send('deps:missing', ['ffmpeg']);
  await flush();
  assert.equal(await evaluate("document.getElementById('btn-start').disabled"), true);
  assert.equal(
    await evaluate("document.getElementById('deps-banner').classList.contains('hidden')"),
    false,
  );
  await evaluate("document.getElementById('btn-start').dispatchEvent(new Event('click'))");
  window.webContents.send('shortcut:start');
  await flush();
  assert.equal(actions.starts.length, 0);
  assert.equal(await evaluate("document.getElementById('app').dataset.state"), 'idle');
  window.webContents.send('deps:missing', ['screencapture', 'ffmpeg']);
  await flush();
  assert.equal(await evaluate("document.getElementById('btn-start').disabled"), true);
  window.webContents.send('deps:missing', []);
  await flush();
  assert.equal(await evaluate("document.getElementById('btn-start').disabled"), false);
  assert.equal(
    await evaluate("document.getElementById('deps-banner').classList.contains('hidden')"),
    true,
  );

  await emit({ type: 'pipeline:start', name: 'progresscut' });
  assert.equal(await evaluate("document.getElementById('app').dataset.state"), 'processing');
  assert.equal(
    await evaluate("document.getElementById('panel-processing').classList.contains('hidden')"),
    false,
  );
  await harness.screenshot('recovery-processing');
  window.webContents.send('shortcut:start');
  await flush();
  assert.equal(actions.starts.length, 0);
  await emit({ type: 'session:error', message: 'Recovery failed: permission denied' });
  assert.equal(await evaluate("document.getElementById('app').dataset.state"), 'idle');
  assert.equal(actions.history.length, 0);
  assert.equal(
    await evaluate("document.querySelector('.toast-body').textContent"),
    'Recovery failed: permission denied',
  );
  await evaluate("document.querySelectorAll('.toast').forEach(element => element.remove())");
}
