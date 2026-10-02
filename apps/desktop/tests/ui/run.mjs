import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const testPath = fileURLToPath(new URL('./sessionFlow.mjs', import.meta.url));
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(electronPath, [testPath], { env: environment, stdio: 'inherit' });
child.on('error', (error) => {
  throw error;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
