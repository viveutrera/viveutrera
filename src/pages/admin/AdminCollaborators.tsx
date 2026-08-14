import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { LanguageLegend } from '../../components/admin/LanguageLegend';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { mediaUrl } from '../../lib/media';
import { canUseUploadApi, deleteMediaFiles } from '../../lib/uploadApi';
import { matchesSearch, validateOptionalUrl, validateRequired } from '../../lib/validation';

export interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

export interface CollaboratorTranslationRow {
  display_name: string;
  thank_you_text?: string | null;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

export interface CollaboratorRow {
  id?: string;
  name: string;
  media_asset_id?: string | null;
  url?: string | null;
  sort_order: number;
  is_active: boolean;
  is_special: boolean;
  show_name?: boolean;
  collaborator_translations?: CollaboratorTranslationRow[];
}

export interface MediaAssetRow {
  id: string;
  object_key: string;
  media_type: string;
  original_name: string;
  media_variants?: Array<{ object_key: string }> | null;
}

export interface TranslationForm {
  language_id: string;
  display_name: string;
  thank_you_text: string;
}

export interface CollaboratorForm {
  name: string;
  media_asset_id: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  is_special: boolean;
  show_name: boolean;
  translations: TranslationForm[];
}

const emptyCollaborator = (languages: LanguageRow[]): CollaboratorForm => ({
  name: '',
  media_asset_id: '',
  url: '',
  sort_order: 0,
  is_active: true,
  is_special: false,
  show_name: true,
  translations: languages.map((language) => ({ language_id: language.id, display_name: '', thank_you_text: '' }))
});

export function AdminCollaborators() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CollaboratorRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<CollaboratorForm>(emptyCollaborator([]));
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specialFilter, setSpecialFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [collaboratorRows, languageRows] = await Promise.all([
      adminRepository.listCollaborators(),
      adminRepository.listLanguages()
    ]);
    const mediaRows = await adminRepository.listMediaAssets();
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    setItems(collaboratorRows as unknown as CollaboratorRow[]);
    setMediaAssets((mediaRows as unknown as MediaAssetRow[]).filter((asset) => asset.media_type === 'logo' || asset.media_type === 'image'));
    setLanguages(nextLanguages);
    setForm((current) => current.translations.length ? current : emptyCollaborator(nextLanguages));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los colaboradores.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateCollaborator(form, languages);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveCollaborator({ id: undefined, ...form, name: form.name.trim(), url: form.url.trim(), media_asset_id: form.media_asset_id || null });
      resetForm();
      setCreateOpen(false);
      setSuccess('Colaborador guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el colaborador.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(emptyCollaborator(languages));
    setCreateOpen(false);
    setError('');
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string) {
    setForm((current) => ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }));
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const collaborator = items.find((item) => item.id === deleteId);
    const asset = mediaAssets.find((item) => item.id === collaborator?.media_asset_id);
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteCollaborator(deleteId);
      if (asset?.id && canUseUploadApi()) {
        const usage = await adminRepository.getMediaAssetUsage(asset.id);
        const totalUsage = usage.images + usage.audios + usage.collaborators + usage.siteSettings + usage.routes;
        if (totalUsage === 0) {
          const objectKeys = [asset.object_key, ...(asset.media_variants ?? []).map((variant) => variant.object_key)];
          await deleteMediaFiles(objectKeys);
          await adminRepository.deleteMediaAsset(asset.id);
        }
      }
      setDeleteId(undefined);
      setSuccess('Colaborador borrado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el colaborador.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = items.filter((item) => (
    matchesSearch([
      item.name,
      item.url,
      selectedMediaName(item.media_asset_id, mediaAssets),
      ...(item.collaborator_translations?.flatMap((translation) => [translation.display_name, translation.thank_you_text]) ?? [])
    ], search)
    && (statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active))
    && (specialFilter === 'all' || (specialFilter === 'special' ? item.is_special : !item.is_special))
  ));
  const selectedCollaborator = items.find((item) => item.id === deleteId);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar colaboradores reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Colaboradores</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar colaboradores</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, URL o agradecimiento" />
        </label>
        <select className="admin-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar colaboradores por estado">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <select className="admin-filter" value={specialFilter} onChange={(event) => setSpecialFilter(event.target.value)} aria-label="Filtrar colaboradores por tipo">
          <option value="all">Todos los tipos</option>
          <option value="special">Especiales</option>
          <option value="general">Generales</option>
        </select>
        <Button type="button" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Crear colaborador</Button>
      </div>
      <div className="admin-data-table admin-data-table-collaborators" role="table" aria-label="Colaboradores">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Logo</span>
          <span role="columnheader">URL</span>
          <span role="columnheader">Orden</span>
          <span role="columnheader">Especial</span>
          <span role="columnheader">Nombre visible</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader" aria-label="Acciones" />
        </div>
        {filteredItems.map((item) => {
          const es = item.collaborator_translations?.find((translation) => getCode(translation.languages) === 'es');
          const media = mediaAssets.find((asset) => asset.id === item.media_asset_id);
          return (
            <div className="admin-data-row" role="row" key={item.id}>
              <span role="cell"><strong>{es?.display_name ?? item.name}</strong><small>{item.name}</small></span>
              <span role="cell">{media ? <img className="admin-table-thumb" src={mediaUrl(media.object_key)} alt="" loading="lazy" /> : 'Sin logo'}</span>
              <span role="cell">{item.url || 'Sin enlace'}</span>
              <span role="cell">{item.sort_order}</span>
              <span role="cell">{item.is_special ? 'Si' : 'No'}</span>
              <span role="cell">{item.show_name ?? true ? 'Si' : 'No'}</span>
              <span role="cell">{item.is_active ? 'Activo' : 'Inactivo'}</span>
              <span className="row-actions" role="cell">
                <button className="icon-button" type="button" aria-label={`Editar ${item.name}`} onClick={() => navigate(`/admin/colaboradores/${item.id}`)}><Pencil size={18} /></button>
                <button className="icon-button icon-button-danger" type="button" aria-label={`Borrar ${item.name}`} onClick={() => setDeleteId(item.id)}><Trash2 size={18} /></button>
              </span>
            </div>
          );
        })}
      </div>
      <Modal title="Crear colaborador" isOpen={isCreateOpen} onClose={resetForm}>
        <form className="stack-form modal-form" onSubmit={submit}>
          <CollaboratorFields
            form={form}
            languages={languages}
            mediaAssets={mediaAssets}
            onChange={setForm}
            onTranslationChange={updateTranslation}
            showMediaField={false}
          />
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar colaborador"
        message={`Se eliminara ${selectedCollaborator?.name ?? 'este colaborador'} y sus textos traducidos. Si su imagen no se usa en otro sitio, tambien se eliminara de R2 y Supabase.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

export function CollaboratorFields({ form, languages, mediaAssets, onChange, onTranslationChange, showMediaField = true }: {
  form: CollaboratorForm;
  languages: LanguageRow[];
  mediaAssets: MediaAssetRow[];
  onChange: (next: CollaboratorForm) => void;
  onTranslationChange: (languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string) => void;
  showMediaField?: boolean;
}) {
  return (
    <>
      <div className="admin-form">
        <FormField label="Nombre interno" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} required />
        {showMediaField ? (
          <SelectField label="Logo / imagen" value={form.media_asset_id} onChange={(event) => onChange({ ...form, media_asset_id: event.target.value })}>
            <option value="">Sin logo</option>
            {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
          </SelectField>
        ) : null}
        <FormField label="URL" value={form.url} onChange={(event) => onChange({ ...form, url: event.target.value })} />
        <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} />
        <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => onChange({ ...form, is_active: event.target.checked })} /> Activo</label>
        <label className="check-field"><input type="checkbox" checked={form.is_special} onChange={(event) => onChange({ ...form, is_special: event.target.checked })} /> Especial</label>
        <label className="check-field"><input type="checkbox" checked={form.show_name} onChange={(event) => onChange({ ...form, show_name: event.target.checked })} /> Mostrar nombre en la web</label>
      </div>
      <div className="translation-grid">
        {languages.map((language) => {
          const translation = form.translations.find((item) => item.language_id === language.id) ?? { language_id: language.id, display_name: '', thank_you_text: '' };
          return (
            <fieldset className="translation-panel" key={language.id}>
              <legend><LanguageLegend code={language.code} name={language.native_name} /></legend>
              <FormField label="Nombre visible" value={translation.display_name} onChange={(event) => onTranslationChange(language.id, 'display_name', event.target.value)} required={language.code === 'es'} />
              <TextAreaField label="Agradecimiento" value={translation.thank_you_text} onChange={(event) => onTranslationChange(language.id, 'thank_you_text', event.target.value)} />
            </fieldset>
          );
        })}
      </div>
    </>
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

function selectedMediaName(mediaAssetId: string | null | undefined, mediaAssets: MediaAssetRow[]) {
  const media = mediaAssets.find((asset) => asset.id === mediaAssetId);
  return media?.original_name ?? media?.object_key;
}
