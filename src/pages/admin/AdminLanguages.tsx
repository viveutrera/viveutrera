import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { matchesSearch, validateRequired } from '../../lib/validation';

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
    setSuccess('');

    const validationError = validateLanguage(form, items);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveLanguage({
        ...form,
        code: form.code.trim(),
        locale: form.locale.trim(),
        name: form.name.trim(),
        native_name: form.native_name.trim(),
        flag_code: form.flag_code.trim()
      });
      setForm(emptyLanguage);
      setSuccess('Idioma guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el idioma.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteLanguage(deleteId);
      setDeleteId(undefined);
      setSuccess('Idioma borrado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el idioma.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(emptyLanguage);
    setError('');
  }

  const filteredItems = items.filter((item) => (
    matchesSearch([item.code, item.locale, item.name, item.native_name], search)
    && (statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active))
  ));
  const selectedLanguage = items.find((item) => item.id === deleteId);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables en GitHub Actions para editar datos reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Idiomas</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
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
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear idioma'}</Button>
            {form.id ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button> : null}
          </div>
        </form>
      </Card>
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar idiomas</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por codigo, locale o nombre" />
        </label>
        <select className="admin-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar idiomas por estado">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>
      <div className="admin-table">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <h2>{item.native_name}</h2>
            <p>{item.code} - {item.locale} - {item.is_active ? 'Activo' : 'Inactivo'}</p>
            <div className="table-actions">
              <Button type="button" variant="secondary" onClick={() => setForm(item)}>Editar</Button>
              <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar idioma"
        message={`Se eliminara ${selectedLanguage?.native_name ?? 'este idioma'} y tambien sus traducciones asociadas.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function validateLanguage(candidate: LanguageRow, rows: LanguageRow[]) {
  const requiredError = [
    validateRequired(candidate.code, 'Codigo'),
    validateRequired(candidate.locale, 'Locale'),
    validateRequired(candidate.name, 'Nombre'),
    validateRequired(candidate.native_name, 'Nombre nativo')
  ].find(Boolean);

  if (requiredError) return requiredError;
  if (!/^[a-z]{2}$/.test(candidate.code.trim())) return 'El codigo debe tener dos letras minusculas, por ejemplo es o en.';
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(candidate.locale.trim())) return 'El locale debe tener formato es o es-ES.';
  const duplicated = rows.some((item) => item.id !== candidate.id && item.code === candidate.code.trim());
  if (duplicated) return 'Ya existe un idioma con ese codigo.';
  return '';
}
