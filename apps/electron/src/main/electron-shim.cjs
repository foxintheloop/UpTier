// Electron module shim for pnpm monorepo compatibility
// When running inside Electron, this resolves to the real Electron APIs
// When running in regular Node (e.g., spawning), it returns the electron path

if (process.versions.electron) {
  // We're inside Electron - need to get the real module
  // Delete this module from cache so subsequent requires go through Electron's interception
  const modulePath = require.resolve('./electron-shim.cjs');
  delete require.cache[modulePath];

  // Now we need to get the real Electron module
  // Use process.electronBinding to access Electron's internal APIs
  const getElectronModule = () => {
    try {
      // Method 1: Try to require from Electron's internal module location
      const path = require('path');
      const electronInternalPath = path.join(
        path.dirname(process.execPath),
        'resources',
        'electron.asar',
        'browser',
        'api',
        'exports',
        'electron.js'
      );
      return require(electronInternalPath);
    } catch (e1) {
      try {
        // Method 2: Try without .asar
        const path = require('path');
        const electronInternalPath = path.join(
          path.dirname(process.execPath),
          'resources',
          'electron',
          'browser',
          'api',
          'exports',
          'electron.js'
        );
        return require(electronInternalPath);
      } catch (e2) {
        // Method 3: The require('electron') should work now that we've deleted our cache entry
        // and Electron's Module._load hook should intercept it
        const Module = require('module');
        const originalLoad = Module._load;
        Module._load = function(request, parent, isMain) {
          if (request === 'electron' && parent && parent.filename === __filename) {
            // Prevent recursion
            throw new Error('Electron module not found in internal path');
          }
          return originalLoad.call(this, request, parent, isMain);
        };
        try {
          const result = require('electron');
          return result;
        } finally {
          Module._load = originalLoad;
        }
      }
    }
  };

  module.exports = getElectronModule();
} else {
  // Not in Electron - return the path to electron executable
  const path = require('path');
  const fs = require('fs');

  // Find the electron executable
  const electronPath = path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'electron', 'dist', 'electron.exe');
  if (fs.existsSync(electronPath)) {
    module.exports = electronPath;
  } else {
    // Try pnpm path
    const pnpmPath = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '.pnpm', 'electron@31.7.7', 'node_modules', 'electron', 'dist', 'electron.exe');
    module.exports = pnpmPath;
  }
}
