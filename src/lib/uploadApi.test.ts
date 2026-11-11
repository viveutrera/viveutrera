import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadApiEndpoint, uploadMediaFile, deleteMediaFiles } from './uploadApi';

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token' } } })) } }
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('media API destinations', () => {
  it('keeps the Cloudflare Worker routes compatible', () => {
    expect(uploadApiEndpoint('https://example.workers.dev/', 'upload')).toBe('https://example.workers.dev/upload');
    expect(uploadApiEndpoint('https://example.workers.dev', 'delete')).toBe('https://example.workers.dev/delete');
  });

  it('sends uploads and deletions to the PHP endpoint with the Supabase session', async () => {
    vi.stubEnv('VITE_UPLOAD_API_URL', 'https://viveutrera.es/api/media.php');
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ asset: { object_key: 'site/a.png' }, publicUrl: 'https://viveutrera.es/media/site/a.png' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: ['site/a.png'] })));
    vi.stubGlobal('fetch', fetch);
    await uploadMediaFile(new File(['image'], 'a.png', { type: 'image/png' }), 'site');
    expect(fetch).toHaveBeenNthCalledWith(1, 'https://viveutrera.es/api/media.php?action=upload', expect.objectContaining({
      method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: expect.any(FormData)
    }));
    await deleteMediaFiles(['site/a.png']);
    expect(fetch).toHaveBeenNthCalledWith(2, 'https://viveutrera.es/api/media.php?action=delete', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ objectKeys: ['site/a.png'] })
    }));
  });

  it('uses the same PHP endpoint for uploads with progress', async () => {
    vi.stubEnv('VITE_UPLOAD_API_URL', 'https://viveutrera.es/api/media.php');
    const requests: TestRequest[] = [];
    class TestRequest {
      open = vi.fn();
      setRequestHeader = vi.fn();
      upload = {};
      status = 201;
      responseText = JSON.stringify({ asset: { object_key: 'site/a.png' } });
      onload?: () => void;
      send = vi.fn(() => this.onload?.());
      constructor() { requests.push(this); }
    }
    vi.stubGlobal('XMLHttpRequest', TestRequest);
    const progress = vi.fn();
    await uploadMediaFile(new File(['image'], 'a.png'), 'site', progress);
    expect(requests[0].open).toHaveBeenCalledWith('POST', 'https://viveutrera.es/api/media.php?action=upload');
    expect(requests[0].setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer test-token');
    expect(progress).toHaveBeenCalledWith(100);
  });
});
