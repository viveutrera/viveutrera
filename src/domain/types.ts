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
  mediaType: 'image' | 'audio' | 'logo' | 'file';
  mimeType: string;
  originalName: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  variants?: MediaVariant[];
}

export interface MediaVariant {
  id?: string;
  variant: 'main' | 'thumbnail' | string;
  objectKey: string;
  fileSize: number;
  width?: number;
  height?: number;
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
  showLongTextDefault: boolean;
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

export interface GuideElementQuery {
  offset: number;
  limit: number;
  typeId?: string;
  search?: string;
}

export interface GuideElementPage {
  items: GuideElement[];
  hasMore: boolean;
  contentLanguage: LanguageCode;
}

export interface NearbyElementCandidate {
  id: string;
  latitude: number;
  longitude: number;
}

export interface Collaborator {
  id: string;
  name: string;
  url?: string;
  mediaAsset?: MediaAsset;
  sortOrder: number;
  isActive: boolean;
  isSpecial: boolean;
  showName: boolean;
  translations: Record<LanguageCode, { displayName: string; thankYouText?: string }>;
}

export interface SiteContent {
  heroTitle: string;
  heroSlogan: string;
  heroDescription: string;
  cityTitle: string;
  cityText: string;
  collaboratorSectionText?: string;
  specialCollaboratorLabel?: string;
  seoTitle: string;
  seoDescription: string;
  heroLogoObjectKey?: string;
  heroImageObjectKey?: string;
  cityImageObjectKey?: string;
}

export interface DonationContent {
  title: string;
  subtitle: string;
  introTitle: string;
  introText: string;
  bizumTitle: string;
  bizumText: string;
  bizumCode: string;
  bizumButtonLabel: string;
  bankTitle: string;
  bankText: string;
  bankAccountHolder: string;
  bankIban: string;
  bankConcept: string;
  copyButtonLabel: string;
  transparencyTitle: string;
  transparencyItems: string[];
  footerText: string;
}

export type TourStatus = 'draft' | 'active' | 'finished' | 'cancelled';

export interface Tour {
  id: string;
  code: string;
  name?: string;
  hostId: string;
  hostName?: string;
  hostEmail?: string;
  status: TourStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  expiresAt: string;
}

export type TourEventType = 'element' | 'message' | 'notice' | 'meeting_point';

export interface TourEvent {
  id: string;
  tourId: string;
  eventType: TourEventType;
  elementId?: string;
  message?: string;
  createdBy?: string;
  createdAt: string;
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
