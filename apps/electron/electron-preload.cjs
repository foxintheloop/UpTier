// This script is loaded BEFORE the main entry via electron --require
// It patches the module system to make require('electron') work correctly

const Module = require('module');
const path = require('path');

// Only patch if we're in Electron main process
if (process.versions.electron && process.type !== 'renderer') {
  const originalResolve = Module._resolveFilename;
  
  // Hook _resolveFilename to make 'electron' requires throw MODULE_NOT_FOUND
  // This triggers Electron's c._load fallback to return the internal module
  Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'electron' || request.startsWith('electron/')) {
      // Throw MODULE_NOT_FOUND to trigger Electron's built-in module handling
      const err = new Error(`Cannot find module '${request}'`);
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };
  
  console.log('[electron-preload] Module resolution hook installed');
}
