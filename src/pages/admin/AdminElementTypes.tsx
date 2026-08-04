import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

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

const emptyType = (languages: LanguageRow[]): ElementTypeForm => ({
  slug: '',
  icon: 'landmark',
  sort_order: 0,
  is_active: true,
  translations: languages.map((language) => ({ language_id: language.id, name: '', description: '' }))
});

export function AdminElementTypes() {
  const [items, setItems] = useState<ElementTypeRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<ElementTypeForm>(emptyType([]));
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
    const [typeRows, languageRows] = await Promise.all([
      adminRepository.listElementTypes(),
      adminRepository.listLanguages()
    ]);
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    setLanguages(nextLanguages);
    setItems(typeRows as unknown as ElementTypeRow[]);
    setForm((current) => current.translations.length ? current : emptyType(nextLanguages));
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
    setError('');
    setSuccess('');
    try {
      await adminRepository.saveElementType({ id: editingId, ...form });
      setEditingId(undefined);
      setForm(emptyType(languages));
      setSuccess('Tipo guardado.');
      await load();
    } catch {
      setError('No se pudo guardar el tipo.');
    }
  }

  function edit(item: ElementTypeRow) {
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      icon: item.icon,
      sort_order: item.sort_order,
      is_active: item.is_active,
      translations: languages.map((language) => {
        const saved = item.element_type_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
        return {
          language_id: language.id,
          name: saved?.name ?? '',
          description: saved?.description ?? ''
        };
      })
    });
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string) {
    setForm((current) => ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }));
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
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <div className="admin-form">
            <FormField label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
            <FormField label="Icono" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? { language_id: language.id, name: '', description: '' };
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Descripcion" value={translation.description} onChange={(event) => updateTranslation(language.id, 'description', event.target.value)} />
                </fieldset>
              );
            })}
          </div>
          <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear tipo'}</Button>
        </form>
      </Card>
      <div className="admin-table">
        {items.map((item) => (
          <Card key={item.id}>
            <h2>{item.element_type_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? item.slug}</h2>
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

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}
