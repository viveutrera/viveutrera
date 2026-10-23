import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_ASSET_BASE_PATH || '/',
    plugins: [react(), {
      name: 'pwa-start-page',
      apply: 'build',
      async closeBundle() {
        const output = resolve('dist');
        await mkdir(resolve(output, 'preview'), { recursive: true });
        await copyFile(resolve(output, 'index.html'), resolve(output, 'preview/index.html'));
      }
    }],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts'
    }
  };
});
