import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

interface TypeRow {
  id: string;
  slug: string;
  element_type_translations?: Array<{ name: string; languages?: { code: string } | { code: string }[] | null }>;
}

interface ElementRow {
  id?: string;
  slug: string;
  element_type_id: string;
  maps_url?: string | null;
  status: 'draft' | 'published';
  is_featured: boolean;
  sort_order: number;
  element_translations?: Array<{
    name: string;
    short_text: string;
    long_text?: string | null;
    is_published: boolean;
    languages?: { code: string } | { code: string }[] | null;
  }>;
}

interface ElementForm {
  slug: string;
  element_type_id: string;
  maps_url: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  sort_order: number;
  name_es: string;
  short_text_es: string;
  long_text_es: string;
  is_published_es: boolean;
}

const emptyElement: ElementForm = {
  slug: '',
  element_type_id: '',
  maps_url: '',
  status: 'draft',
  is_featured: false,
  sort_order: 0,
  name_es: '',
  short_text_es: '',
  long_text_es: '',
  is_published_es: false
};

export function AdminElements() {
  const [items, setItems] = useState<ElementRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [form, setForm] = useState({ ...emptyElement });
  const [editingId, setEditingId] = useState<string>();
  const [deleteId, setDeleteId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [elementRows, typeRows] = await Promise.all([
      adminRepository.listElements(),
      adminRepository.listElementTypes()
    ]);
    setItems(elementRows as unknown as ElementRow[]);
    setTypes(typeRows as unknown as TypeRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los elementos.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await adminRepository.saveElement({ id: editingId, ...form });
      setEditingId(undefined);
      setForm({ ...emptyElement });
      await load();
    } catch {
      setError('No se pudo guardar el elemento.');
    }
  }

  function edit(item: ElementRow) {
    const es = item.element_translations?.find((translation) => getCode(translation.languages) === 'es');
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      element_type_id: item.element_type_id,
      maps_url: item.maps_url ?? '',
      status: item.status,
      is_featured: item.is_featured,
      sort_order: item.sort_order,
      name_es: es?.name ?? '',
      short_text_es: es?.short_text ?? '',
      long_text_es: es?.long_text ?? '',
      is_published_es: es?.is_published ?? false
    });
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await adminRepository.deleteElement(deleteId);
    setDeleteId(undefined);
    await load();
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar elementos reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Elementos</h1>
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <form className="admin-form admin-form-wide" onSubmit={submit}>
          <FormField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
          <SelectField label="Tipo" value={form.element_type_id} onChange={(event) => setForm({ ...form, element_type_id: event.target.value })} required>
            <option value="">Selecciona un tipo</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.element_type_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? type.slug}</option>
            ))}
          </SelectField>
          <SelectField label="Estado" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'published' })}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
          </SelectField>
          <FormField label="URL mapa" value={form.maps_url} onChange={(event) => setForm({ ...form, maps_url: event.target.value })} />
          <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
          <FormField label="Nombre ES" value={form.name_es} onChange={(event) => setForm({ ...form, name_es: event.target.value })} required />
          <TextAreaField label="Texto corto ES" value={form.short_text_es} onChange={(event) => setForm({ ...form, short_text_es: event.target.value })} required />
          <TextAreaField label="Texto largo ES" value={form.long_text_es} onChange={(event) => setForm({ ...form, long_text_es: event.target.value })} />
          <label className="check-field"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Destacado</label>
          <label className="check-field"><input type="checkbox" checked={form.is_published_es} onChange={(event) => setForm({ ...form, is_published_es: event.target.checked })} /> Traduccion ES publicada</label>
          <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear elemento'}</Button>
        </form>
      </Card>
      <div className="admin-table">
        {items.map((item) => {
          const es = item.element_translations?.find((translation) => getCode(translation.languages) === 'es');
          return (
            <Card key={item.id}>
              <h2>{es?.name ?? item.slug}</h2>
              <p>{item.status} · {item.slug}</p>
              <div className="table-actions">
                <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
                <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
              </div>
            </Card>
          );
        })}
      </div>
      <ConfirmDialog isOpen={Boolean(deleteId)} title="Borrar elemento" message="Se eliminaran sus traducciones, enlaces y asociaciones textuales." confirmLabel="Borrar" onCancel={() => setDeleteId(undefined)} onConfirm={confirmDelete} />
    </section>
  );
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}
