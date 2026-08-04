import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

interface ElementOption {
  id: string;
  slug: string;
}

interface LanguageOption {
  id: string;
  code: string;
  native_name: string;
}

interface LinkRow {
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
  const [items, setItems] = useState<LinkRow[]>([]);
  const [elements, setElements] = useState<ElementOption[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [form, setForm] = useState({ ...emptyLink });
  const [editingId, setEditingId] = useState<string>();
  const [deleteId, setDeleteId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
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
    try {
      await adminRepository.saveLink({ id: editingId, ...form });
      setEditingId(undefined);
      setForm({ ...emptyLink });
      setSuccess('Enlace guardado.');
      await load();
    } catch {
      setError('No se pudo guardar el enlace.');
    }
  }

  function edit(item: LinkRow) {
    setEditingId(item.id);
    setForm({
      element_id: item.element_id,
      language_id: item.language_id,
      title: item.title,
      url: item.url,
      link_type: item.link_type ?? '',
      sort_order: item.sort_order,
      is_published: item.is_published
    });
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await adminRepository.deleteLink(deleteId);
    setDeleteId(undefined);
    await load();
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar enlaces reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Enlaces</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="admin-form" onSubmit={submit}>
          <SelectField label="Elemento" value={form.element_id} onChange={(event) => setForm({ ...form, element_id: event.target.value })} required>
            <option value="">Selecciona elemento</option>
            {elements.map((element) => <option key={element.id} value={element.id}>{element.slug}</option>)}
          </SelectField>
          <SelectField label="Idioma" value={form.language_id} onChange={(event) => setForm({ ...form, language_id: event.target.value })} required>
            <option value="">Selecciona idioma</option>
            {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name} ({language.code})</option>)}
          </SelectField>
          <FormField label="Titulo" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <FormField label="URL" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required />
          <FormField label="Tipo" value={form.link_type} onChange={(event) => setForm({ ...form, link_type: event.target.value })} />
          <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
          <label className="check-field"><input type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} /> Publicado</label>
          <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear enlace'}</Button>
        </form>
      </Card>
      <div className="admin-table">
        {items.map((item) => (
          <Card key={item.id}>
            <h2>{item.title}</h2>
            <p>{getSlug(item.elements) ?? item.element_id} · {getCode(item.languages) ?? item.language_id}</p>
            <div className="table-actions">
              <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
              <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog isOpen={Boolean(deleteId)} title="Borrar enlace" message="Se eliminara solo este enlace complementario." confirmLabel="Borrar" onCancel={() => setDeleteId(undefined)} onConfirm={confirmDelete} />
    </section>
  );
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}

function getSlug(relation: { slug: string } | { slug: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.slug : relation?.slug;
}
