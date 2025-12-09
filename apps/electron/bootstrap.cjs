// Bootstrap script that ensures require('electron') resolves to Electron's internal module
// This runs before our main entry point and patches the module resolution

const Module = require('module');

// Get original resolve filename
const originalResolveFilename = Module._resolveFilename;

// Patch Module._resolveFilename to skip node_modules/electron only for 'electron' requests
Module._resolveFilename = function(request, parent, isMain, options) {
  // Only intercept 'electron' requires
  if (request === 'electron') {
    // Clear the parent's paths temporarily to force resolution to Electron's built-in
    const originalPaths = parent && parent.paths;
    if (parent && parent.paths) {
      parent.paths = [];
    }

    try {
      // This should now resolve to Electron's built-in module
      return originalResolveFilename.call(this, request, parent, isMain, options);
    } catch (e) {
      // If that fails, restore paths and try again
      if (parent) parent.paths = originalPaths;
      return originalResolveFilename.call(this, request, parent, isMain, options);
    } finally {
      // Always restore paths
      if (parent) parent.paths = originalPaths;
    }
  }

  // For all other modules, use normal resolution
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Now load the actual entry point
require('./out/main/index.js');
