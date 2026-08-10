import type {
  Collaborator,
  ElementType,
  GuideElement,
  Language,
  LanguageCode,
  MediaAsset,
  MediaVariant,
  SiteContent,
  Tour,
  TourStatus
} from '../domain/types';
import { supabase } from '../lib/supabase';
import { languages as mockLanguages, siteContent as mockSiteContent } from './mockData';

const languageCodes: LanguageCode[] = ['es', 'en', 'fr', 'de'];
const publicElementSelect = 'id, slug, element_type_id, maps_url, latitude, longitude, status, is_featured, show_long_text_default, sort_order, element_translations!inner(name, short_text, long_text, seo_title, seo_description, is_published, language_id)';
const publicElementSelectLegacy = 'id, slug, element_type_id, maps_url, status, is_featured, sort_order, element_translations!inner(name, short_text, long_text, seo_title, seo_description, is_published, language_id)';
const adminElementSelect = 'id, slug, element_type_id, maps_url, latitude, longitude, status, is_featured, show_long_text_default, sort_order, element_translations(id, name, short_text, long_text, is_published, language_id, languages(code))';
const adminElementSelectLegacy = 'id, slug, element_type_id, maps_url, status, is_featured, sort_order, element_translations(id, name, short_text, long_text, is_published, language_id, languages(code))';

const placeholderAsset: MediaAsset = {
  id: 'placeholder',
  objectKey: 'brand/logo-vive-utrera.png',
  mediaType: 'image',
  mimeType: 'image/png',
  originalName: 'logo-vive-utrera.png',
  fileSize: 348481,
  width: 461,
  height: 524
};

interface ElementRowRaw {
  id: string;
  slug: string;
  element_type_id: string;
  maps_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  is_featured: boolean;
  show_long_text_default?: boolean;
  sort_order: number;
  element_translations?: Array<{
    name: string;
    short_text: string;
    long_text: string | null;
    seo_title: string | null;
    seo_description: string | null;
    is_published: boolean;
  }> | {
    name: string;
    short_text: string;
    long_text: string | null;
    seo_title: string | null;
    seo_description: string | null;
    is_published: boolean;
  };
}

interface ElementLinkRowRaw {
  id: string;
  language_id: string;
  title: string;
  url: string;
  link_type: string | null;
  sort_order: number;
  is_published: boolean;
}

interface MediaAssetRowRaw {
  id: string;
  object_key: string;
  media_type: 'image' | 'audio' | 'logo' | 'file';
  mime_type: string;
  original_name: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  media_variants?: MediaVariantRowRaw[] | MediaVariantRowRaw | null;
}

interface MediaVariantRowRaw {
  id?: string;
  variant: string;
  object_key: string;
  file_size: number;
  width: number | null;
  height: number | null;
}

interface ElementImageRowRaw {
  id: string;
  element_id: string;
  is_cover: boolean;
  sort_order: number;
  media_assets: MediaAssetRowRaw | MediaAssetRowRaw[] | null;
  element_image_translations?: Array<{
    title: string | null;
    alt_text: string;
    caption: string | null;
    languages?: { code: string } | { code: string }[] | null;
  }>;
}

interface ElementAudioRowRaw {
  id: string;
  element_id: string;
  title: string;
  transcript: string | null;
  sort_order: number;
  is_published: boolean;
  media_assets: MediaAssetRowRaw | MediaAssetRowRaw[] | null;
}

interface SiteSettingRowRaw {
  key: string;
  value_json: unknown;
}

interface SiteTranslationRowRaw {
  hero_title: string;
  hero_slogan: string;
  hero_description: string;
  city_title: string;
  city_text: string;
  collaborator_section_text?: string | null;
  special_collaborator_label?: string | null;
  seo_title: string;
  seo_description: string;
}

interface CollaboratorTranslationRowRaw {
  id?: string;
  display_name: string;
  thank_you_text: string | null;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

interface CollaboratorRowRaw {
  id: string;
  name: string;
  media_asset_id: string | null;
  url: string | null;
  sort_order: number;
  is_active: boolean;
  is_special: boolean;
  show_name?: boolean | null;
  media_assets?: MediaAssetRowRaw | MediaAssetRowRaw[] | null;
  collaborator_translations?: CollaboratorTranslationRowRaw[];
}

function asLanguageCode(code: string): LanguageCode {
  return languageCodes.includes(code as LanguageCode) ? code as LanguageCode : 'es';
}

function emptyTranslations<T>(factory: () => T): Record<LanguageCode, T> {
  return {
    es: factory(),
    en: factory(),
    fr: factory(),
    de: factory()
  };
}

function relatedLanguageCode(relation: unknown): string {
  if (Array.isArray(relation)) return relation[0]?.code ?? 'es';
  if (relation && typeof relation === 'object' && 'code' in relation) {
    return String((relation as { code?: unknown }).code ?? 'es');
  }
  return 'es';
}

function ensureSupabase() {
  if (!supabase) throw new Error('Supabase no esta configurado.');
  return supabase;
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === '42703'
    || candidate.code === 'PGRST204'
    || Boolean(candidate.message?.includes('show_long_text_default'))
    || Boolean(candidate.message?.includes('show_name'))
    || Boolean(candidate.message?.includes('collaborator_section_text'))
    || Boolean(candidate.message?.includes('special_collaborator_label'))
    || Boolean(candidate.message?.includes('latitude'))
    || Boolean(candidate.message?.includes('longitude'));
}

export const supabaseGuideRepository = {
  async getLanguages(): Promise<Language[]> {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('languages')
      .select('id, code, locale, name, native_name, flag_code, is_active, is_default, fallback_language_id, sort_order, site_translations(language_card_text, language_card_button)')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    return (data ?? []).map((row) => {
      const translation = Array.isArray(row.site_translations) ? row.site_translations[0] : row.site_translations;
      return {
        id: row.id,
        code: asLanguageCode(row.code),
        locale: row.locale,
        name: row.name,
        nativeName: row.native_name,
        flagCode: row.flag_code ?? row.code.toUpperCase(),
        isActive: row.is_active,
        isDefault: row.is_default,
        fallbackLanguageId: row.fallback_language_id ?? undefined,
        sortOrder: row.sort_order,
        cardText: translation?.language_card_text ?? mockLanguages.find((language) => language.code === row.code)?.cardText ?? '',
        cardButton: translation?.language_card_button ?? mockLanguages.find((language) => language.code === row.code)?.cardButton ?? 'Ver guia'
      };
    });
  },

  async getSiteContent(language: LanguageCode): Promise<SiteContent> {
    const client = ensureSupabase();
    const { data: languageRow } = await client.from('languages').select('id').eq('code', language).maybeSingle();
    if (!languageRow) return mockSiteContent.es;

    const response = await client
      .from('site_translations')
      .select('hero_title, hero_slogan, hero_description, city_title, city_text, collaborator_section_text, special_collaborator_label, seo_title, seo_description')
      .eq('language_id', languageRow.id)
      .maybeSingle();
    let data = response.data as SiteTranslationRowRaw | null;
    let error = response.error;
    if (error && isMissingColumnError(error)) {
      const legacy = await client
        .from('site_translations')
        .select('hero_title, hero_slogan, hero_description, city_title, city_text, seo_title, seo_description')
        .eq('language_id', languageRow.id)
        .maybeSingle();
      data = legacy.data;
      error = legacy.error;
    }

    if (error) throw error;
    if (!data) return mockSiteContent.es;
    const mediaSettings = await getSiteMediaSettings();

    return {
      heroTitle: data.hero_title,
      heroSlogan: data.hero_slogan,
      heroDescription: data.hero_description,
      cityTitle: data.city_title,
      cityText: data.city_text,
      collaboratorSectionText: data.collaborator_section_text ?? mockSiteContent[language].collaboratorSectionText,
      specialCollaboratorLabel: data.special_collaborator_label ?? mockSiteContent[language].specialCollaboratorLabel,
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      heroLogoObjectKey: mediaSettings.heroLogoObjectKey,
      heroImageObjectKey: mediaSettings.heroImageObjectKey,
      cityImageObjectKey: mediaSettings.cityImageObjectKey
    };
  },

  async getElementTypes(): Promise<ElementType[]> {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('element_types')
      .select('id, slug, icon, sort_order, is_active, element_type_translations(name, languages(code))')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    return (data ?? []).map((row) => {
      const names = emptyTranslations(() => row.slug);
      row.element_type_translations?.forEach((translation) => {
        const code = asLanguageCode(relatedLanguageCode(translation.languages));
        names[code] = translation.name;
      });

      return {
        id: row.id,
        slug: row.slug,
        icon: row.icon ?? 'landmark',
        sortOrder: row.sort_order,
        isActive: row.is_active,
        name: names
      };
    });
  },

  async getElements(language: LanguageCode): Promise<GuideElement[]> {
    const client = ensureSupabase();
    const languageId = await getLanguageId(language);
    if (!languageId) return [];

    const response = await client
      .from('elements')
      .select(publicElementSelect)
      .eq('status', 'published')
      .eq('element_translations.language_id', languageId)
      .eq('element_translations.is_published', true)
      .order('sort_order');
    let data: unknown = response.data;
    let error: unknown = response.error;

    if (error && isMissingColumnError(error)) {
      const legacy = await client
        .from('elements')
        .select(publicElementSelectLegacy)
        .eq('status', 'published')
        .eq('element_translations.language_id', languageId)
        .eq('element_translations.is_published', true)
        .order('sort_order');
      data = legacy.data;
      error = legacy.error;
    }

    if (error) throw error;

    const elements = ((data ?? []) as ElementRowRaw[]).map((row) => mapElementRow(row, language));
    await hydrateElementMedia(elements, languageId, language);
    return elements;
  },

  async getElementBySlug(language: LanguageCode, slug: string): Promise<GuideElement | undefined> {
    const client = ensureSupabase();
    const languageId = await getLanguageId(language);
    if (!languageId) return undefined;

    const response = await client
      .from('elements')
      .select(publicElementSelect)
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('element_translations.language_id', languageId)
      .eq('element_translations.is_published', true)
      .maybeSingle();
    let data: unknown = response.data;
    let error: unknown = response.error;

    if (error && isMissingColumnError(error)) {
      const legacy = await client
        .from('elements')
        .select(publicElementSelectLegacy)
        .eq('slug', slug)
        .eq('status', 'published')
        .eq('element_translations.language_id', languageId)
        .eq('element_translations.is_published', true)
        .maybeSingle();
      data = legacy.data;
      error = legacy.error;
    }

    if (error) throw error;
    if (!data) return undefined;

    const element = mapElementRow(data as unknown as ElementRowRaw, language);
    await hydrateElementMedia([element], languageId, language);
    const { data: links, error: linksError } = await client
      .from('element_links')
      .select('id, language_id, title, url, link_type, sort_order, is_published')
      .eq('element_id', element.id)
      .eq('language_id', languageId)
      .eq('is_published', true)
      .order('sort_order');

    if (linksError) throw linksError;
    element.links = ((links ?? []) as ElementLinkRowRaw[]).map((link) => ({
      id: link.id,
      languageCode: language,
      title: link.title,
      url: link.url,
      linkType: link.link_type ?? undefined,
      sortOrder: link.sort_order,
      isPublished: link.is_published
    }));

    return element;
  },

  async getCollaborators(): Promise<Collaborator[]> {
    const client = ensureSupabase();
    const response = await client
      .from('collaborators')
      .select('id, name, media_asset_id, url, sort_order, is_active, is_special, show_name, media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds), collaborator_translations(display_name, thank_you_text, languages(code))')
      .eq('is_active', true)
      .order('sort_order');
    let data = response.data as CollaboratorRowRaw[] | null;
    let error = response.error;
    if (error && isMissingColumnError(error)) {
      const legacy = await client
        .from('collaborators')
        .select('id, name, media_asset_id, url, sort_order, is_active, is_special, media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds), collaborator_translations(display_name, thank_you_text, languages(code))')
        .eq('is_active', true)
        .order('sort_order');
      data = legacy.data;
      error = legacy.error;
    }

    if (error) throw error;

    return (data ?? []).map((row) => {
      const translations = emptyTranslations<{ displayName: string; thankYouText?: string }>(() => ({ displayName: row.name }));
      row.collaborator_translations?.forEach((translation) => {
        const code = asLanguageCode(relatedLanguageCode(translation.languages));
        translations[code] = {
          displayName: translation.display_name,
          thankYouText: translation.thank_you_text ?? undefined
        };
      });

      return {
        id: row.id,
        name: row.name,
        url: row.url ?? undefined,
        mediaAsset: mapMediaAsset(row.media_assets) ?? (row.media_asset_id ? placeholderAsset : undefined),
        sortOrder: row.sort_order,
        isActive: row.is_active,
        isSpecial: row.is_special,
        showName: row.show_name ?? true,
        translations
      };
    });
  }
};

export const adminRepository = {
  async listMediaAssets() {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('media_assets')
      .select('id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds, created_at, media_variants(id, variant, object_key, file_size, width, height)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async saveMediaAsset(input: {
    id?: string;
    object_key: string;
    media_type: 'image' | 'audio' | 'logo' | 'file';
    mime_type: string;
    original_name: string;
    file_size: number;
    width?: number | null;
    height?: number | null;
    duration_seconds?: number | null;
  }) {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('media_assets')
      .upsert({
        id: input.id,
        object_key: input.object_key,
        media_type: input.media_type,
        mime_type: input.mime_type,
        original_name: input.original_name,
        file_size: input.file_size,
        width: input.width ?? null,
        height: input.height ?? null,
        duration_seconds: input.duration_seconds ?? null
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async saveMediaVariant(input: {
    media_asset_id: string;
    variant: string;
    object_key: string;
    file_size: number;
    width?: number | null;
    height?: number | null;
  }) {
    const client = ensureSupabase();
    const { error } = await client
      .from('media_variants')
      .upsert({
        media_asset_id: input.media_asset_id,
        variant: input.variant,
        object_key: input.object_key,
        file_size: input.file_size,
        width: input.width ?? null,
        height: input.height ?? null
      }, { onConflict: 'media_asset_id,variant' });
    if (error) throw error;
  },
  async deleteMediaAsset(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('media_assets').delete().eq('id', id);
    if (error) throw error;
  },
  async getMediaAssetUsage(id: string) {
    const client = ensureSupabase();
    const [images, audios, collaborators, siteSettings] = await Promise.all([
      client.from('element_images').select('id', { count: 'exact', head: true }).eq('media_asset_id', id),
      client.from('element_audios').select('id', { count: 'exact', head: true }).eq('media_asset_id', id),
      client.from('collaborators').select('id', { count: 'exact', head: true }).eq('media_asset_id', id),
      client.from('site_settings').select('id', { count: 'exact', head: true }).contains('value_json', { media_asset_id: id })
    ]);
    const error = images.error ?? audios.error ?? collaborators.error ?? siteSettings.error;
    if (error) throw error;
    return {
      images: images.count ?? 0,
      audios: audios.count ?? 0,
      collaborators: collaborators.count ?? 0,
      siteSettings: siteSettings.count ?? 0
    };
  },

  async listSiteTranslations() {
    const client = ensureSupabase();
    const { data, error } = await client.from('site_translations').select('*');
    if (error) throw error;
    return data ?? [];
  },
  async listSiteSettings() {
    const client = ensureSupabase();
    const { data, error } = await client.from('site_settings').select('key, value_json');
    if (error) throw error;
    return data ?? [];
  },
  async saveSiteSetting(key: string, value: Record<string, unknown>) {
    const client = ensureSupabase();
    const { error } = await client
      .from('site_settings')
      .upsert({ key, value_json: value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  },
  async saveSiteTranslations(translations: Array<{
    language_id: string;
    hero_title: string;
    hero_slogan: string;
    hero_description: string;
    city_title: string;
    city_text: string;
    language_card_text: string;
    language_card_button: string;
    collaborator_section_text?: string | null;
    special_collaborator_label?: string | null;
    seo_title: string;
    seo_description: string;
  }>) {
    const client = ensureSupabase();
    let { error } = await client.from('site_translations').upsert(translations, { onConflict: 'language_id' });
    if (error && isMissingColumnError(error)) {
      const legacyTranslations = translations.map((translation) => {
        const legacy: Partial<typeof translation> = { ...translation };
        delete legacy.collaborator_section_text;
        delete legacy.special_collaborator_label;
        return legacy;
      });
      const legacy = await client.from('site_translations').upsert(legacyTranslations, { onConflict: 'language_id' });
      error = legacy.error;
    }
    if (error) throw error;
  },

  async listLanguages() {
    const client = ensureSupabase();
    const { data, error } = await client.from('languages').select('*').order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  async saveLanguage(input: {
    id?: string;
    code: string;
    locale: string;
    name: string;
    native_name: string;
    flag_code: string;
    is_active: boolean;
    is_default: boolean;
    sort_order: number;
  }) {
    const client = ensureSupabase();
    const { error } = await client.from('languages').upsert(input).select().single();
    if (error) throw error;
  },
  async deleteLanguage(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('languages').delete().eq('id', id);
    if (error) throw error;
  },

  async listElementTypes() {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('element_types')
      .select('id, slug, icon, sort_order, is_active, element_type_translations(id, name, description, language_id, languages(code))')
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  async saveElementType(input: {
    id?: string;
    slug: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
    translations: Array<{ language_id: string; name: string; description: string }>;
  }) {
    const client = ensureSupabase();
    const { data: type, error } = await client
      .from('element_types')
      .upsert({ id: input.id, slug: input.slug, icon: input.icon, sort_order: input.sort_order, is_active: input.is_active })
      .select('id')
      .single();
    if (error) throw error;

    const { error: translationError } = await client
      .from('element_type_translations')
      .upsert(input.translations.filter((translation) => translation.name.trim()).map((translation) => ({
        element_type_id: type.id,
        language_id: translation.language_id,
        name: translation.name,
        description: translation.description || null
      })), { onConflict: 'element_type_id,language_id' });
    if (translationError) throw translationError;
  },
  async deleteElementType(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('element_types').delete().eq('id', id);
    if (error) throw error;
  },

  async listElements() {
    const client = ensureSupabase();
    const response = await client
      .from('elements')
      .select(adminElementSelect)
      .order('sort_order');
    let data: unknown = response.data;
    let error: unknown = response.error;
    if (error && isMissingColumnError(error)) {
      const legacy = await client
        .from('elements')
        .select(adminElementSelectLegacy)
        .order('sort_order');
      data = legacy.data;
      error = legacy.error;
    }
    if (error) throw error;
    return data ?? [];
  },
  async saveElement(input: {
    id?: string;
    slug: string;
    element_type_id: string;
    maps_url: string;
    latitude?: number | null;
    longitude?: number | null;
    status: 'draft' | 'published';
    is_featured: boolean;
    show_long_text_default?: boolean;
    sort_order: number;
    translations: Array<{
      language_id: string;
      name: string;
      short_text: string;
      long_text: string;
      seo_title: string;
      seo_description: string;
      is_published: boolean;
    }>;
  }) {
    const client = ensureSupabase();
    const payload = {
      id: input.id,
      slug: input.slug,
      element_type_id: input.element_type_id,
      maps_url: input.maps_url || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      status: input.status,
      is_featured: input.is_featured,
      show_long_text_default: input.show_long_text_default ?? false,
      sort_order: input.sort_order,
      published_at: input.status === 'published' ? new Date().toISOString() : null
    };
    let { data: element, error } = await client
      .from('elements')
      .upsert(payload)
      .select('id')
      .single();
    if (error && isMissingColumnError(error)) {
      const legacyPayload: Partial<typeof payload> = { ...payload };
      delete legacyPayload.show_long_text_default;
      delete legacyPayload.latitude;
      delete legacyPayload.longitude;
      const legacy = await client
        .from('elements')
        .upsert(legacyPayload)
        .select('id')
        .single();
      element = legacy.data;
      error = legacy.error;
    }
    if (error) throw error;
    if (!element) throw new Error('No se pudo guardar el elemento.');

    const { error: translationError } = await client
      .from('element_translations')
      .upsert(input.translations.filter((translation) => translation.name.trim() && translation.short_text.trim()).map((translation) => ({
        element_id: element.id,
        language_id: translation.language_id,
        name: translation.name,
        short_text: translation.short_text,
        long_text: translation.long_text || null,
        seo_title: translation.seo_title || translation.name,
        seo_description: translation.seo_description || translation.short_text,
        is_published: translation.is_published
      })), { onConflict: 'element_id,language_id' });
    if (translationError) throw translationError;
  },
  async deleteElement(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('elements').delete().eq('id', id);
    if (error) throw error;
  },

  async listElementImages() {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('element_images')
      .select('id, element_id, media_asset_id, is_cover, sort_order, elements(slug), media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds, media_variants(id, variant, object_key, file_size, width, height)), element_image_translations(id, title, alt_text, caption, language_id, languages(code))')
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  async saveElementImage(input: {
    id?: string;
    element_id: string;
    media_asset_id: string;
    is_cover: boolean;
    sort_order: number;
    translations: Array<{ language_id: string; title: string; alt_text: string; caption: string }>;
  }) {
    const client = ensureSupabase();
    if (input.is_cover) {
      const { error: coverError } = await client
        .from('element_images')
        .update({ is_cover: false })
        .eq('element_id', input.element_id);
      if (coverError) throw coverError;
    }

    const { data: image, error } = await client
      .from('element_images')
      .upsert({
        id: input.id,
        element_id: input.element_id,
        media_asset_id: input.media_asset_id,
        is_cover: input.is_cover,
        sort_order: input.sort_order
      })
      .select('id')
      .single();
    if (error) throw error;

    const rows = input.translations.filter((translation) => translation.alt_text.trim()).map((translation) => ({
      element_image_id: image.id,
      language_id: translation.language_id,
      title: translation.title || null,
      alt_text: translation.alt_text,
      caption: translation.caption || null
    }));
    if (rows.length) {
      const { error: translationError } = await client
        .from('element_image_translations')
        .upsert(rows, { onConflict: 'element_image_id,language_id' });
      if (translationError) throw translationError;
    }
  },
  async deleteElementImage(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('element_images').delete().eq('id', id);
    if (error) throw error;
  },

  async listElementAudios() {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('element_audios')
      .select('id, element_id, language_id, media_asset_id, title, transcript, sort_order, is_published, elements(slug), languages(code), media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds)')
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  async saveElementAudio(input: {
    id?: string;
    element_id: string;
    language_id: string;
    media_asset_id: string;
    title: string;
    transcript: string;
    sort_order: number;
    is_published: boolean;
  }) {
    const client = ensureSupabase();
    const { error } = await client
      .from('element_audios')
      .upsert({
        id: input.id,
        element_id: input.element_id,
        language_id: input.language_id,
        media_asset_id: input.media_asset_id,
        title: input.title,
        transcript: input.transcript || null,
        sort_order: input.sort_order,
        is_published: input.is_published
      })
      .select()
      .single();
    if (error) throw error;
  },
  async deleteElementAudio(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('element_audios').delete().eq('id', id);
    if (error) throw error;
  },

  async listCollaborators() {
    const client = ensureSupabase();
    const response = await client
      .from('collaborators')
      .select('id, name, media_asset_id, url, sort_order, is_active, is_special, show_name, media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds), collaborator_translations(id, display_name, thank_you_text, language_id, languages(code))')
      .order('sort_order');
    let data = response.data as CollaboratorRowRaw[] | null;
    let error = response.error;
    if (error && isMissingColumnError(error)) {
      const legacy = await client
        .from('collaborators')
        .select('id, name, media_asset_id, url, sort_order, is_active, is_special, media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds), collaborator_translations(id, display_name, thank_you_text, language_id, languages(code))')
        .order('sort_order');
      data = legacy.data;
      error = legacy.error;
    }
    if (error) throw error;
    return data ?? [];
  },
  async saveCollaborator(input: {
    id?: string;
    name: string;
    url: string;
    media_asset_id?: string | null;
    sort_order: number;
    is_active: boolean;
    is_special: boolean;
    show_name?: boolean;
    translations: Array<{ language_id: string; display_name: string; thank_you_text: string }>;
  }) {
    const client = ensureSupabase();
    const payload = {
      id: input.id,
      name: input.name,
      media_asset_id: input.media_asset_id || null,
      url: input.url || null,
      sort_order: input.sort_order,
      is_active: input.is_active,
      is_special: input.is_special,
      show_name: input.show_name ?? true
    };
    let { data: collaborator, error } = await client
      .from('collaborators')
      .upsert(payload)
      .select('id')
      .single();
    if (error && isMissingColumnError(error)) {
      const legacyPayload: Partial<typeof payload> = { ...payload };
      delete legacyPayload.show_name;
      const legacy = await client
        .from('collaborators')
        .upsert(legacyPayload)
        .select('id')
        .single();
      collaborator = legacy.data;
      error = legacy.error;
    }
    if (error) throw error;
    if (!collaborator) throw new Error('No se pudo guardar el colaborador.');

    const { error: translationError } = await client
      .from('collaborator_translations')
      .upsert(input.translations.filter((translation) => translation.display_name.trim()).map((translation) => ({
        collaborator_id: collaborator.id,
        language_id: translation.language_id,
        display_name: translation.display_name,
        thank_you_text: translation.thank_you_text || null
      })), { onConflict: 'collaborator_id,language_id' });
    if (translationError) throw translationError;
  },
  async deleteCollaborator(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('collaborators').delete().eq('id', id);
    if (error) throw error;
  },

  async listHostProfiles() {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('user_id, email, display_name, role, active, created_at, updated_at')
      .eq('role', 'host')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async createHostProfile(input: { email: string; displayName: string; active: boolean }) {
    const client = ensureSupabase();
    const { data, error } = await client.functions.invoke('admin-hosts', {
      body: {
        action: 'create',
        email: input.email,
        displayName: input.displayName,
        active: input.active
      }
    });
    if (error) throw new Error(error.message || 'No se pudo crear el anfitrion.');
    const response = data as { error?: string } | null;
    if (response?.error) throw new Error(response.error);
    return data;
  },
  async updateHostProfile(input: { user_id: string; display_name: string; active: boolean }) {
    const client = ensureSupabase();
    const { error } = await client
      .from('profiles')
      .update({
        display_name: input.display_name,
        active: input.active,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', input.user_id)
      .eq('role', 'host');
    if (error) throw error;
  },
  async deleteHostProfile(userId: string) {
    const client = ensureSupabase();
    const { data, error } = await client.functions.invoke('admin-hosts', {
      body: { action: 'delete', userId }
    });
    if (error) throw new Error(error.message || 'No se pudo borrar el anfitrion.');
    const response = data as { error?: string } | null;
    if (response?.error) throw new Error(response.error);
  },

  async listLinks() {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('element_links')
      .select('id, element_id, language_id, title, url, link_type, sort_order, is_published, elements(slug), languages(code)')
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  },
  async saveLink(input: {
    id?: string;
    element_id: string;
    language_id: string;
    title: string;
    url: string;
    link_type: string;
    sort_order: number;
    is_published: boolean;
  }) {
    const client = ensureSupabase();
    const { error } = await client
      .from('element_links')
      .upsert({
        id: input.id,
        element_id: input.element_id,
        language_id: input.language_id,
        title: input.title,
        url: input.url,
        link_type: input.link_type || null,
        sort_order: input.sort_order,
        is_published: input.is_published
      })
      .select()
      .single();
    if (error) throw error;
  },
  async deleteLink(id: string) {
    const client = ensureSupabase();
    const { error } = await client.from('element_links').delete().eq('id', id);
    if (error) throw error;
  }
};

export const tourRepository = {
  async listMyTours(): Promise<Tour[]> {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('tours')
      .select('id, code, host_id, status, created_at, started_at, ended_at, expires_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTourRow);
  },
  async createTour(): Promise<Tour> {
    const client = ensureSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw new Error('Debes iniciar sesion como anfitrion.');
    const { data, error } = await client
      .from('tours')
      .insert({ host_id: userData.user.id, status: 'draft' })
      .select('id, code, host_id, status, created_at, started_at, ended_at, expires_at')
      .single();
    if (error) throw error;
    return mapTourRow(data);
  },
  async startTour(id: string): Promise<void> {
    const client = ensureSupabase();
    const { error } = await client
      .from('tours')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', id)
      .in('status', ['draft', 'active']);
    if (error) throw error;
  },
  async finishTour(id: string): Promise<void> {
    const client = ensureSupabase();
    const { error } = await client
      .from('tours')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'active');
    if (error) throw error;
  },
  async joinActiveTour(code: string): Promise<Tour | undefined> {
    const client = ensureSupabase();
    const { data, error } = await client.rpc('join_tour_by_code', { input_code: code });
    if (error) throw error;
    const rows = (data ?? []) as Array<Parameters<typeof mapTourRow>[0]>;
    return rows[0] ? mapTourRow(rows[0]) : undefined;
  }
};

function mapTourRow(row: {
  id: string;
  code: string;
  host_id: string;
  status: string;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  expires_at: string;
}): Tour {
  return {
    id: row.id,
    code: row.code,
    hostId: row.host_id,
    status: asTourStatus(row.status),
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    expiresAt: row.expires_at
  };
}

function asTourStatus(status: string): TourStatus {
  return status === 'active' || status === 'finished' || status === 'cancelled' ? status : 'draft';
}

async function getLanguageId(language: LanguageCode): Promise<string | undefined> {
  const client = ensureSupabase();
  const { data, error } = await client.from('languages').select('id').eq('code', language).maybeSingle();
  if (error) throw error;
  return data?.id;
}

async function hydrateElementMedia(elements: GuideElement[], languageId: string, language: LanguageCode) {
  if (elements.length === 0) return;
  const client = ensureSupabase();
  const ids = elements.map((element) => element.id);

  const { data: imageRows, error: imageError } = await client
    .from('element_images')
    .select('id, element_id, is_cover, sort_order, media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds, media_variants(id, variant, object_key, file_size, width, height)), element_image_translations(title, alt_text, caption, languages(code))')
    .in('element_id', ids)
    .order('sort_order');
  if (imageError) throw imageError;

  const { data: audioRows, error: audioError } = await client
    .from('element_audios')
    .select('id, element_id, title, transcript, sort_order, is_published, media_assets(id, object_key, media_type, mime_type, original_name, file_size, width, height, duration_seconds)')
    .in('element_id', ids)
    .eq('language_id', languageId)
    .eq('is_published', true)
    .order('sort_order');
  if (audioError) throw audioError;

  elements.forEach((element) => {
    const images = ((imageRows ?? []) as unknown as ElementImageRowRaw[])
      .filter((row) => row.element_id === element.id)
      .map((row) => {
        const mediaAsset = mapMediaAsset(row.media_assets) ?? placeholderAsset;
        const translations = emptyTranslations(() => ({ title: mediaAsset.originalName, altText: mediaAsset.originalName, caption: undefined as string | undefined }));
        row.element_image_translations?.forEach((translation) => {
          const code = asLanguageCode(relatedLanguageCode(translation.languages));
          translations[code] = {
            title: translation.title ?? mediaAsset.originalName,
            altText: translation.alt_text,
            caption: translation.caption ?? undefined
          };
        });
        if (!translations[language].altText) {
          translations[language] = { title: mediaAsset.originalName, altText: element.translations[language].name, caption: undefined };
        }
        return {
          id: row.id,
          mediaAsset,
          isCover: row.is_cover,
          sortOrder: row.sort_order,
          translations
        };
      });

    const audios = ((audioRows ?? []) as unknown as ElementAudioRowRaw[])
      .filter((row) => row.element_id === element.id)
      .map((row) => {
        const mediaAsset = mapMediaAsset(row.media_assets) ?? placeholderAsset;
        return {
          id: row.id,
          languageCode: language,
          title: row.title,
          durationSeconds: mediaAsset.durationSeconds ?? 0,
          mediaAsset,
          transcript: row.transcript ?? undefined,
          sortOrder: row.sort_order,
          isPublished: row.is_published
        };
      });

    element.images = images.length ? images : element.images;
    element.audios = audios;
  });
}

async function getSiteMediaSettings() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('site_settings')
    .select('key, value_json')
    .in('key', ['hero_logo_media', 'hero_media', 'city_media']);
  if (error) throw error;

  const rows = (data ?? []) as SiteSettingRowRaw[];
  return {
    heroLogoObjectKey: settingObjectKey(rows.find((row) => row.key === 'hero_logo_media')?.value_json),
    heroImageObjectKey: settingObjectKey(rows.find((row) => row.key === 'hero_media')?.value_json),
    cityImageObjectKey: settingObjectKey(rows.find((row) => row.key === 'city_media')?.value_json)
  };
}

function settingObjectKey(value: unknown) {
  if (!value || typeof value !== 'object' || !('object_key' in value)) return undefined;
  const objectKey = (value as { object_key?: unknown }).object_key;
  return typeof objectKey === 'string' && objectKey.trim() ? objectKey : undefined;
}

function mapElementRow(row: ElementRowRaw, language: LanguageCode): GuideElement {
  const translation = Array.isArray(row.element_translations) ? row.element_translations[0] : row.element_translations;
  const translations = emptyTranslations(() => ({
    name: translation?.name ?? row.slug,
    shortText: translation?.short_text ?? '',
    longText: translation?.long_text ?? '',
    seoTitle: translation?.seo_title ?? translation?.name ?? row.slug,
    seoDescription: translation?.seo_description ?? translation?.short_text ?? '',
    isPublished: false
  }));

  translations[language] = {
    name: translation?.name ?? row.slug,
    shortText: translation?.short_text ?? '',
    longText: translation?.long_text ?? '',
    seoTitle: translation?.seo_title ?? translation?.name ?? row.slug,
    seoDescription: translation?.seo_description ?? translation?.short_text ?? '',
    isPublished: translation?.is_published ?? true
  };

  return {
    id: row.id,
    slug: row.slug,
    typeId: row.element_type_id,
    mapsUrl: row.maps_url ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    status: row.status === 'published' ? 'published' : 'draft',
    isFeatured: row.is_featured,
    showLongTextDefault: row.show_long_text_default ?? false,
    sortOrder: row.sort_order,
    translations,
    images: [],
    audios: [],
    links: []
  };
}

function mapMediaAsset(relation: MediaAssetRowRaw | MediaAssetRowRaw[] | null | undefined): MediaAsset | undefined {
  const asset = Array.isArray(relation) ? relation[0] : relation;
  if (!asset) return undefined;

  return {
    id: asset.id,
    objectKey: asset.object_key,
    mediaType: asset.media_type,
    mimeType: asset.mime_type,
    originalName: asset.original_name,
    fileSize: asset.file_size,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    durationSeconds: asset.duration_seconds ?? undefined,
    variants: mapMediaVariants(asset.media_variants)
  };
}

function mapMediaVariants(relation: MediaVariantRowRaw[] | MediaVariantRowRaw | null | undefined): MediaVariant[] {
  const rows = Array.isArray(relation) ? relation : relation ? [relation] : [];
  return rows.map((variant) => ({
    id: variant.id,
    variant: variant.variant,
    objectKey: variant.object_key,
    fileSize: variant.file_size,
    width: variant.width ?? undefined,
    height: variant.height ?? undefined
  }));
}

export function canUseSupabase() {
  return Boolean(supabase);
}
