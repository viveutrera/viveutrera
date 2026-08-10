import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { matchesSearch, validateRequired } from '../../lib/validation';

interface HostProfileRow {
  user_id: string;
  email: string;
  display_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyCreateForm = { email: '', displayName: '', active: true };

export function AdminHosts() {
  const [items, setItems] = useState<HostProfileRow[]>([]);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editingHost, setEditingHost] = useState<HostProfileRow>();
  const [deleteHost, setDeleteHost] = useState<HostProfileRow>();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [successModal, setSuccessModal] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await adminRepository.listHostProfiles();
    setItems(rows as unknown as HostProfileRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los anfitriones.');
      setLoading(false);
    });
  }, []);

  async function createHost(event: FormEvent) {
    event.preventDefault();
    setError('');
    const validationError = validateHostForm(createForm.email, createForm.displayName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.createHostProfile(createForm);
      setCreateForm(emptyCreateForm);
      setCreateOpen(false);
      setSuccessModal('Anfitrion creado. Supabase enviara una invitacion o enlace para establecer la contrasena al correo indicado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el anfitrion.');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateHost(event: FormEvent) {
    event.preventDefault();
    if (!editingHost) return;
    setError('');
    const nameError = validateRequired(editingHost.display_name, 'Nombre');
    if (nameError) {
      setError(nameError);
      return;
    }
    setSubmitting(true);
    try {
      await adminRepository.updateHostProfile({
        user_id: editingHost.user_id,
        display_name: editingHost.display_name.trim(),
        active: editingHost.active
      });
      setEditingHost(undefined);
      setSuccessModal('Anfitrion actualizado correctamente.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar el anfitrion.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteHost() {
    if (!deleteHost) return;
    setSubmitting(true);
    setError('');
    try {
      await adminRepository.deleteHostProfile(deleteHost.user_id);
      setDeleteHost(undefined);
      setSuccessModal('Anfitrion borrado correctamente.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el anfitrion.');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = items.filter((item) => matchesSearch([item.display_name, item.email, item.active ? 'activo' : 'inactivo'], search));

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura Supabase para gestionar anfitriones reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Anfitriones</h1>
      {error ? <ErrorState message={error} /> : null}
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar anfitriones</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, email o estado" />
        </label>
        <Button type="button" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Crear anfitrion</Button>
      </div>
      <div className="admin-data-table admin-data-table-hosts" role="table" aria-label="Anfitriones">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Creado</span>
          <span role="columnheader">Actualizado</span>
          <span role="columnheader" aria-label="Acciones" />
        </div>
        {filtered.map((item) => (
          <div className="admin-data-row" role="row" key={item.user_id}>
            <span role="cell"><strong>{item.display_name}</strong></span>
            <span role="cell">{item.email}</span>
            <span role="cell">{item.active ? 'Activo' : 'Inactivo'}</span>
            <span role="cell">{formatDate(item.created_at)}</span>
            <span role="cell">{formatDate(item.updated_at)}</span>
            <span className="row-actions" role="cell">
              <button className="icon-button" type="button" aria-label={`Editar ${item.display_name}`} onClick={() => setEditingHost(item)}><Pencil size={18} /></button>
              <button className="icon-button icon-button-danger" type="button" aria-label={`Borrar ${item.display_name}`} onClick={() => setDeleteHost(item)}><Trash2 size={18} /></button>
            </span>
          </div>
        ))}
      </div>
      <Modal title="Crear anfitrion" isOpen={isCreateOpen} onClose={() => setCreateOpen(false)}>
        <form className="stack-form modal-form" onSubmit={createHost}>
          <div className="admin-form">
            <FormField label="Nombre" value={createForm.displayName} onChange={(event) => setCreateForm({ ...createForm, displayName: event.target.value })} required />
            <FormField label="Email" type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} required />
            <label className="check-field"><input type="checkbox" checked={createForm.active} onChange={(event) => setCreateForm({ ...createForm, active: event.target.checked })} /> Activo</label>
          </div>
          <p className="hint">No se define contrasena aqui. La Edge Function enviara una invitacion para que el anfitrion establezca la suya.</p>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear anfitrion'}</Button>
          </div>
        </form>
      </Modal>
      <Modal title="Editar anfitrion" isOpen={Boolean(editingHost)} onClose={() => setEditingHost(undefined)}>
        {editingHost ? (
          <form className="stack-form modal-form" onSubmit={updateHost}>
            <div className="admin-form">
              <FormField label="Nombre" value={editingHost.display_name} onChange={(event) => setEditingHost({ ...editingHost, display_name: event.target.value })} required />
              <FormField label="Email" value={editingHost.email} readOnly />
              <label className="check-field"><input type="checkbox" checked={editingHost.active} onChange={(event) => setEditingHost({ ...editingHost, active: event.target.checked })} /> Activo</label>
            </div>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setEditingHost(undefined)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          </form>
        ) : null}
      </Modal>
      <Modal title="Operacion completada" isOpen={Boolean(successModal)} onClose={() => setSuccessModal('')}>
        <p>{successModal}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setSuccessModal('')}>Aceptar</Button>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteHost)}
        title="Borrar anfitrion"
        message={`Se borrara ${deleteHost?.display_name ?? 'este anfitrion'} de Authentication/Users y de profiles. Sus tours tambien quedaran eliminados por cascada.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteHost(undefined)}
        onConfirm={confirmDeleteHost}
      />
    </section>
  );
}

function validateHostForm(email: string, displayName: string) {
  const nameError = validateRequired(displayName, 'Nombre');
  if (nameError) return nameError;
  const emailError = validateRequired(email, 'Email');
  if (emailError) return emailError;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'Email no valido.';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
