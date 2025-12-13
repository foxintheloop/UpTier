import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron';
import path from 'path';
let tray = null;
let mainWindowRef = null;
let pendingNotificationCount = 0;
export function createTray(mainWindow) {
    mainWindowRef = mainWindow;
    // Try to load the app icon, fall back to empty if not found
    let icon;
    try {
        const iconPath = path.join(__dirname, '../../build/icon.png');
        icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) {
            icon = nativeImage.createEmpty();
        }
        else {
            // Resize for tray (16x16 on Windows)
            icon = icon.resize({ width: 16, height: 16 });
        }
    }
    catch {
        icon = nativeImage.createEmpty();
    }
    tray = new Tray(icon);
    updateTrayTooltip();
    rebuildContextMenu();
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
function rebuildContextMenu() {
    if (!tray)
        return;
    const menuItems = [
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
    ];
    // Add notification count if any
    if (pendingNotificationCount > 0) {
        menuItems.push({
            type: 'separator',
        });
        menuItems.push({
            label: `${pendingNotificationCount} pending reminder${pendingNotificationCount > 1 ? 's' : ''}`,
            enabled: false,
        });
    }
    menuItems.push({
        type: 'separator',
    });
    menuItems.push({
        label: 'Quit',
        click: () => {
            app.quit();
        },
    });
    const contextMenu = Menu.buildFromTemplate(menuItems);
    tray.setContextMenu(contextMenu);
}
export function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
    mainWindowRef = null;
}
function updateTrayTooltip() {
    if (!tray)
        return;
    if (pendingNotificationCount > 0) {
        tray.setToolTip(`UpTier - ${pendingNotificationCount} pending reminder${pendingNotificationCount > 1 ? 's' : ''}`);
    }
    else {
        tray.setToolTip('UpTier');
    }
}
export function setTrayTooltip(text) {
    if (tray) {
        tray.setToolTip(text);
    }
}
export function updateNotificationCount(count) {
    pendingNotificationCount = count;
    updateTrayTooltip();
    rebuildContextMenu();
}
//# sourceMappingURL=tray.js.map