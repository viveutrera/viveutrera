import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase, collaboratorsPageContentKey, defaultCollaboratorsPageContent, normalizeCollaboratorsPageTranslations } from '../../data/supabaseRepository';
import type { CollaboratorsPageContent, LanguageCode } from '../../domain/types';
import { publicPath } from '../../lib/routing';
import { validateRequired } from '../../lib/validation';

interface LanguageRow { id: string; code: string; native_name: string; sort_order: number; }
interface SiteSettingRow { key: string; value_json: unknown; }

export function AdminCollaboratorPageSettings() {
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [forms, setForms] = useState<Record<string, CollaboratorsPageContent>>({});
  const [activeLanguageId, setActiveLanguageId] = useState('');
  const [editingLanguageId, setEditingLanguageId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successModal, setSuccessModal] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) { setLoading(false); return; }
    Promise.all([adminRepository.listLanguages(), adminRepository.listSiteSettings()])
      .then(([languageRows, settingRows]) => {
        const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
        const setting = (settingRows as unknown as SiteSettingRow[]).find((item) => item.key === collaboratorsPageContentKey);
        const localized = normalizeCollaboratorsPageTranslations(setting?.value_json);
        const nextForms: Record<string, CollaboratorsPageContent> = {};
        nextLanguages.forEach((language) => { nextForms[language.code] = localized[language.code as LanguageCode] ?? defaultCollaboratorsPageContent; });
        setLanguages(nextLanguages); setForms(nextForms); setActiveLanguageId(nextLanguages[0]?.id ?? '');
      })
      .catch(() => setError('No se pudo cargar la configuracion de la pagina de colaboradores.'))
      .finally(() => setLoading(false));
  }, []);

  const activeLanguage = languages.find((language) => language.id === activeLanguageId);
  const languageCode = activeLanguage?.code ?? 'es';
  const form = forms[languageCode] ?? defaultCollaboratorsPageContent;
  const isEditing = editingLanguageId === activeLanguageId;

  function update(field: keyof CollaboratorsPageContent, value: string) { setForms((current) => ({ ...current, [languageCode]: { ...form, [field]: value } })); }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const validationError = validateCollaboratorsPageContent(form);
    if (validationError) { setError(validationError); return; }
    setSubmitting(true);
    try {
      await adminRepository.saveSiteSetting(collaboratorsPageContentKey, { translations: forms });
      setEditingLanguageId(undefined); setSuccessModal(`Textos de colaboradores en ${activeLanguage?.native_name ?? languageCode} guardados correctamente.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo guardar la configuracion de colaboradores.'); }
    finally { setSubmitting(false); }
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura Supabase para editar los textos de colaboradores." />;
  if (isLoading) return <LoadingState />;
  return (
    <section className="admin-section">
      <h1>Textos colaboradores</h1>{error ? <ErrorState message={error} /> : null}
      <Card>
        <h2>Textos por idioma</h2>
        <div className="settings-tabs" role="tablist" aria-label="Idiomas de colaboradores">
          {languages.map((language) => <button key={language.id} type="button" role="tab" aria-selected={activeLanguageId === language.id} className={activeLanguageId === language.id ? 'active' : ''} onClick={() => setActiveLanguageId(language.id)}><img className="settings-tab-flag" src={publicPath(`flags/flag-${language.code}.png`)} alt="" />{language.native_name}</button>)}
        </div>
        <form className="stack-form" onSubmit={save}>
          <div className="admin-title-row"><h3>{activeLanguage?.native_name ?? 'Español'}</h3><div className="button-row"><Button type="button" variant="secondary" disabled={isEditing || isSubmitting} onClick={() => setEditingLanguageId(activeLanguageId)}>Editar</Button><Button type="submit" disabled={!isEditing || isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button></div></div>
          <Card><h2>Cabecera</h2><div className="admin-form admin-form-wide"><FormField label="Titulo" value={form.title} onChange={(event) => update('title', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Subtitulo" value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} required readOnly={!isEditing} /></div></Card>
          <Card><h2>Listas de colaboradores</h2><div className="admin-form admin-form-wide"><TextAreaField label="Texto cuando no hay colaboradores especiales" value={form.specialSectionEmptyText} onChange={(event) => update('specialSectionEmptyText', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Texto cuando no hay colaboradores generales" value={form.generalSectionEmptyText} onChange={(event) => update('generalSectionEmptyText', event.target.value)} required readOnly={!isEditing} /></div></Card>
          <Card><h2>Bloque de llamada</h2><div className="admin-form admin-form-wide"><FormField label="Titulo" value={form.calloutTitle} onChange={(event) => update('calloutTitle', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Texto" value={form.calloutText} onChange={(event) => update('calloutText', event.target.value)} required readOnly={!isEditing} /><FormField label="Texto boton" value={form.calloutButtonLabel} onChange={(event) => update('calloutButtonLabel', event.target.value)} required readOnly={!isEditing} /></div></Card>
          <Card><h2>Cierre</h2><div className="admin-form admin-form-wide"><FormField label="Texto final" value={form.closingText} onChange={(event) => update('closingText', event.target.value)} required readOnly={!isEditing} /></div></Card>
        </form>
      </Card>
      <Modal title="Textos guardados" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}><p>{successModal}</p><div className="modal-actions"><Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button></div></Modal>
    </section>
  );
}

function validateCollaboratorsPageContent(content: CollaboratorsPageContent) { return [validateRequired(content.title, 'Titulo'), validateRequired(content.subtitle, 'Subtitulo'), validateRequired(content.calloutTitle, 'Titulo del bloque de llamada'), validateRequired(content.calloutButtonLabel, 'Texto boton'), validateRequired(content.closingText, 'Texto final')].find(Boolean) ?? ''; }
