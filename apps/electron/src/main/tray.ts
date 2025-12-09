import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron';

let tray: Tray | null = null;
let mainWindowRef: BrowserWindow | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  // Create a simple tray icon (16x16 colored square as placeholder)
  // In production, you'd use an actual .ico file
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('UpTier');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show UpTier',
      click: () => {
        if (mainWindowRef) {
          if (mainWindowRef.isMinimized()) {
            mainWindowRef.restore();
          }
          mainWindowRef.show();
          mainWindowRef.focus();
        }
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click to show window
  tray.on('double-click', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isMinimized()) {
        mainWindowRef.restore();
      }
      mainWindowRef.show();
      mainWindowRef.focus();
    }
  });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  mainWindowRef = null;
}

export function updateTrayTooltip(text: string): void {
  if (tray) {
    tray.setToolTip(text);
  }
}
