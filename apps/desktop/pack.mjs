import process from 'node:process';
import console from 'node:console';
/**
 * ProgressCut packaging script
 *
 * Usage:
 *   node apps/desktop/pack.mjs          — builds + packages for current arch
 *   node apps/desktop/pack.mjs --dir    — unpackaged .app only (faster, for testing)
 *   node apps/desktop/pack.mjs --x64    — force x64 build
 *   node apps/desktop/pack.mjs --arm64  — force arm64 build
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { copyFile, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const desktop = resolve(root, 'apps/desktop');
const build = resolve(desktop, 'build');

const args = process.argv.slice(2);
const dirOnly = args.includes('--dir');
const arch = args.includes('--arm64') ? 'arm64' : args.includes('--x64') ? 'x64' : null; // null = current arch

// ── 1. JS bundles ─────────────────────────────────────────────────────────────

console.log('▸ Building JS bundles…');
execFileSync('node', ['build.mjs'], { cwd: desktop, stdio: 'inherit' });

// ── 2. App icon ───────────────────────────────────────────────────────────────

console.log('▸ Generating app icon…');
mkdirSync(build, { recursive: true });

const brandMark = resolve(desktop, 'src/renderer/assets/brand-mark.png');
const iconPng = resolve(build, 'icon.png');
const iconset = resolve(build, 'ProgressCut.iconset');
const iconIcns = resolve(build, 'icon.icns');

// 1024×1024 canvas with brand mark centred on dark bg
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 9, g: 9, b: 11, alpha: 1 } },
})
  .composite([
    {
      input: await sharp(brandMark).resize(640, 640, { fit: 'inside' }).toBuffer(),
      gravity: 'center',
    },
  ])
  .png()
  .toFile(iconPng);

// Generate iconset sizes required by macOS
const sizes = [16, 32, 64, 128, 256, 512, 1024];
mkdirSync(iconset, { recursive: true });
await Promise.all(
  sizes.flatMap((sz) => {
    const tasks = [
      sharp(iconPng)
        .resize(sz, sz)
        .png()
        .toFile(join(iconset, `icon_${sz}x${sz}.png`)),
    ];
    if (sz <= 512) {
      tasks.push(
        sharp(iconPng)
          .resize(sz * 2, sz * 2)
          .png()
          .toFile(join(iconset, `icon_${sz}x${sz}@2x.png`)),
      );
    }
    return tasks;
  }),
);

// Convert iconset → icns (macOS only; skips gracefully on other platforms)
try {
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', iconIcns], { stdio: 'pipe' });
  console.log('  icon.icns created');
} catch {
  // Linux/CI: electron-builder will fall back to icon.png
  await copyFile(iconPng, iconIcns.replace('.icns', '.png'));
  console.log('  iconutil not found — using icon.png fallback');
}

await rm(iconset, { recursive: true, force: true });

// ── 3. DMG background (simple dark gradient) ──────────────────────────────────

const dmgBg = resolve(build, 'dmg-bg.png');
if (!existsSync(dmgBg)) {
  await sharp({
    create: { width: 540, height: 380, channels: 3, background: { r: 9, g: 9, b: 11 } },
  })
    .png()
    .toFile(dmgBg);
}

// ── 4. electron-builder ───────────────────────────────────────────────────────

console.log(`▸ Packaging${arch ? ` (${arch})` : ''}…`);
const eb = resolve(root, 'node_modules/.bin/electron-builder');

const ebArgs = ['--projectDir', desktop, '--config', resolve(desktop, 'electron-builder.yml')];
if (dirOnly) ebArgs.push('--dir');
if (arch === 'arm64') ebArgs.push('--arm64');
if (arch === 'x64') ebArgs.push('--x64');

execFileSync(eb, ebArgs, {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Tell electron-builder where node_modules live (workspace root)
    NODE_PATH: resolve(root, 'node_modules'),
  },
});

console.log('\n✓ Done — check release/');
