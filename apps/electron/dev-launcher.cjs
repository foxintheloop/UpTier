const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const electronDist = path.join(__dirname, '../../node_modules/.pnpm/electron@31.7.7/node_modules/electron/dist');
const resourcesApp = path.join(electronDist, 'resources', 'app');
const electronExe = path.join(electronDist, 'electron.exe');
const outDir = path.join(__dirname, 'out');

// Copy function
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Clean and create resources/app
if (fs.existsSync(resourcesApp)) {
  fs.rmSync(resourcesApp, { recursive: true, force: true });
}
fs.mkdirSync(resourcesApp, { recursive: true });

// Copy built output
console.log('Copying built files to resources/app...');
copyRecursive(outDir, resourcesApp);

// Create package.json in resources/app
const packageJson = {
  name: 'uptier',
  main: 'main/index.js'
};
fs.writeFileSync(path.join(resourcesApp, 'package.json'), JSON.stringify(packageJson, null, 2));

// Copy node_modules for native modules
const nodeModulesSource = path.join(__dirname, '../../node_modules');
const betterSqlite3 = path.join(nodeModulesSource, '.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3');
const electronStore = path.join(nodeModulesSource, '.pnpm/electron-store@8.2.0/node_modules/electron-store');

if (fs.existsSync(betterSqlite3)) {
  copyRecursive(betterSqlite3, path.join(resourcesApp, 'node_modules', 'better-sqlite3'));
}
if (fs.existsSync(electronStore)) {
  copyRecursive(electronStore, path.join(resourcesApp, 'node_modules', 'electron-store'));
}

// Also copy @uptier/shared
const sharedPkg = path.join(__dirname, '../../packages/shared');
copyRecursive(sharedPkg, path.join(resourcesApp, 'node_modules', '@uptier', 'shared'));

console.log('Starting Electron...');
console.log('Electron path:', electronExe);
console.log('App path:', resourcesApp);

// Run electron
const child = spawn(electronExe, [], {
  cwd: resourcesApp,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('error', (err) => {
  console.error('Failed to start electron:', err);
});

child.on('exit', (code) => {
  console.log('Electron exited with code:', code);
  process.exit(code || 0);
});
