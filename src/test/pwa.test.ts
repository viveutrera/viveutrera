// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8'));

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const entries = new Map<string, Response>();
  const key = (request: string | { url: string }) => typeof request === 'string' ? request : request.url;
  const fetch = vi.fn(async (request: string | { url: string }) => {
    // GitHub Pages returns 404 for a client-side route without a static entry.
    return new Response('page', { status: key(request) === '/preview' ? 404 : 200 });
  });
  const cache = {
    async addAll(urls: string[]) {
      const responses = await Promise.all(urls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Precache failed: ${url}`);
        return [url, response] as const;
      }));
      responses.forEach(([url, response]) => entries.set(url, response));
    },
    async put(request: string | { url: string }, response: Response) {
      entries.set(key(request), response);
    }
  };
  const caches = {
    open: vi.fn(async () => cache),
    match: vi.fn(async (request: string | { url: string }) => entries.get(key(request))?.clone()),
    keys: vi.fn(async () => ['vive-utrera-shell-v3', 'another-app-cache']),
    delete: vi.fn(async () => true)
  };
  const self = {
    location: { origin: 'https://viveutrera.es' },
    addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) }
  };
  runInNewContext(source, { self, caches, fetch, URL });
  const lifecycle = (name: string) => new Promise<void>((resolve, reject) => {
    handlers[name]({ waitUntil: (promise: Promise<void>) => promise.then(resolve, reject) });
  });
  const request = (path: string, mode = 'navigate') => new Promise<Response>((resolve, reject) => {
    handlers.fetch({
      request: { method: 'GET', mode, url: `https://viveutrera.es${path}` },
      respondWith: (promise: Promise<Response>) => promise.then(resolve, reject)
    });
  });
  return { fetch, caches, entries, self, lifecycle, request };
}

describe('PWA installation and updates', () => {
  it('installs with the manifest start page and every Android/iPhone icon cached', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    expect(sw.entries.has(manifest.start_url)).toBe(true);
    for (const icon of manifest.icons) expect(sw.entries.has(icon.src)).toBe(true);
    expect(sw.entries.has('/brand/pwa-icon-180.png')).toBe(true);
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });

  it('removes old app caches without deleting caches owned by other apps', async () => {
    const sw = worker();
    await sw.lifecycle('activate');
    expect(sw.caches.delete).toHaveBeenCalledExactlyOnceWith('vive-utrera-shell-v3');
  });

  it('serves the cached app shell on navigation 404s and when offline', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    sw.fetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }));
    expect((await sw.request('/guia/es')).status).toBe(200);
    sw.fetch.mockRejectedValueOnce(new Error('Offline'));
    expect((await sw.request(manifest.start_url)).status).toBe(200);
  });

  it('does not store authenticated navigation responses in the public shell cache', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    sw.fetch.mockResolvedValueOnce(new Response('Private page'));
    expect(await (await sw.request('/admin')).text()).toBe('Private page');
    expect(sw.entries.has('https://viveutrera.es/admin')).toBe(false);
  });

  it('refreshes a cached manifest and retains it for offline use', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    sw.fetch.mockResolvedValueOnce(new Response('Updated manifest'));
    expect(await (await sw.request('/manifest.webmanifest', 'cors')).text()).toBe('Updated manifest');
    sw.fetch.mockRejectedValueOnce(new Error('Offline'));
    expect(await (await sw.request('/manifest.webmanifest', 'cors')).text()).toBe('Updated manifest');
  });
});
