import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

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
    try {
      await adminRepository.saveElement({ id: editingId, ...form });
      setEditingId(undefined);
      setForm(emptyElement(languages));
      setSuccess('Elemento guardado.');
      await load();
    } catch {
      setError('No se pudo guardar el elemento.');
    }
  }

  function edit(item: ElementRow) {
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
