import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { setTimeout, clearTimeout } from 'node:timers';
import process from 'node:process';
import console from 'node:console';
import sharp from 'sharp';
import { connectInspector } from './inspector.mjs';

if (process.platform !== 'darwin') throw new Error('Packaged smoke requires macOS');
const outputFolder = process.arch === 'arm64' ? 'mac-arm64' : 'mac';
const application = resolve(process.argv[2] ?? `release/${outputFolder}/ProgressCut.app`);
const executable = join(application, 'Contents/MacOS/ProgressCut');
const sandbox = await mkdtemp(join(tmpdir(), 'progresscut-packaged-'));
const home = join(sandbox, 'home');
const outputDir = join(sandbox, 'session');
const framesDir = join(outputDir, 'frames');
await mkdir(home);
await mkdir(framesDir, { recursive: true });
await Promise.all(
  [30, 120, 220].map((level, index) =>
    sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: { r: level, g: 40, b: 100 },
      },
    })
      .png()
      .toFile(join(framesDir, `${1700000000000 + index * 1000}.png`)),
  ),
);
const environment = { ...process.env, HOME: home, TMPDIR: sandbox };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.NODE_PATH;
const child = spawn(executable, ['--inspect=0', `--user-data-dir=${join(home, 'profile')}`], {
  env: environment,
  detached: true,
  stdio: ['ignore', 'ignore', 'pipe'],
});
let stderr = '';
let inspector;
let startupError;
const exit = new Promise((resolveExit) => {
  child.once('exit', (code, signal) => resolveExit({ code, signal }));
  child.once('error', (error) => {
    startupError = error;
    resolveExit({ error: error.message });
  });
});
const watchdog = setTimeout(() => kill(), 60000);
function kill() {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}
child.stderr.on('data', (chunk) => {
  stderr = (stderr + chunk.toString()).slice(-12000);
});

async function waitFor(check, description) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (startupError) throw startupError;
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`App exited: ${stderr}`);
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timeout: ${description}\n${stderr}`);
}

try {
  const address = await waitFor(
    () => /ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/.exec(stderr)?.[0],
    'inspector',
  );
  inspector = await connectInspector(address);
  const evaluate = inspector.evaluate;
  await waitFor(() => evaluate('Boolean(process.mainModule)'), 'main module');
  const electron = "process.mainModule.require('electron')";
  const renderer = (script) =>
    evaluate(
      `${electron}.BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(${JSON.stringify(script)})`,
      true,
    );
  const runtime = await evaluate(`({ packaged: ${electron}.app.isPackaged,
    home: process.mainModule.require('node:os').homedir(),
    main: process.mainModule.filename,
    sharp: process.mainModule.require('node:module').createRequire(process.mainModule.filename).resolve('sharp') })`);
  assert.equal(runtime.packaged, true);
  assert.equal(runtime.home, home);
  assert.ok(runtime.main.startsWith(application));
  assert.ok(runtime.sharp.startsWith(application), `Sharp leaked from workspace: ${runtime.sharp}`);
  await waitFor(
    () =>
      evaluate(
        `${electron}.BrowserWindow.getAllWindows().length > 0 && !${electron}.BrowserWindow.getAllWindows()[0].webContents.isLoading()`,
      ),
    'renderer load',
  );
  assert.equal(await renderer("document.getElementById('app').dataset.state"), 'idle');
  assert.equal(await renderer('document.images[0].naturalWidth > 0'), true);
  await renderer(
    `window.progresscut.rerenderSession(${JSON.stringify({ outputDir, framesDir, targetMs: 3000, outputFormat: 'mp4' })})`,
  );
  await waitFor(async () => {
    const error = await renderer("document.querySelector('.toast-body')?.textContent ?? ''");
    if (error && !error.toLowerCase().includes('update')) throw new Error(error);
    return await renderer("document.getElementById('app').dataset.state === 'done'");
  }, 'packaged export');
  const duration = Number(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        join(outputDir, 'progresscut.mp4'),
      ],
      { encoding: 'utf8' },
    ),
  );
  assert.ok(Math.abs(duration - 3) <= 1 / 24);
  console.log(
    JSON.stringify(
      {
        status: 'passed',
        runtime,
        durationSeconds: duration,
        capture: 'synthetic PNGs',
        signed: 'not verified',
        packagedExport: true,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(stderr);
  throw error;
} finally {
  clearTimeout(watchdog);
  inspector?.close();
  kill();
  await exit;
  await rm(sandbox, { recursive: true, force: true });
}
