import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { setTimeout, clearTimeout } from 'node:timers';
import { build } from 'esbuild';
import process from 'node:process';
import console from 'node:console';

if (process.platform !== 'darwin') throw new Error('This Electron crash smoke test requires macOS');
const require = createRequire(import.meta.url);
const desktop = fileURLToPath(new URL('../../', import.meta.url));
const electron = require('electron');
const sandbox = await mkdtemp(join(tmpdir(), 'progresscut-crash-'));
const home = join(sandbox, 'home');
await mkdir(home);
const bundleDirectory = await mkdtemp(join(desktop, 'dist/crash-'));
const bundle = join(bundleDirectory, 'worker.cjs');
const children = new Set();
const outcomes = [];

async function runWorker(mode, outputDir, stage, crash = false) {
  const environment = { ...process.env, HOME: home, TMPDIR: sandbox, CRASH_MODE: mode };
  delete environment.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, [bundle, mode, outputDir], {
    env: environment,
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  children.add(child);
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = (stderr + chunk.toString()).slice(-4000);
  });
  return new Promise((resolvePromise, reject) => {
    let result;
    const timeout = setTimeout(() => {
      killGroup(child);
      reject(new Error(`Timed out waiting for ${mode}/${stage}: ${stderr}`));
    }, 60000);
    child.on('message', (message) => {
      if (message?.stage === 'error') {
        killGroup(child);
        reject(new Error(message.message));
      }
      if (message?.stage === stage) {
        result = message;
        if (crash) killGroup(child);
      }
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('exit', (code, signal) => {
      clearTimeout(timeout);
      children.delete(child);
      if (!result || (crash ? signal !== 'SIGKILL' : code !== 0)) {
        reject(new Error(`Unexpected ${mode} exit ${code}/${signal}: ${stderr}`));
      } else resolvePromise(result);
    });
  });
}

function killGroup(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

try {
  await build({
    entryPoints: [resolve(desktop, 'tests/crash/worker.ts')],
    outfile: bundle,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron', 'sharp'],
    banner: {
      js: `
const crashChildProcess = require('node:child_process');
const crashOriginalSpawn = crashChildProcess.spawn;
crashChildProcess.spawn = function (...args) {
  const child = crashOriginalSpawn.apply(this, args);
  if (process.env.CRASH_MODE === 'encoding' && args[0] === 'ffmpeg')
    process.send({ stage: 'encoding', encoderPid: child.pid });
  return child;
};`,
    },
    tsconfig: resolve(desktop, 'tsconfig.json'),
    plugins: [
      {
        name: 'synthetic-capture',
        setup(builder) {
          builder.onResolve({ filter: /^@progresscut\/capture$/ }, () => ({
            path: resolve(desktop, 'tests/crash/fixtureCapture.ts'),
          }));
        },
      },
    ],
  });
  await runWorker('capture', join(sandbox, 'sessions'), 'capture', true);
  const first = await runWorker('inspect', '', 'inspect');
  assert.equal(first.sessions.length, 1);
  assert.equal(first.sessions[0].frameCount, 3);
  await runWorker('encoding', join(sandbox, 'sessions'), 'encoding', true);
  const second = await runWorker('inspect', '', 'inspect');
  assert.equal(second.sessions.length, 2);
  for (const session of second.sessions) {
    assert.equal(session.frameCount, 3);
    const frameNames = (await readdir(session.framesDir)).sort();
    const originalFrames = await Promise.all(
      frameNames.map((name) => readFile(join(session.framesDir, name))),
    );
    assert.equal(frameNames.length, 3);
    await runWorker('recover', session.outputDir, 'recovered');
    const probe = JSON.parse(
      execFileSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'stream=codec_name,pix_fmt:format=duration',
          '-of',
          'json',
          join(session.outputDir, 'progresscut.mp4'),
        ],
        { encoding: 'utf8' },
      ),
    );
    assert.equal(probe.streams[0].codec_name, 'h264');
    assert.equal(probe.streams[0].pix_fmt, 'yuv420p');
    assert.ok(
      Math.abs(Number(probe.format.duration) - 3) < 0.15,
      `Recovered video duration: ${probe.format.duration}s; expected 3s`,
    );
    assert.ok((await readFile(join(session.outputDir, 'story-lab/index.html'), 'utf8')).length > 0);
    const recoveredFrames = await Promise.all(
      frameNames.map((name) => readFile(join(session.framesDir, name))),
    );
    assert.deepEqual(recoveredFrames, originalFrames);
    const remaining = await runWorker('inspect', '', 'inspect');
    assert.ok(!remaining.sessions.some((entry) => entry.outputDir === session.outputDir));
    assert.equal(remaining.sessions.length, 1 - outcomes.length);
    outcomes.push({ outputDir: session.outputDir, frames: session.frameCount, recovered: true });
  }
  assert.equal((await runWorker('inspect', '', 'inspect')).sessions.length, 0);
  console.log(
    JSON.stringify(
      {
        status: 'passed',
        capture: 'synthetic',
        runtime: 'Electron',
        interruption: 'SIGKILL',
        encoder: 'real FFmpeg',
        outcomes,
      },
      null,
      2,
    ),
  );
} finally {
  for (const child of children) killGroup(child);
  await rm(bundleDirectory, { recursive: true, force: true });
  await rm(sandbox, { recursive: true, force: true });
}
