import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { validateRequired } from '../../lib/validation';

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

export function AdminLanguageEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<LanguageRow>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    adminRepository.listLanguages()
      .then((rows) => {
        const languages = rows as LanguageRow[];
        setItems(languages);
        setForm(languages.find((language) => language.id === id));
      })
      .catch(() => setError('No se pudo cargar el idioma.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
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
      setSuccess('Idioma guardado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el idioma.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!id) return <Navigate to="/admin/idiomas" replace />;
  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar datos reales." />;
  if (isLoading) return <LoadingState />;
  if (!form) return <EmptyState title="Idioma no encontrado" message="Vuelve al listado y selecciona otro idioma." />;

  return (
    <section className="admin-section">
      <div className="admin-title-row">
        <h1>Editar idioma</h1>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/idiomas')}>Volver</Button>
      </div>
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
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>
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
