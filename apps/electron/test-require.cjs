console.log('Testing require("electron")...');
try {
  const electron = require('electron');
  console.log('SUCCESS! electron type:', typeof electron);
  console.log('electron.app:', typeof electron.app);
  console.log('electron.BrowserWindow:', typeof electron.BrowserWindow);
  console.log('Keys:', Object.keys(electron).slice(0, 10));
} catch (e) {
  console.log('FAILED:', e.message);
  console.log('Stack:', e.stack);
}
