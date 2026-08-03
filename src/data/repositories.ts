import { collaborators, elements, elementTypes, languages, siteContent } from './mockData';
import type { GuideElement, LanguageCode, UploadRequest, UploadResult } from '../domain/types';
import { mediaUrl } from '../lib/media';

export const guideRepository = {
  async getLanguages() {
    return languages.filter((language) => language.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  async getSiteContent(language: LanguageCode) {
    return siteContent[language] ?? siteContent.es;
  },
  async getElementTypes() {
    return elementTypes.filter((type) => type.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  async getElements(language: LanguageCode) {
    return elements
      .filter((element) => element.status === 'published' && element.translations[language]?.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
  async getElementBySlug(language: LanguageCode, slug: string): Promise<GuideElement | undefined> {
    return elements.find((element) => element.slug === slug && element.translations[language]?.isPublished);
  },
  async getCollaborators() {
    return collaborators.filter((collaborator) => collaborator.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
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
