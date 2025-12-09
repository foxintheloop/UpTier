const fs = require('fs');

const patchLines = [
  '// Electron module resolution patch for pnpm monorepos',
  '(function() {',
  '  if (typeof process !== "undefined" && process.versions && process.versions.electron && process.type === "browser") {',
  '    var Module = require("module");',
  '    // Delete any cached version of the npm electron package',
  '    Object.keys(require.cache).forEach(function(key) {',
  '      if (key.includes("node_modules") && key.includes("electron") && key.endsWith("index.js")) {',
  '        delete require.cache[key];',
  '      }',
  '    });',
  '    // Patch _resolveFilename to prevent finding the npm package',
  '    var origResolve = Module._resolveFilename;',
  '    Module._resolveFilename = function(request, parent, isMain, options) {',
  '      if (request === "electron") {',
  '        return "electron"; // Return as builtin identifier',
  '      }',
  '      return origResolve.call(this, request, parent, isMain, options);',
  '    };',
  '    // Patch _load to intercept electron and use internal require',
  '    var origLoad = Module._load;',
  '    Module._load = function(request, parent, isMain) {',
  '      if (request === "electron") {',
  '        // Use the internal require from Electron',
  '        if (typeof __non_webpack_require__ !== "undefined") {',
  '          return __non_webpack_require__("electron");',
  '        }',
  '        // Try to access via NativeModule',
  '        try {',
  '          var NativeModule = process.binding("natives");',
  '          if (NativeModule && NativeModule.electron) {',
  '            return require("vm").runInThisContext(NativeModule.electron);',
  '          }',
  '        } catch(e) {}',
  '        // Fallback: call original but with empty parent to trigger builtin',
  '        return origLoad.call(this, "electron", null, false);',
  '      }',
  '      return origLoad.call(this, request, parent, isMain);',
  '    };',
  '  }',
  '})();',
  ''
];

const content = `import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin, OutputChunk } from 'vite';

// Custom plugin to inject the module resolution patch at the start of the main process bundle
function electronModulePatchPlugin(): Plugin {
  return {
    name: 'electron-module-patch',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Patch to fix require('electron') in pnpm monorepos
      // This patch intercepts Module._load to properly handle the electron module
      const patchCode = ${JSON.stringify(patchLines)}.join('\\n');

      for (const fileName of Object.keys(bundle)) {
        const chunk = bundle[fileName] as OutputChunk;
        if (chunk.type === 'chunk' && chunk.isEntry) {
          chunk.code = patchCode + chunk.code;
        }
      }
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), electronModulePatchPlugin()],
    build: {
      lib: {
        entry: './src/main/index.ts',
      },
      rollupOptions: {
        external: ['better-sqlite3', 'electron-store'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: './src/preload/index.ts',
      },
    },
  },
  renderer: {
    root: './src/renderer',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: './src/renderer/index.html',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@uptier/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
  },
});
`;

fs.writeFileSync('C:/Users/Hello/Documents/UpTier/apps/electron/electron.vite.config.ts', content);
console.log('Config file written successfully');
