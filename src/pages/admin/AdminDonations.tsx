import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase, defaultDonationContent } from '../../data/supabaseRepository';
import type { DonationContent } from '../../domain/types';
import { validateRequired } from '../../lib/validation';

const donationContentKey = 'donation_content';

interface SiteSettingRow {
  key: string;
  value_json: unknown;
}

export function AdminDonations() {
  const [form, setForm] = useState<DonationContent>(defaultDonationContent);
  const [transparencyText, setTransparencyText] = useState(defaultDonationContent.transparencyItems.join('\n'));
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successModal, setSuccessModal] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    adminRepository.listSiteSettings()
      .then((rows) => {
        const setting = (rows as unknown as SiteSettingRow[]).find((item) => item.key === donationContentKey);
        const content = normalizeDonationContent(setting?.value_json);
        setForm(content);
        setTransparencyText(content.transparencyItems.join('\n'));
      })
      .catch(() => setError('No se pudo cargar la configuracion de donativos.'))
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof DonationContent, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    const validationError = validateDonationContent(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      await adminRepository.saveSiteSetting(donationContentKey, {
        ...form,
        transparencyItems: transparencyText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      });
      setSuccessModal('Configuracion de donativos guardada correctamente.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la configuracion de donativos.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura Supabase para editar los donativos." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Donativos</h1>
      {error ? <ErrorState message={error} /> : null}
      <form className="stack-form" onSubmit={save}>
        <Card>
          <h2>Cabecera</h2>
          <div className="admin-form admin-form-wide">
            <FormField label="Titulo" value={form.title} onChange={(event) => update('title', event.target.value)} required />
            <TextAreaField label="Subtitulo" value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} required />
            <FormField label="Titulo bloque inicial" value={form.introTitle} onChange={(event) => update('introTitle', event.target.value)} required />
            <TextAreaField label="Texto bloque inicial" value={form.introText} onChange={(event) => update('introText', event.target.value)} required />
          </div>
        </Card>

        <Card>
          <h2>Bizum</h2>
          <div className="admin-form admin-form-wide">
            <FormField label="Titulo Bizum" value={form.bizumTitle} onChange={(event) => update('bizumTitle', event.target.value)} required />
            <TextAreaField label="Texto Bizum" value={form.bizumText} onChange={(event) => update('bizumText', event.target.value)} required />
            <FormField label="Codigo Bizum" value={form.bizumCode} onChange={(event) => update('bizumCode', event.target.value)} required />
            <FormField label="Texto boton Bizum" value={form.bizumButtonLabel} onChange={(event) => update('bizumButtonLabel', event.target.value)} required />
          </div>
        </Card>

        <Card>
          <h2>Transferencia bancaria</h2>
          <div className="admin-form admin-form-wide">
            <FormField label="Titulo transferencia" value={form.bankTitle} onChange={(event) => update('bankTitle', event.target.value)} required />
            <TextAreaField label="Texto transferencia" value={form.bankText} onChange={(event) => update('bankText', event.target.value)} required />
            <FormField label="Titular" value={form.bankAccountHolder} onChange={(event) => update('bankAccountHolder', event.target.value)} required />
            <FormField label="IBAN" value={form.bankIban} onChange={(event) => update('bankIban', event.target.value)} required />
            <FormField label="Concepto" value={form.bankConcept} onChange={(event) => update('bankConcept', event.target.value)} required />
            <FormField label="Texto boton copiar" value={form.copyButtonLabel} onChange={(event) => update('copyButtonLabel', event.target.value)} required />
          </div>
        </Card>

        <Card>
          <h2>Transparencia</h2>
          <div className="admin-form admin-form-wide">
            <FormField label="Titulo transparencia" value={form.transparencyTitle} onChange={(event) => update('transparencyTitle', event.target.value)} required />
            <TextAreaField label="Items de transparencia (uno por linea)" value={transparencyText} onChange={(event) => setTransparencyText(event.target.value)} required />
            <FormField label="Texto final" value={form.footerText} onChange={(event) => update('footerText', event.target.value)} required />
          </div>
        </Card>

        <div className="admin-title-row">
          <span />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar donativos'}</Button>
        </div>
      </form>

      <Modal title="Donativos guardados" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}>
        <p>{successModal}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button>
        </div>
      </Modal>
    </section>
  );
}

function normalizeDonationContent(value: unknown): DonationContent {
  if (!value || typeof value !== 'object') return defaultDonationContent;
  return { ...defaultDonationContent, ...(value as Partial<DonationContent>) };
}

function validateDonationContent(content: DonationContent) {
  return [
    validateRequired(content.title, 'Titulo'),
    validateRequired(content.subtitle, 'Subtitulo'),
    validateRequired(content.bizumCode, 'Codigo Bizum'),
    validateRequired(content.bankAccountHolder, 'Titular'),
    validateRequired(content.bankIban, 'IBAN')
  ].find(Boolean) ?? '';
}
