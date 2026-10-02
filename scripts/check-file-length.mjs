import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = fileURLToPath(new URL('../', import.meta.url));
const extensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.json',
  '.yml',
  '.yaml',
]);
const excludedDirectories = new Set([
  'node_modules',
  'dist',
  'release',
  '.git',
  'coverage',
  '.vitest-cache',
  'docs',
]);
const excludedFiles = new Set(['pnpm-lock.yaml', 'package-lock.json']);
const maximumLines = 200;
let inspectedFiles = 0;
let largestFile = { path: '', lines: 0 };
const violations = [];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) await inspect(path);
      continue;
    }
    if (!entry.isFile() || !extensions.has(extname(entry.name)) || excludedFiles.has(entry.name))
      continue;
    const content = await readFile(path, 'utf8');
    const lines = content ? content.split('\n').length - (content.endsWith('\n') ? 1 : 0) : 0;
    inspectedFiles++;
    if (lines > largestFile.lines) largestFile = { path: relative(root, path), lines };
    if (lines > maximumLines)
      violations.push(`${relative(root, path)}: ${lines} lines (maximum ${maximumLines})`);
  }
}

await inspect(resolve(root));
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `${inspectedFiles} files checked; largest: ${largestFile.path} (${largestFile.lines} lines).`,
  );
}
