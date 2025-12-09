// Test what's available in Electron's main process
console.log('process.versions.electron:', process.versions.electron);
console.log('process.type:', process.type);
console.log('process.electronBinding:', typeof process.electronBinding);
console.log('process._linkedBinding:', typeof process._linkedBinding);

// Check Module internals
const Module = require('module');
console.log('Module._cache keys with electron:', Object.keys(Module._cache).filter(k => k.includes('electron')));

// Check builtins
console.log('Module.builtinModules.includes electron:', Module.builtinModules.includes('electron'));

// Try to see if electron is registered as a native addon
if (process.moduleLoadList) {
  console.log('moduleLoadList with electron:', process.moduleLoadList.filter(m => m.includes('electron')));
}

// Check if electron is available as internal binding
try {
  const binding = process.binding ? process.binding('electron') : null;
  console.log('process.binding electron:', binding);
} catch(e) {
  console.log('process.binding electron error:', e.message);
}

// Most direct approach - just try require electron
console.log('About to require electron...');
try {
  const electron = require('electron');
  console.log('electron type:', typeof electron);
  console.log('electron keys:', Object.keys(electron || {}));
} catch(e) {
  console.log('require electron error:', e.message);
}
