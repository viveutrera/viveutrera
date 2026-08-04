import { publicPath } from './routing';

export function mediaUrl(objectKey: string) {
  const baseUrl = import.meta.env.VITE_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) return publicPath(objectKey);
  return `${baseUrl}/${objectKey.replace(/^\//, '')}`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}
