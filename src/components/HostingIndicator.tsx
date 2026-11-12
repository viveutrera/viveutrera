import { useEffect, useState } from 'react';
import { publicPath } from '../lib/routing';

export function HostingIndicator() {
  const [label, setLabel] = useState('Comprobando alojamiento…');

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      controller?.abort();
      clearTimeout(timeout);
      const current = new AbortController();
      controller = current;
      setLabel('Comprobando alojamiento…');
      timeout = setTimeout(() => current.abort(), 5000);
      try {
        // A unique URL also avoids cache-first responses from older workers.
        const url = `${publicPath('hosting-info.json')}?check=${crypto.randomUUID()}`;
        const response = await fetch(url, {
          cache: 'no-store', redirect: 'error', signal: current.signal
        });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          throw new Error('Invalid hosting marker');
        }
        const data: unknown = await response.json();
        const hosting = data && typeof data === 'object' && 'hosting' in data ? data.hosting : null;
        if (hosting !== 'SW Hosting' && hosting !== 'Cloudflare Pages') {
          throw new Error('Unknown hosting');
        }
        if (active && controller === current) {
          setLabel(hosting === 'SW Hosting' ? 'v2.0 SW' : 'v1.1 Cl');
        }
      } catch {
        if (active && controller === current) setLabel('Alojamiento sin verificar');
      } finally {
        if (controller === current) clearTimeout(timeout);
      }
    };

    void check();
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    const interval = setInterval(check, 60_000);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener('online', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return <p className="hosting-indicator" role="status">{label}</p>;
}
