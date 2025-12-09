import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
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
