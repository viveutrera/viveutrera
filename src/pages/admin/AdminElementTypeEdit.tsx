import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { LanguageLegend } from '../../components/admin/LanguageLegend';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { elementTypeIconOptions, isElementTypeIcon } from '../../lib/typeIcons';
import { validateRequired, validateSlug } from '../../lib/validation';

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

export function AdminElementTypeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ElementTypeRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<ElementTypeForm>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    Promise.all([adminRepository.listElementTypes(), adminRepository.listLanguages()])
      .then(([typeRows, languageRows]) => {
        const nextTypes = typeRows as unknown as ElementTypeRow[];
        const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
        const type = nextTypes.find((item) => item.id === id);
        setItems(nextTypes);
        setLanguages(nextLanguages);
        setForm(type ? {
          slug: type.slug,
          icon: type.icon,
          sort_order: type.sort_order,
          is_active: type.is_active,
          translations: nextLanguages.map((language) => {
            const saved = type.element_type_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
            return {
              language_id: language.id,
              name: saved?.name ?? '',
              description: saved?.description ?? ''
            };
          })
        } : undefined);
      })
      .catch(() => setError('No se pudo cargar el tipo.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError('');
    setSuccess('');

    const validationError = validateType(form, languages, items, id);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveElementType({ id, ...form, slug: form.slug.trim(), icon: form.icon.trim() });
      setSuccess('Tipo guardado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el tipo.');
    } finally {
      setSubmitting(false);
    }
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string) {
    setForm((current) => current ? ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }) : current);
  }

  if (!id) return <Navigate to="/admin/tipos" replace />;
  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar tipos reales." />;
  if (isLoading) return <LoadingState />;
  if (!form) return <EmptyState title="Tipo no encontrado" message="Vuelve al listado y selecciona otro tipo." />;

  return (
    <section className="admin-section">
      <div className="admin-title-row">
        <h1>Editar tipo</h1>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/tipos')}>Volver</Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <div className="admin-form">
            <FormField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
            <SelectField label="Icono" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>
              {elementTypeIconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? { language_id: language.id, name: '', description: '' };
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend><LanguageLegend code={language.code} name={language.native_name} /></legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Descripcion" value={translation.description} onChange={(event) => updateTranslation(language.id, 'description', event.target.value)} />
                </fieldset>
              );
            })}
          </div>
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

function validateType(candidate: ElementTypeForm, languages: LanguageRow[], rows: ElementTypeRow[], editingId?: string) {
  const slugError = validateSlug(candidate.slug);
  if (slugError) return slugError;
  if (!isElementTypeIcon(candidate.icon)) return 'Selecciona un icono valido.';
  const duplicated = rows.some((item) => item.id !== editingId && item.slug === candidate.slug.trim());
  if (duplicated) return 'Ya existe un tipo con ese slug.';
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  return validateRequired(spanishTranslation?.name, `Nombre en ${spanish?.native_name ?? 'el idioma principal'}`);
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}
