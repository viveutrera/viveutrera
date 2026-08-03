import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

interface ElementTypeRow {
  id?: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  element_type_translations?: Array<{ name: string; description?: string | null; languages?: { code: string } | null }>;
}

const emptyType = { slug: '', icon: 'landmark', name_es: '', description_es: '', sort_order: 0, is_active: true };

export function AdminElementTypes() {
  const [items, setItems] = useState<ElementTypeRow[]>([]);
  const [form, setForm] = useState({ ...emptyType });
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
    setItems(await adminRepository.listElementTypes() as ElementTypeRow[]);
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
    try {
      await adminRepository.saveElementType({ id: editingId, ...form });
      setEditingId(undefined);
      setForm({ ...emptyType });
      await load();
    } catch {
      setError('No se pudo guardar el tipo.');
    }
  }

  function edit(item: ElementTypeRow) {
    const es = item.element_type_translations?.find((translation) => translation.languages?.code === 'es');
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      icon: item.icon,
      name_es: es?.name ?? '',
      description_es: es?.description ?? '',
      sort_order: item.sort_order,
      is_active: item.is_active
    });
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await adminRepository.deleteElementType(deleteId);
    setDeleteId(undefined);
    await load();
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar tipos reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Tipos de elementos</h1>
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <form className="admin-form" onSubmit={submit}>
          <FormField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
          <FormField label="Icono" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
          <FormField label="Nombre ES" value={form.name_es} onChange={(event) => setForm({ ...form, name_es: event.target.value })} required />
          <TextAreaField label="Descripcion ES" value={form.description_es} onChange={(event) => setForm({ ...form, description_es: event.target.value })} />
          <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
          <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
          <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear tipo'}</Button>
        </form>
      </Card>
      <div className="admin-table">
        {items.map((item) => (
          <Card key={item.id}>
            <h2>{item.element_type_translations?.find((translation) => translation.languages?.code === 'es')?.name ?? item.slug}</h2>
            <p>{item.slug}</p>
            <div className="table-actions">
              <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
              <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog isOpen={Boolean(deleteId)} title="Borrar tipo" message="No se podra borrar si hay elementos asociados." confirmLabel="Borrar" onCancel={() => setDeleteId(undefined)} onConfirm={confirmDelete} />
    </section>
  );
}
