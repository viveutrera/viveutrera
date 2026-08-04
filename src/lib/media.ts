import type { MediaAsset } from '../domain/types';
import { publicPath } from './routing';

export function mediaUrl(objectKey: string) {
  const baseUrl = import.meta.env.VITE_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) return publicPath(objectKey);
  return `${baseUrl}/${objectKey.replace(/^\//, '')}`;
}

export function mediaObjectKey(asset: MediaAsset, preferredVariant?: string) {
  if (!preferredVariant) return asset.objectKey;
  return asset.variants?.find((variant) => variant.variant === preferredVariant)?.objectKey ?? asset.objectKey;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}
