import { app } from 'electron';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { startSession, rerenderSession } from '../../src/main/captureSession.js';
import { clearSessionManifest, findRecoverableSessions } from '../../src/main/sessionManifest.js';
import type { SessionEvent } from '../../src/shared/session.js';

const [mode, outputBaseDir] = process.argv.slice(2);
if (!process.env['HOME'] || homedir() !== process.env['HOME']) {
  throw new Error('Crash fixture requires an isolated HOME directory');
}
app.setPath('userData', join(homedir(), 'electron-profile'));

function send(message: unknown): void {
  if (!process.send) throw new Error('Crash fixture requires an IPC parent');
  process.send(message);
}

function finish(message: unknown, code = 0): void {
  if (!process.send) throw new Error('Crash fixture requires an IPC parent');
  process.send(message, () => app.exit(code));
}

void app
  .whenReady()
  .then(async () => {
    if (mode === 'inspect') {
      finish({ stage: 'inspect', sessions: await findRecoverableSessions() });
      return;
    }
    if (mode === 'recover') {
      const sessions = await findRecoverableSessions();
      const session = sessions.find((entry) => entry.outputDir === outputBaseDir);
      if (!session) throw new Error('Expected unfinished session not found');
      rerenderSession(
        session,
        (event) => {
          if (event.type === 'session:done')
            finish({ stage: 'recovered', outputDir: event.outputDir });
          if (event.type === 'session:error') finish({ stage: 'error', message: event.message }, 1);
        },
        () => clearSessionManifest(session.outputDir),
      );
      return;
    }
    if (!outputBaseDir || (mode !== 'capture' && mode !== 'encoding'))
      throw new Error('Invalid crash fixture mode');
    const emit = (event: SessionEvent): void => {
      if (event.type === 'session:error') finish({ stage: 'error', message: event.message }, 1);
      if (event.type === 'capture:frame' && event.count === 3) {
        if (mode === 'capture') send({ stage: 'capture' });
        else capture.cancel();
      }
    };
    const capture = startSession(
      { intervalMs: 100, targetMs: 3000, outputFormat: 'mp4', outputBaseDir },
      emit,
    );
  })
  .catch((error: unknown) => finish({ stage: 'error', message: String(error) }, 1));
