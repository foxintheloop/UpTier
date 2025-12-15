#!/usr/bin/env node
/**
 * Development launcher for electron-vite
 * Clears ELECTRON_RUN_AS_NODE which is inherited from VSCode/Electron parent processes
 * Without this, Electron runs in Node.js mode and can't access its internal APIs
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('[dev.js] Launching electron-vite dev...');
console.log('[dev.js] Clearing ELECTRON_RUN_AS_NODE from environment');

// Create clean environment without ELECTRON_RUN_AS_NODE
const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;

// Run electron-vite directly from root node_modules/.bin (pnpm hoists it there)
const isWindows = process.platform === 'win32';
const rootDir = path.join(__dirname, '..', '..', '..');
const electronViteBin = path.join(rootDir, 'node_modules', '.bin', isWindows ? 'electron-vite.cmd' : 'electron-vite');

const child = spawn(electronViteBin, ['dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: path.dirname(__dirname),
  env: cleanEnv,
  shell: isWindows,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
