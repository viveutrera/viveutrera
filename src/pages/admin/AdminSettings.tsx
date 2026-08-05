import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { mediaUrl } from '../../lib/media';
import { validateRequired } from '../../lib/validation';

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface SettingsTranslation {
  language_id: string;
  hero_title: string;
  hero_slogan: string;
  hero_description: string;
  city_title: string;
  city_text: string;
  language_card_text: string;
  language_card_button: string;
  seo_title: string;
  seo_description: string;
}

interface MediaAssetRow {
  id?: string;
  object_key: string;
  media_type: 'image' | 'audio' | 'logo' | 'file';
  original_name: string;
}

interface SiteSettingRow {
  key: string;
  value_json: { media_asset_id?: string; object_key?: string } | null;
}

const emptyTranslation = (languageId: string): SettingsTranslation => ({
  language_id: languageId,
  hero_title: '',
  hero_slogan: '',
  hero_description: '',
  city_title: '',
  city_text: '',
  language_card_text: '',
  language_card_button: '',
  seo_title: '',
  seo_description: ''
});

export function AdminSettings() {
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [translations, setTranslations] = useState<Record<string, SettingsTranslation>>({});
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [heroMediaId, setHeroMediaId] = useState('');
  const [cityMediaId, setCityMediaId] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }

    Promise.all([
      adminRepository.listLanguages(),
      adminRepository.listSiteTranslations(),
      adminRepository.listMediaAssets(),
      adminRepository.listSiteSettings()
    ])
      .then(([languageRows, translationRows, mediaRows, settingRows]) => {
        const activeLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
        const nextTranslations: Record<string, SettingsTranslation> = {};
        const imageRows = (mediaRows as unknown as MediaAssetRow[]).filter((item) => item.media_type === 'image' || item.media_type === 'logo');
        const settings = settingRows as unknown as SiteSettingRow[];

        activeLanguages.forEach((language) => {
          const saved = (translationRows as unknown as SettingsTranslation[]).find((item) => item.language_id === language.id);
          nextTranslations[language.id] = saved ?? emptyTranslation(language.id);
        });

        setLanguages(activeLanguages);
        setTranslations(nextTranslations);
        setMediaAssets(imageRows);
        setHeroMediaId(resolveMediaId(settings.find((setting) => setting.key === 'hero_media'), imageRows));
        setCityMediaId(resolveMediaId(settings.find((setting) => setting.key === 'city_media'), imageRows));
      })
      .catch(() => setError('No se pudo cargar la configuracion.'))
      .finally(() => setLoading(false));
  }, []);

  function update(languageId: string, field: keyof Omit<SettingsTranslation, 'language_id'>, value: string) {
    setTranslations((current) => ({
      ...current,
      [languageId]: {
        ...(current[languageId] ?? emptyTranslation(languageId)),
        [field]: value
      }
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateSettings(translations, languages);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveSiteTranslations(Object.values(translations));
      await Promise.all([
        adminRepository.saveSiteSetting('hero_media', settingPayload(mediaAssets.find((asset) => asset.id === heroMediaId))),
        adminRepository.saveSiteSetting('city_media', settingPayload(mediaAssets.find((asset) => asset.id === cityMediaId)))
      ]);
      setSuccess('Configuracion multidioma guardada.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la configuracion.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas antes de editar contenido real." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Configuracion</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <form className="stack-form" onSubmit={submit}>
        <Card>
          <h2>Imagenes principales</h2>
          <div className="admin-form">
            <SelectField label="Imagen hero" value={heroMediaId} onChange={(event) => setHeroMediaId(event.target.value)}>
              <option value="">Sin imagen administrable</option>
              {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
            </SelectField>
            <SelectField label="Imagen ciudad / guia" value={cityMediaId} onChange={(event) => setCityMediaId(event.target.value)}>
              <option value="">Sin imagen administrable</option>
              {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
            </SelectField>
          </div>
          <div className="media-picker-preview-grid">
            <MediaPreview title="Hero" asset={mediaAssets.find((asset) => asset.id === heroMediaId)} />
            <MediaPreview title="Ciudad" asset={mediaAssets.find((asset) => asset.id === cityMediaId)} />
          </div>
        </Card>
        {languages.map((language) => {
          const translation = translations[language.id] ?? emptyTranslation(language.id);
          return (
            <Card key={language.id}>
              <h2>{language.native_name}</h2>
              <div className="admin-form admin-form-wide">
                <FormField label="Titulo hero" value={translation.hero_title} onChange={(event) => update(language.id, 'hero_title', event.target.value)} required />
                <FormField label="Eslogan hero" value={translation.hero_slogan} onChange={(event) => update(language.id, 'hero_slogan', event.target.value)} required />
                <TextAreaField label="Descripcion hero" value={translation.hero_description} onChange={(event) => update(language.id, 'hero_description', event.target.value)} required />
                <FormField label="Titulo ciudad" value={translation.city_title} onChange={(event) => update(language.id, 'city_title', event.target.value)} required />
                <TextAreaField label="Texto ciudad" value={translation.city_text} onChange={(event) => update(language.id, 'city_text', event.target.value)} required />
                <TextAreaField label="Texto tarjeta idioma" value={translation.language_card_text} onChange={(event) => update(language.id, 'language_card_text', event.target.value)} required />
                <FormField label="Boton tarjeta idioma" value={translation.language_card_button} onChange={(event) => update(language.id, 'language_card_button', event.target.value)} required />
                <FormField label="SEO titulo" value={translation.seo_title} onChange={(event) => update(language.id, 'seo_title', event.target.value)} required />
                <TextAreaField label="SEO descripcion" value={translation.seo_description} onChange={(event) => update(language.id, 'seo_description', event.target.value)} required />
              </div>
            </Card>
          );
        })}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar configuracion'}</Button>
      </form>
    </section>
  );
}

function MediaPreview({ title, asset }: { title: string; asset?: MediaAssetRow }) {
  return (
    <div className="media-picker-preview">
      <strong>{title}</strong>
      {asset ? <img src={mediaUrl(asset.object_key)} alt="" loading="lazy" /> : <span>Sin imagen seleccionada</span>}
    </div>
  );
}

function settingPayload(asset?: MediaAssetRow): Record<string, unknown> {
  return asset?.id ? { media_asset_id: asset.id, object_key: asset.object_key } : {};
}

function resolveMediaId(setting: SiteSettingRow | undefined, mediaAssets: MediaAssetRow[]) {
  const mediaId = setting?.value_json?.media_asset_id;
  if (mediaId && mediaAssets.some((asset) => asset.id === mediaId)) return mediaId;
  const objectKey = setting?.value_json?.object_key;
  return mediaAssets.find((asset) => asset.object_key === objectKey)?.id ?? '';
}

function validateSettings(translations: Record<string, SettingsTranslation>, languages: LanguageRow[]) {
  for (const language of languages) {
    const translation = translations[language.id] ?? emptyTranslation(language.id);
    const requiredError = [
      validateRequired(translation.hero_title, `Titulo hero en ${language.native_name}`),
      validateRequired(translation.hero_slogan, `Eslogan hero en ${language.native_name}`),
      validateRequired(translation.hero_description, `Descripcion hero en ${language.native_name}`),
      validateRequired(translation.city_title, `Titulo ciudad en ${language.native_name}`),
      validateRequired(translation.city_text, `Texto ciudad en ${language.native_name}`),
      validateRequired(translation.language_card_text, `Texto tarjeta idioma en ${language.native_name}`),
      validateRequired(translation.language_card_button, `Boton tarjeta idioma en ${language.native_name}`),
      validateRequired(translation.seo_title, `SEO titulo en ${language.native_name}`),
      validateRequired(translation.seo_description, `SEO descripcion en ${language.native_name}`)
    ].find(Boolean);

    if (requiredError) return requiredError;
  }

  return '';
}
