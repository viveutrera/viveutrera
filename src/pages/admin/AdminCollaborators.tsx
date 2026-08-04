import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { mediaUrl } from '../../lib/media';
import { matchesSearch, validateOptionalUrl, validateRequired } from '../../lib/validation';

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface CollaboratorTranslationRow {
  display_name: string;
  thank_you_text?: string | null;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

interface CollaboratorRow {
  id?: string;
  name: string;
  media_asset_id?: string | null;
  url?: string | null;
  sort_order: number;
  is_active: boolean;
  is_special: boolean;
  collaborator_translations?: CollaboratorTranslationRow[];
}

interface MediaAssetRow {
  id: string;
  object_key: string;
  media_type: string;
  original_name: string;
}

interface TranslationForm {
  language_id: string;
  display_name: string;
  thank_you_text: string;
}

interface CollaboratorForm {
  name: string;
  media_asset_id: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  is_special: boolean;
  translations: TranslationForm[];
}

const emptyCollaborator = (languages: LanguageRow[]): CollaboratorForm => ({
  name: '',
  media_asset_id: '',
  url: '',
  sort_order: 0,
  is_active: true,
  is_special: false,
  translations: languages.map((language) => ({ language_id: language.id, display_name: '', thank_you_text: '' }))
});

export function AdminCollaborators() {
  const [items, setItems] = useState<CollaboratorRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<CollaboratorForm>(emptyCollaborator([]));
  const [editingId, setEditingId] = useState<string>();
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
      await adminRepository.saveCollaborator({ id: editingId, ...form, name: form.name.trim(), url: form.url.trim(), media_asset_id: form.media_asset_id || null });
      resetForm();
      setSuccess('Colaborador guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el colaborador.');
    } finally {
      setSubmitting(false);
    }
  }

  function edit(item: CollaboratorRow) {
    setError('');
    setSuccess('');
    setEditingId(item.id);
    setForm({
      name: item.name,
      media_asset_id: item.media_asset_id ?? '',
      url: item.url ?? '',
      sort_order: item.sort_order,
      is_active: item.is_active,
      is_special: item.is_special,
      translations: languages.map((language) => {
        const saved = item.collaborator_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
        return {
          language_id: language.id,
          display_name: saved?.display_name ?? '',
          thank_you_text: saved?.thank_you_text ?? ''
        };
      })
    });
  }

  function resetForm() {
    setEditingId(undefined);
    setForm(emptyCollaborator(languages));
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
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteCollaborator(deleteId);
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
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <div className="admin-form">
            <FormField label="Nombre interno" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <SelectField label="Logo / imagen" value={form.media_asset_id} onChange={(event) => setForm({ ...form, media_asset_id: event.target.value })}>
              <option value="">Sin logo</option>
              {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name || asset.object_key}</option>)}
            </SelectField>
            <FormField label="URL" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
            <label className="check-field"><input type="checkbox" checked={form.is_special} onChange={(event) => setForm({ ...form, is_special: event.target.checked })} /> Especial</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? { language_id: language.id, display_name: '', thank_you_text: '' };
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Nombre visible" value={translation.display_name} onChange={(event) => updateTranslation(language.id, 'display_name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Agradecimiento" value={translation.thank_you_text} onChange={(event) => updateTranslation(language.id, 'thank_you_text', event.target.value)} />
                </fieldset>
              );
            })}
          </div>
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear colaborador'}</Button>
            {editingId ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button> : null}
          </div>
        </form>
      </Card>
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
      </div>
      <div className="admin-table">
        {filteredItems.map((item) => {
          const es = item.collaborator_translations?.find((translation) => getCode(translation.languages) === 'es');
          const media = mediaAssets.find((asset) => asset.id === item.media_asset_id);
          return (
            <Card key={item.id}>
              <div className="media-admin-row">
                {media ? <img src={mediaUrl(media.object_key)} alt="" loading="lazy" /> : <div className="media-admin-icon">sin logo</div>}
                <div>
                  <h2>{es?.display_name ?? item.name}</h2>
                  <p>{item.is_active ? 'Activo' : 'Inactivo'} - {item.is_special ? 'Especial' : 'General'}{media ? ` - ${media.original_name || media.object_key}` : ''}</p>
                </div>
              </div>
              <div className="table-actions">
                <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
                <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
              </div>
            </Card>
          );
        })}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar colaborador"
        message={`Se eliminara ${selectedCollaborator?.name ?? 'este colaborador'} y sus textos traducidos. No se borraran archivos multimedia.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
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

function selectedMediaName(mediaAssetId: string | null | undefined, mediaAssets: MediaAssetRow[]) {
  const media = mediaAssets.find((asset) => asset.id === mediaAssetId);
  return media?.original_name ?? media?.object_key;
}
