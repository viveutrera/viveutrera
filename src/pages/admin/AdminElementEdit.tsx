import { FormEvent, useCallback, useEffect, useState, type SetStateAction } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { LanguageLegend } from '../../components/admin/LanguageLegend';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { prepareImageUpload } from '../../lib/imageCompression';
import { linkTypeOptions } from '../../lib/linkTypes';
import { mediaUrl } from '../../lib/media';
import { canUseUploadApi, deleteMediaFiles, uploadMediaFile } from '../../lib/uploadApi';
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
  media_variants?: Array<{ variant: string; object_key: string }> | null;
}

interface ElementImageRow {
  id?: string;
  element_id: string;
  media_asset_id: string;
  is_cover: boolean;
  sort_order: number;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
  element_image_translations?: Array<{
    title?: string | null;
    alt_text: string;
    caption?: string | null;
    language_id?: string;
    languages?: { code: string } | { code: string }[] | null;
  }>;
}

interface ElementAudioRow {
  id?: string;
  element_id: string;
  language_id: string;
  media_asset_id: string;
  title: string;
  transcript?: string | null;
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
  const [images, setImages] = useState<ElementImageRow[]>([]);
  const [audios, setAudios] = useState<ElementAudioRow[]>([]);
  const [links, setLinks] = useState<ElementLinkRow[]>([]);
  const [imageForm, setImageForm] = useState({ ...emptyImage });
  const [audioForm, setAudioForm] = useState({ ...emptyAudio });
  const [linkForm, setLinkForm] = useState({ ...emptyLink });
  const [imageUploadFile, setImageUploadFile] = useState<File>();
  const [imageFileInputKey, setImageFileInputKey] = useState(0);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalMode, setImageModalMode] = useState<'upload' | 'edit'>('upload');
  const [editingImageId, setEditingImageId] = useState<string>();
  const [imageUploadPreview, setImageUploadPreview] = useState<{
    url?: string;
    originalSize?: number;
    optimizedSize?: number;
    thumbnailSize?: number;
    width?: number;
    height?: number;
    progress?: number;
    warnings?: string[];
    status?: string;
    result?: 'success' | 'error';
  }>({});
  const [audioUploadFile, setAudioUploadFile] = useState<File>();
  const [audioFileInputKey, setAudioFileInputKey] = useState(0);
  const [isAudioModalOpen, setAudioModalOpen] = useState(false);
  const [audioModalMode, setAudioModalMode] = useState<'upload' | 'edit'>('upload');
  const [editingAudioId, setEditingAudioId] = useState<string>();
  const [audioUploadPreview, setAudioUploadPreview] = useState<{
    originalSize?: number;
    progress?: number;
    status?: string;
    result?: 'success' | 'error';
  }>({});
  const [isLinkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string>();
  const [isMainEditing, setMainEditing] = useState(false);
  const [successModal, setSuccessModal] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'image' | 'audio'; id?: string; label: string }>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    const [elementRows, typeRows, languageRows, imageRows, audioRows, linkRows] = await Promise.all([
      adminRepository.listElements(),
      adminRepository.listElementTypes(),
      adminRepository.listLanguages(),
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
    if (!isMainEditing) return;
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
      setMainEditing(false);
      setSuccess('Elemento guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el elemento.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveImage(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    if (!editingImageId && !imageUploadFile) {
      setImageUploadPreview((current) => ({ ...current, result: 'error', status: 'Selecciona una imagen para subir.' }));
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const uploaded = imageUploadFile ? await uploadAsset(imageUploadFile, 'element-image', setImageUploadPreview) : undefined;
      const mediaAssetId = uploaded?.id ?? imageForm.media_asset_id;
      await adminRepository.saveElementImage({
        id: editingImageId,
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
      setImageUploadPreview((current) => ({
        ...current,
        progress: 100,
        result: 'success',
        status: editingImageId ? 'Imagen actualizada correctamente.' : 'Imagen subida y asociada correctamente.'
      }));
      await load();
      if (editingImageId) {
        setSuccess('Imagen actualizada correctamente.');
        closeImageModal();
      } else {
        closeImageModal();
        setSuccessModal(uploaded?.summary ?? 'Imagen subida y asociada correctamente.');
      }
    } catch (caught) {
      setImageUploadPreview((current) => ({
        ...current,
        result: 'error',
        status: caught instanceof Error ? caught.message : 'No se pudo guardar la imagen.'
      }));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAudio(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    const requiredError = validateRequired(audioForm.language_id, 'Idioma') || validateRequired(audioForm.media_asset_id, 'Audio') || validateRequired(audioForm.title, 'Titulo');
    const requiredUploadError = validateRequired(audioForm.language_id, 'Idioma') || validateRequired(audioForm.title, 'Titulo');
    if (!editingAudioId && !audioUploadFile) {
      setAudioUploadPreview((current) => ({ ...current, result: 'error', status: 'Selecciona un audio para subir.' }));
      return;
    }
    if (audioForm.media_asset_id ? requiredError : requiredUploadError) {
      setAudioUploadPreview((current) => ({ ...current, result: 'error', status: audioForm.media_asset_id ? requiredError : requiredUploadError }));
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const uploaded = audioUploadFile ? await uploadAsset(audioUploadFile, 'element-audio', setAudioUploadPreview) : undefined;
      const mediaAssetId = uploaded?.id ?? audioForm.media_asset_id;
      await adminRepository.saveElementAudio({ id: editingAudioId, element_id: id, ...audioForm, media_asset_id: mediaAssetId, title: audioForm.title.trim() });
      setAudioUploadPreview({ progress: 100, result: 'success', status: editingAudioId ? 'Audio actualizado correctamente.' : 'Audio subido y asociado correctamente.' });
      await load();
      if (editingAudioId) {
        setSuccess('Audio actualizado correctamente.');
        closeAudioModal();
      } else {
        closeAudioModal();
        setSuccessModal(uploaded?.summary ?? 'Audio subido y asociado correctamente.');
      }
    } catch (caught) {
      setAudioUploadPreview({ result: 'error', status: caught instanceof Error ? caught.message : 'No se pudo guardar el audio.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadAsset(
    file: File,
    target: string,
    onStatus?: (next: SetStateAction<typeof imageUploadPreview>) => void
  ): Promise<{ id: string; summary: string }> {
    if (!canUseUploadApi()) throw new Error('Falta configurar VITE_UPLOAD_API_URL para subir ficheros desde esta pantalla.');

    if (file.type.startsWith('image/')) {
      onStatus?.((current) => ({ ...current, status: 'Optimizando imagen en el navegador...' }));
      const prepared = await prepareImageUpload(file);
      onStatus?.((current) => ({
        ...current,
        optimizedSize: prepared.mainFile.size,
        thumbnailSize: prepared.thumbnailFile.size,
        width: prepared.width,
        height: prepared.height,
        warnings: prepared.warnings,
        status: 'Subiendo imagen principal y miniatura a R2...'
      }));
      const [mainResult, thumbnailResult] = await Promise.all([
        uploadMediaFile(prepared.mainFile, target, (progress) => {
          onStatus?.((current) => ({ ...current, progress: Math.round(progress * 0.7), status: `Subiendo imagen principal: ${progress}%` }));
        }),
        uploadMediaFile(prepared.thumbnailFile, target, (progress) => {
          onStatus?.((current) => ({ ...current, progress: 70 + Math.round(progress * 0.2), status: `Subiendo miniatura: ${progress}%` }));
        })
      ]);
      onStatus?.((current) => ({ ...current, progress: 92, status: 'Guardando metadatos en Supabase...' }));
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
      return {
        id: saved.id,
        summary: `Imagen subida correctamente: ${prepared.mainFile.name}. Original: ${formatBytes(file.size)}. Optimizada: ${formatBytes(prepared.mainFile.size)}. Miniatura: ${formatBytes(prepared.thumbnailFile.size)}.`
      };
    }

    onStatus?.((current) => ({ ...current, status: 'Subiendo fichero a R2...' }));
    const result = await uploadMediaFile(file, target, (progress) => {
      onStatus?.((current) => ({ ...current, progress, status: `Subiendo fichero: ${progress}%` }));
    });
    onStatus?.((current) => ({ ...current, progress: 92, status: 'Guardando metadatos en Supabase...' }));
    const saved = await adminRepository.saveMediaAsset({
      ...result.asset,
      width: null,
      height: null,
      duration_seconds: null
    }) as { id: string };
    return {
      id: saved.id,
      summary: `Audio subido correctamente: ${file.name}. Tamano original: ${formatBytes(file.size)}.`
    };
  }

  async function selectImageUploadFile(file?: File) {
    if (imageUploadPreview.url) URL.revokeObjectURL(imageUploadPreview.url);
    setImageUploadFile(file);
    if (!file) {
      setImageUploadPreview({});
      return;
    }

    setImageUploadPreview({
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      originalSize: file.size,
      status: 'Fichero preparado para subir.'
    });

    if (file.type.startsWith('image/')) {
      try {
        const bitmap = await createImageBitmap(file);
        setImageUploadPreview((current) => ({ ...current, width: bitmap.width, height: bitmap.height }));
        bitmap.close();
      } catch {
        setImageUploadPreview((current) => ({ ...current, status: 'No se pudieron leer las dimensiones de la imagen.' }));
      }
    }
  }

  function openNewImageModal() {
    resetImageForm(false);
    setImageModalMode('upload');
    setImageModalOpen(true);
  }

  function editImage(image: ElementImageRow) {
    const asset = mediaAsset(image.media_assets);
    const spanishTranslation = image.element_image_translations?.find((translation) => getCode(translation.languages) === 'es') ?? image.element_image_translations?.[0];
    setEditingImageId(image.id);
    setImageForm({
      media_asset_id: image.media_asset_id,
      is_cover: image.is_cover,
      sort_order: image.sort_order,
      title: spanishTranslation?.title ?? asset?.original_name?.replace(/\.[^.]+$/, '') ?? '',
      alt_text: spanishTranslation?.alt_text ?? '',
      caption: spanishTranslation?.caption ?? ''
    });
    setImageUploadFile(undefined);
    setImageUploadPreview({});
    setImageModalMode('edit');
    setImageModalOpen(true);
  }

  function resetImageForm(clearFileInput: boolean) {
    setImageForm({ ...emptyImage });
    setImageUploadFile(undefined);
    setEditingImageId(undefined);
    if (clearFileInput) setImageFileInputKey((current) => current + 1);
  }

  function closeImageModal() {
    if (imageUploadPreview.url) URL.revokeObjectURL(imageUploadPreview.url);
    setImageModalOpen(false);
    resetImageForm(true);
    setImageUploadPreview({});
  }

  function selectAudioUploadFile(file?: File) {
    setAudioUploadFile(file);
    setAudioUploadPreview(file ? { originalSize: file.size, status: 'Fichero preparado para subir.' } : {});
  }

  function openNewAudioModal() {
    resetAudioForm(false);
    setAudioModalMode('upload');
    setAudioModalOpen(true);
  }

  function editAudio(audio: ElementAudioRow) {
    setEditingAudioId(audio.id);
    setAudioForm({
      language_id: audio.language_id,
      media_asset_id: audio.media_asset_id,
      title: audio.title,
      transcript: audio.transcript ?? '',
      sort_order: audio.sort_order,
      is_published: audio.is_published
    });
    setAudioUploadFile(undefined);
    setAudioUploadPreview({});
    setAudioModalMode('edit');
    setAudioModalOpen(true);
  }

  function resetAudioForm(clearFileInput: boolean) {
    setAudioForm({ ...emptyAudio, language_id: languages[0]?.id ?? '' });
    setAudioUploadFile(undefined);
    setEditingAudioId(undefined);
    if (clearFileInput) setAudioFileInputKey((current) => current + 1);
  }

  function closeAudioModal() {
    setAudioModalOpen(false);
    resetAudioForm(true);
    setAudioUploadPreview({});
  }

  async function saveLink(event: FormEvent) {
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
      await adminRepository.saveLink({ id: editingLinkId, element_id: id, ...linkForm, title: linkForm.title.trim(), url: linkForm.url.trim(), link_type: linkForm.link_type.trim() });
      closeLinkModal();
      setSuccess(editingLinkId ? 'Enlace actualizado.' : 'Enlace guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el enlace.');
    } finally {
      setSubmitting(false);
    }
  }

  function openNewLinkModal() {
    setEditingLinkId(undefined);
    setLinkForm({ ...emptyLink, language_id: languages[0]?.id ?? '' });
    setLinkModalOpen(true);
  }

  function editLink(link: ElementLinkRow) {
    setEditingLinkId(link.id);
    setLinkForm({
      language_id: link.language_id,
      title: link.title,
      url: link.url,
      link_type: link.link_type ?? '',
      sort_order: link.sort_order,
      is_published: link.is_published
    });
    setLinkModalOpen(true);
  }

  function closeLinkModal() {
    setLinkModalOpen(false);
    setEditingLinkId(undefined);
    setLinkForm({ ...emptyLink, language_id: languages[0]?.id ?? '' });
  }

  async function deleteAssociation(kind: 'image' | 'audio' | 'link', associationId?: string) {
    if (!associationId) return;
    setSubmitting(true);
    setError('');
    try {
      if (kind === 'image') await deleteImageAssociation(associationId);
      if (kind === 'audio') await deleteAudioAssociation(associationId);
      if (kind === 'link') await adminRepository.deleteLink(associationId);
      setSuccess('Asociacion borrada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar la asociacion.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteAssociation() {
    if (!pendingDelete) return;
    await deleteAssociation(pendingDelete.kind, pendingDelete.id);
    setPendingDelete(undefined);
  }

  async function deleteImageAssociation(associationId: string) {
    const association = images.find((item) => item.id === associationId);
    const asset = mediaAsset(association?.media_assets);
    await adminRepository.deleteElementImage(associationId);
    if (asset?.id) await deleteUnusedMediaAsset(asset);
  }

  async function deleteAudioAssociation(associationId: string) {
    const association = audios.find((item) => item.id === associationId);
    const asset = mediaAsset(association?.media_assets);
    await adminRepository.deleteElementAudio(associationId);
    if (asset?.id) await deleteUnusedMediaAsset(asset);
  }

  async function deleteUnusedMediaAsset(asset: MediaAssetRow) {
    if (!asset.id || !canUseUploadApi()) return;
    const usage = await adminRepository.getMediaAssetUsage(asset.id);
    const totalUsage = usage.images + usage.audios + usage.collaborators + usage.siteSettings;
    if (totalUsage > 0) return;
    const objectKeys = [asset.object_key, ...(asset.media_variants ?? []).map((variant) => variant.object_key)];
    await deleteMediaFiles(objectKeys);
    await adminRepository.deleteMediaAsset(asset.id);
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
            <FormField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required readOnly={!isMainEditing} />
            <SelectField label="Tipo" value={form.element_type_id} onChange={(event) => setForm({ ...form, element_type_id: event.target.value })} required disabled={!isMainEditing}>
              <option value="">Selecciona un tipo</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>{typeName(type)}</option>
              ))}
            </SelectField>
            <SelectField label="Estado" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'published' })} disabled={!isMainEditing}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </SelectField>
            <FormField label="URL mapa" value={form.maps_url} onChange={(event) => setForm({ ...form, maps_url: event.target.value })} readOnly={!isMainEditing} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} readOnly={!isMainEditing} />
            <label className="check-field"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} disabled={!isMainEditing} /> Destacado</label>
            <label className="check-field"><input type="checkbox" checked={form.show_long_text_default} onChange={(event) => setForm({ ...form, show_long_text_default: event.target.checked })} disabled={!isMainEditing} /> Texto largo desplegado por defecto</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? emptyElement([language]).translations[0];
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend><LanguageLegend code={language.code} name={language.native_name} /></legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} readOnly={!isMainEditing} />
                  <TextAreaField label="Texto corto" value={translation.short_text} onChange={(event) => updateTranslation(language.id, 'short_text', event.target.value)} required={language.code === 'es'} readOnly={!isMainEditing} />
                  <TextAreaField label="Texto largo" value={translation.long_text} onChange={(event) => updateTranslation(language.id, 'long_text', event.target.value)} readOnly={!isMainEditing} />
                  <FormField label="SEO titulo" value={translation.seo_title} onChange={(event) => updateTranslation(language.id, 'seo_title', event.target.value)} readOnly={!isMainEditing} />
                  <TextAreaField label="SEO descripcion" value={translation.seo_description} onChange={(event) => updateTranslation(language.id, 'seo_description', event.target.value)} readOnly={!isMainEditing} />
                  <label className="check-field"><input type="checkbox" checked={translation.is_published} onChange={(event) => updateTranslation(language.id, 'is_published', event.target.checked)} disabled={!isMainEditing} /> Publicada</label>
                </fieldset>
              );
            })}
          </div>
          <div className="button-row">
            <Button type="button" variant="secondary" onClick={() => setMainEditing(true)} disabled={isSubmitting || isMainEditing}>Editar</Button>
            <Button type="submit" disabled={isSubmitting || !isMainEditing}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>
      <ElementImagesSection
        form={imageForm}
        uploadFile={imageUploadFile}
        uploadPreview={imageUploadPreview}
        fileInputKey={imageFileInputKey}
        images={images}
        isSubmitting={isSubmitting}
        isOpen={isImageModalOpen}
        mode={imageModalMode}
        onChange={setImageForm}
        onUploadFileChange={selectImageUploadFile}
        onOpenNew={openNewImageModal}
        onEdit={editImage}
        onClose={closeImageModal}
        onDelete={(associationId) => setPendingDelete({ kind: 'image', id: associationId, label: 'imagen' })}
        onSubmit={saveImage}
      />
      <ElementAudiosSection
        form={audioForm}
        uploadFile={audioUploadFile}
        uploadPreview={audioUploadPreview}
        fileInputKey={audioFileInputKey}
        audios={audios}
        languages={languages}
        isSubmitting={isSubmitting}
        isOpen={isAudioModalOpen}
        mode={audioModalMode}
        onChange={setAudioForm}
        onUploadFileChange={selectAudioUploadFile}
        onOpenNew={openNewAudioModal}
        onEdit={editAudio}
        onClose={closeAudioModal}
        onDelete={(associationId) => setPendingDelete({ kind: 'audio', id: associationId, label: 'audio' })}
        onSubmit={saveAudio}
      />
      <ElementLinksSection
        form={linkForm}
        links={links}
        languages={languages}
        isSubmitting={isSubmitting}
        isOpen={isLinkModalOpen}
        isEditing={Boolean(editingLinkId)}
        onChange={setLinkForm}
        onOpenNew={openNewLinkModal}
        onEdit={editLink}
        onClose={closeLinkModal}
        onDelete={(associationId) => deleteAssociation('link', associationId)}
        onSubmit={saveLink}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={`Borrar ${pendingDelete?.label ?? 'archivo'}`}
        message={`Se borrara este ${pendingDelete?.label ?? 'archivo'} del elemento y, si el archivo no se usa en otro sitio, tambien se eliminara de R2.`}
        confirmLabel="Borrar"
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={confirmDeleteAssociation}
      />
      <Modal title="Subida completada" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}>
        <p>{successModal}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button>
        </div>
      </Modal>
    </section>
  );
}

function ElementImagesSection({
  form,
  uploadFile,
  uploadPreview,
  fileInputKey,
  images,
  isSubmitting,
  isOpen,
  mode,
  onChange,
  onUploadFileChange,
  onOpenNew,
  onEdit,
  onClose,
  onDelete,
  onSubmit
}: {
  form: typeof emptyImage;
  uploadFile?: File;
  uploadPreview: {
    url?: string;
    originalSize?: number;
    optimizedSize?: number;
    thumbnailSize?: number;
    width?: number;
    height?: number;
    progress?: number;
    warnings?: string[];
    status?: string;
    result?: 'success' | 'error';
  };
  fileInputKey: number;
  images: ElementImageRow[];
  isSubmitting: boolean;
  isOpen: boolean;
  mode: 'upload' | 'edit';
  onChange: (next: typeof emptyImage) => void;
  onUploadFileChange: (file?: File) => void;
  onOpenNew: () => void;
  onEdit: (image: ElementImageRow) => void;
  onClose: () => void;
  onDelete: (id?: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const isEditing = mode === 'edit';
  return (
    <Card>
      <div className="admin-title-row">
        <h2>Imagenes del elemento</h2>
        <Button type="button" onClick={onOpenNew}>Subir nueva imagen</Button>
      </div>
      <div className="admin-data-table admin-data-table-element-images" role="table" aria-label="Imagenes del elemento">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Imagen</span>
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Tamano</span>
          <span role="columnheader">Dimensiones</span>
          <span role="columnheader">Orden</span>
          <span role="columnheader">Portada</span>
          <span role="columnheader">Acciones</span>
        </div>
        {images.map((image) => {
          const asset = mediaAsset(image.media_assets);
          return (
            <div className="admin-data-row" role="row" key={image.id}>
              <span role="cell">{asset ? <img className="admin-table-thumb" src={mediaUrl(asset.object_key)} alt="" loading="lazy" /> : <span className="media-admin-icon">Imagen</span>}</span>
              <span role="cell"><strong>{asset?.original_name ?? image.media_asset_id}</strong><small>{asset?.object_key}</small></span>
              <span role="cell">{formatBytes(asset?.file_size ?? 0)}</span>
              <span role="cell">{asset?.width && asset.height ? `${asset.width} x ${asset.height}` : '-'}</span>
              <span role="cell">{image.sort_order}</span>
              <span role="cell">{image.is_cover ? 'Si' : 'No'}</span>
              <span role="cell" className="row-actions">
                <button className="icon-button" type="button" aria-label="Editar imagen" onClick={() => onEdit(image)}><Pencil size={18} /></button>
                <button className="icon-button icon-button-danger" type="button" aria-label="Borrar imagen" onClick={() => onDelete(image.id)}><Trash2 size={18} /></button>
              </span>
            </div>
          );
        })}
      </div>
      <Modal isOpen={isOpen} title={isEditing ? 'Editar imagen del elemento' : 'Subir imagen al elemento'} onClose={onClose}>
        <form className="modal-form stack-form" onSubmit={onSubmit}>
          {!isEditing ? (
            <label className="form-field">
              <span>Subir nueva imagen</span>
              <input key={fileInputKey} type="file" accept="image/*" onChange={(event) => onUploadFileChange(event.target.files?.[0])} disabled={isSubmitting || !canUseUploadApi()} />
              {uploadFile ? <small>{uploadFile.name}</small> : null}
            </label>
          ) : null}
          <div className="admin-form">
            <FormField label="Titulo" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} disabled={isSubmitting} />
            <FormField label="Texto alternativo" value={form.alt_text} onChange={(event) => onChange({ ...form, alt_text: event.target.value })} disabled={isSubmitting} />
            <FormField label="Pie" value={form.caption} onChange={(event) => onChange({ ...form, caption: event.target.value })} disabled={isSubmitting} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} disabled={isSubmitting} />
            <label className="check-field"><input type="checkbox" checked={form.is_cover} onChange={(event) => onChange({ ...form, is_cover: event.target.checked })} disabled={isSubmitting} /> Portada</label>
          </div>
          {uploadFile || uploadPreview.status ? (
            <div className={`upload-preview-panel ${uploadPreview.result ? `upload-preview-${uploadPreview.result}` : ''}`}>
              {uploadPreview.url ? <img src={uploadPreview.url} alt="" /> : <div className="media-admin-icon">Imagen</div>}
              <div>
                {uploadFile ? <strong>{uploadFile.name}</strong> : null}
                {uploadPreview.originalSize ? <p>Original: {formatBytes(uploadPreview.originalSize)}{uploadPreview.width && uploadPreview.height ? ` - ${uploadPreview.width} x ${uploadPreview.height}px` : ''}</p> : null}
                {uploadPreview.optimizedSize ? <p>Optimizada: {formatBytes(uploadPreview.optimizedSize)} - miniatura: {formatBytes(uploadPreview.thumbnailSize ?? 0)}</p> : null}
                {uploadPreview.warnings?.map((warning) => <p key={warning} className="warning-text">{warning}</p>)}
                {uploadPreview.progress !== undefined ? <progress value={uploadPreview.progress} max="100" aria-label="Progreso de subida" /> : null}
                {uploadPreview.status ? <p>{uploadPreview.status}</p> : null}
              </div>
            </div>
          ) : null}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || (!isEditing && (!canUseUploadApi() || !uploadFile))}>{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Subir/asociar imagen'}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

function ElementAudiosSection({
  form,
  uploadFile,
  uploadPreview,
  fileInputKey,
  audios,
  languages,
  isSubmitting,
  isOpen,
  mode,
  onChange,
  onUploadFileChange,
  onOpenNew,
  onEdit,
  onClose,
  onDelete,
  onSubmit
}: {
  form: typeof emptyAudio;
  uploadFile?: File;
  uploadPreview: {
    originalSize?: number;
    progress?: number;
    status?: string;
    result?: 'success' | 'error';
  };
  fileInputKey: number;
  audios: ElementAudioRow[];
  languages: LanguageRow[];
  isSubmitting: boolean;
  isOpen: boolean;
  mode: 'upload' | 'edit';
  onChange: (next: typeof emptyAudio) => void;
  onUploadFileChange: (file?: File) => void;
  onOpenNew: () => void;
  onEdit: (audio: ElementAudioRow) => void;
  onClose: () => void;
  onDelete: (id?: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const isEditing = mode === 'edit';
  return (
    <Card>
      <div className="admin-title-row">
        <h2>Audios</h2>
        <Button type="button" onClick={onOpenNew}>Subir nuevo audio</Button>
      </div>
      <div className="admin-data-table admin-data-table-element-audios" role="table" aria-label="Audios del elemento">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Titulo</span>
          <span role="columnheader">Idioma</span>
          <span role="columnheader">Archivo</span>
          <span role="columnheader">Orden</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Acciones</span>
        </div>
        {audios.map((audio) => {
          const asset = mediaAsset(audio.media_assets);
          return (
            <div className="admin-data-row" role="row" key={audio.id}>
              <span role="cell"><strong>{audio.title}</strong></span>
              <span role="cell">{getCode(audio.languages)}</span>
              <span role="cell">{asset?.original_name ?? audio.media_asset_id}<small>{asset?.object_key}</small></span>
              <span role="cell">{audio.sort_order}</span>
              <span role="cell">{audio.is_published ? 'Publicado' : 'Oculto'}</span>
              <span role="cell" className="row-actions">
                <button className="icon-button" type="button" aria-label="Editar audio" onClick={() => onEdit(audio)}><Pencil size={18} /></button>
                <button className="icon-button icon-button-danger" type="button" aria-label="Borrar audio" onClick={() => onDelete(audio.id)}><Trash2 size={18} /></button>
              </span>
            </div>
          );
        })}
      </div>
      <Modal isOpen={isOpen} title={isEditing ? 'Editar audio del elemento' : 'Subir audio al elemento'} onClose={onClose}>
        <form className="modal-form stack-form" onSubmit={onSubmit}>
          {!isEditing ? (
            <label className="form-field">
              <span>Subir nuevo audio</span>
              <input key={fileInputKey} type="file" accept="audio/*" onChange={(event) => onUploadFileChange(event.target.files?.[0])} disabled={isSubmitting || !canUseUploadApi()} />
              {uploadFile ? <small>{uploadFile.name}</small> : null}
            </label>
          ) : null}
          <div className="admin-form">
            <SelectField label="Idioma" value={form.language_id} onChange={(event) => onChange({ ...form, language_id: event.target.value })} required disabled={isSubmitting}>
              <option value="">Selecciona idioma</option>
              {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
            </SelectField>
            <FormField label="Titulo" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} required disabled={isSubmitting} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} disabled={isSubmitting} />
            <label className="check-field"><input type="checkbox" checked={form.is_published} onChange={(event) => onChange({ ...form, is_published: event.target.checked })} disabled={isSubmitting} /> Publicado</label>
          </div>
          <TextAreaField label="Transcripcion" value={form.transcript} onChange={(event) => onChange({ ...form, transcript: event.target.value })} disabled={isSubmitting} />
          {uploadFile || uploadPreview.status ? (
            <div className={`upload-preview-panel ${uploadPreview.result ? `upload-preview-${uploadPreview.result}` : ''}`}>
              <div className="media-admin-icon">Audio</div>
              <div>
                {uploadFile ? <strong>{uploadFile.name}</strong> : null}
                {uploadPreview.originalSize ? <p>Original: {formatBytes(uploadPreview.originalSize)}</p> : null}
                {uploadPreview.progress !== undefined ? <progress value={uploadPreview.progress} max="100" aria-label="Progreso de subida" /> : null}
                {uploadPreview.status ? <p>{uploadPreview.status}</p> : null}
              </div>
            </div>
          ) : null}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || (!isEditing && (!canUseUploadApi() || !uploadFile))}>{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Subir/asociar audio'}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

function ElementLinksSection({ form, links, languages, isSubmitting, isOpen, isEditing, onChange, onOpenNew, onEdit, onClose, onDelete, onSubmit }: {
  form: typeof emptyLink;
  links: ElementLinkRow[];
  languages: LanguageRow[];
  isSubmitting: boolean;
  isOpen: boolean;
  isEditing: boolean;
  onChange: (next: typeof emptyLink) => void;
  onOpenNew: () => void;
  onEdit: (link: ElementLinkRow) => void;
  onClose: () => void;
  onDelete: (id?: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Card>
      <div className="admin-title-row">
        <h2>Enlaces</h2>
        <Button type="button" onClick={onOpenNew}>Nuevo enlace</Button>
      </div>
      <div className="admin-data-table admin-data-table-element-links" role="table" aria-label="Enlaces del elemento">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Titulo</span>
          <span role="columnheader">Idioma</span>
          <span role="columnheader">Tipo</span>
          <span role="columnheader">URL</span>
          <span role="columnheader">Orden</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Acciones</span>
        </div>
        {links.map((link) => (
          <div className="admin-data-row" role="row" key={link.id}>
            <span role="cell"><strong>{link.title}</strong></span>
            <span role="cell">{getCode(link.languages)}</span>
            <span role="cell">{link.link_type || 'General'}</span>
            <span role="cell">{link.url}</span>
            <span role="cell">{link.sort_order}</span>
            <span role="cell">{link.is_published ? 'Publicado' : 'Oculto'}</span>
            <span role="cell" className="row-actions">
              <button className="icon-button" type="button" aria-label="Editar enlace" onClick={() => onEdit(link)}><Pencil size={18} /></button>
              <button className="icon-button icon-button-danger" type="button" aria-label="Borrar enlace" onClick={() => onDelete(link.id)}><Trash2 size={18} /></button>
            </span>
          </div>
        ))}
      </div>
      <Modal isOpen={isOpen} title={isEditing ? 'Editar enlace' : 'Nuevo enlace'} onClose={onClose}>
        <form className="modal-form stack-form" onSubmit={onSubmit}>
          <div className="admin-form">
            <SelectField label="Idioma" value={form.language_id} onChange={(event) => onChange({ ...form, language_id: event.target.value })} required disabled={isSubmitting}>
              <option value="">Selecciona idioma</option>
              {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
            </SelectField>
            <FormField label="Titulo" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} required disabled={isSubmitting} />
            <FormField label="URL" type="url" value={form.url} onChange={(event) => onChange({ ...form, url: event.target.value })} required disabled={isSubmitting} />
            <SelectField label="Tipo" value={form.link_type} onChange={(event) => onChange({ ...form, link_type: event.target.value })} disabled={isSubmitting}>
              {linkTypeOptions.map((option) => <option key={option.value || 'general'} value={option.value}>{option.label}</option>)}
            </SelectField>
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} disabled={isSubmitting} />
            <label className="check-field"><input type="checkbox" checked={form.is_published} onChange={(event) => onChange({ ...form, is_published: event.target.checked })} disabled={isSubmitting} /> Publicado</label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar enlace'}</Button>
          </div>
        </form>
      </Modal>
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
