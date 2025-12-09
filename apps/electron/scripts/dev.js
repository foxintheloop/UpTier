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

// Use npx to run electron-vite
const child = spawn('npx', ['electron-vite', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: path.dirname(__dirname),
  env: cleanEnv,
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
