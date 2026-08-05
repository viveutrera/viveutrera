import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { matchesSearch, validateRequired, validateSlug } from '../../lib/validation';

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface ElementTypeTranslationRow {
  name: string;
  description?: string | null;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

interface ElementTypeRow {
  id?: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  element_type_translations?: ElementTypeTranslationRow[];
}

interface ElementReference {
  element_type_id: string;
}

interface TranslationForm {
  language_id: string;
  name: string;
  description: string;
}

interface ElementTypeForm {
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  translations: TranslationForm[];
}

const emptyType = (languages: LanguageRow[]): ElementTypeForm => ({
  slug: '',
  icon: 'landmark',
  sort_order: 0,
  is_active: true,
  translations: languages.map((language) => ({ language_id: language.id, name: '', description: '' }))
});

export function AdminElementTypes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ElementTypeRow[]>([]);
  const [elements, setElements] = useState<ElementReference[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<ElementTypeForm>(emptyType([]));
  const [deleteId, setDeleteId] = useState<string>();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [typeRows, languageRows, elementRows] = await Promise.all([
      adminRepository.listElementTypes(),
      adminRepository.listLanguages(),
      adminRepository.listElements()
    ]);
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    setLanguages(nextLanguages);
    setItems(typeRows as unknown as ElementTypeRow[]);
    setElements(elementRows as unknown as ElementReference[]);
    setForm((current) => current.translations.length ? current : emptyType(nextLanguages));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los tipos.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateType(form, languages, items);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveElementType({ ...form, slug: form.slug.trim(), icon: form.icon.trim() });
      resetForm();
      setCreateOpen(false);
      setSuccess('Tipo guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el tipo.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(emptyType(languages));
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
    const associated = elements.filter((element) => element.element_type_id === deleteId).length;
    if (associated > 0) {
      setError(`No se puede borrar este tipo porque tiene ${associated} elemento(s) asociados.`);
      setDeleteId(undefined);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteElementType(deleteId);
      setDeleteId(undefined);
      setSuccess('Tipo borrado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el tipo.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = items.filter((item) => (
    matchesSearch([
      item.slug,
      item.icon,
      ...(item.element_type_translations?.map((translation) => translation.name) ?? [])
    ], search)
    && (statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active))
  ));
  const selectedType = items.find((item) => item.id === deleteId);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar tipos reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Tipos de elementos</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar tipos</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por slug, icono o nombre" />
        </label>
        <select className="admin-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar tipos por estado">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <Button type="button" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Crear tipo</Button>
      </div>
      <div className="admin-data-table" role="table" aria-label="Tipos de elementos">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Slug</span>
          <span role="columnheader">Icono</span>
          <span role="columnheader">Elementos</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader" aria-label="Acciones" />
        </div>
        {filteredItems.map((item) => (
          <div className="admin-data-row" role="row" key={item.id}>
            <span role="cell"><strong>{item.element_type_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? item.slug}</strong></span>
            <span role="cell">{item.slug}</span>
            <span role="cell">{item.icon}</span>
            <span role="cell">{elements.filter((element) => element.element_type_id === item.id).length}</span>
            <span role="cell">{item.is_active ? 'Activo' : 'Inactivo'}</span>
            <span className="row-actions" role="cell">
              <button className="icon-button" type="button" aria-label={`Editar ${item.slug}`} onClick={() => navigate(`/admin/tipos/${item.id}`)}><Pencil size={18} /></button>
              <button className="icon-button icon-button-danger" type="button" aria-label={`Borrar ${item.slug}`} onClick={() => setDeleteId(item.id)}><Trash2 size={18} /></button>
            </span>
          </div>
        ))}
      </div>
      <Modal title="Crear tipo" isOpen={isCreateOpen} onClose={resetForm}>
        <form className="stack-form modal-form" onSubmit={submit}>
          <div className="admin-form">
            <FormField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
            <FormField label="Icono" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? { language_id: language.id, name: '', description: '' };
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Descripcion" value={translation.description} onChange={(event) => updateTranslation(language.id, 'description', event.target.value)} />
                </fieldset>
              );
            })}
          </div>
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar tipo"
        message={`Se intentara borrar ${selectedType?.slug ?? 'este tipo'}. Si tiene elementos asociados, la accion se bloqueara.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function validateType(candidate: ElementTypeForm, languages: LanguageRow[], rows: ElementTypeRow[], editingId?: string) {
  const slugError = validateSlug(candidate.slug);
  if (slugError) return slugError;
  const duplicated = rows.some((item) => item.id !== editingId && item.slug === candidate.slug.trim());
  if (duplicated) return 'Ya existe un tipo con ese slug.';
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  return validateRequired(spanishTranslation?.name, `Nombre en ${spanish?.native_name ?? 'el idioma principal'}`);
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}
