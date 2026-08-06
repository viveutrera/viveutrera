import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { validateOptionalUrl, validateRequired } from '../../lib/validation';
import {
  CollaboratorFields,
  type CollaboratorForm,
  type CollaboratorRow,
  type LanguageRow,
  type MediaAssetRow,
  type TranslationForm
} from './AdminCollaborators';

export function AdminCollaboratorEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<CollaboratorRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [form, setForm] = useState<CollaboratorForm>();
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
      adminRepository.listCollaborators(),
      adminRepository.listLanguages(),
      adminRepository.listMediaAssets()
    ]).then(([collaboratorRows, languageRows, mediaRows]) => {
      const nextItems = collaboratorRows as unknown as CollaboratorRow[];
      const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
      const collaborator = nextItems.find((item) => item.id === id);
      setItems(nextItems);
      setLanguages(nextLanguages);
      setMediaAssets((mediaRows as unknown as MediaAssetRow[]).filter((asset) => asset.media_type === 'logo' || asset.media_type === 'image'));
      setForm(collaborator ? {
        name: collaborator.name,
        media_asset_id: collaborator.media_asset_id ?? '',
        url: collaborator.url ?? '',
        sort_order: collaborator.sort_order,
        is_active: collaborator.is_active,
        is_special: collaborator.is_special,
        translations: nextLanguages.map((language) => {
          const saved = collaborator.collaborator_translations?.find((translation) => translation.language_id === language.id || getCode(translation.languages) === language.code);
          return {
            language_id: language.id,
            display_name: saved?.display_name ?? '',
            thank_you_text: saved?.thank_you_text ?? ''
          };
        })
      } : undefined);
    }).catch(() => setError('No se pudo cargar el colaborador.')).finally(() => setLoading(false));
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError('');
    setSuccess('');
    const validationError = validateCollaborator(form, languages);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveCollaborator({ id, ...form, name: form.name.trim(), url: form.url.trim(), media_asset_id: form.media_asset_id || null });
      setSuccess('Colaborador guardado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el colaborador.');
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

  if (!id) return <Navigate to="/admin/colaboradores" replace />;
  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar colaboradores reales." />;
  if (isLoading) return <LoadingState />;
  if (!form || !items.some((item) => item.id === id)) return <EmptyState title="Colaborador no encontrado" message="Vuelve al listado y selecciona otro colaborador." />;

  return (
    <section className="admin-section">
      <div className="admin-title-row">
        <h1>Editar colaborador</h1>
        <Button type="button" variant="ghost" onClick={() => navigate('/admin/colaboradores')}>Volver</Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="stack-form" onSubmit={submit}>
          <CollaboratorFields form={form} languages={languages} mediaAssets={mediaAssets} onChange={setForm} onTranslationChange={updateTranslation} />
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

function validateCollaborator(candidate: CollaboratorForm, languages: LanguageRow[]) {
  const nameError = validateRequired(candidate.name, 'Nombre interno');
  if (nameError) return nameError;
  const urlError = validateOptionalUrl(candidate.url, 'La URL');
  if (urlError) return urlError;
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  return validateRequired(spanishTranslation?.display_name, `Nombre visible en ${spanish?.native_name ?? 'el idioma principal'}`);
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}
