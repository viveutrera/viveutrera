import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
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
        // Only this server-local marker differs; the application is identical.
        const hosting = process.env.CF_PAGES === '1' ? 'Cloudflare Pages' : mode === 'sw' ? 'SW Hosting' : null;
        await writeFile(resolve(output, 'hosting-info.json'), `${JSON.stringify({ hosting })}\n`);
      }
    }],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts'
    }
  };
});
