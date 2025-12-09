// Test what Electron internal APIs are available
console.log('=== Electron Internals Test ===');
console.log('process.versions.electron:', process.versions.electron);
console.log('process.type:', process.type);

// Check for electronBinding
console.log('\n=== process.electronBinding ===');
if (typeof process.electronBinding === 'function') {
  console.log('electronBinding is available');
  try {
    const bindings = ['app', 'browser_window', 'ipc_main', 'electron'];
    for (const name of bindings) {
      try {
        const b = process.electronBinding(name);
        console.log('  ' + name + ':', typeof b, b ? Object.keys(b).slice(0,5) : '(null)');
      } catch (e) {
        console.log('  ' + name + ': ERROR - ' + e.message);
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
} else {
  console.log('electronBinding not available');
}

// Check Module._cache for any electron-related entries
console.log('\n=== Module._cache electron entries ===');
const Module = require('module');
const electronKeys = Object.keys(Module._cache).filter(function(k) {
  return k.toLowerCase().includes('electron');
});
console.log('Found', electronKeys.length, 'entries');
electronKeys.forEach(function(k) { console.log('  -', k); });

// Try to find internal modules
console.log('\n=== Checking for internal electron ===');
const variants = [
  'electron/main',
  'electron/common',
  'electron/renderer',
];
for (const v of variants) {
  try {
    const m = require(v);
    console.log(v + ': SUCCESS -', typeof m, m ? Object.keys(m).slice(0,5) : '(null)');
  } catch (e) {
    console.log(v + ':', e.code || e.message);
  }
}

process.exit(0);
