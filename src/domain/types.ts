export type LanguageCode = 'es' | 'en' | 'fr' | 'de';

export interface Language {
  id: string;
  code: LanguageCode;
  locale: string;
  name: string;
  nativeName: string;
  flagCode: string;
  isActive: boolean;
  isDefault: boolean;
  fallbackLanguageId?: string;
  sortOrder: number;
  cardText: string;
  cardButton: string;
}

export interface ElementType {
  id: string;
  slug: string;
  icon: string;
  name: Record<LanguageCode, string>;
  isActive: boolean;
  sortOrder: number;
}

export interface MediaAsset {
  id: string;
  objectKey: string;
  mediaType: 'image' | 'audio' | 'logo';
  mimeType: string;
  originalName: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface ElementImage {
  id: string;
  mediaAsset: MediaAsset;
  isCover: boolean;
  sortOrder: number;
  translations: Record<LanguageCode, { title: string; altText: string; caption?: string }>;
}

export interface ElementAudio {
  id: string;
  languageCode: LanguageCode;
  title: string;
  durationSeconds: number;
  mediaAsset: MediaAsset;
  transcript?: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ElementLink {
  id: string;
  languageCode: LanguageCode;
  title: string;
  url: string;
  linkType?: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface GuideElement {
  id: string;
  slug: string;
  typeId: string;
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
  status: 'draft' | 'published';
  isFeatured: boolean;
  sortOrder: number;
  translations: Record<LanguageCode, {
    name: string;
    shortText: string;
    longText: string;
    seoTitle: string;
    seoDescription: string;
    isPublished: boolean;
  }>;
  images: ElementImage[];
  audios: ElementAudio[];
  links: ElementLink[];
}

export interface Collaborator {
  id: string;
  name: string;
  url?: string;
  mediaAsset?: MediaAsset;
  sortOrder: number;
  isActive: boolean;
  isSpecial: boolean;
  translations: Record<LanguageCode, { displayName: string; thankYouText?: string }>;
}

export interface SiteContent {
  heroTitle: string;
  heroSlogan: string;
  heroDescription: string;
  cityTitle: string;
  cityText: string;
  seoTitle: string;
  seoDescription: string;
}

export interface UploadRequest {
  file: File;
  target: 'site' | 'element-image' | 'element-audio' | 'collaborator';
  elementId?: string;
  languageCode?: LanguageCode;
}

export interface UploadResult {
  mediaAsset: MediaAsset;
  publicUrl: string;
}
