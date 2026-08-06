import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { prepareImageUpload } from '../../lib/imageCompression';
import { mediaUrl } from '../../lib/media';
import { canUseUploadApi, uploadMediaFile } from '../../lib/uploadApi';
import { validateOptionalUrl, validateRequired, validateSlug } from '../../lib/validation';

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface TypeRow {
  id: string;
  slug: string;
  element_type_translations?: Array<{ name: string; languages?: { code: string } | { code: string }[] | null }>;
}

interface ElementTranslationRow {
  name: string;
  short_text: string;
  long_text?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_published: boolean;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

interface ElementRow {
  id?: string;
  slug: string;
  element_type_id: string;
  maps_url?: string | null;
  status: 'draft' | 'published';
  is_featured: boolean;
  show_long_text_default?: boolean;
  sort_order: number;
  element_translations?: ElementTranslationRow[];
}

interface TranslationForm {
  language_id: string;
  name: string;
  short_text: string;
  long_text: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
}

interface ElementForm {
  slug: string;
  element_type_id: string;
  maps_url: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  show_long_text_default: boolean;
  sort_order: number;
  translations: TranslationForm[];
}

interface MediaAssetRow {
  id: string;
  object_key: string;
  media_type: 'image' | 'audio' | 'logo' | 'file';
  mime_type?: string;
  original_name: string;
  file_size?: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
}

interface ElementImageRow {
  id?: string;
  element_id: string;
  media_asset_id: string;
  is_cover: boolean;
  sort_order: number;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
}

interface ElementAudioRow {
  id?: string;
  element_id: string;
  language_id: string;
  media_asset_id: string;
  title: string;
  sort_order: number;
  is_published: boolean;
  languages?: { code: string } | { code: string }[] | null;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
}

interface ElementLinkRow {
  id?: string;
  element_id: string;
  language_id: string;
  title: string;
  url: string;
  link_type?: string | null;
  sort_order: number;
  is_published: boolean;
  languages?: { code: string } | { code: string }[] | null;
}

const emptyElement = (languages: LanguageRow[]): ElementForm => ({
  slug: '',
  element_type_id: '',
  maps_url: '',
  status: 'draft',
  is_featured: false,
  show_long_text_default: false,
  sort_order: 0,
  translations: languages.map((language) => ({
    language_id: language.id,
    name: '',
    short_text: '',
    long_text: '',
    seo_title: '',
    seo_description: '',
    is_published: language.code === 'es'
  }))
});

const emptyImage = {
  media_asset_id: '',
  is_cover: false,
  sort_order: 0,
  title: '',
  alt_text: '',
  caption: ''
};

const emptyAudio = {
  language_id: '',
  media_asset_id: '',
  title: '',
  transcript: '',
  sort_order: 0,
  is_published: true
};

const emptyLink = {
  language_id: '',
  title: '',
  url: '',
  link_type: '',
  sort_order: 0,
  is_published: true
};

export function AdminElementEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ElementRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<ElementForm>();
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [images, setImages] = useState<ElementImageRow[]>([]);
  const [audios, setAudios] = useState<ElementAudioRow[]>([]);
  const [links, setLinks] = useState<ElementLinkRow[]>([]);
  const [imageForm, setImageForm] = useState({ ...emptyImage });
  const [audioForm, setAudioForm] = useState({ ...emptyAudio });
  const [linkForm, setLinkForm] = useState({ ...emptyLink });
  const [imageUploadFile, setImageUploadFile] = useState<File>();
  const [audioUploadFile, setAudioUploadFile] = useState<File>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    const [elementRows, typeRows, languageRows, mediaRows, imageRows, audioRows, linkRows] = await Promise.all([
      adminRepository.listElements(),
      adminRepository.listElementTypes(),
      adminRepository.listLanguages(),
      adminRepository.listMediaAssets(),
      adminRepository.listElementImages(),
      adminRepository.listElementAudios(),
      adminRepository.listLinks()
    ]);
    const nextElements = elementRows as unknown as ElementRow[];
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    const element = nextElements.find((item) => item.id === id);
    setItems(nextElements);
    setTypes(typeRows as unknown as TypeRow[]);
    setLanguages(nextLanguages);
    setMediaAssets(mediaRows as unknown as MediaAssetRow[]);
    setImages((imageRows as unknown as ElementImageRow[]).filter((item) => item.element_id === id));
    setAudios((audioRows as unknown as ElementAudioRow[]).filter((item) => item.element_id === id));
    setLinks((linkRows as unknown as ElementLinkRow[]).filter((item) => item.element_id === id));
    setAudioForm((current) => ({ ...current, language_id: current.language_id || nextLanguages[0]?.id || '' }));
    setLinkForm((current) => ({ ...current, language_id: current.language_id || nextLanguages[0]?.id || '' }));
    setForm(element ? {
      slug: element.slug,
      element_type_id: element.element_type_id,
      maps_url: element.maps_url ?? '',
      status: element.status,
      is_featured: element.is_featured,
      show_long_text_default: element.show_long_text_default ?? false,
      sort_order: element.sort_order,
      translations: nextLanguages.map((language) => {
        const saved = element.element_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
        return {
          language_id: language.id,
          name: saved?.name ?? '',
          short_text: saved?.short_text ?? '',
          long_text: saved?.long_text ?? '',
          seo_title: saved?.seo_title ?? '',
          seo_description: saved?.seo_description ?? '',
          is_published: saved?.is_published ?? false
        };
      })
    } : undefined);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError('No se pudo cargar el elemento.'))
      .finally(() => setLoading(false));
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError('');
    setSuccess('');

    const validationError = validateElement(form, languages, items, id);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveElement({ id, ...form, slug: form.slug.trim(), maps_url: form.maps_url.trim() });
      setSuccess('Elemento guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el elemento.');
    } finally {
      setSubmitting(false);
    }
  }

  async function addImage(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    if (!imageForm.media_asset_id && !imageUploadFile) {
      setError('Selecciona una imagen subida o un fichero nuevo.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const mediaAssetId = imageUploadFile ? await uploadAsset(imageUploadFile, 'element-image') : imageForm.media_asset_id;
      await adminRepository.saveElementImage({
        element_id: id,
        media_asset_id: mediaAssetId,
        is_cover: imageForm.is_cover,
        sort_order: imageForm.sort_order,
        translations: languages.map((language) => ({
          language_id: language.id,
          title: imageForm.title,
          alt_text: imageForm.alt_text || imageForm.title || form?.slug || '',
          caption: imageForm.caption
        }))
      });
      setImageForm({ ...emptyImage });
      setImageUploadFile(undefined);
      setSuccess('Imagen asociada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo asociar la imagen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function addAudio(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    const requiredError = validateRequired(audioForm.language_id, 'Idioma') || validateRequired(audioForm.media_asset_id, 'Audio') || validateRequired(audioForm.title, 'Titulo');
    const requiredUploadError = validateRequired(audioForm.language_id, 'Idioma') || validateRequired(audioForm.title, 'Titulo');
    if (!audioForm.media_asset_id && !audioUploadFile) {
      setError('Selecciona un audio subido o un fichero nuevo.');
      return;
    }
    if (audioForm.media_asset_id ? requiredError : requiredUploadError) {
      setError(audioForm.media_asset_id ? requiredError : requiredUploadError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const mediaAssetId = audioUploadFile ? await uploadAsset(audioUploadFile, 'element-audio') : audioForm.media_asset_id;
      await adminRepository.saveElementAudio({ id: undefined, element_id: id, ...audioForm, media_asset_id: mediaAssetId, title: audioForm.title.trim() });
      setAudioForm({ ...emptyAudio, language_id: languages[0]?.id ?? '' });
      setAudioUploadFile(undefined);
      setSuccess('Audio asociado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo asociar el audio.');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadAsset(file: File, target: string) {
    if (!canUseUploadApi()) throw new Error('Falta configurar VITE_UPLOAD_API_URL para subir ficheros desde esta pantalla.');

    if (file.type.startsWith('image/')) {
      const prepared = await prepareImageUpload(file);
      const [mainResult, thumbnailResult] = await Promise.all([
        uploadMediaFile(prepared.mainFile, target),
        uploadMediaFile(prepared.thumbnailFile, target)
      ]);
      const saved = await adminRepository.saveMediaAsset({
        ...mainResult.asset,
        mime_type: prepared.mainFile.type,
        original_name: prepared.mainFile.name,
        file_size: prepared.mainFile.size,
        width: prepared.width,
        height: prepared.height,
        duration_seconds: null
      }) as { id: string };
      await adminRepository.saveMediaVariant({
        media_asset_id: saved.id,
        variant: 'thumbnail',
        object_key: thumbnailResult.asset.object_key,
        file_size: prepared.thumbnailFile.size,
        width: prepared.thumbnailWidth,
        height: prepared.thumbnailHeight
      });
      return saved.id;
    }

    const result = await uploadMediaFile(file, target);
    const saved = await adminRepository.saveMediaAsset({
      ...result.asset,
      width: null,
      height: null,
      duration_seconds: null
    }) as { id: string };
    return saved.id;
  }

  async function addLink(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    const requiredError = validateRequired(linkForm.language_id, 'Idioma') || validateRequired(linkForm.title, 'Titulo') || validateRequired(linkForm.url, 'URL') || validateOptionalUrl(linkForm.url, 'La URL');
    if (requiredError) {
      setError(requiredError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await adminRepository.saveLink({ id: undefined, element_id: id, ...linkForm, title: linkForm.title.trim(), url: linkForm.url.trim(), link_type: linkForm.link_type.trim() });
      setLinkForm({ ...emptyLink, language_id: languages[0]?.id ?? '' });
      setSuccess('Enlace guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el enlace.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAssociation(kind: 'image' | 'audio' | 'link', associationId?: string) {
    if (!associationId) return;
    setSubmitting(true);
    setError('');
    try {
      if (kind === 'image') await adminRepository.deleteElementImage(associationId);
      if (kind === 'audio') await adminRepository.deleteElementAudio(associationId);
      if (kind === 'link') await adminRepository.deleteLink(associationId);
      setSuccess('Asociacion borrada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar la asociacion.');
    } finally {
      setSubmitting(false);
    }
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string | boolean) {
    setForm((current) => current ? ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }) : current);
  }

  if (!id) return <Navigate to="/admin/elementos" replace />;
  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar elementos reales." />;
  if (isLoading) return <LoadingState />;
  if (!form) return <EmptyState title="Elemento no encontrado" message="Vuelve al listado y selecciona otro elemento." />;

  const imageAssets = mediaAssets.filter((asset) => asset.media_type === 'image' || asset.media_type === 'logo');
  const audioAssets = mediaAssets.filter((asset) => asset.media_type === 'audio');

  return (
    <section className="admin-section">
      <div className="admin-title-row">
        <h1>Editar elemento</h1>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/elementos')}>Volver</Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <div className="admin-form">
            <FormField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
            <SelectField label="Tipo" value={form.element_type_id} onChange={(event) => setForm({ ...form, element_type_id: event.target.value })} required>
              <option value="">Selecciona un tipo</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>{typeName(type)}</option>
              ))}
            </SelectField>
            <SelectField label="Estado" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'published' })}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </SelectField>
            <FormField label="URL mapa" value={form.maps_url} onChange={(event) => setForm({ ...form, maps_url: event.target.value })} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Destacado</label>
            <label className="check-field"><input type="checkbox" checked={form.show_long_text_default} onChange={(event) => setForm({ ...form, show_long_text_default: event.target.checked })} /> Texto largo desplegado por defecto</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? emptyElement([language]).translations[0];
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Texto corto" value={translation.short_text} onChange={(event) => updateTranslation(language.id, 'short_text', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Texto largo" value={translation.long_text} onChange={(event) => updateTranslation(language.id, 'long_text', event.target.value)} />
                  <FormField label="SEO titulo" value={translation.seo_title} onChange={(event) => updateTranslation(language.id, 'seo_title', event.target.value)} />
                  <TextAreaField label="SEO descripcion" value={translation.seo_description} onChange={(event) => updateTranslation(language.id, 'seo_description', event.target.value)} />
                  <label className="check-field"><input type="checkbox" checked={translation.is_published} onChange={(event) => updateTranslation(language.id, 'is_published', event.target.checked)} /> Publicada</label>
                </fieldset>
              );
            })}
          </div>
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>
      <ElementImagesSection
        assets={imageAssets}
        form={imageForm}
        uploadFile={imageUploadFile}
        images={images}
        isSubmitting={isSubmitting}
        onChange={setImageForm}
        onUploadFileChange={setImageUploadFile}
        onDelete={(associationId) => deleteAssociation('image', associationId)}
        onSubmit={addImage}
      />
      <ElementAudiosSection
        assets={audioAssets}
        form={audioForm}
        uploadFile={audioUploadFile}
        audios={audios}
        languages={languages}
        isSubmitting={isSubmitting}
        onChange={setAudioForm}
        onUploadFileChange={setAudioUploadFile}
        onDelete={(associationId) => deleteAssociation('audio', associationId)}
        onSubmit={addAudio}
      />
      <ElementLinksSection
        form={linkForm}
        links={links}
        languages={languages}
        isSubmitting={isSubmitting}
        onChange={setLinkForm}
        onDelete={(associationId) => deleteAssociation('link', associationId)}
        onSubmit={addLink}
      />
    </section>
  );
}

function ElementImagesSection({ assets, form, uploadFile, images, isSubmitting, onChange, onUploadFileChange, onDelete, onSubmit }: {
  assets: MediaAssetRow[];
  form: typeof emptyImage;
  uploadFile?: File;
  images: ElementImageRow[];
  isSubmitting: boolean;
  onChange: (next: typeof emptyImage) => void;
  onUploadFileChange: (file?: File) => void;
  onDelete: (id?: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Card>
      <h2>Imagenes del elemento</h2>
      <form className="admin-form" onSubmit={onSubmit}>
        <label className="form-field">
          <span>Subir nueva imagen</span>
          <input type="file" accept="image/*" onChange={(event) => onUploadFileChange(event.target.files?.[0])} />
          {uploadFile ? <small>{uploadFile.name}</small> : null}
        </label>
        <SelectField label="Imagen ya subida" value={form.media_asset_id} onChange={(event) => onChange({ ...form, media_asset_id: event.target.value })}>
          <option value="">Selecciona imagen subida</option>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
        </SelectField>
        <FormField label="Titulo" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
        <FormField label="Texto alternativo" value={form.alt_text} onChange={(event) => onChange({ ...form, alt_text: event.target.value })} />
        <FormField label="Pie" value={form.caption} onChange={(event) => onChange({ ...form, caption: event.target.value })} />
        <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} />
        <label className="check-field"><input type="checkbox" checked={form.is_cover} onChange={(event) => onChange({ ...form, is_cover: event.target.checked })} /> Portada</label>
        <div className="button-row"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Subir/asociar imagen'}</Button></div>
      </form>
      <div className="association-list">
        {images.map((image) => {
          const asset = mediaAsset(image.media_assets);
          return (
            <div className="association-row" key={image.id}>
              {asset ? <img src={mediaUrl(asset.object_key)} alt="" loading="lazy" /> : null}
              <span>{asset?.original_name ?? image.media_asset_id} {image.is_cover ? '(portada)' : ''}</span>
              <button className="icon-button icon-button-danger" type="button" aria-label="Borrar imagen" onClick={() => onDelete(image.id)}><Trash2 size={18} /></button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ElementAudiosSection({ assets, form, uploadFile, audios, languages, isSubmitting, onChange, onUploadFileChange, onDelete, onSubmit }: {
  assets: MediaAssetRow[];
  form: typeof emptyAudio;
  uploadFile?: File;
  audios: ElementAudioRow[];
  languages: LanguageRow[];
  isSubmitting: boolean;
  onChange: (next: typeof emptyAudio) => void;
  onUploadFileChange: (file?: File) => void;
  onDelete: (id?: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Card>
      <h2>Audios</h2>
      <form className="admin-form" onSubmit={onSubmit}>
        <label className="form-field">
          <span>Subir nuevo audio</span>
          <input type="file" accept="audio/*" onChange={(event) => onUploadFileChange(event.target.files?.[0])} />
          {uploadFile ? <small>{uploadFile.name}</small> : null}
        </label>
        <SelectField label="Idioma" value={form.language_id} onChange={(event) => onChange({ ...form, language_id: event.target.value })} required>
          <option value="">Selecciona idioma</option>
          {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
        </SelectField>
        <SelectField label="Audio ya subido" value={form.media_asset_id} onChange={(event) => onChange({ ...form, media_asset_id: event.target.value })}>
          <option value="">Selecciona audio subido</option>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
        </SelectField>
        <FormField label="Titulo" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} required />
        <FormField label="Transcripcion" value={form.transcript} onChange={(event) => onChange({ ...form, transcript: event.target.value })} />
        <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} />
        <label className="check-field"><input type="checkbox" checked={form.is_published} onChange={(event) => onChange({ ...form, is_published: event.target.checked })} /> Publicado</label>
        <div className="button-row"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Subir/asociar audio'}</Button></div>
      </form>
      <div className="association-list">
        {audios.map((audio) => {
          const asset = mediaAsset(audio.media_assets);
          return (
            <div className="association-row" key={audio.id}>
              <span>{audio.title} - {getCode(audio.languages)} - {asset?.original_name ?? audio.media_asset_id}</span>
              <button className="icon-button icon-button-danger" type="button" aria-label="Borrar audio" onClick={() => onDelete(audio.id)}><Trash2 size={18} /></button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ElementLinksSection({ form, links, languages, isSubmitting, onChange, onDelete, onSubmit }: {
  form: typeof emptyLink;
  links: ElementLinkRow[];
  languages: LanguageRow[];
  isSubmitting: boolean;
  onChange: (next: typeof emptyLink) => void;
  onDelete: (id?: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Card>
      <h2>Enlaces</h2>
      <form className="admin-form" onSubmit={onSubmit}>
        <SelectField label="Idioma" value={form.language_id} onChange={(event) => onChange({ ...form, language_id: event.target.value })} required>
          <option value="">Selecciona idioma</option>
          {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
        </SelectField>
        <FormField label="Titulo" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} required />
        <FormField label="URL" type="url" value={form.url} onChange={(event) => onChange({ ...form, url: event.target.value })} required />
        <FormField label="Tipo" value={form.link_type} onChange={(event) => onChange({ ...form, link_type: event.target.value })} />
        <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} />
        <label className="check-field"><input type="checkbox" checked={form.is_published} onChange={(event) => onChange({ ...form, is_published: event.target.checked })} /> Publicado</label>
        <div className="button-row"><Button type="submit" disabled={isSubmitting}>Guardar enlace</Button></div>
      </form>
      <div className="association-list">
        {links.map((link) => (
          <div className="association-row" key={link.id}>
            <span>{link.title} - {getCode(link.languages)} - {link.url}</span>
            <button className="icon-button icon-button-danger" type="button" aria-label="Borrar enlace" onClick={() => onDelete(link.id)}><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function validateElement(candidate: ElementForm, languages: LanguageRow[], rows: ElementRow[], editingId?: string) {
  const slugError = validateSlug(candidate.slug);
  if (slugError) return slugError;
  const duplicated = rows.some((item) => item.id !== editingId && item.slug === candidate.slug.trim());
  if (duplicated) return 'Ya existe un elemento con ese slug.';
  const typeError = validateRequired(candidate.element_type_id, 'Tipo');
  if (typeError) return typeError;
  const urlError = validateOptionalUrl(candidate.maps_url, 'La URL del mapa');
  if (urlError) return urlError;
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  const requiredError = [
    validateRequired(spanishTranslation?.name, `Nombre en ${spanish?.native_name ?? 'el idioma principal'}`),
    validateRequired(spanishTranslation?.short_text, `Texto corto en ${spanish?.native_name ?? 'el idioma principal'}`)
  ].find(Boolean);
  return requiredError ?? '';
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}

function typeName(type?: TypeRow) {
  return type?.element_type_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? type?.slug ?? 'Sin tipo';
}

function mediaAsset(relation: MediaAssetRow | MediaAssetRow[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}
