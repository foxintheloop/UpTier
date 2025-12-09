// This runs inside Electron to see what's available
console.log('=== Electron Internal Test ===');
console.log('process.versions.electron:', process.versions.electron);
console.log('process.type:', process.type);

// Check for internal electron bindings/modules
console.log('\n=== Checking for internal access ===');

// Try to find where Electron stores its internal exports
const Module = require('module');
console.log('Module._cache keys containing electron:');
Object.keys(Module._cache).forEach(key => {
  if (key.includes('electron')) {
    console.log('  -', key);
  }
});

// Check if there's an internal require
console.log('\nprocess keys:', Object.keys(process).filter(k => k.includes('electron') || k.includes('binding')));

// Try accessing electron binding
try {
  const binding = process.electronBinding('electron');
  console.log('electronBinding("electron"):', typeof binding);
} catch (e) {
  console.log('electronBinding("electron") error:', e.message);
}

// Try to see what c._load is doing
console.log('\n=== Module._load info ===');
const originalLoad = Module._load.toString().substring(0, 200);
console.log('Module._load (first 200 chars):', originalLoad);

process.exit(0);
