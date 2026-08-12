import { collaborators, elements, elementTypes, languages, siteContent } from './mockData';
import type { CollaboratorsPageContent, DonationContent, GuideElement, GuideElementQuery, LanguageCode, NearbyElementCandidate, UploadRequest, UploadResult } from '../domain/types';
import { mediaUrl } from '../lib/media';
import { canUseSupabase, defaultCollaboratorsPageContent, defaultDonationContent, supabaseGuideRepository } from './supabaseRepository';

async function withFallback<T>(action: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!canUseSupabase()) return fallback();
  try {
    return await action();
  } catch (error) {
    console.warn('Supabase no disponible, usando datos simulados.', error);
    return fallback();
  }
}

export const guideRepository = {
  async getLanguages() {
    return withFallback(
      () => supabaseGuideRepository.getLanguages(),
      () => languages.filter((language) => language.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
    );
  },
  async getSiteContent(language: LanguageCode) {
    return withFallback(
      () => supabaseGuideRepository.getSiteContent(language),
      () => siteContent[language] ?? siteContent.es
    );
  },
  async getElementTypes() {
    return withFallback(
      () => supabaseGuideRepository.getElementTypes(),
      () => elementTypes.filter((type) => type.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
    );
  },
  async getElements(language: LanguageCode) {
    return withFallback(
      () => supabaseGuideRepository.getElements(language),
      () => elements
        .filter((element) => element.status === 'published' && element.translations[language]?.isPublished)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    );
  },
  async getElementPage(language: LanguageCode, options: GuideElementQuery) {
    return withFallback(
      () => supabaseGuideRepository.getElementPage(language, options),
      () => {
        const normalized = options.search?.trim().toLocaleLowerCase() ?? '';
        const rows = elements
          .filter((element) => element.status === 'published' && element.translations[language]?.isPublished)
          .filter((element) => !options.typeId || element.typeId === options.typeId)
          .filter((element) => {
            const translation = element.translations[language];
            return !normalized || `${translation.name} ${translation.shortText}`.toLocaleLowerCase().includes(normalized);
          })
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
        const page = rows.slice(options.offset, options.offset + options.limit);
        return {
          items: page.map((element) => ({ ...element, audios: [], links: [], images: element.images.slice(0, 1) })),
          hasMore: options.offset + options.limit < rows.length,
          contentLanguage: language
        };
      }
    );
  },
  async getElementsByIds(language: LanguageCode, ids: string[]) {
    return withFallback(
      () => supabaseGuideRepository.getElementsByIds(language, ids),
      () => {
        const order = new Map(ids.map((id, index) => [id, index]));
        return elements
          .filter((element) => ids.includes(element.id) && element.status === 'published' && element.translations[language]?.isPublished)
          .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
          .map((element) => ({ ...element, audios: [], links: [], images: element.images.slice(0, 1) }));
      }
    );
  },
  async getElementNavigation(language: LanguageCode) {
    return withFallback(
      () => supabaseGuideRepository.getElementNavigation(language),
      () => elements
        .filter((element) => element.status === 'published' && element.translations[language]?.isPublished)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .map((element) => ({ ...element, images: [], audios: [], links: [] }))
    );
  },
  async getNearbyElementCandidates(language: LanguageCode): Promise<NearbyElementCandidate[]> {
    return withFallback(
      () => supabaseGuideRepository.getNearbyElementCandidates(language),
      () => elements
        .filter((element) => element.status === 'published' && element.translations[language]?.isPublished)
        .filter((element): element is GuideElement & { latitude: number; longitude: number } => typeof element.latitude === 'number' && typeof element.longitude === 'number')
        .map((element) => ({ id: element.id, latitude: element.latitude, longitude: element.longitude }))
    );
  },
  async getElementBySlug(language: LanguageCode, slug: string): Promise<GuideElement | undefined> {
    return withFallback(
      () => supabaseGuideRepository.getElementBySlug(language, slug),
      () => elements.find((element) => element.slug === slug && element.translations[language]?.isPublished)
    );
  },
  async getCollaborators() {
    return withFallback(
      () => supabaseGuideRepository.getCollaborators(),
      () => collaborators.filter((collaborator) => collaborator.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
    );
  },
  async getDonationContent(): Promise<DonationContent> {
    return withFallback(
      () => supabaseGuideRepository.getDonationContent(),
      () => defaultDonationContent
    );
  },
  async getCollaboratorsPageContent(): Promise<CollaboratorsPageContent> {
    return withFallback(
      () => supabaseGuideRepository.getCollaboratorsPageContent(),
      () => defaultCollaboratorsPageContent
    );
  }
};

export interface StorageService {
  upload(request: UploadRequest): Promise<UploadResult>;
  remove(objectKey: string): Promise<void>;
  getPublicUrl(objectKey: string): string;
}

export const mockStorageService: StorageService = {
  async upload(request) {
    const objectKey = `mock/${request.target}/${crypto.randomUUID()}-${request.file.name}`;
    return {
      mediaAsset: {
        id: crypto.randomUUID(),
        objectKey,
        mediaType: request.target === 'element-audio' ? 'audio' : 'image',
        mimeType: request.file.type,
        originalName: request.file.name,
        fileSize: request.file.size
      },
      publicUrl: mediaUrl(objectKey)
    };
  },
  async remove() {
    return;
  },
  getPublicUrl: mediaUrl
};
