import { collaborators, elements, elementTypes, languages, siteContent } from './mockData';
import type { GuideElement, LanguageCode, UploadRequest, UploadResult } from '../domain/types';
import { mediaUrl } from '../lib/media';
import { canUseSupabase, supabaseGuideRepository } from './supabaseRepository';

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
