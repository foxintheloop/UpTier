#!/usr/bin/env node
/**
 * Deploy MCP Server to standalone directory
 *
 * This script deploys the MCP server to ~/.uptier/mcp-server/ with its own
 * node_modules. This prevents NODE_MODULE_VERSION conflicts between Electron
 * (Node 22) and Claude Desktop (Node 23) when using better-sqlite3.
 *
 * Usage: node scripts/deploy-mcp.js
 *        pnpm --filter @uptier/mcp-server deploy
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  log(`\n[${step}] ${msg}`, 'blue');
}

function logSuccess(msg) {
  log(`  ✓ ${msg}`, 'green');
}

function logError(msg) {
  log(`  ✗ ${msg}`, 'red');
}

// Paths
const projectRoot = path.join(__dirname, '..');
const mcpServerSrc = path.join(projectRoot, 'apps', 'mcp-server');
const sharedSrc = path.join(projectRoot, 'packages', 'shared');

// Deployment target
const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const deployDir = path.join(appData.includes('.uptier') ? path.dirname(appData) : appData, '.uptier', 'mcp-server');

// Claude Desktop config path
const claudeConfigPath = path.join(appData, 'Claude', 'claude_desktop_config.json');

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Create standalone package.json
 */
function createPackageJson() {
  return {
    name: 'uptier-mcp-server',
    version: '1.0.0',
    private: true,
    type: 'module',
    main: './index.js',
    dependencies: {
      '@uptier/shared': 'file:./shared',
      '@modelcontextprotocol/sdk': '^1.0.0',
      'better-sqlite3': '^11.10.0',
      'pino': '^10.1.0',
      'zod': '^3.23.0',
    },
  };
}

/**
 * Update Claude Desktop config
 */
function updateClaudeConfig() {
  const entryPoint = path.join(deployDir, 'index.js').replace(/\\/g, '/');

  let config = { mcpServers: {} };

  if (fs.existsSync(claudeConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf-8'));
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
    } catch (e) {
      log(`  Warning: Could not parse existing config, creating new one`, 'yellow');
    }
  }

  // Use the full path to node.exe that's running this script
  // This ensures Claude Desktop uses the same Node.js version
  const nodeExePath = process.execPath.replace(/\\/g, '/');

  config.mcpServers.uptier = {
    command: nodeExePath,
    args: [entryPoint],
    env: {
      NODE_ENV: 'production',
    },
  };

  // Ensure Claude config directory exists
  const claudeConfigDir = path.dirname(claudeConfigPath);
  if (!fs.existsSync(claudeConfigDir)) {
    fs.mkdirSync(claudeConfigDir, { recursive: true });
  }

  fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2) + '\n');
  return entryPoint;
}

/**
 * Main deployment function
 */
async function deploy() {
  log('\n=== UpTier MCP Server Deployment ===', 'blue');
  log(`Target: ${deployDir}`);

  // Step 1: Check if source files exist
  logStep(1, 'Checking source files...');

  const mcpDist = path.join(mcpServerSrc, 'dist');
  const sharedDist = path.join(sharedSrc, 'dist');
  const sharedSchema = path.join(sharedSrc, 'src', 'schema.sql');

  if (!fs.existsSync(mcpDist)) {
    logError('MCP server not built. Run: pnpm --filter @uptier/shared build && pnpm --filter @uptier/mcp-server build');
    process.exit(1);
  }
  logSuccess('MCP server dist found');

  if (!fs.existsSync(sharedDist)) {
    logError('Shared package not built. Run: pnpm --filter @uptier/shared build');
    process.exit(1);
  }
  logSuccess('Shared package dist found');

  if (!fs.existsSync(sharedSchema)) {
    logError('schema.sql not found');
    process.exit(1);
  }
  logSuccess('schema.sql found');

  // Step 2: Clean and create deployment directory
  logStep(2, 'Preparing deployment directory...');

  if (fs.existsSync(deployDir)) {
    // Remove old deployment but keep node_modules if deps haven't changed
    const keepNodeModules = fs.existsSync(path.join(deployDir, 'node_modules'));
    const oldPkg = keepNodeModules ?
      JSON.parse(fs.readFileSync(path.join(deployDir, 'package.json'), 'utf-8').toString()) : null;

    // Remove everything except node_modules
    const entries = fs.readdirSync(deployDir);
    for (const entry of entries) {
      if (entry !== 'node_modules') {
        const entryPath = path.join(deployDir, entry);
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
    logSuccess('Cleaned old deployment');
  } else {
    fs.mkdirSync(deployDir, { recursive: true });
    logSuccess('Created deployment directory');
  }

  // Step 3: Copy MCP server dist
  logStep(3, 'Copying MCP server files...');
  copyDir(mcpDist, deployDir);
  logSuccess('Copied MCP server dist');

  // Step 4: Copy shared package
  logStep(4, 'Copying shared package...');

  const sharedDeployDir = path.join(deployDir, 'shared');
  fs.mkdirSync(path.join(sharedDeployDir, 'dist'), { recursive: true });
  fs.mkdirSync(path.join(sharedDeployDir, 'src'), { recursive: true });

  copyDir(sharedDist, path.join(sharedDeployDir, 'dist'));
  fs.copyFileSync(sharedSchema, path.join(sharedDeployDir, 'src', 'schema.sql'));

  // Create shared package.json for proper module resolution
  const sharedPkg = {
    name: '@uptier/shared',
    version: '1.0.0',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        require: './dist/index.js',
        import: './dist/index.js',
        default: './dist/index.js',
      },
      './schema.sql': './src/schema.sql',
    },
  };
  fs.writeFileSync(
    path.join(sharedDeployDir, 'package.json'),
    JSON.stringify(sharedPkg, null, 2)
  );
  logSuccess('Copied shared package');

  // Step 5: Create package.json
  logStep(5, 'Creating package.json...');

  const pkg = createPackageJson();
  fs.writeFileSync(
    path.join(deployDir, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );
  logSuccess('Created package.json');

  // Step 6: Install dependencies
  logStep(6, 'Installing dependencies (this may take a minute)...');

  try {
    // Find npm relative to the current node executable
    // This ensures we use npm from the same Node installation
    const nodeDir = path.dirname(process.execPath);
    const isWindows = process.platform === 'win32';

    // Try multiple npm locations
    const npmLocations = [
      path.join(nodeDir, isWindows ? 'npm.cmd' : 'npm'),
      path.join(nodeDir, 'npm'),
      'npm', // Fallback to PATH
    ];

    let npmPath = 'npm';
    for (const loc of npmLocations) {
      if (fs.existsSync(loc)) {
        npmPath = loc;
        break;
      }
    }

    log(`  Using npm: ${npmPath}`, 'yellow');
    log(`  Using node: ${process.execPath}`, 'yellow');

    // Ensure node is in PATH for npm's child processes (like node-gyp)
    const env = { ...process.env };
    const pathSep = isWindows ? ';' : ':';
    env.PATH = nodeDir + pathSep + (env.PATH || env.Path || '');
    if (isWindows && env.Path) {
      env.Path = nodeDir + pathSep + env.Path;
    }

    const result = spawnSync(npmPath, ['install'], {
      cwd: deployDir,
      stdio: 'inherit',
      shell: isWindows,
      env: env,
    });

    if (result.status !== 0) {
      throw new Error(`npm install failed with status ${result.status}`);
    }
    logSuccess('Dependencies installed');
  } catch (e) {
    logError(`Failed to install dependencies: ${e.message}`);
    log(`  Try running manually: cd "${deployDir}" && npm install`, 'yellow');
    process.exit(1);
  }

  // Step 7: Update Claude Desktop config
  logStep(7, 'Updating Claude Desktop config...');

  try {
    const entryPoint = updateClaudeConfig();
    logSuccess(`Claude Desktop config updated`);
    logSuccess(`Entry point: ${entryPoint}`);
  } catch (e) {
    logError(`Failed to update Claude Desktop config: ${e.message}`);
    log(`  You may need to manually configure Claude Desktop`, 'yellow');
  }

  // Done!
  log('\n=== Deployment Complete ===', 'green');
  log(`\nMCP server deployed to: ${deployDir}`);
  log(`\nTo use with Claude Desktop:`);
  log(`  1. Restart Claude Desktop`);
  log(`  2. The UpTier tools should now be available`);
  log(`\nNote: The database is stored at ~/.uptier/tasks.db`);
  log(`      Both the Electron app and MCP server share this database.`);
}

// Run deployment
deploy().catch((err) => {
  logError(`Deployment failed: ${err.message}`);
  process.exit(1);
});
