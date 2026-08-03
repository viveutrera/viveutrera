import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, TextAreaField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

const emptySettings = {
  hero_title: '',
  hero_slogan: '',
  hero_description: '',
  city_title: '',
  city_text: '',
  language_card_text: '',
  language_card_button: '',
  seo_title: '',
  seo_description: ''
};

export function AdminSettings() {
  const [form, setForm] = useState(emptySettings);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    adminRepository.getSpanishSiteTranslation()
      .then((data) => {
        if (data) {
          setForm({
            hero_title: data.hero_title ?? '',
            hero_slogan: data.hero_slogan ?? '',
            hero_description: data.hero_description ?? '',
            city_title: data.city_title ?? '',
            city_text: data.city_text ?? '',
            language_card_text: data.language_card_text ?? '',
            language_card_button: data.language_card_button ?? '',
            seo_title: data.seo_title ?? '',
            seo_description: data.seo_description ?? ''
          });
        }
      })
      .catch(() => setError('No se pudo cargar la configuracion.'))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await adminRepository.saveSpanishSiteTranslation(form);
      setSuccess('Configuracion guardada. El siguiente despliegue o recarga publica leera estos datos.');
    } catch {
      setError('No se pudo guardar la configuracion.');
    }
  }

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas antes de editar contenido real." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Configuracion</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="admin-form admin-form-wide" onSubmit={submit}>
          <FormField label="Titulo hero" value={form.hero_title} onChange={(event) => setForm({ ...form, hero_title: event.target.value })} required />
          <FormField label="Eslogan hero" value={form.hero_slogan} onChange={(event) => setForm({ ...form, hero_slogan: event.target.value })} required />
          <TextAreaField label="Descripcion hero" value={form.hero_description} onChange={(event) => setForm({ ...form, hero_description: event.target.value })} required />
          <FormField label="Titulo ciudad" value={form.city_title} onChange={(event) => setForm({ ...form, city_title: event.target.value })} required />
          <TextAreaField label="Texto ciudad" value={form.city_text} onChange={(event) => setForm({ ...form, city_text: event.target.value })} required />
          <TextAreaField label="Texto tarjeta idioma" value={form.language_card_text} onChange={(event) => setForm({ ...form, language_card_text: event.target.value })} required />
          <FormField label="Boton tarjeta idioma" value={form.language_card_button} onChange={(event) => setForm({ ...form, language_card_button: event.target.value })} required />
          <FormField label="SEO titulo" value={form.seo_title} onChange={(event) => setForm({ ...form, seo_title: event.target.value })} required />
          <TextAreaField label="SEO descripcion" value={form.seo_description} onChange={(event) => setForm({ ...form, seo_description: event.target.value })} required />
          <Button type="submit">Guardar configuracion</Button>
        </form>
      </Card>
    </section>
  );
}
