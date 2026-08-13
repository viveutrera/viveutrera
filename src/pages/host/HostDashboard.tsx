import { useEffect, useState, type FormEvent } from 'react';
import { Clipboard, LogOut, Play, Plus, Square, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/States';
import { tourRepository } from '../../data/supabaseRepository';
import type { Tour } from '../../domain/types';
import { publicPath } from '../../lib/routing';
import { subscribeToTourPresence } from '../../lib/realtimeTourService';
import { useAuth } from '../../routes/authContext';

export function HostDashboard() {
  const { signOut, userEmail, userRole } = useAuth();
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [tourName, setTourName] = useState('');
  const [finishTourId, setFinishTourId] = useState<string>();
  const [deleteTourId, setDeleteTourId] = useState<string>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const rows = await tourRepository.listMyTours();
    setTours(rows);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los tours.');
      setLoading(false);
    });
  }, []);

  async function createTour(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const tour = await tourRepository.createTour(tourName);
      setCreateOpen(false);
      setTourName('');
      setMessage(`Tour creado. Codigo: ${tour.code}`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el tour.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteTour() {
    if (!deleteTourId) return;
    setSubmitting(true);
    setError('');
    try {
      await tourRepository.deleteTour(deleteTourId);
      setDeleteTourId(undefined);
      setMessage('Tour borrado correctamente.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el tour.');
    } finally {
      setSubmitting(false);
    }
  }

  async function startTour(id: string) {
    setSubmitting(true);
    setError('');
    try {
      await tourRepository.startTour(id);
      setMessage('Tour iniciado. El codigo ya admite participantes.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar el tour.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmFinishTour() {
    if (!finishTourId) return;
    setSubmitting(true);
    setError('');
    try {
      await tourRepository.finishTour(finishTourId);
      setFinishTourId(undefined);
      setMessage('Tour finalizado. El codigo ya no admite participantes.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo finalizar el tour.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`Codigo ${code} copiado.`);
    } catch {
      setError('No se pudo copiar el codigo. Seleccionalo manualmente.');
    }
  }

  if (isLoading) return <LoadingState label="Cargando tours" />;

  return (
    <main className="host-page">
      <header className="host-header">
        <Link to="/preview" className="host-brand" aria-label="Vive Utrera">
          <img src={publicPath('brand/logo-vive-utrera.png')} alt="" />
          <span><strong>VIVE</strong> UTRERA</span>
        </Link>
        <Button type="button" variant="ghost" icon={<LogOut size={18} />} onClick={signOut}>Salir</Button>
      </header>
      <section className="host-hero">
        <p>{userRole === 'admin' ? 'Acceso administrador' : 'Acceso anfitrion'}</p>
        <h1>Mis tours</h1>
        <span>{userEmail}</span>
      </section>
      <section className="host-grid">
        <Card className="host-action-card">
          <Plus size={28} />
          <div>
            <h2>Nuevo tour</h2>
            <p>Crea un codigo aleatorio para compartir con los participantes.</p>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)} disabled={isSubmitting}>Crear tour</Button>
        </Card>
      </section>
      {error ? <div className="state state-error">{error}</div> : null}
      <section className="host-tour-list" aria-label="Tours del anfitrion">
        {tours.length === 0 ? <Card><p>No tienes tours creados todavia.</p></Card> : null}
        {tours.map((tour) => {
          const isExpiredActive = tour.status === 'active' && isTourExpired(tour);
          const displayStatus = isExpiredActive ? 'expired' : tour.status;
          return (
          <Card className="host-tour-card" key={tour.id}>
            <div className="host-tour-card-top">
              <span className={`tour-status tour-status-${displayStatus}`}>{statusLabel(tour.status, isExpiredActive)}</span>
              <div className="host-tour-code-row">
                <strong className="tour-code">{tour.code}</strong>
                <button className="icon-button tour-copy-button" type="button" onClick={() => copyCode(tour.code)} aria-label={`Copiar codigo ${tour.code}`}>
                  <Clipboard size={18} />
                </button>
              </div>
            </div>
            <div className="host-tour-card-body">
              <div>
                <span>Nombre</span>
                <strong>{tour.name ?? 'Sin nombre'}</strong>
              </div>
              <div>
                <span>Creado por</span>
                <strong>{tour.hostName ?? tour.hostEmail ?? 'Anfitrion'}</strong>
              </div>
              <div>
                <span>Caduca</span>
                <strong>{formatDate(tour.expiresAt)}</strong>
              </div>
              <div>
                <span>Participantes</span>
                {tour.status === 'active' && !isExpiredActive ? <ConnectedParticipants tourId={tour.id} /> : <strong>No activo</strong>}
              </div>
            </div>
            <div className="host-tour-actions">
              {tour.status === 'draft' ? <Button type="button" className="host-tour-start-button" icon={<Play size={18} />} onClick={() => startTour(tour.id)} disabled={isSubmitting}>Iniciar</Button> : null}
              {tour.status === 'active' && !isExpiredActive ? <Button type="button" className="host-tour-finish-button" icon={<Square size={18} />} onClick={() => setFinishTourId(tour.id)} disabled={isSubmitting}>Finalizar</Button> : null}
              <Button type="button" variant="danger" icon={<Trash2 size={18} />} onClick={() => setDeleteTourId(tour.id)} disabled={isSubmitting}>Borrar</Button>
            </div>
          </Card>
          );
        })}
      </section>
      <Modal title="Crear tour" isOpen={isCreateOpen} onClose={() => setCreateOpen(false)}>
        <form className="stack-form modal-form" onSubmit={createTour}>
          <label className="form-field">
            <span>Nombre del tour</span>
            <input value={tourName} onChange={(event) => setTourName(event.target.value)} maxLength={120} placeholder="Opcional" />
          </label>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear tour'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(finishTourId)}
        title="Finalizar tour"
        message="El tour dejara de admitir participantes y no se podran enviar nuevas indicaciones."
        confirmLabel="Finalizar"
        onCancel={() => setFinishTourId(undefined)}
        onConfirm={confirmFinishTour}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTourId)}
        title="Borrar tour"
        message="Se borrara el tour y sus eventos asociados. Esta accion no se puede deshacer."
        confirmLabel="Borrar"
        onCancel={() => setDeleteTourId(undefined)}
        onConfirm={confirmDeleteTour}
      />
      <Modal title="Aviso" isOpen={Boolean(message)} onClose={() => setMessage('')}>
        <p>{message}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setMessage('')}>Aceptar</Button>
        </div>
      </Modal>
    </main>
  );
}

function ConnectedParticipants({ tourId }: { tourId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => subscribeToTourPresence(tourId, `host-${tourId}`, setCount), [tourId]);

  return <small className="tour-presence">Participantes conectados: {Math.max(0, count - 1)}</small>;
}

function statusLabel(status: Tour['status'], isExpiredActive = false) {
  if (isExpiredActive) return 'Caducado';
  if (status === 'active') return 'Activo';
  if (status === 'finished') return 'Finalizado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Borrador';
}

function isTourExpired(tour: Tour) {
  return Number.isFinite(new Date(tour.expiresAt).getTime()) && new Date(tour.expiresAt).getTime() <= Date.now();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
