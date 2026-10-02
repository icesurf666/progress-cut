import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron';
import { join } from 'node:path';

export function createTray(window: BrowserWindow, bundleDirectory: string): Tray {
  const icon = nativeImage.createFromPath(join(bundleDirectory, 'tray.png'));
  icon.setTemplateImage(true);
  const tray = new Tray(icon);
  tray.setToolTip('ProgressCut');
  const toggle = (): void => {
    if (window.isVisible()) window.hide();
    else {
      window.show();
      window.focus();
    }
    rebuildMenu();
  };
  const rebuildMenu = (): void => {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: window.isVisible() ? 'Hide Window' : 'Show Window', click: toggle },
        { type: 'separator' },
        { label: 'Quit', click: () => app.exit(0) },
      ]),
    );
  };
  rebuildMenu();
  tray.on('click', toggle);
  return tray;
}
