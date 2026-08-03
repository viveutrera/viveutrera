import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

interface LanguageRow {
  id?: string;
  code: string;
  locale: string;
  name: string;
  native_name: string;
  flag_code: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

const emptyLanguage: LanguageRow = {
  code: '',
  locale: '',
  name: '',
  native_name: '',
  flag_code: '',
  is_active: true,
  is_default: false,
  sort_order: 0
};

export function AdminLanguages() {
  const [items, setItems] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<LanguageRow>(emptyLanguage);
  const [deleteId, setDeleteId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await adminRepository.listLanguages();
    setItems(rows as LanguageRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los idiomas.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await adminRepository.saveLanguage(form);
      setForm(emptyLanguage);
      await load();
    } catch {
      setError('No se pudo guardar el idioma.');
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await adminRepository.deleteLanguage(deleteId);
    setDeleteId(undefined);
    await load();
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables en GitHub Actions para editar datos reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Idiomas</h1>
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <form className="admin-form" onSubmit={submit}>
          <FormField label="Codigo" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
          <FormField label="Locale" value={form.locale} onChange={(event) => setForm({ ...form, locale: event.target.value })} required />
          <FormField label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <FormField label="Nombre nativo" value={form.native_name} onChange={(event) => setForm({ ...form, native_name: event.target.value })} required />
          <FormField label="Bandera/codigo" value={form.flag_code} onChange={(event) => setForm({ ...form, flag_code: event.target.value })} />
          <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
          <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
          <label className="check-field"><input type="checkbox" checked={form.is_default} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} /> Por defecto</label>
          <Button type="submit">{form.id ? 'Guardar cambios' : 'Crear idioma'}</Button>
        </form>
      </Card>
      <div className="admin-table">
        {items.map((item) => (
          <Card key={item.id}>
            <h2>{item.native_name}</h2>
            <p>{item.code} · {item.locale}</p>
            <div className="table-actions">
              <Button type="button" variant="secondary" onClick={() => setForm(item)}>Editar</Button>
              <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog isOpen={Boolean(deleteId)} title="Borrar idioma" message="Se eliminaran tambien sus traducciones asociadas." confirmLabel="Borrar" onCancel={() => setDeleteId(undefined)} onConfirm={confirmDelete} />
    </section>
  );
}
