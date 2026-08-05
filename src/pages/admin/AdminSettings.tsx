import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { mediaUrl } from '../../lib/media';
import { publicPath } from '../../lib/routing';
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
  const [heroLogoMediaId, setHeroLogoMediaId] = useState('');
  const [heroMediaId, setHeroMediaId] = useState('');
  const [cityMediaId, setCityMediaId] = useState('');
  const [activeLanguageId, setActiveLanguageId] = useState('');
  const [editingLanguageId, setEditingLanguageId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successModal, setSuccessModal] = useState('');

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
        setActiveLanguageId(activeLanguages[0]?.id ?? '');
        setHeroLogoMediaId(resolveMediaId(settings.find((setting) => setting.key === 'hero_logo_media'), imageRows));
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

  async function saveMediaSettings(event: FormEvent) {
    event.preventDefault();
    setError('');

    setSubmitting(true);
    try {
      await Promise.all([
        adminRepository.saveSiteSetting('hero_logo_media', settingPayload(mediaAssets.find((asset) => asset.id === heroLogoMediaId))),
        adminRepository.saveSiteSetting('hero_media', settingPayload(mediaAssets.find((asset) => asset.id === heroMediaId))),
        adminRepository.saveSiteSetting('city_media', settingPayload(mediaAssets.find((asset) => asset.id === cityMediaId)))
      ]);
      setSuccessModal('Imagenes principales guardadas correctamente.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron guardar las imagenes principales.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveTranslation(event: FormEvent, language: LanguageRow) {
    event.preventDefault();
    setError('');

    const validationError = validateTranslation(translations[language.id] ?? emptyTranslation(language.id), language);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveSiteTranslations([translations[language.id] ?? emptyTranslation(language.id)]);
      setEditingLanguageId(undefined);
      setSuccessModal(`Textos de ${language.native_name} guardados correctamente.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron guardar los textos.');
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
      <div className="stack-form">
        <Card>
          <h2>Imagenes principales</h2>
          <form className="stack-form" onSubmit={saveMediaSettings}>
            <div className="site-media-settings-grid">
              <div className="site-media-setting">
                <SelectField label="Imagen portada hero" value={heroLogoMediaId} onChange={(event) => setHeroLogoMediaId(event.target.value)}>
                  <option value="">Logo por defecto</option>
                  {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
                </SelectField>
                <MediaPreview title="Portada hero" asset={mediaAssets.find((asset) => asset.id === heroLogoMediaId)} fallbackObjectKey="brand/logo-vive-utrera.png" />
              </div>
              <div className="site-media-setting">
                <SelectField label="Imagen fondo hero" value={heroMediaId} onChange={(event) => setHeroMediaId(event.target.value)}>
                  <option value="">Sin imagen administrable</option>
                  {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
                </SelectField>
                <MediaPreview title="Fondo hero" asset={mediaAssets.find((asset) => asset.id === heroMediaId)} />
              </div>
              <div className="site-media-setting">
                <SelectField label="Imagen ciudad / guia" value={cityMediaId} onChange={(event) => setCityMediaId(event.target.value)}>
                  <option value="">Sin imagen administrable</option>
                  {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
                </SelectField>
                <MediaPreview title="Ciudad / guia" asset={mediaAssets.find((asset) => asset.id === cityMediaId)} />
              </div>
            </div>
            <div className="button-row">
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar imagenes'}</Button>
            </div>
          </form>
        </Card>
        <Card>
          <h2>Textos por idioma</h2>
          <div className="settings-tabs" role="tablist" aria-label="Idiomas de configuracion">
            {languages.map((language) => (
              <button
                key={language.id}
                type="button"
                role="tab"
                aria-selected={activeLanguageId === language.id}
                className={activeLanguageId === language.id ? 'active' : ''}
                onClick={() => setActiveLanguageId(language.id)}
              >
                <img className="settings-tab-flag" src={publicPath(`flags/flag-${language.code}.png`)} alt="" />
                {language.native_name}
              </button>
            ))}
          </div>
          {languages.map((language) => {
            const translation = translations[language.id] ?? emptyTranslation(language.id);
            const isActive = activeLanguageId === language.id;
            const isEditing = editingLanguageId === language.id;
            return (
              <form
                key={language.id}
                className={isActive ? 'settings-language-panel stack-form' : 'settings-language-panel stack-form hidden'}
                role="tabpanel"
                onSubmit={(event) => saveTranslation(event, language)}
              >
                <div className="admin-title-row">
                  <h3>{language.native_name}</h3>
                  <div className="button-row">
                    <Button type="button" variant="secondary" disabled={isEditing || isSubmitting} onClick={() => setEditingLanguageId(language.id)}>Editar</Button>
                    <Button type="submit" disabled={!isEditing || isSubmitting}>{isSubmitting && isEditing ? 'Guardando...' : 'Guardar'}</Button>
                  </div>
                </div>
              <div className="admin-form admin-form-wide">
                <FormField label="Titulo hero" value={translation.hero_title} onChange={(event) => update(language.id, 'hero_title', event.target.value)} required readOnly={!isEditing} />
                <FormField className="wide-input" label="Eslogan hero" value={translation.hero_slogan} onChange={(event) => update(language.id, 'hero_slogan', event.target.value)} required readOnly={!isEditing} />
                <TextAreaField label="Descripcion hero" value={translation.hero_description} onChange={(event) => update(language.id, 'hero_description', event.target.value)} required readOnly={!isEditing} />
                <FormField label="Titulo ciudad" value={translation.city_title} onChange={(event) => update(language.id, 'city_title', event.target.value)} required readOnly={!isEditing} />
                <TextAreaField label="Texto ciudad" value={translation.city_text} onChange={(event) => update(language.id, 'city_text', event.target.value)} required readOnly={!isEditing} />
                <TextAreaField label="Texto tarjeta idioma" value={translation.language_card_text} onChange={(event) => update(language.id, 'language_card_text', event.target.value)} required readOnly={!isEditing} />
                <FormField label="Boton tarjeta idioma" value={translation.language_card_button} onChange={(event) => update(language.id, 'language_card_button', event.target.value)} required readOnly={!isEditing} />
                <FormField label="SEO titulo" value={translation.seo_title} onChange={(event) => update(language.id, 'seo_title', event.target.value)} required readOnly={!isEditing} />
                <TextAreaField label="SEO descripcion" value={translation.seo_description} onChange={(event) => update(language.id, 'seo_description', event.target.value)} required readOnly={!isEditing} />
              </div>
              </form>
            );
          })}
        </Card>
      </div>
      <Modal title="Configuracion guardada" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}>
        <p>{successModal}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button>
        </div>
      </Modal>
    </section>
  );
}

function MediaPreview({ title, asset, fallbackObjectKey }: { title: string; asset?: MediaAssetRow; fallbackObjectKey?: string }) {
  const objectKey = asset?.object_key ?? fallbackObjectKey;
  return (
    <div className="site-media-preview" aria-label={title}>
      {objectKey ? <img src={asset ? mediaUrl(objectKey) : publicPath(objectKey)} alt="" loading="lazy" /> : <span>Sin imagen seleccionada</span>}
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

function validateTranslation(translation: SettingsTranslation, language: LanguageRow) {
  return [
    validateRequired(translation.hero_title, `Titulo hero en ${language.native_name}`),
    validateRequired(translation.hero_slogan, `Eslogan hero en ${language.native_name}`),
    validateRequired(translation.hero_description, `Descripcion hero en ${language.native_name}`),
    validateRequired(translation.city_title, `Titulo ciudad en ${language.native_name}`),
    validateRequired(translation.city_text, `Texto ciudad en ${language.native_name}`),
    validateRequired(translation.language_card_text, `Texto tarjeta idioma en ${language.native_name}`),
    validateRequired(translation.language_card_button, `Boton tarjeta idioma en ${language.native_name}`),
    validateRequired(translation.seo_title, `SEO titulo en ${language.native_name}`),
    validateRequired(translation.seo_description, `SEO descripcion en ${language.native_name}`)
  ].find(Boolean) ?? '';
}
