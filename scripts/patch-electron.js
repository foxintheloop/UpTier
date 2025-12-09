#!/usr/bin/env node

/**
 * This script patches the electron npm package's index.js to work correctly
 * in pnpm monorepos. The issue is that when running inside Electron's main process,
 * require('electron') should return Electron's internal module, but the npm package
 * returns the path to electron.exe instead.
 */

const fs = require('fs');
const path = require('path');

// Find the electron package in node_modules
const electronPaths = [
  path.join(__dirname, '..', 'node_modules', 'electron', 'index.js'),
  path.join(__dirname, '..', 'node_modules', '.pnpm', 'electron@31.7.7', 'node_modules', 'electron', 'index.js'),
];

let electronIndexPath = null;
for (const p of electronPaths) {
  if (fs.existsSync(p)) {
    electronIndexPath = p;
    break;
  }
}

if (!electronIndexPath) {
  console.log('Could not find electron package, skipping patch');
  process.exit(0);
}

console.log('Patching electron package at:', electronIndexPath);

const patchedCode = `const fs = require('fs');
const path = require('path');

const pathFile = path.join(__dirname, 'path.txt');

// Check if we're running inside Electron
const isElectronRuntime = !!(process.versions && process.versions.electron);

if (isElectronRuntime) {
  // When running inside Electron, use the internal module
  // Electron patches Module._load to intercept 'electron' requires
  // but we need to bypass the file resolution to trigger it
  const Module = require('module');
  const originalResolveFilename = Module._resolveFilename;

  // Temporarily patch _resolveFilename to return 'electron' unchanged
  Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'electron') {
      return 'electron';
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  // Now call Module._load directly with 'electron'
  // Electron's patched _load will intercept this and return the internal module
  try {
    const electronModule = Module._load('electron', module, false);

    // Restore original _resolveFilename
    Module._resolveFilename = originalResolveFilename;

    if (electronModule && electronModule.app && typeof electronModule.app.whenReady === 'function') {
      module.exports = electronModule;
    } else {
      // Fallback to returning the path
      module.exports = getElectronPath();
    }
  } catch (e) {
    // Restore original _resolveFilename
    Module._resolveFilename = originalResolveFilename;
    // Fall back to returning the path
    module.exports = getElectronPath();
  }
} else {
  // We're outside Electron (e.g., spawning electron process from Node.js)
  // Return the path to the electron executable
  module.exports = getElectronPath();
}

function getElectronPath() {
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, 'utf-8').trim();
  }
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || 'electron');
  }
  if (executablePath) {
    return path.join(__dirname, 'dist', executablePath);
  } else {
    throw new Error('Electron failed to install correctly, please delete node_modules/electron and try installing again');
  }
}
`;

// Get the real path of the electron index.js (follow symlink)
const realPath = fs.realpathSync(electronIndexPath);
fs.writeFileSync(realPath, patchedCode);
console.log('Successfully patched electron package at:', realPath);
