'use strict';

// This module provides access to Electron's internal APIs for main process
// It uses process._linkedBinding to access native modules directly
// This bypasses node_modules/electron which only returns a path string

const binding = process._linkedBinding;

// Main process APIs
const app = binding('electron_browser_app').app;
const BrowserWindow = binding('electron_browser_window').BrowserWindow;
const ipcMain = binding('electron_browser_ipc_main').ipcMain;
const Menu = binding('electron_browser_menu').Menu;
const MenuItem = binding('electron_browser_menu').MenuItem;
const Tray = binding('electron_browser_tray').Tray;
const dialog = binding('electron_browser_dialog').dialog;
const shell = binding('electron_browser_shell').shell;
const nativeTheme = binding('electron_browser_native_theme').nativeTheme;
const screen = binding('electron_browser_screen').screen;
const globalShortcut = binding('electron_browser_global_shortcut').globalShortcut;
const clipboard = binding('electron_browser_clipboard').clipboard;
const session = binding('electron_browser_session').session;
const crashReporter = binding('electron_browser_crash_reporter').crashReporter;
const net = binding('electron_browser_net').net;
const protocol = binding('electron_browser_protocol').protocol;
const powerMonitor = binding('electron_browser_power_monitor').powerMonitor;
const powerSaveBlocker = binding('electron_browser_power_save_blocker').powerSaveBlocker;
const contentTracing = binding('electron_browser_content_tracing').contentTracing;
const webContents = binding('electron_browser_web_contents').webContents;
const webFrameMain = binding('electron_browser_web_frame_main').webFrameMain;
const nativeImage = binding('electron_common_native_image').nativeImage;
const MessageChannelMain = binding('electron_browser_message_port').MessageChannelMain;
const safeStorage = binding('electron_browser_safe_storage').safeStorage;

// Try to get autoUpdater (may not be available on all platforms)
let autoUpdater = null;
try {
  autoUpdater = binding('electron_browser_auto_updater').autoUpdater;
} catch (e) {}

module.exports = {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  Tray,
  dialog,
  shell,
  nativeTheme,
  screen,
  globalShortcut,
  clipboard,
  session,
  crashReporter,
  autoUpdater,
  net,
  protocol,
  powerMonitor,
  powerSaveBlocker,
  contentTracing,
  webContents,
  webFrameMain,
  nativeImage,
  MessageChannelMain,
  safeStorage,
};
