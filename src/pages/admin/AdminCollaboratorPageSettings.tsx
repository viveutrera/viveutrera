import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import {
  adminRepository,
  canUseSupabase,
  collaboratorsPageContentKey,
  defaultCollaboratorsPageContent,
  normalizeCollaboratorsPageContent
} from '../../data/supabaseRepository';
import type { CollaboratorsPageContent } from '../../domain/types';
import { validateRequired } from '../../lib/validation';

interface SiteSettingRow {
  key: string;
  value_json: unknown;
}

export function AdminCollaboratorPageSettings() {
  const [form, setForm] = useState<CollaboratorsPageContent>(defaultCollaboratorsPageContent);
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
        const setting = (rows as unknown as SiteSettingRow[]).find((item) => item.key === collaboratorsPageContentKey);
        setForm(normalizeCollaboratorsPageContent(setting?.value_json));
      })
      .catch(() => setError('No se pudo cargar la configuracion de la pagina de colaboradores.'))
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof CollaboratorsPageContent, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    const validationError = validateCollaboratorsPageContent(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      await adminRepository.saveSiteSetting(collaboratorsPageContentKey, { ...form });
      setSuccessModal('Textos de colaboradores guardados correctamente.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la configuracion de colaboradores.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura Supabase para editar los textos de colaboradores." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Textos colaboradores</h1>
      {error ? <ErrorState message={error} /> : null}
      <form className="stack-form" onSubmit={save}>
        <Card>
          <h2>Cabecera</h2>
          <div className="admin-form admin-form-wide">
            <FormField label="Titulo" value={form.title} onChange={(event) => update('title', event.target.value)} required />
            <TextAreaField label="Subtitulo" value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} required />
          </div>
        </Card>

        <Card>
          <h2>Listas de colaboradores</h2>
          <div className="admin-form admin-form-wide">
            <TextAreaField label="Texto cuando no hay colaboradores especiales" value={form.specialSectionEmptyText} onChange={(event) => update('specialSectionEmptyText', event.target.value)} required />
            <TextAreaField label="Texto cuando no hay colaboradores generales" value={form.generalSectionEmptyText} onChange={(event) => update('generalSectionEmptyText', event.target.value)} required />
          </div>
        </Card>

        <Card>
          <h2>Bloque de llamada</h2>
          <div className="admin-form admin-form-wide">
            <FormField label="Titulo" value={form.calloutTitle} onChange={(event) => update('calloutTitle', event.target.value)} required />
            <TextAreaField label="Texto" value={form.calloutText} onChange={(event) => update('calloutText', event.target.value)} required />
            <FormField label="Texto boton" value={form.calloutButtonLabel} onChange={(event) => update('calloutButtonLabel', event.target.value)} required />
          </div>
        </Card>

        <Card>
          <h2>Cierre</h2>
          <div className="admin-form admin-form-wide">
            <FormField label="Texto final" value={form.closingText} onChange={(event) => update('closingText', event.target.value)} required />
          </div>
        </Card>

        <div className="admin-title-row">
          <span />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar textos'}</Button>
        </div>
      </form>

      <Modal title="Textos guardados" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}>
        <p>{successModal}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button>
        </div>
      </Modal>
    </section>
  );
}

function validateCollaboratorsPageContent(content: CollaboratorsPageContent) {
  return [
    validateRequired(content.title, 'Titulo'),
    validateRequired(content.subtitle, 'Subtitulo'),
    validateRequired(content.calloutTitle, 'Titulo del bloque de llamada'),
    validateRequired(content.calloutButtonLabel, 'Texto boton'),
    validateRequired(content.closingText, 'Texto final')
  ].find(Boolean) ?? '';
}
