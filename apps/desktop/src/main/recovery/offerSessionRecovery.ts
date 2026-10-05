import { dialog, type BrowserWindow } from 'electron';
import { findRecoverableSessions, type RecoverableSession } from '../sessionManifest.js';

export async function offerSessionRecovery(
  window: BrowserWindow,
  recover: (session: RecoverableSession) => void,
): Promise<void> {
  const sessions = await findRecoverableSessions();
  if (!sessions.length) return;
  if (window.webContents.isLoading()) {
    await new Promise<void>((resolve) => window.webContents.once('did-finish-load', resolve));
  }
  for (const session of sessions) {
    const response = await dialog.showMessageBox(window, {
      type: 'warning',
      buttons: ['Recover story', 'Keep frames'],
      defaultId: 0,
      cancelId: 1,
      title: 'Recover unfinished session?',
      message: `${session.frameCount} captured frames were found from an unfinished session.`,
      detail: `${session.outputDir}\nProgressCut can rebuild the story without recording again. Kept sessions remain available on the next launch.`,
    });
    if (response.response === 0) {
      recover(session);
      return;
    }
  }
}
