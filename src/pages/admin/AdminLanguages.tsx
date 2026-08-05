import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
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
  const navigate = useNavigate();
  const [items, setItems] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<LanguageRow>(emptyLanguage);
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
      setCreateOpen(false);
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
    setCreateOpen(false);
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
        <Button type="button" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Crear idioma</Button>
      </div>
      <div className="admin-data-table" role="table" aria-label="Idiomas">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Codigo</span>
          <span role="columnheader">Locale</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Orden</span>
          <span role="columnheader" aria-label="Acciones" />
        </div>
        {filteredItems.map((item) => (
          <div className="admin-data-row" role="row" key={item.id}>
            <span role="cell"><strong>{item.native_name}</strong><small>{item.name}</small></span>
            <span role="cell">{item.code}</span>
            <span role="cell">{item.locale}</span>
            <span role="cell">{item.is_default ? 'Por defecto' : item.is_active ? 'Activo' : 'Inactivo'}</span>
            <span role="cell">{item.sort_order}</span>
            <span className="row-actions" role="cell">
              <button className="icon-button" type="button" aria-label={`Editar ${item.native_name}`} onClick={() => navigate(`/admin/idiomas/${item.id}`)}><Pencil size={18} /></button>
              <button className="icon-button icon-button-danger" type="button" aria-label={`Borrar ${item.native_name}`} onClick={() => setDeleteId(item.id)}><Trash2 size={18} /></button>
            </span>
          </div>
        ))}
      </div>
      <Modal title="Crear idioma" isOpen={isCreateOpen} onClose={resetForm}>
        <form className="admin-form modal-form" onSubmit={submit}>
          <FormField label="Codigo" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
          <FormField label="Locale" value={form.locale} onChange={(event) => setForm({ ...form, locale: event.target.value })} required />
          <FormField label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <FormField label="Nombre nativo" value={form.native_name} onChange={(event) => setForm({ ...form, native_name: event.target.value })} required />
          <FormField label="Bandera/codigo" value={form.flag_code} onChange={(event) => setForm({ ...form, flag_code: event.target.value })} />
          <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
          <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
          <label className="check-field"><input type="checkbox" checked={form.is_default} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} /> Por defecto</label>
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
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
