import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { validateOptionalUrl, validateRequired } from '../../lib/validation';
import { LinkFields, type ElementOption, type LanguageOption, type LinkRow } from './AdminLinks';

const emptyLink = {
  element_id: '',
  language_id: '',
  title: '',
  url: '',
  link_type: '',
  sort_order: 0,
  is_published: true
};

export function AdminLinkEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<LinkRow[]>([]);
  const [elements, setElements] = useState<ElementOption[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [form, setForm] = useState({ ...emptyLink });
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    Promise.all([
      adminRepository.listLinks(),
      adminRepository.listElements(),
      adminRepository.listLanguages()
    ]).then(([linkRows, elementRows, languageRows]) => {
      const nextLinks = linkRows as unknown as LinkRow[];
      const link = nextLinks.find((item) => item.id === id);
      setItems(nextLinks);
      setElements(elementRows as unknown as ElementOption[]);
      setLanguages(languageRows as unknown as LanguageOption[]);
      if (link) {
        setForm({
          element_id: link.element_id,
          language_id: link.language_id,
          title: link.title,
          url: link.url,
          link_type: link.link_type ?? '',
          sort_order: link.sort_order,
          is_published: link.is_published
        });
      }
    }).catch(() => setError('No se pudo cargar el enlace.')).finally(() => setLoading(false));
  }, [id]);

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
      await adminRepository.saveLink({ id, ...form, title: form.title.trim(), url: form.url.trim(), link_type: form.link_type.trim() });
      setSuccess('Enlace guardado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el enlace.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!id) return <Navigate to="/admin/enlaces" replace />;
  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar enlaces reales." />;
  if (isLoading) return <LoadingState />;
  if (!items.some((item) => item.id === id)) return <EmptyState title="Enlace no encontrado" message="Vuelve al listado y selecciona otro enlace." />;

  return (
    <section className="admin-section">
      <div className="admin-title-row">
        <h1>Editar enlace</h1>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/enlaces')}>Volver</Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <LinkFields form={form} elements={elements} languages={languages} onChange={setForm} />
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>
    </section>
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
