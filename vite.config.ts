import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, cp, mkdir, writeFile } from 'node:fs/promises';
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
        // Server-local marker; never infer the responding host from its domain.
        const hosting = process.env.CF_PAGES === '1' ? 'Cloudflare Pages' : mode === 'sw' ? 'SW Hosting' : null;
        await writeFile(resolve(output, 'hosting-info.json'), `${JSON.stringify({ hosting })}\n`);
        if (mode === 'sw') {
          if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('La API SW necesita las variables públicas de Supabase.');
          }
          await cp(resolve('sw-hosting'), resolve(output, 'api'), { recursive: true });
          const config = {
            supabase_url: env.VITE_SUPABASE_URL,
            supabase_anon_key: env.VITE_SUPABASE_ANON_KEY,
            public_media_url: env.VITE_PUBLIC_MEDIA_BASE_URL,
            allowed_origins: ['https://viveutrera.es', 'https://www.viveutrera.es']
          };
          const encoded = Buffer.from(JSON.stringify(config)).toString('base64');
          await writeFile(resolve(output, 'api/media-config.php'),
            `<?php\n$config = json_decode(base64_decode('${encoded}'), true);\n$config['media_directory'] = dirname(__DIR__) . '/media';\nreturn $config;\n`);
        }
      }
    }],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts'
    }
  };
});
