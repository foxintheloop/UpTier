import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initializeDatabase, closeDb, getDbPath } from './database';
import { registerIpcHandlers } from './ipc-handlers';
import { createWindowState, saveWindowState, getWindowBounds } from './window-state';
import { createTray, destroyTray } from './tray';
import { notificationScheduler } from './notifications';
import { watch } from 'fs';
import log, { initializeLogger, createScopedLogger } from './logger';
const appLog = createScopedLogger('app');
let mainWindow = null;
let dbWatcher = null;
const isDev = process.env.NODE_ENV !== 'production';
// Initialize logger FIRST - before any other code
initializeLogger();
appLog.info('Application starting', {
    isDev,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
});
function createWindow() {
    appLog.info('Creating main window');
    // Initialize window state
    createWindowState();
    const bounds = getWindowBounds();
    appLog.debug('Window bounds retrieved', { ...bounds });
    mainWindow = new BrowserWindow({
        ...bounds,
        minWidth: 800,
        minHeight: 600,
        title: 'UpTier',
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
        backgroundColor: '#0f172a', // slate-900
    });
    appLog.debug('BrowserWindow created', {
        preloadPath: path.join(__dirname, '../preload/index.js'),
    });
    // Window event logging
    mainWindow.on('resize', () => {
        appLog.debug('Window resized');
        saveWindowState(mainWindow);
    });
    mainWindow.on('move', () => {
        appLog.debug('Window moved');
        saveWindowState(mainWindow);
    });
    mainWindow.on('close', () => {
        appLog.info('Window closing');
        saveWindowState(mainWindow);
    });
    // Show when ready
    mainWindow.once('ready-to-show', () => {
        appLog.info('Window ready to show');
        mainWindow?.show();
    });
    // WebContents event logging
    mainWindow.webContents.on('did-finish-load', () => {
        appLog.info('Renderer content loaded successfully');
    });
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        appLog.error('Renderer failed to load', new Error(errorDescription), {
            errorCode,
            validatedURL,
        });
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        appLog.error('Render process gone', new Error(details.reason), {
            exitCode: details.exitCode,
        });
    });
    mainWindow.webContents.on('unresponsive', () => {
        appLog.warn('Renderer became unresponsive');
    });
    mainWindow.webContents.on('responsive', () => {
        appLog.info('Renderer became responsive');
    });
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
        // Only log errors and warnings from renderer console
        if (level >= 2) {
            const levelName = level === 2 ? 'warn' : 'error';
            appLog.warn(`Renderer console.${levelName}`, { message, line, sourceId });
        }
    });
    // Load the app
    if (isDev) {
        const devUrl = 'http://localhost:5173';
        appLog.info('Loading dev URL', { url: devUrl });
        mainWindow.loadURL(devUrl).catch((err) => {
            appLog.error('Failed to load dev URL', err, { url: devUrl });
        });
    }
    else {
        const prodPath = path.join(__dirname, '../renderer/index.html');
        appLog.info('Loading production file', { path: prodPath });
        mainWindow.loadFile(prodPath).catch((err) => {
            appLog.error('Failed to load production file', err, { path: prodPath });
        });
    }
    mainWindow.on('closed', () => {
        appLog.info('Window closed');
        mainWindow = null;
    });
}
function setupDatabaseWatcher() {
    const dbPath = getDbPath();
    appLog.info('Setting up database watcher', { dbPath });
    try {
        // Watch for external database changes (from MCP server)
        dbWatcher = watch(dbPath, (eventType) => {
            if (eventType === 'change' && mainWindow) {
                appLog.debug('Database file changed externally, notifying renderer');
                mainWindow.webContents.send('database-changed');
            }
        });
        appLog.info('Database watcher established successfully');
    }
    catch (error) {
        appLog.error('Failed to set up database watcher', error);
    }
}
app.whenReady().then(() => {
    // Handle renderer logs via IPC (must be registered after app is ready)
    ipcMain.on('log:renderer', (_event, level, message, data) => {
        const logMessage = `[renderer] ${message}`;
        const logData = data ? JSON.stringify(data) : '';
        switch (level) {
            case 'debug':
                log.debug(logMessage, logData);
                break;
            case 'info':
                log.info(logMessage, logData);
                break;
            case 'warn':
                log.warn(logMessage, logData);
                break;
            case 'error':
                log.error(logMessage, logData);
                break;
            default:
                log.info(logMessage, logData);
        }
    });
    appLog.info('App ready event fired', {
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
    });
    // Initialize database
    try {
        initializeDatabase();
        appLog.info('Database initialized successfully');
    }
    catch (error) {
        appLog.error('Database initialization failed', error);
        app.quit();
        return;
    }
    // Register IPC handlers
    registerIpcHandlers();
    appLog.info('IPC handlers registered');
    // Create window
    createWindow();
    // Create tray
    createTray(mainWindow);
    appLog.info('System tray created');
    // Start notification scheduler
    notificationScheduler.start(mainWindow);
    appLog.info('Notification scheduler started');
    // Watch database for external changes
    setupDatabaseWatcher();
    app.on('activate', () => {
        appLog.info('App activated');
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    appLog.info('All windows closed');
    if (process.platform !== 'darwin') {
        appLog.info('Quitting application (non-macOS)');
        app.quit();
    }
});
app.on('before-quit', () => {
    appLog.info('Application before-quit event');
    // Clean up
    if (dbWatcher) {
        dbWatcher.close();
        dbWatcher = null;
        appLog.debug('Database watcher closed');
    }
    notificationScheduler.stop();
    appLog.debug('Notification scheduler stopped');
    destroyTray();
    appLog.debug('Tray destroyed');
    closeDb();
    appLog.info('Application shutdown complete');
});
// Global error handlers
process.on('uncaughtException', (error) => {
    appLog.error('Uncaught exception', error);
});
process.on('unhandledRejection', (reason) => {
    appLog.error('Unhandled rejection', reason);
});
// Export for tray access
export function getMainWindow() {
    return mainWindow;
}
export function focusMainWindow() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
        appLog.debug('Main window focused');
    }
}
//# sourceMappingURL=index.js.map