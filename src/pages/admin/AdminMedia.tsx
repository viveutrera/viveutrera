import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField } from '../../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { mediaUrl } from '../../lib/media';
import { matchesSearch, validateRequired } from '../../lib/validation';

interface MediaAssetRow {
  id?: string;
  object_key: string;
  media_type: 'image' | 'audio' | 'logo' | 'file';
  mime_type: string;
  original_name: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
}

const emptyMedia: MediaAssetRow = {
  object_key: '',
  media_type: 'image',
  mime_type: 'image/webp',
  original_name: '',
  file_size: 0,
  width: null,
  height: null,
  duration_seconds: null
};

export function AdminMedia() {
  const [items, setItems] = useState<MediaAssetRow[]>([]);
  const [form, setForm] = useState<MediaAssetRow>(emptyMedia);
  const [deleteId, setDeleteId] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const rows = await adminRepository.listMediaAssets();
    setItems(rows as unknown as MediaAssetRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudo cargar la biblioteca multimedia.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateMedia(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveMediaAsset({
        ...form,
        object_key: form.object_key.trim().replace(/^\/+/, ''),
        mime_type: form.mime_type.trim(),
        original_name: form.original_name.trim() || form.object_key.split('/').pop() || form.object_key,
        width: form.width || null,
        height: form.height || null,
        duration_seconds: form.duration_seconds || null
      });
      setForm(emptyMedia);
      setSuccess('Asset guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el asset.');
    } finally {
      setSubmitting(false);
    }
  }

  function edit(item: MediaAssetRow) {
    setError('');
    setSuccess('');
    setForm(item);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteMediaAsset(deleteId);
      setDeleteId(undefined);
      setSuccess('Asset borrado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el asset. Puede estar asociado a elementos o colaboradores.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(emptyMedia);
    setError('');
  }

  const filteredItems = items.filter((item) => (
    matchesSearch([item.object_key, item.original_name, item.mime_type, item.media_type], search)
    && (typeFilter === 'all' || item.media_type === typeFilter)
  ));
  const selectedAsset = items.find((item) => item.id === deleteId);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para registrar multimedia real." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Multimedia</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <Card>
        <form className="admin-form" onSubmit={submit}>
          <FormField label="Object key" value={form.object_key} onChange={(event) => setForm({ ...form, object_key: event.target.value })} required />
          <SelectField label="Tipo" value={form.media_type} onChange={(event) => setForm({ ...form, media_type: event.target.value as MediaAssetRow['media_type'] })}>
            <option value="image">Imagen</option>
            <option value="logo">Logo</option>
            <option value="audio">Audio</option>
            <option value="file">Archivo</option>
          </SelectField>
          <FormField label="MIME" value={form.mime_type} onChange={(event) => setForm({ ...form, mime_type: event.target.value })} required />
          <FormField label="Nombre original" value={form.original_name} onChange={(event) => setForm({ ...form, original_name: event.target.value })} />
          <FormField label="Tamano bytes" type="number" min="0" value={form.file_size} onChange={(event) => setForm({ ...form, file_size: Number(event.target.value) })} required />
          <FormField label="Ancho" type="number" min="0" value={form.width ?? ''} onChange={(event) => setForm({ ...form, width: event.target.value ? Number(event.target.value) : null })} />
          <FormField label="Alto" type="number" min="0" value={form.height ?? ''} onChange={(event) => setForm({ ...form, height: event.target.value ? Number(event.target.value) : null })} />
          <FormField label="Duracion segundos" type="number" min="0" value={form.duration_seconds ?? ''} onChange={(event) => setForm({ ...form, duration_seconds: event.target.value ? Number(event.target.value) : null })} />
          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Registrar asset'}</Button>
            {form.id ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button> : null}
          </div>
        </form>
      </Card>
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar multimedia</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por key, nombre, MIME o tipo" />
        </label>
        <select className="admin-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar multimedia por tipo">
          <option value="all">Todos los tipos</option>
          <option value="image">Imagenes</option>
          <option value="logo">Logos</option>
          <option value="audio">Audios</option>
          <option value="file">Archivos</option>
        </select>
      </div>
      <div className="admin-table">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <div className="media-admin-row">
              {item.media_type === 'image' || item.media_type === 'logo' ? <img src={mediaUrl(item.object_key)} alt="" loading="lazy" /> : <div className="media-admin-icon">{item.media_type}</div>}
              <div>
                <h2>{item.original_name || item.object_key}</h2>
                <p>{item.media_type} - {item.mime_type} - {item.object_key}</p>
              </div>
            </div>
            <div className="table-actions">
              <Button type="button" variant="secondary" onClick={() => edit(item)}>Editar</Button>
              <Button type="button" variant="ghost" onClick={() => window.open(mediaUrl(item.object_key), '_blank', 'noopener,noreferrer')}>Abrir</Button>
              <Button type="button" variant="danger" onClick={() => setDeleteId(item.id)}>Borrar</Button>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar asset"
        message={`Se eliminara el registro ${selectedAsset?.object_key ?? 'seleccionado'} de Supabase. No borra el archivo fisico de R2.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function validateMedia(candidate: MediaAssetRow) {
  const requiredError = [
    validateRequired(candidate.object_key, 'Object key'),
    validateRequired(candidate.mime_type, 'MIME')
  ].find(Boolean);

  if (requiredError) return requiredError;
  if (/^https?:\/\//i.test(candidate.object_key.trim())) return 'Object key debe ser una ruta del bucket, no una URL completa.';
  if (candidate.file_size < 0) return 'El tamano no puede ser negativo.';
  return '';
}
