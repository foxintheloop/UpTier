// Test what bindings are available in Electron
console.log('=== Testing Electron Bindings ===');
console.log('process.versions.electron:', process.versions.electron);

// Check for internal module loading
const Module = require('module');

// Try to see what electron does with require.cache
console.log('\n=== Checking for electron in require.cache ===');
const electronCacheKeys = Object.keys(require.cache).filter(k => k.includes('electron'));
console.log('Cache keys with electron:', electronCacheKeys);

// Check if electron is in Module._cache
if (Module._cache) {
  const moduleCacheKeys = Object.keys(Module._cache).filter(k => k.includes('electron'));
  console.log('Module._cache keys with electron:', moduleCacheKeys);
}

// Try to access electron's internal module directly via the path
console.log('\n=== Trying internal paths ===');

// Check what the npm electron package exports right now
const electronPkg = require('electron');
console.log('require("electron") type:', typeof electronPkg);
console.log('require("electron") value sample:', String(electronPkg).substring(0, 100));

// Try require.resolve with different options
console.log('\n=== Testing require.resolve ===');
try {
  const resolved = require.resolve('electron');
  console.log('require.resolve("electron"):', resolved);
} catch(e) {
  console.log('require.resolve error:', e.message);
}

// Check if there's a way to get internal electron module
console.log('\n=== Checking Module internals ===');
console.log('Module.builtinModules:', Module.builtinModules.filter(m => m.includes('electron') || m.includes('internal')));

// Try to see Electron's actual exported APIs by checking process
console.log('\n=== Process electron properties ===');
console.log('process.electron:', process.electron);
console.log('process.electronBinding:', typeof process.electronBinding);

// Try require.main
console.log('\n=== require.main ===');
console.log('require.main:', require.main ? require.main.filename : null);
