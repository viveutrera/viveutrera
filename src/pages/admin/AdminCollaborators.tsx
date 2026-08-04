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

interface CollaboratorTranslationRow {
  display_name: string;
  thank_you_text?: string | null;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

interface CollaboratorRow {
  id?: string;
  name: string;
  url?: string | null;
  sort_order: number;
  is_active: boolean;
  is_special: boolean;
  collaborator_translations?: CollaboratorTranslationRow[];
}

interface TranslationForm {
  language_id: string;
  display_name: string;
  thank_you_text: string;
}

interface CollaboratorForm {
  name: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  is_special: boolean;
  translations: TranslationForm[];
}

const emptyCollaborator = (languages: LanguageRow[]): CollaboratorForm => ({
  name: '',
  url: '',
  sort_order: 0,
  is_active: true,
  is_special: false,
  translations: languages.map((language) => ({ language_id: language.id, display_name: '', thank_you_text: '' }))
});

export function AdminCollaborators() {
  const [items, setItems] = useState<CollaboratorRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<CollaboratorForm>(emptyCollaborator([]));
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
    const [collaboratorRows, languageRows] = await Promise.all([
      adminRepository.listCollaborators(),
      adminRepository.listLanguages()
    ]);
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    setItems(collaboratorRows as unknown as CollaboratorRow[]);
    setLanguages(nextLanguages);
    setForm((current) => current.translations.length ? current : emptyCollaborator(nextLanguages));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los colaboradores.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await adminRepository.saveCollaborator({ id: editingId, ...form });
      setEditingId(undefined);
      setForm(emptyCollaborator(languages));
      setSuccess('Colaborador guardado.');
      await load();
    } catch {
      setError('No se pudo guardar el colaborador.');
    }
  }

  function edit(item: CollaboratorRow) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      url: item.url ?? '',
      sort_order: item.sort_order,
      is_active: item.is_active,
      is_special: item.is_special,
      translations: languages.map((language) => {
        const saved = item.collaborator_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
        return {
          language_id: language.id,
          display_name: saved?.display_name ?? '',
          thank_you_text: saved?.thank_you_text ?? ''
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
    await adminRepository.deleteCollaborator(deleteId);
    setDeleteId(undefined);
    await load();
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar colaboradores reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Colaboradores</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <div className="admin-form">
            <FormField label="Nombre interno" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <FormField label="URL" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo</label>
            <label className="check-field"><input type="checkbox" checked={form.is_special} onChange={(event) => setForm({ ...form, is_special: event.target.checked })} /> Especial</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? { language_id: language.id, display_name: '', thank_you_text: '' };
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Nombre visible" value={translation.display_name} onChange={(event) => updateTranslation(language.id, 'display_name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Agradecimiento" value={translation.thank_you_text} onChange={(event) => updateTranslation(language.id, 'thank_you_text', event.target.value)} />
                </fieldset>
              );
            })}
          </div>
          <Button type="submit">{editingId ? 'Guardar cambios' : 'Crear colaborador'}</Button>
        </form>
      </Card>
      <div className="admin-table">
        {items.map((item) => {
          const es = item.collaborator_translations?.find((translation) => getCode(translation.languages) === 'es');
          return (
            <Card key={item.id}>
              <h2>{es?.display_name ?? item.name}</h2>
              <p>{item.is_active ? 'Activo' : 'Inactivo'} · {item.is_special ? 'Especial' : 'General'}</p>
              <div className="table-actions">
                <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
                <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
              </div>
            </Card>
          );
        })}
      </div>
      <ConfirmDialog isOpen={Boolean(deleteId)} title="Borrar colaborador" message="Se eliminara el colaborador y sus textos traducidos. No se borraran archivos multimedia." confirmLabel="Borrar" onCancel={() => setDeleteId(undefined)} onConfirm={confirmDelete} />
    </section>
  );
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}
