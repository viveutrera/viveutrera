import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { matchesSearch, validateOptionalUrl, validateRequired, validateSlug } from '../../lib/validation';

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface TypeRow {
  id: string;
  slug: string;
  element_type_translations?: Array<{ name: string; languages?: { code: string } | { code: string }[] | null }>;
}

interface ElementTranslationRow {
  name: string;
  short_text: string;
  long_text?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_published: boolean;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

interface ElementRow {
  id?: string;
  slug: string;
  element_type_id: string;
  maps_url?: string | null;
  status: 'draft' | 'published';
  is_featured: boolean;
  sort_order: number;
  element_translations?: ElementTranslationRow[];
}

interface TranslationForm {
  language_id: string;
  name: string;
  short_text: string;
  long_text: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
}

interface ElementForm {
  slug: string;
  element_type_id: string;
  maps_url: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  sort_order: number;
  translations: TranslationForm[];
}

const emptyElement = (languages: LanguageRow[]): ElementForm => ({
  slug: '',
  element_type_id: '',
  maps_url: '',
  status: 'draft',
  is_featured: false,
  sort_order: 0,
  translations: languages.map((language) => ({
    language_id: language.id,
    name: '',
    short_text: '',
    long_text: '',
    seo_title: '',
    seo_description: '',
    is_published: language.code === 'es'
  }))
});

export function AdminElements() {
  const [items, setItems] = useState<ElementRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<ElementForm>(emptyElement([]));
  const [editingId, setEditingId] = useState<string>();
  const [deleteId, setDeleteId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [elementRows, typeRows, languageRows] = await Promise.all([
      adminRepository.listElements(),
      adminRepository.listElementTypes(),
      adminRepository.listLanguages()
    ]);
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    setItems(elementRows as unknown as ElementRow[]);
    setTypes(typeRows as unknown as TypeRow[]);
    setLanguages(nextLanguages);
    setForm((current) => current.translations.length ? current : emptyElement(nextLanguages));
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
    setError('');
    setSuccess('');

    const validationError = validateElement(form, languages, items, editingId);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveElement({ id: editingId, ...form, slug: form.slug.trim(), maps_url: form.maps_url.trim() });
      resetForm();
      setSuccess('Elemento guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el elemento.');
    } finally {
      setSubmitting(false);
    }
  }

  function edit(item: ElementRow) {
    setError('');
    setSuccess('');
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      element_type_id: item.element_type_id,
      maps_url: item.maps_url ?? '',
      status: item.status,
      is_featured: item.is_featured,
      sort_order: item.sort_order,
      translations: languages.map((language) => {
        const saved = item.element_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
        return {
          language_id: language.id,
          name: saved?.name ?? '',
          short_text: saved?.short_text ?? '',
          long_text: saved?.long_text ?? '',
          seo_title: saved?.seo_title ?? '',
          seo_description: saved?.seo_description ?? '',
          is_published: saved?.is_published ?? false
        };
      })
    });
  }

  function resetForm() {
    setEditingId(undefined);
    setForm(emptyElement(languages));
    setError('');
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string | boolean) {
    setForm((current) => ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }));
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteElement(deleteId);
      setDeleteId(undefined);
      setSuccess('Elemento borrado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el elemento.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = items.filter((item) => {
    const textValues = [
      item.slug,
      item.status,
      item.element_translations?.map((translation) => `${translation.name} ${translation.short_text}`).join(' ')
    ];
    return matchesSearch(textValues, search)
      && (statusFilter === 'all' || item.status === statusFilter)
      && (typeFilter === 'all' || item.element_type_id === typeFilter)
      && (languageFilter === 'all' || item.element_translations?.some((translation) => translation.language_id === languageFilter && translation.is_published));
  });
  const selectedElement = items.find((item) => item.id === deleteId);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar elementos reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Elementos</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <div className="admin-form">
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
            <label className="check-field"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Destacado</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? emptyElement([language]).translations[0];
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Texto corto" value={translation.short_text} onChange={(event) => updateTranslation(language.id, 'short_text', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Texto largo" value={translation.long_text} onChange={(event) => updateTranslation(language.id, 'long_text', event.target.value)} />
                  <FormField label="SEO titulo" value={translation.seo_title} onChange={(event) => updateTranslation(language.id, 'seo_title', event.target.value)} />
                  <TextAreaField label="SEO descripcion" value={translation.seo_description} onChange={(event) => updateTranslation(language.id, 'seo_description', event.target.value)} />
                  <label className="check-field"><input type="checkbox" checked={translation.is_published} onChange={(event) => updateTranslation(language.id, 'is_published', event.target.checked)} /> Publicada</label>
                </fieldset>
              );
            })}
          </div>
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear elemento'}</Button>
            {editingId ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button> : null}
          </div>
        </form>
      </Card>
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar elementos</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, slug o texto" />
        </label>
        <select className="admin-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar elementos por estado">
          <option value="all">Todos los estados</option>
          <option value="draft">Borradores</option>
          <option value="published">Publicados</option>
        </select>
        <select className="admin-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar elementos por tipo">
          <option value="all">Todos los tipos</option>
          {types.map((type) => <option key={type.id} value={type.id}>{type.element_type_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? type.slug}</option>)}
        </select>
        <select className="admin-filter" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} aria-label="Filtrar elementos por idioma publicado">
          <option value="all">Todos los idiomas</option>
          {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
        </select>
      </div>
      <div className="admin-table">
        {filteredItems.map((item) => {
          const es = item.element_translations?.find((translation) => getCode(translation.languages) === 'es');
          return (
            <Card key={item.id}>
              <h2>{es?.name ?? item.slug}</h2>
              <p>{item.status} - {item.slug}</p>
              <div className="table-actions">
                <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
                <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
              </div>
            </Card>
          );
        })}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar elemento"
        message={`Se eliminara ${selectedElement?.slug ?? 'este elemento'} con sus traducciones, enlaces y asociaciones textuales.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function validateElement(candidate: ElementForm, languages: LanguageRow[], rows: ElementRow[], editingId?: string) {
  const slugError = validateSlug(candidate.slug);
  if (slugError) return slugError;
  const duplicated = rows.some((item) => item.id !== editingId && item.slug === candidate.slug.trim());
  if (duplicated) return 'Ya existe un elemento con ese slug.';
  const typeError = validateRequired(candidate.element_type_id, 'Tipo');
  if (typeError) return typeError;
  const urlError = validateOptionalUrl(candidate.maps_url, 'La URL del mapa');
  if (urlError) return urlError;
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  const requiredError = [
    validateRequired(spanishTranslation?.name, `Nombre en ${spanish?.native_name ?? 'el idioma principal'}`),
    validateRequired(spanishTranslation?.short_text, `Texto corto en ${spanish?.native_name ?? 'el idioma principal'}`)
  ].find(Boolean);
  return requiredError ?? '';
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}
