import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { linkTypeLabel, linkTypeOptions } from '../../lib/linkTypes';
import { matchesSearch, validateOptionalUrl, validateRequired } from '../../lib/validation';

export interface ElementOption {
  id: string;
  slug: string;
}

export interface LanguageOption {
  id: string;
  code: string;
  native_name: string;
}

export interface LinkRow {
  id?: string;
  element_id: string;
  language_id: string;
  title: string;
  url: string;
  link_type?: string | null;
  sort_order: number;
  is_published: boolean;
  elements?: { slug: string } | { slug: string }[] | null;
  languages?: { code: string } | { code: string }[] | null;
}

const emptyLink = {
  element_id: '',
  language_id: '',
  title: '',
  url: '',
  link_type: '',
  sort_order: 0,
  is_published: true
};

export function AdminLinks() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LinkRow[]>([]);
  const [elements, setElements] = useState<ElementOption[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [form, setForm] = useState({ ...emptyLink });
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [elementFilter, setElementFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [publishedFilter, setPublishedFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [linkRows, elementRows, languageRows] = await Promise.all([
      adminRepository.listLinks(),
      adminRepository.listElements(),
      adminRepository.listLanguages()
    ]);
    setItems(linkRows as unknown as LinkRow[]);
    setElements(elementRows as unknown as ElementOption[]);
    setLanguages(languageRows as unknown as LanguageOption[]);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los enlaces.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateLink(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveLink({ id: undefined, ...form, title: form.title.trim(), url: form.url.trim(), link_type: form.link_type.trim() });
      resetForm();
      setCreateOpen(false);
      setSuccess('Enlace guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el enlace.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({ ...emptyLink });
    setCreateOpen(false);
    setError('');
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteLink(deleteId);
      setDeleteId(undefined);
      setSuccess('Enlace borrado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el enlace.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = items.filter((item) => (
    matchesSearch([item.title, item.url, item.link_type, getSlug(item.elements), getCode(item.languages)], search)
    && (elementFilter === 'all' || item.element_id === elementFilter)
    && (languageFilter === 'all' || item.language_id === languageFilter)
    && (publishedFilter === 'all' || (publishedFilter === 'published' ? item.is_published : !item.is_published))
  ));
  const selectedLink = items.find((item) => item.id === deleteId);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar enlaces reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Enlaces</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar enlaces</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por titulo, URL, tipo o elemento" />
        </label>
        <select className="admin-filter" value={elementFilter} onChange={(event) => setElementFilter(event.target.value)} aria-label="Filtrar enlaces por elemento">
          <option value="all">Todos los elementos</option>
          {elements.map((element) => <option key={element.id} value={element.id}>{element.slug}</option>)}
        </select>
        <select className="admin-filter" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} aria-label="Filtrar enlaces por idioma">
          <option value="all">Todos los idiomas</option>
          {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
        </select>
        <select className="admin-filter" value={publishedFilter} onChange={(event) => setPublishedFilter(event.target.value)} aria-label="Filtrar enlaces por estado">
          <option value="all">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="draft">No publicados</option>
        </select>
        <Button type="button" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Crear enlace</Button>
      </div>
      <div className="admin-data-table" role="table" aria-label="Enlaces">
        <div className="admin-data-row admin-data-row-links admin-data-head" role="row">
          <span role="columnheader">Titulo</span>
          <span role="columnheader">Elemento</span>
          <span role="columnheader">Idioma</span>
          <span role="columnheader">Tipo</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader" aria-label="Acciones" />
        </div>
        {filteredItems.map((item) => (
          <div className="admin-data-row admin-data-row-links" role="row" key={item.id}>
            <span role="cell"><strong>{item.title}</strong><small>{item.url}</small></span>
            <span role="cell">{getSlug(item.elements) ?? item.element_id}</span>
            <span role="cell">{getCode(item.languages) ?? item.language_id}</span>
            <span role="cell">{linkTypeLabel(item.link_type)}</span>
            <span role="cell">{item.is_published ? 'Publicado' : 'No publicado'}</span>
            <span className="row-actions" role="cell">
              <button className="icon-button" type="button" aria-label={`Editar ${item.title}`} onClick={() => navigate(`/admin/enlaces/${item.id}`)}><Pencil size={18} /></button>
              <button className="icon-button icon-button-danger" type="button" aria-label={`Borrar ${item.title}`} onClick={() => setDeleteId(item.id)}><Trash2 size={18} /></button>
            </span>
          </div>
        ))}
      </div>
      <Modal title="Crear enlace" isOpen={isCreateOpen} onClose={resetForm}>
        <form className="stack-form modal-form" onSubmit={submit}>
          <LinkFields form={form} elements={elements} languages={languages} onChange={setForm} />
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar enlace"
        message={`Se eliminara solo el enlace "${selectedLink?.title ?? 'seleccionado'}".`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

export function LinkFields({ form, elements, languages, onChange }: {
  form: typeof emptyLink;
  elements: ElementOption[];
  languages: LanguageOption[];
  onChange: (next: typeof emptyLink) => void;
}) {
  return (
    <div className="admin-form">
      <SelectField label="Elemento" value={form.element_id} onChange={(event) => onChange({ ...form, element_id: event.target.value })} required>
        <option value="">Selecciona elemento</option>
        {elements.map((element) => <option key={element.id} value={element.id}>{element.slug}</option>)}
      </SelectField>
      <SelectField label="Idioma" value={form.language_id} onChange={(event) => onChange({ ...form, language_id: event.target.value })} required>
        <option value="">Selecciona idioma</option>
        {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name} ({language.code})</option>)}
      </SelectField>
      <FormField label="Titulo" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} required />
      <FormField label="URL" type="url" value={form.url} onChange={(event) => onChange({ ...form, url: event.target.value })} required />
      <SelectField label="Tipo" value={form.link_type} onChange={(event) => onChange({ ...form, link_type: event.target.value })}>
        {linkTypeOptions.map((option) => <option key={option.value || 'general'} value={option.value}>{option.label}</option>)}
      </SelectField>
      <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: Number(event.target.value) })} />
      <label className="check-field"><input type="checkbox" checked={form.is_published} onChange={(event) => onChange({ ...form, is_published: event.target.checked })} /> Publicado</label>
    </div>
  );
}

function validateLink(candidate: typeof emptyLink) {
  const requiredError = [
    validateRequired(candidate.element_id, 'Elemento'),
    validateRequired(candidate.language_id, 'Idioma'),
    validateRequired(candidate.title, 'Titulo'),
    validateRequired(candidate.url, 'URL')
  ].find(Boolean);
  if (requiredError) return requiredError;
  return validateOptionalUrl(candidate.url, 'La URL');
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}

function getSlug(relation: { slug: string } | { slug: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.slug : relation?.slug;
}
