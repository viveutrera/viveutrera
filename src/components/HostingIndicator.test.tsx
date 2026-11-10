import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostingIndicator } from './HostingIndicator';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const marker = (hosting: string | null) => new Response(JSON.stringify({ hosting }), {
  headers: { 'Content-Type': 'application/json' }
});

describe('HostingIndicator', () => {
  it.each(['SW Hosting', 'Cloudflare Pages'])('reports %s from the response, independently of the hostname', async (hosting) => {
    const fetch = vi.fn().mockResolvedValue(marker(hosting));
    vi.stubGlobal('fetch', fetch);
    render(<HostingIndicator />);
    expect(await screen.findByText(`Alojamiento: ${hosting}`)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/^\/hosting-info\.json\?check=.+/), {
      cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal)
    });
  });

  it.each([
    () => Promise.reject(new Error('Offline')),
    () => Promise.resolve(new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } })),
    () => Promise.resolve(marker(null)),
    () => Promise.resolve(new Response('Missing', { status: 404 }))
  ])('does not claim a hosting when the marker cannot be verified', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(response));
    render(<HostingIndicator />);
    expect(await screen.findByText('Alojamiento sin verificar')).toBeInTheDocument();
  });

  it('rechecks with a different URL and removes a previous hosting after a network failure', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(marker('SW Hosting')).mockRejectedValueOnce(new Error('Offline'));
    vi.stubGlobal('fetch', fetch);
    render(<HostingIndicator />);
    await screen.findByText('Alojamiento: SW Hosting');
    fireEvent.focus(window);
    await screen.findByText('Alojamiento sin verificar');
    expect(fetch.mock.calls[0][0]).not.toBe(fetch.mock.calls[1][0]);
    await waitFor(() => expect(screen.queryByText('Alojamiento: SW Hosting')).not.toBeInTheDocument());
  });
});
