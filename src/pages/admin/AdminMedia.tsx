import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { prepareImageUpload } from '../../lib/imageCompression';
import { mediaUrl } from '../../lib/media';
import { canUseUploadApi, deleteMediaFiles, uploadMediaFile } from '../../lib/uploadApi';
import { matchesSearch, validateRequired } from '../../lib/validation';

interface MediaAssetRow {
  id?: string;
  object_key: string;
  media_type: 'image' | 'audio' | 'logo' | 'file';
  mime_type: string;
  original_name: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  media_variants?: MediaVariantRow[] | null;
}

interface MediaVariantRow {
  id?: string;
  variant: string;
  object_key: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
}

interface ElementOptionRow {
  id: string;
  slug: string;
  element_translations?: Array<{ name: string; language_id?: string; languages?: { code: string } | { code: string }[] | null }>;
}

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface ImageTranslationForm {
  language_id: string;
  title: string;
  alt_text: string;
  caption: string;
}

interface ImageAssociationForm {
  element_id: string;
  media_asset_id: string;
  is_cover: boolean;
  sort_order: number;
  translations: ImageTranslationForm[];
}

interface AudioAssociationForm {
  element_id: string;
  language_id: string;
  media_asset_id: string;
  title: string;
  transcript: string;
  sort_order: number;
  is_published: boolean;
}

interface ElementImageAssociationRow {
  id: string;
  element_id: string;
  media_asset_id: string;
  is_cover: boolean;
  sort_order: number;
  elements?: { slug: string } | { slug: string }[] | null;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
  element_image_translations?: Array<{
    title?: string | null;
    alt_text: string;
    caption?: string | null;
    language_id?: string;
    languages?: { code: string } | { code: string }[] | null;
  }>;
}

interface ElementAudioAssociationRow {
  id: string;
  element_id: string;
  language_id: string;
  media_asset_id: string;
  title: string;
  sort_order: number;
  is_published: boolean;
  elements?: { slug: string } | { slug: string }[] | null;
  languages?: { code: string } | { code: string }[] | null;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
}

const emptyMedia: MediaAssetRow = {
  object_key: '',
  media_type: 'image',
  mime_type: 'image/webp',
  original_name: '',
  file_size: 0,
  width: null,
  height: null,
  duration_seconds: null
};

const emptyImageAssociation = (languages: LanguageRow[]): ImageAssociationForm => ({
  element_id: '',
  media_asset_id: '',
  is_cover: true,
  sort_order: 0,
  translations: languages.map((language) => ({
    language_id: language.id,
    title: '',
    alt_text: '',
    caption: ''
  }))
});

const emptyAudioAssociation = (languages: LanguageRow[]): AudioAssociationForm => ({
  element_id: '',
  language_id: languages[0]?.id ?? '',
  media_asset_id: '',
  title: '',
  transcript: '',
  sort_order: 0,
  is_published: true
});

export function AdminMedia() {
  const [items, setItems] = useState<MediaAssetRow[]>([]);
  const [elements, setElements] = useState<ElementOptionRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [elementImages, setElementImages] = useState<ElementImageAssociationRow[]>([]);
  const [elementAudios, setElementAudios] = useState<ElementAudioAssociationRow[]>([]);
  const [form, setForm] = useState<MediaAssetRow>(emptyMedia);
  const [imageAssociation, setImageAssociation] = useState<ImageAssociationForm>(emptyImageAssociation([]));
  const [audioAssociation, setAudioAssociation] = useState<AudioAssociationForm>(emptyAudioAssociation([]));
  const [editingImageAssociationId, setEditingImageAssociationId] = useState<string>();
  const [deleteId, setDeleteId] = useState<string>();
  const [deleteImageId, setDeleteImageId] = useState<string>();
  const [deleteAudioId, setDeleteAudioId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploadTarget, setUploadTarget] = useState('element-image');
  const [uploadFile, setUploadFile] = useState<File>();
  const [uploadPreview, setUploadPreview] = useState<{
    url?: string;
    originalSize?: number;
    optimizedSize?: number;
    thumbnailSize?: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
    progress?: number;
    warnings?: string[];
    status?: string;
  }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [rows, elementRows, languageRows, imageRows, audioRows] = await Promise.all([
      adminRepository.listMediaAssets(),
      adminRepository.listElements(),
      adminRepository.listLanguages(),
      adminRepository.listElementImages(),
      adminRepository.listElementAudios()
    ]);
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    setItems(rows as unknown as MediaAssetRow[]);
    setElements(elementRows as unknown as ElementOptionRow[]);
    setLanguages(nextLanguages);
    setElementImages(imageRows as unknown as ElementImageAssociationRow[]);
    setElementAudios(audioRows as unknown as ElementAudioAssociationRow[]);
    setImageAssociation((current) => current.translations.length ? current : emptyImageAssociation(nextLanguages));
    setAudioAssociation((current) => current.language_id ? current : emptyAudioAssociation(nextLanguages));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudo cargar la biblioteca multimedia.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateMedia(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveMediaAsset({
        ...form,
        object_key: form.object_key.trim().replace(/^\/+/, ''),
        mime_type: form.mime_type.trim(),
        original_name: form.original_name.trim() || form.object_key.split('/').pop() || form.object_key,
        width: form.width || null,
        height: form.height || null,
        duration_seconds: form.duration_seconds || null
      });
      setForm(emptyMedia);
      setSuccess('Asset guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el asset.');
    } finally {
      setSubmitting(false);
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!uploadFile) {
      setError('Selecciona un fichero para subir.');
      return;
    }

    setSubmitting(true);
    try {
      if (uploadFile.type.startsWith('image/')) {
        setUploadPreview((current) => ({ ...current, status: 'Optimizando imagen en el navegador...' }));
        const prepared = await prepareImageUpload(uploadFile);
        setUploadPreview((current) => ({
          ...current,
          optimizedSize: prepared.mainFile.size,
          thumbnailSize: prepared.thumbnailFile.size,
          width: prepared.width,
          height: prepared.height,
          warnings: prepared.warnings,
          status: 'Subiendo imagen principal y miniatura a R2...'
        }));
        const mainResult = await uploadMediaFile(prepared.mainFile, uploadTarget, (progress) => {
          setUploadPreview((current) => ({ ...current, progress: Math.round(progress * 0.7), status: `Subiendo imagen principal: ${progress}%` }));
        });
        const thumbnailResult = await uploadMediaFile(prepared.thumbnailFile, uploadTarget, (progress) => {
          setUploadPreview((current) => ({ ...current, progress: 70 + Math.round(progress * 0.2), status: `Subiendo miniatura: ${progress}%` }));
        });
        setUploadPreview((current) => ({ ...current, status: 'Guardando metadatos en Supabase...' }));
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
        setSuccess(`Imagen optimizada: ${Math.round(prepared.mainFile.size / 1024)} KB y miniatura: ${Math.round(prepared.thumbnailFile.size / 1024)} KB.`);
      } else {
        setUploadPreview((current) => ({ ...current, status: 'Subiendo fichero a R2...' }));
        const result = await uploadMediaFile(uploadFile, uploadTarget, (progress) => {
          setUploadPreview((current) => ({ ...current, progress, status: `Subiendo fichero: ${progress}%` }));
        });
        await adminRepository.saveMediaAsset({
          ...result.asset,
          width: null,
          height: null,
          duration_seconds: null
        });
        setSuccess(`Fichero subido y registrado: ${result.asset.object_key}`);
      }
      setUploadFile(undefined);
      setUploadPreview({});
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo subir el fichero.');
    } finally {
      setSubmitting(false);
    }
  }

  async function selectUploadFile(file?: File) {
    if (uploadPreview.url) URL.revokeObjectURL(uploadPreview.url);
    setUploadFile(file);
    if (!file) {
      setUploadPreview({});
      return;
    }

    const nextPreview = {
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      originalSize: file.size,
      status: 'Fichero preparado para subir.'
    };
    setUploadPreview(nextPreview);

    if (file.type.startsWith('image/')) {
      try {
        const bitmap = await createImageBitmap(file);
        setUploadPreview((current) => ({ ...current, width: bitmap.width, height: bitmap.height }));
        bitmap.close();
      } catch {
        setUploadPreview((current) => ({ ...current, status: 'No se pudieron leer las dimensiones de la imagen.' }));
      }
    }

    if (file.type.startsWith('audio/')) {
      try {
        const durationSeconds = await readAudioDuration(file);
        setUploadPreview((current) => ({ ...current, durationSeconds }));
      } catch {
        setUploadPreview((current) => ({ ...current, status: 'No se pudo leer la duracion del audio.' }));
      }
    }
  }

  function edit(item: MediaAssetRow) {
    setError('');
    setSuccess('');
    setForm(item);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const asset = items.find((item) => item.id === deleteId);
    if (!asset?.id) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const usage = await adminRepository.getMediaAssetUsage(asset.id);
      const totalUsage = usage.images + usage.audios + usage.collaborators + usage.siteSettings;
      if (totalUsage > 0) {
        setError(`No se puede borrar: esta usado en ${usage.images} imagenes de elementos, ${usage.audios} audios, ${usage.collaborators} colaboradores y ${usage.siteSettings} ajustes del sitio. Quita primero esas asociaciones.`);
        return;
      }

      const objectKeys = [asset.object_key, ...(asset.media_variants ?? []).map((variant) => variant.object_key)];
      await deleteMediaFiles(objectKeys);
      await adminRepository.deleteMediaAsset(deleteId);
      setDeleteId(undefined);
      setSuccess(`Asset borrado de R2 y Supabase: ${objectKeys.length} archivo${objectKeys.length === 1 ? '' : 's'}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el asset de forma coordinada.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveImageAssociation(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = [
      validateRequired(imageAssociation.element_id, 'Elemento'),
      validateRequired(imageAssociation.media_asset_id, 'Imagen'),
      validateRequired(imageAssociation.translations.find((translation) => getLanguageCode(translation.language_id, languages) === 'es')?.alt_text, 'Texto alternativo en espanol')
    ].find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveElementImage({ id: editingImageAssociationId, ...imageAssociation });
      setEditingImageAssociationId(undefined);
      setImageAssociation(emptyImageAssociation(languages));
      setSuccess(editingImageAssociationId ? 'Asociacion de imagen actualizada.' : 'Imagen asociada al elemento.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo asociar la imagen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAudioAssociation(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = [
      validateRequired(audioAssociation.element_id, 'Elemento'),
      validateRequired(audioAssociation.language_id, 'Idioma'),
      validateRequired(audioAssociation.media_asset_id, 'Audio'),
      validateRequired(audioAssociation.title, 'Titulo del audio')
    ].find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveElementAudio(audioAssociation);
      setAudioAssociation(emptyAudioAssociation(languages));
      setSuccess('Audio asociado al elemento.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo asociar el audio.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteImageAssociation() {
    if (!deleteImageId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteElementImage(deleteImageId);
      setDeleteImageId(undefined);
      setSuccess('Asociacion de imagen borrada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar la asociacion de imagen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteAudioAssociation() {
    if (!deleteAudioId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteElementAudio(deleteAudioId);
      setDeleteAudioId(undefined);
      setSuccess('Asociacion de audio borrada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar la asociacion de audio.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(emptyMedia);
    setError('');
  }

  function updateImageTranslation(languageId: string, field: keyof Omit<ImageTranslationForm, 'language_id'>, value: string) {
    setImageAssociation((current) => ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }));
  }

  function selectImageAsset(assetId: string) {
    const asset = imageAssets.find((item) => item.id === assetId);
    setImageAssociation((current) => ({
      ...current,
      media_asset_id: assetId,
      translations: current.translations.map((translation) => ({
        ...translation,
        title: translation.title || asset?.original_name?.replace(/\.[^.]+$/, '') || '',
        alt_text: translation.alt_text || selectedElementName(current.element_id, elements, languages)
      }))
    }));
  }

  function selectImageElement(elementId: string) {
    setImageAssociation((current) => ({
      ...current,
      element_id: elementId,
      translations: current.translations.map((translation) => ({
        ...translation,
        alt_text: translation.alt_text || selectedElementName(elementId, elements, languages)
      }))
    }));
  }

  function editImageAssociation(association: ElementImageAssociationRow) {
    setError('');
    setSuccess('');
    setEditingImageAssociationId(association.id);
    setImageAssociation({
      element_id: association.element_id,
      media_asset_id: association.media_asset_id,
      is_cover: association.is_cover,
      sort_order: association.sort_order,
      translations: languages.map((language) => {
        const saved = association.element_image_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
        return {
          language_id: language.id,
          title: saved?.title ?? '',
          alt_text: saved?.alt_text ?? '',
          caption: saved?.caption ?? ''
        };
      })
    });
  }

  function resetImageAssociation() {
    setEditingImageAssociationId(undefined);
    setImageAssociation(emptyImageAssociation(languages));
  }

  const filteredItems = items.filter((item) => (
    matchesSearch([item.object_key, item.original_name, item.mime_type, item.media_type], search)
    && (typeFilter === 'all' || item.media_type === typeFilter)
  ));
  const selectedAsset = items.find((item) => item.id === deleteId);
  const imageAssets = items.filter((item) => item.id && (item.media_type === 'image' || item.media_type === 'logo'));
  const audioAssets = items.filter((item) => item.id && item.media_type === 'audio');
  const selectedImageAssociation = elementImages.find((item) => item.id === deleteImageId);
  const selectedAudioAssociation = elementAudios.find((item) => item.id === deleteAudioId);
  const selectedImageAsset = imageAssets.find((item) => item.id === imageAssociation.media_asset_id);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para registrar multimedia real." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Multimedia</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="admin-form" onSubmit={upload}>
          <SelectField label="Destino" value={uploadTarget} onChange={(event) => setUploadTarget(event.target.value)}>
            <option value="element-image">Imagen de elemento</option>
            <option value="element-audio">Audio de elemento</option>
            <option value="collaborator">Logo colaborador</option>
            <option value="site">General del sitio</option>
          </SelectField>
          <FormField label="Fichero" type="file" onChange={(event) => selectUploadFile(event.target.files?.[0])} disabled={!canUseUploadApi()} />
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting || !canUseUploadApi()}>{isSubmitting ? 'Subiendo...' : 'Subir a R2'}</Button>
          </div>
          <p className="hint">Las imagenes se convierten a WebP: version principal hasta 300 KB y miniatura hasta 50 KB.</p>
          {!canUseUploadApi() ? <p className="hint">Configura VITE_UPLOAD_API_URL y despliega el Worker para activar la subida directa.</p> : null}
        </form>
        {uploadFile ? (
          <div className="upload-preview-panel">
            {uploadPreview.url ? <img src={uploadPreview.url} alt="" /> : <div className="media-admin-icon">{uploadFile.type || 'archivo'}</div>}
            <div>
              <strong>{uploadFile.name}</strong>
              <p>Original: {formatBytes(uploadPreview.originalSize ?? uploadFile.size)}{uploadPreview.width && uploadPreview.height ? ` - ${uploadPreview.width} x ${uploadPreview.height}px` : ''}{uploadPreview.durationSeconds ? ` - ${formatDuration(uploadPreview.durationSeconds)}` : ''}</p>
              {uploadPreview.optimizedSize ? <p>Optimizada: {formatBytes(uploadPreview.optimizedSize)} - miniatura: {formatBytes(uploadPreview.thumbnailSize ?? 0)}</p> : null}
              {uploadPreview.warnings?.map((warning) => <p key={warning} className="warning-text">{warning}</p>)}
              {uploadPreview.progress !== undefined ? <progress value={uploadPreview.progress} max="100" aria-label="Progreso de subida" /> : null}
              {uploadPreview.status ? <p>{uploadPreview.status}</p> : null}
            </div>
          </div>
        ) : null}
      </Card>
      <Card>
        <form className="stack-form" onSubmit={saveImageAssociation}>
          <div className="admin-title-row">
            <h2>{editingImageAssociationId ? 'Editar imagen de elemento' : 'Asociar imagen a elemento'}</h2>
            {editingImageAssociationId ? <Button type="button" variant="ghost" onClick={resetImageAssociation}>Cancelar edicion</Button> : null}
          </div>
          <div className="admin-form">
            <SelectField label="Elemento" value={imageAssociation.element_id} onChange={(event) => selectImageElement(event.target.value)} required>
              <option value="">Selecciona un elemento</option>
              {elements.map((element) => <option key={element.id} value={element.id}>{elementLabel(element, languages)}</option>)}
            </SelectField>
            <SelectField label="Imagen" value={imageAssociation.media_asset_id} onChange={(event) => selectImageAsset(event.target.value)} required>
              <option value="">Selecciona una imagen subida</option>
              {imageAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
            </SelectField>
            <FormField label="Orden" type="number" value={imageAssociation.sort_order} onChange={(event) => setImageAssociation({ ...imageAssociation, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={imageAssociation.is_cover} onChange={(event) => setImageAssociation({ ...imageAssociation, is_cover: event.target.checked })} /> Imagen principal</label>
          </div>
          <div className="media-association-workbench">
            <div className="media-asset-picker" aria-label="Imagenes disponibles">
              {imageAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className={asset.id === imageAssociation.media_asset_id ? 'media-asset-option active' : 'media-asset-option'}
                  onClick={() => selectImageAsset(asset.id ?? '')}
                >
                  <img src={mediaUrl(asset.media_variants?.find((variant) => variant.variant === 'thumbnail')?.object_key ?? asset.object_key)} alt="" loading="lazy" />
                  <span>{asset.original_name || asset.object_key}</span>
                </button>
              ))}
            </div>
            <div className="media-selected-preview">
              <strong>Seleccion actual</strong>
              {selectedImageAsset ? (
                <>
                  <img src={mediaUrl(selectedImageAsset.object_key)} alt="" loading="lazy" />
                  <span>{selectedImageAsset.original_name || selectedImageAsset.object_key}</span>
                </>
              ) : <span>Selecciona una imagen para asociarla.</span>}
            </div>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = imageAssociation.translations.find((item) => item.language_id === language.id) ?? emptyImageAssociation([language]).translations[0];
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Titulo" value={translation.title} onChange={(event) => updateImageTranslation(language.id, 'title', event.target.value)} />
                  <FormField label="Texto alternativo" value={translation.alt_text} onChange={(event) => updateImageTranslation(language.id, 'alt_text', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Pie de foto" value={translation.caption} onChange={(event) => updateImageTranslation(language.id, 'caption', event.target.value)} />
                </fieldset>
              );
            })}
          </div>
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{editingImageAssociationId ? 'Guardar asociacion' : 'Asociar imagen'}</Button>
          </div>
        </form>
        <div className="association-list">
          {elementImages.map((association) => (
            <div key={association.id} className="association-row">
              {relationAsset(association.media_assets) ? <img src={mediaUrl(relationAsset(association.media_assets)?.object_key ?? '')} alt="" loading="lazy" /> : null}
              <span>{relationSlug(association.elements)} - {relationAsset(association.media_assets)?.original_name ?? relationAsset(association.media_assets)?.object_key}{association.is_cover ? ' - portada' : ''}</span>
              <div className="table-actions">
                <Button type="button" variant="secondary" onClick={() => editImageAssociation(association)}>Editar</Button>
                <Button type="button" variant="danger" onClick={() => setDeleteImageId(association.id)}>Quitar</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <form className="admin-form" onSubmit={saveAudioAssociation}>
          <h2>Asociar audio a elemento</h2>
          <SelectField label="Elemento" value={audioAssociation.element_id} onChange={(event) => setAudioAssociation({ ...audioAssociation, element_id: event.target.value })} required>
            <option value="">Selecciona un elemento</option>
            {elements.map((element) => <option key={element.id} value={element.id}>{elementLabel(element, languages)}</option>)}
          </SelectField>
          <SelectField label="Idioma" value={audioAssociation.language_id} onChange={(event) => setAudioAssociation({ ...audioAssociation, language_id: event.target.value })} required>
            {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
          </SelectField>
          <SelectField label="Audio" value={audioAssociation.media_asset_id} onChange={(event) => setAudioAssociation({ ...audioAssociation, media_asset_id: event.target.value })} required>
            <option value="">Selecciona un audio subido</option>
            {audioAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
          </SelectField>
          <FormField label="Titulo" value={audioAssociation.title} onChange={(event) => setAudioAssociation({ ...audioAssociation, title: event.target.value })} required />
          <TextAreaField label="Transcripcion" value={audioAssociation.transcript} onChange={(event) => setAudioAssociation({ ...audioAssociation, transcript: event.target.value })} />
          <FormField label="Orden" type="number" value={audioAssociation.sort_order} onChange={(event) => setAudioAssociation({ ...audioAssociation, sort_order: Number(event.target.value) })} />
          <label className="check-field"><input type="checkbox" checked={audioAssociation.is_published} onChange={(event) => setAudioAssociation({ ...audioAssociation, is_published: event.target.checked })} /> Publicado</label>
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>Asociar audio</Button>
          </div>
        </form>
        <div className="association-list">
          {elementAudios.map((association) => (
            <div key={association.id} className="association-row">
              <span>{relationSlug(association.elements)} - {getCode(association.languages)} - {association.title}</span>
              <Button type="button" variant="danger" onClick={() => setDeleteAudioId(association.id)}>Quitar</Button>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <form className="admin-form" onSubmit={submit}>
          <FormField label="Object key" value={form.object_key} onChange={(event) => setForm({ ...form, object_key: event.target.value })} required />
          <SelectField label="Tipo" value={form.media_type} onChange={(event) => setForm({ ...form, media_type: event.target.value as MediaAssetRow['media_type'] })}>
            <option value="image">Imagen</option>
            <option value="logo">Logo</option>
            <option value="audio">Audio</option>
            <option value="file">Archivo</option>
          </SelectField>
          <FormField label="MIME" value={form.mime_type} onChange={(event) => setForm({ ...form, mime_type: event.target.value })} required />
          <FormField label="Nombre original" value={form.original_name} onChange={(event) => setForm({ ...form, original_name: event.target.value })} />
          <FormField label="Tamano bytes" type="number" min="0" value={form.file_size} onChange={(event) => setForm({ ...form, file_size: Number(event.target.value) })} required />
          <FormField label="Ancho" type="number" min="0" value={form.width ?? ''} onChange={(event) => setForm({ ...form, width: event.target.value ? Number(event.target.value) : null })} />
          <FormField label="Alto" type="number" min="0" value={form.height ?? ''} onChange={(event) => setForm({ ...form, height: event.target.value ? Number(event.target.value) : null })} />
          <FormField label="Duracion segundos" type="number" min="0" value={form.duration_seconds ?? ''} onChange={(event) => setForm({ ...form, duration_seconds: event.target.value ? Number(event.target.value) : null })} />
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Registrar asset'}</Button>
            {form.id ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button> : null}
          </div>
        </form>
      </Card>
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar multimedia</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por key, nombre, MIME o tipo" />
        </label>
        <select className="admin-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar multimedia por tipo">
          <option value="all">Todos los tipos</option>
          <option value="image">Imagenes</option>
          <option value="logo">Logos</option>
          <option value="audio">Audios</option>
          <option value="file">Archivos</option>
        </select>
      </div>
      <div className="admin-table">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <div className="media-admin-row">
              {item.media_type === 'image' || item.media_type === 'logo' ? <img src={mediaUrl(item.object_key)} alt="" loading="lazy" /> : <div className="media-admin-icon">{item.media_type}</div>}
              <div>
                <h2>{item.original_name || item.object_key}</h2>
                <p>{item.media_type} - {item.mime_type} - {item.object_key}</p>
              </div>
            </div>
            <div className="table-actions">
              <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
              {(item.media_type === 'image' || item.media_type === 'logo') && item.id ? <Button type="button" variant="secondary" onClick={() => selectImageAsset(item.id ?? '')}>Asociar</Button> : null}
              <Button type="button" variant="ghost" onClick={() => window.open(mediaUrl(item.object_key), '_blank', 'noopener,noreferrer')}>Abrir</Button>
              <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar asset"
        message={`Se borrara ${selectedAsset?.object_key ?? 'el asset seleccionado'} de R2 y despues su registro de Supabase. Si esta asociado a algun elemento o colaborador, se bloqueara el borrado.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteImageId)}
        title="Quitar imagen del elemento"
        message={`Se quitara la asociacion ${relationSlug(selectedImageAssociation?.elements)}. El archivo seguira en la biblioteca multimedia.`}
        confirmLabel="Quitar"
        onCancel={() => setDeleteImageId(undefined)}
        onConfirm={confirmDeleteImageAssociation}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteAudioId)}
        title="Quitar audio del elemento"
        message={`Se quitara el audio ${selectedAudioAssociation?.title ?? 'seleccionado'} del elemento. El archivo seguira en la biblioteca multimedia.`}
        confirmLabel="Quitar"
        onCancel={() => setDeleteAudioId(undefined)}
        onConfirm={confirmDeleteAudioAssociation}
      />
    </section>
  );
}

function validateMedia(candidate: MediaAssetRow) {
  const requiredError = [
    validateRequired(candidate.object_key, 'Object key'),
    validateRequired(candidate.mime_type, 'MIME')
  ].find(Boolean);

  if (requiredError) return requiredError;
  if (/^https?:\/\//i.test(candidate.object_key.trim())) return 'Object key debe ser una ruta del bucket, no una URL completa.';
  if (candidate.file_size < 0) return 'El tamano no puede ser negativo.';
  return '';
}

function elementLabel(element: ElementOptionRow, languages: LanguageRow[]) {
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const translation = element.element_translations?.find((item) => item.language_id === spanish?.id || getCode(item.languages) === spanish?.code);
  return translation?.name ?? element.slug;
}

function selectedElementName(elementId: string, elements: ElementOptionRow[], languages: LanguageRow[]) {
  const element = elements.find((item) => item.id === elementId);
  return element ? elementLabel(element, languages) : '';
}

function getLanguageCode(languageId: string, languages: LanguageRow[]) {
  return languages.find((language) => language.id === languageId)?.code;
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}

function relationSlug(relation: { slug: string } | { slug: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.slug ?? 'elemento' : relation?.slug ?? 'elemento';
}

function relationAsset(relation: MediaAssetRow | MediaAssetRow[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function readAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer el audio.'));
    };
    audio.src = url;
  });
}
