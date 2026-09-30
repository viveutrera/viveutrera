import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase, defaultDonationContent, donationContentKey, normalizeDonationTranslations } from '../../data/supabaseRepository';
import type { DonationContent, LanguageCode } from '../../domain/types';
import { publicPath } from '../../lib/routing';
import { validateRequired } from '../../lib/validation';

interface LanguageRow { id: string; code: string; native_name: string; sort_order: number; }
interface SiteSettingRow { key: string; value_json: unknown; }

export function AdminDonations() {
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [forms, setForms] = useState<Record<string, DonationContent>>({});
  const [transparencyTexts, setTransparencyTexts] = useState<Record<string, string>>({});
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
        const setting = (settingRows as unknown as SiteSettingRow[]).find((item) => item.key === donationContentKey);
        const localized = normalizeDonationTranslations(setting?.value_json);
        const nextForms: Record<string, DonationContent> = {};
        const nextTransparency: Record<string, string> = {};
        nextLanguages.forEach((language) => { const content = localized[language.code as LanguageCode] ?? defaultDonationContent; nextForms[language.code] = content; nextTransparency[language.code] = content.transparencyItems.join('\n'); });
        setLanguages(nextLanguages); setForms(nextForms); setTransparencyTexts(nextTransparency); setActiveLanguageId(nextLanguages[0]?.id ?? '');
      })
      .catch(() => setError('No se pudo cargar la configuracion de donativos.'))
      .finally(() => setLoading(false));
  }, []);

  const activeLanguage = languages.find((language) => language.id === activeLanguageId);
  const languageCode = activeLanguage?.code ?? 'es';
  const form = forms[languageCode] ?? defaultDonationContent;
  const isEditing = editingLanguageId === activeLanguageId;

  function update(field: keyof DonationContent, value: string) {
    setForms((current) => ({ ...current, [languageCode]: { ...form, [field]: value } }));
  }
  function updateTransparency(value: string) {
    setTransparencyTexts((current) => ({ ...current, [languageCode]: value }));
    setForms((current) => ({ ...current, [languageCode]: { ...form, transparencyItems: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) } }));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const validationError = validateDonationContent(form);
    if (validationError) { setError(validationError); return; }
    setSubmitting(true);
    try {
      const savedContent = { ...form, transparencyItems: (transparencyTexts[languageCode] ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean) };
      const nextForms = { ...forms, [languageCode]: savedContent };
      setForms(nextForms);
      await adminRepository.saveSiteSetting(donationContentKey, { translations: nextForms });
      setEditingLanguageId(undefined); setSuccessModal(`Textos de donativos en ${activeLanguage?.native_name ?? languageCode} guardados correctamente.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo guardar la configuracion de donativos.'); }
    finally { setSubmitting(false); }
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura Supabase para editar los donativos." />;
  if (isLoading) return <LoadingState />;
  return (
    <section className="admin-section">
      <h1>Donativos</h1>{error ? <ErrorState message={error} /> : null}
      <Card>
        <h2>Textos por idioma</h2>
        <div className="settings-tabs" role="tablist" aria-label="Idiomas de donativos">
          {languages.map((language) => <button key={language.id} type="button" role="tab" aria-selected={activeLanguageId === language.id} className={activeLanguageId === language.id ? 'active' : ''} onClick={() => setActiveLanguageId(language.id)}><img className="settings-tab-flag" src={publicPath(`flags/flag-${language.code}.png`)} alt="" />{language.native_name}</button>)}
        </div>
        <form className="stack-form" onSubmit={save}>
          <div className="admin-title-row"><h3>{activeLanguage?.native_name ?? 'Español'}</h3><div className="button-row"><Button type="button" variant="secondary" disabled={isEditing || isSubmitting} onClick={() => setEditingLanguageId(activeLanguageId)}>Editar</Button><Button type="submit" disabled={!isEditing || isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button></div></div>
          <Card><h2>Cabecera</h2><div className="admin-form admin-form-wide"><FormField label="Titulo" value={form.title} onChange={(event) => update('title', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Subtitulo" value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} required readOnly={!isEditing} /><FormField label="Titulo bloque inicial" value={form.introTitle} onChange={(event) => update('introTitle', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Texto bloque inicial" value={form.introText} onChange={(event) => update('introText', event.target.value)} required readOnly={!isEditing} /></div></Card>
          <Card><h2>Bizum</h2><div className="admin-form admin-form-wide"><FormField label="Titulo Bizum" value={form.bizumTitle} onChange={(event) => update('bizumTitle', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Texto Bizum" value={form.bizumText} onChange={(event) => update('bizumText', event.target.value)} required readOnly={!isEditing} /><FormField label="Codigo Bizum" value={form.bizumCode} onChange={(event) => update('bizumCode', event.target.value)} required readOnly={!isEditing} /><FormField label="Texto boton Bizum" value={form.bizumButtonLabel} onChange={(event) => update('bizumButtonLabel', event.target.value)} required readOnly={!isEditing} /></div></Card>
          <Card><h2>Transferencia bancaria</h2><div className="admin-form admin-form-wide"><FormField label="Titulo transferencia" value={form.bankTitle} onChange={(event) => update('bankTitle', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Texto transferencia" value={form.bankText} onChange={(event) => update('bankText', event.target.value)} required readOnly={!isEditing} /><FormField label="Titular" value={form.bankAccountHolder} onChange={(event) => update('bankAccountHolder', event.target.value)} required readOnly={!isEditing} /><FormField label="IBAN" value={form.bankIban} onChange={(event) => update('bankIban', event.target.value)} required readOnly={!isEditing} /><FormField label="Concepto" value={form.bankConcept} onChange={(event) => update('bankConcept', event.target.value)} required readOnly={!isEditing} /><FormField label="Texto boton copiar" value={form.copyButtonLabel} onChange={(event) => update('copyButtonLabel', event.target.value)} required readOnly={!isEditing} /></div></Card>
          <Card><h2>Transparencia</h2><div className="admin-form admin-form-wide"><FormField label="Titulo transparencia" value={form.transparencyTitle} onChange={(event) => update('transparencyTitle', event.target.value)} required readOnly={!isEditing} /><TextAreaField label="Items de transparencia (uno por linea)" value={transparencyTexts[languageCode] ?? ''} onChange={(event) => updateTransparency(event.target.value)} required readOnly={!isEditing} /><FormField label="Texto final" value={form.footerText} onChange={(event) => update('footerText', event.target.value)} required readOnly={!isEditing} /></div></Card>
        </form>
      </Card>
      <Modal title="Donativos guardados" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}><p>{successModal}</p><div className="modal-actions"><Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button></div></Modal>
    </section>
  );
}

function validateDonationContent(content: DonationContent) { return [validateRequired(content.title, 'Titulo'), validateRequired(content.subtitle, 'Subtitulo'), validateRequired(content.bizumCode, 'Codigo Bizum'), validateRequired(content.bankAccountHolder, 'Titular'), validateRequired(content.bankIban, 'IBAN')].find(Boolean) ?? ''; }
