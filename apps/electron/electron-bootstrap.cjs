// Bootstrap script that patches Node's module resolution to properly handle
// the 'electron' module in pnpm monorepos.
// This script runs before the main entry point via --require flag.

const Module = require('module');
const path = require('path');

// Only patch if we're inside Electron's main process
if (process.versions.electron && process.type === 'browser') {
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function(request, parent, isMain, options) {
    // Intercept require('electron') to prevent it from resolving to node_modules
    if (request === 'electron') {
      // Return 'electron' as-is, letting Electron's built-in module system handle it
      // Electron registers 'electron' as a built-in module
      return 'electron';
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  console.log('[electron-bootstrap] Module resolution patched for Electron');
}
