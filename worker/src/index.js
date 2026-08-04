const maxFileSize = 50 * 1024 * 1024;
const allowedTargets = new Set(['site', 'element-image', 'element-audio', 'collaborator']);

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true }, 200, corsHeaders);
    }

    if (url.pathname !== '/upload' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404, corsHeaders);
    }

    try {
      await assertAdmin(request, env);
      const formData = await request.formData();
      const file = formData.get('file');
      const target = String(formData.get('target') || 'site');

      if (!file || typeof file === 'string') {
        return json({ error: 'Falta el fichero.' }, 400, corsHeaders);
      }

      if (!allowedTargets.has(target)) {
        return json({ error: 'Destino de subida no permitido.' }, 400, corsHeaders);
      }

      if (file.size <= 0 || file.size > maxFileSize) {
        return json({ error: 'El fichero supera el limite de 50 MB.' }, 400, corsHeaders);
      }

      const objectKey = buildObjectKey(target, file.name);
      const mediaType = inferMediaType(target, file.type);

      await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream'
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

      return json({
        publicUrl: `${String(env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '')}/${objectKey}`,
        asset: {
          object_key: objectKey,
          media_type: mediaType,
          mime_type: file.type || 'application/octet-stream',
          original_name: file.name,
          file_size: file.size
        }
      }, 201, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir el fichero.';
      const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
      return json({ error: message }, status, corsHeaders);
    }
  }
};

async function assertAdmin(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new Error('Unauthorized');
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) throw new Error('Falta configurar Supabase en el Worker.');

  const userResponse = await fetch(`${String(env.SUPABASE_URL).replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!userResponse.ok) throw new Error('Unauthorized');
  const user = await userResponse.json();
  if (!user?.id) throw new Error('Unauthorized');

  const profileUrl = new URL(`${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1/admin_profiles`);
  profileUrl.searchParams.set('user_id', `eq.${user.id}`);
  profileUrl.searchParams.set('select', 'user_id');
  profileUrl.searchParams.set('limit', '1');

  const profileResponse = await fetch(profileUrl, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!profileResponse.ok) throw new Error('Forbidden');
  const rows = await profileResponse.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Forbidden');
}

function buildObjectKey(target, originalName) {
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const cleanName = sanitizeFilename(originalName || 'archivo');
  return `${target}/${datePath}/${crypto.randomUUID()}-${cleanName}`;
}

function sanitizeFilename(filename) {
  const parts = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('.');
  const extension = parts.length > 1 ? `.${parts.pop()}` : '';
  const basename = parts.join('.').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'archivo';
  return `${basename}${extension.toLowerCase()}`;
}

function inferMediaType(target, mimeType) {
  if (target === 'element-audio' || mimeType.startsWith('audio/')) return 'audio';
  if (target === 'collaborator') return 'logo';
  if (mimeType.startsWith('image/')) return 'image';
  return 'file';
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = String(env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
