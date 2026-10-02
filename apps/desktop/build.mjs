import { Buffer } from 'node:buffer';
import console from 'node:console';
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url));

const nodeBase = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron', 'sharp'],
  sourcemap: 'inline',
};

// Tray icon — 18×18 monochrome ProgressCut logo (two panels + diagonal slash)
// macOS Template image: must be black on transparent, adapts to light/dark menu bar
const trayIcon = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
     <rect x="1"  y="2"  width="7" height="9" rx="1" fill="black"/>
     <rect x="10" y="7"  width="7" height="9" rx="1" fill="black"/>
     <line x1="5" y1="16" x2="13" y2="2" stroke="black" stroke-width="1.5" stroke-linecap="round"/>
   </svg>`,
);

await Promise.all([
  build({
    ...nodeBase,
    entryPoints: [resolve(root, 'src/main/index.ts')],
    outfile: resolve(root, 'dist/main.cjs'),
  }),
  build({
    ...nodeBase,
    entryPoints: [resolve(root, 'src/preload/index.ts')],
    outfile: resolve(root, 'dist/preload.cjs'),
  }),
  build({
    entryPoints: [resolve(root, 'src/renderer/renderer.ts')],
    bundle: true,
    loader: { '.html': 'text' },
    platform: 'browser',
    format: 'iife',
    outfile: resolve(root, 'dist/renderer.js'),
  }),
  sharp(trayIcon).png().toFile(resolve(root, 'dist/tray.png')),
]);

console.log('build ok');
