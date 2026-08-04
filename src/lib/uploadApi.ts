import { supabase } from './supabase';

export interface UploadedAsset {
  object_key: string;
  media_type: 'image' | 'audio' | 'logo' | 'file';
  mime_type: string;
  original_name: string;
  file_size: number;
}

interface UploadResponse {
  asset: UploadedAsset;
  publicUrl: string;
}

export function canUseUploadApi() {
  return Boolean(import.meta.env.VITE_UPLOAD_API_URL && supabase);
}

export async function uploadMediaFile(file: File, target: string): Promise<UploadResponse> {
  if (!supabase) throw new Error('Supabase no esta configurado.');
  const uploadApiUrl = String(import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/$/, '');
  if (!uploadApiUrl) throw new Error('Falta configurar VITE_UPLOAD_API_URL.');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('La sesion ha caducado. Vuelve a iniciar sesion.');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('target', target);

  const response = await fetch(`${uploadApiUrl}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const payload = await response.json().catch(() => undefined) as { error?: string } | UploadResponse | undefined;
  if (!response.ok) {
    throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'No se pudo subir el fichero.');
  }

  if (!payload || !('asset' in payload)) throw new Error('Respuesta invalida del Worker.');
  return payload;
}
