import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { prepareImageUpload } from '../../lib/imageCompression';
import { mediaUrl } from '../../lib/media';
import { canUseUploadApi, deleteMediaFiles, uploadMediaFile } from '../../lib/uploadApi';
import { validateOptionalUrl, validateRequired } from '../../lib/validation';
import {
  CollaboratorFields,
  type CollaboratorForm,
  type CollaboratorRow,
  type LanguageRow,
  type MediaAssetRow,
  type TranslationForm
} from './AdminCollaborators';

export function AdminCollaboratorEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<CollaboratorRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [form, setForm] = useState<CollaboratorForm>();
  const [logoFile, setLogoFile] = useState<File>();
  const [logoFileInputKey, setLogoFileInputKey] = useState(0);
  const [isLogoModalOpen, setLogoModalOpen] = useState(false);
  const [logoUploadPreview, setLogoUploadPreview] = useState<{
    url?: string;
    originalSize?: number;
    optimizedSize?: number;
    thumbnailSize?: number;
    width?: number;
    height?: number;
    progress?: number;
    status?: string;
    result?: 'success' | 'error';
  }>({});
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successModal, setSuccessModal] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    Promise.all([
      adminRepository.listCollaborators(),
      adminRepository.listLanguages(),
      adminRepository.listMediaAssets()
    ]).then(([collaboratorRows, languageRows, mediaRows]) => {
      const nextItems = collaboratorRows as unknown as CollaboratorRow[];
      const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
      const collaborator = nextItems.find((item) => item.id === id);
      setItems(nextItems);
      setLanguages(nextLanguages);
      setMediaAssets((mediaRows as unknown as MediaAssetRow[]).filter((asset) => asset.media_type === 'logo' || asset.media_type === 'image'));
      setForm(collaborator ? {
        name: collaborator.name,
        media_asset_id: collaborator.media_asset_id ?? '',
        url: collaborator.url ?? '',
        sort_order: collaborator.sort_order,
        is_active: collaborator.is_active,
        is_special: collaborator.is_special,
        show_name: collaborator.show_name ?? true,
        translations: nextLanguages.map((language) => {
          const saved = collaborator.collaborator_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
          return {
            language_id: language.id,
            display_name: saved?.display_name ?? '',
            thank_you_text: saved?.thank_you_text ?? ''
          };
        })
      } : undefined);
    }).catch(() => setError('No se pudo cargar el colaborador.')).finally(() => setLoading(false));
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError('');
    setSuccess('');
    const validationError = validateCollaborator(form, languages);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveCollaborator({ id, ...form, name: form.name.trim(), url: form.url.trim(), media_asset_id: form.media_asset_id || null });
      setSuccess('Colaborador guardado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el colaborador.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCurrentLogo() {
    if (!form?.media_asset_id || !id) return;
    const asset = mediaAssets.find((item) => item.id === form.media_asset_id);
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const nextForm = { ...form, media_asset_id: '' };
      await adminRepository.saveCollaborator({ id, ...nextForm, name: nextForm.name.trim(), url: nextForm.url.trim(), media_asset_id: null });
      setForm(nextForm);
      if (asset?.id && canUseUploadApi()) {
        const usage = await adminRepository.getMediaAssetUsage(asset.id);
        const totalUsage = usage.images + usage.audios + usage.collaborators + usage.siteSettings + usage.routes;
        if (totalUsage === 0) {
          const objectKeys = [asset.object_key, ...(asset.media_variants ?? []).map((variant) => variant.object_key)];
          await deleteMediaFiles(objectKeys);
          await adminRepository.deleteMediaAsset(asset.id);
          setMediaAssets((current) => current.filter((item) => item.id !== asset.id));
          setSuccess('Imagen del colaborador eliminada de R2 y Supabase.');
        } else {
          setSuccess('Imagen quitada del colaborador. El archivo sigue en uso en otro contenido.');
        }
      } else {
        setSuccess('Imagen quitada del colaborador.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo quitar la imagen del colaborador.');
    } finally {
      setSubmitting(false);
    }
  }

  async function selectLogoFile(file?: File) {
    if (logoUploadPreview.url) URL.revokeObjectURL(logoUploadPreview.url);
    setLogoFile(file);
    if (!file) {
      setLogoUploadPreview({});
      return;
    }
    setLogoUploadPreview({
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      originalSize: file.size,
      status: 'Fichero preparado para subir.'
    });
    if (file.type.startsWith('image/')) {
      try {
        const bitmap = await createImageBitmap(file);
        setLogoUploadPreview((current) => ({ ...current, width: bitmap.width, height: bitmap.height }));
        bitmap.close();
      } catch {
        setLogoUploadPreview((current) => ({ ...current, status: 'No se pudieron leer las dimensiones de la imagen.' }));
      }
    }
  }

  async function uploadLogo(event: FormEvent) {
    event.preventDefault();
    if (!form || !logoFile) {
      setLogoUploadPreview((current) => ({ ...current, result: 'error', status: 'Selecciona una imagen para subir.' }));
      return;
    }
    if (!canUseUploadApi()) {
      setLogoUploadPreview((current) => ({ ...current, result: 'error', status: 'Falta configurar VITE_UPLOAD_API_URL.' }));
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      setLogoUploadPreview((current) => ({ ...current, status: 'Optimizando imagen en el navegador...' }));
      const prepared = await prepareImageUpload(logoFile);
      setLogoUploadPreview((current) => ({
        ...current,
        optimizedSize: prepared.mainFile.size,
        thumbnailSize: prepared.thumbnailFile.size,
        width: prepared.width,
        height: prepared.height,
        warnings: prepared.warnings,
        status: 'Subiendo logo y miniatura a R2...'
      }));
      const [mainResult, thumbnailResult] = await Promise.all([
        uploadMediaFile(prepared.mainFile, 'collaborator', (progress) => {
          setLogoUploadPreview((current) => ({ ...current, progress: Math.round(progress * 0.7), status: `Subiendo logo: ${progress}%` }));
        }),
        uploadMediaFile(prepared.thumbnailFile, 'collaborator', (progress) => {
          setLogoUploadPreview((current) => ({ ...current, progress: 70 + Math.round(progress * 0.2), status: `Subiendo miniatura: ${progress}%` }));
        })
      ]);
      setLogoUploadPreview((current) => ({ ...current, progress: 92, status: 'Guardando metadatos en Supabase...' }));
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
      const nextForm = { ...form, media_asset_id: saved.id };
      await adminRepository.saveCollaborator({ id, ...nextForm, name: nextForm.name.trim(), url: nextForm.url.trim(), media_asset_id: saved.id });
      setForm(nextForm);
      setMediaAssets((current) => [...current, {
        id: saved.id,
        object_key: mainResult.asset.object_key,
        media_type: 'logo',
        original_name: prepared.mainFile.name,
        media_variants: [{ object_key: thumbnailResult.asset.object_key }]
      }]);
      setLogoFile(undefined);
      setLogoFileInputKey((current) => current + 1);
      setLogoUploadPreview({ progress: 100, result: 'success', status: 'Logo subido y guardado correctamente.' });
      closeLogoModal();
      setSuccessModal(`Imagen subida correctamente: ${prepared.mainFile.name}. Original: ${formatBytes(logoFile.size)}. Optimizada: ${formatBytes(prepared.mainFile.size)}. Miniatura: ${formatBytes(prepared.thumbnailFile.size)}.`);
    } catch (caught) {
      setLogoUploadPreview({ result: 'error', status: caught instanceof Error ? caught.message : 'No se pudo subir el logo.' });
    } finally {
      setSubmitting(false);
    }
  }

  function closeLogoModal() {
    if (logoUploadPreview.url) URL.revokeObjectURL(logoUploadPreview.url);
    setLogoModalOpen(false);
    setLogoFile(undefined);
    setLogoFileInputKey((current) => current + 1);
    setLogoUploadPreview({});
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string) {
    setForm((current) => current ? ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }) : current);
  }

  if (!id) return <Navigate to="/admin/colaboradores" replace />;
  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar colaboradores reales." />;
  if (isLoading) return <LoadingState />;
  if (!form || !items.some((item) => item.id === id)) return <EmptyState title="Colaborador no encontrado" message="Vuelve al listado y selecciona otro colaborador." />;
  const currentLogo = mediaAssets.find((asset) => asset.id === form.media_asset_id);

  return (
    <section className="admin-section">
      <div className="admin-title-row">
        <h1>Editar colaborador</h1>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/colaboradores')}>Volver</Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <CollaboratorFields form={form} languages={languages} mediaAssets={mediaAssets} onChange={setForm} onTranslationChange={updateTranslation} showMediaField={false} />
          <div className="current-media-panel">
            <h2>Imagen del colaborador</h2>
            {currentLogo ? (
              <div className="current-media-card">
                <img src={mediaUrl(currentLogo.object_key)} alt="" loading="lazy" />
                <div>
                  <strong>{currentLogo.original_name || currentLogo.object_key}</strong>
                  <p>{currentLogo.object_key}</p>
                  <Button type="button" variant="danger" onClick={deleteCurrentLogo} disabled={isSubmitting}>Borrar imagen</Button>
                </div>
              </div>
            ) : (
              <p className="hint">El colaborador no tiene imagen asociada.</p>
            )}
          </div>
          <div className="button-row">
            <Button type="button" variant="secondary" onClick={() => setLogoModalOpen(true)} disabled={Boolean(form.media_asset_id) || isSubmitting}>Subir imagen</Button>
            {form.media_asset_id ? <p className="hint">Borra primero la imagen actual para habilitar la subida de una nueva.</p> : null}
          </div>
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>
      <Modal isOpen={isLogoModalOpen} title="Subir imagen de colaborador" onClose={closeLogoModal}>
        <form className="modal-form stack-form" onSubmit={uploadLogo}>
          <FormField key={logoFileInputKey} label="Imagen" type="file" accept="image/*" onChange={(event) => selectLogoFile(event.target.files?.[0])} disabled={isSubmitting || !canUseUploadApi()} />
          {logoFile || logoUploadPreview.status ? (
            <div className={`upload-preview-panel ${logoUploadPreview.result ? `upload-preview-${logoUploadPreview.result}` : ''}`}>
              {logoUploadPreview.url ? <img src={logoUploadPreview.url} alt="" /> : <div className="media-admin-icon">Logo</div>}
              <div>
                {logoFile ? <strong>{logoFile.name}</strong> : null}
                {logoUploadPreview.originalSize ? <p>Original: {formatBytes(logoUploadPreview.originalSize)}{logoUploadPreview.width && logoUploadPreview.height ? ` - ${logoUploadPreview.width} x ${logoUploadPreview.height}px` : ''}</p> : null}
                {logoUploadPreview.optimizedSize ? <p>Optimizada: {formatBytes(logoUploadPreview.optimizedSize)} - miniatura: {formatBytes(logoUploadPreview.thumbnailSize ?? 0)}</p> : null}
                {logoUploadPreview.progress !== undefined ? <progress value={logoUploadPreview.progress} max="100" aria-label="Progreso de subida" /> : null}
                {logoUploadPreview.status ? <p>{logoUploadPreview.status}</p> : null}
              </div>
            </div>
          ) : null}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeLogoModal} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || !canUseUploadApi() || Boolean(form.media_asset_id)}>{isSubmitting ? 'Subiendo...' : 'Subir y seleccionar'}</Button>
          </div>
        </form>
      </Modal>
      <Modal title="Subida completada" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}>
        <p>{successModal}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button>
        </div>
      </Modal>
    </section>
  );
}

function validateCollaborator(candidate: CollaboratorForm, languages: LanguageRow[]) {
  const nameError = validateRequired(candidate.name, 'Nombre interno');
  if (nameError) return nameError;
  const urlError = validateOptionalUrl(candidate.url, 'La URL');
  if (urlError) return urlError;
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  return validateRequired(spanishTranslation?.display_name, `Nombre visible en ${spanish?.native_name ?? 'el idioma principal'}`);
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
