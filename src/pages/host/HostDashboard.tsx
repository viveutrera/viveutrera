import { useEffect, useState } from 'react';
import { Clipboard, LogOut, Play, Plus, Square } from 'lucide-react';
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
  const [finishTourId, setFinishTourId] = useState<string>();
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

  async function createTour() {
    setSubmitting(true);
    setError('');
    try {
      const tour = await tourRepository.createTour();
      setMessage(`Tour creado. Codigo: ${tour.code}`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el tour.');
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
          <Button type="button" onClick={createTour} disabled={isSubmitting}>Crear tour</Button>
        </Card>
      </section>
      {error ? <div className="state state-error">{error}</div> : null}
      <section className="host-tour-list" aria-label="Tours del anfitrion">
        {tours.length === 0 ? <Card><p>No tienes tours creados todavia.</p></Card> : null}
        {tours.map((tour) => (
          <Card className="host-tour-card" key={tour.id}>
            <div>
              <p className={`tour-status tour-status-${tour.status}`}>{statusLabel(tour.status)}</p>
              <strong className="tour-code">{tour.code}</strong>
              <small>Caduca: {formatDate(tour.expiresAt)}</small>
              {tour.status === 'active' ? <ConnectedParticipants tourId={tour.id} /> : null}
            </div>
            <div className="host-tour-actions">
              <Button type="button" variant="secondary" icon={<Clipboard size={18} />} onClick={() => copyCode(tour.code)}>Copiar</Button>
              {tour.status === 'draft' ? <Button type="button" icon={<Play size={18} />} onClick={() => startTour(tour.id)} disabled={isSubmitting}>Iniciar</Button> : null}
              {tour.status === 'active' ? <Button type="button" variant="danger" icon={<Square size={18} />} onClick={() => setFinishTourId(tour.id)} disabled={isSubmitting}>Finalizar</Button> : null}
            </div>
          </Card>
        ))}
      </section>
      <ConfirmDialog
        isOpen={Boolean(finishTourId)}
        title="Finalizar tour"
        message="El tour dejara de admitir participantes y no se podran enviar nuevas indicaciones."
        confirmLabel="Finalizar"
        onCancel={() => setFinishTourId(undefined)}
        onConfirm={confirmFinishTour}
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

function statusLabel(status: Tour['status']) {
  if (status === 'active') return 'Activo';
  if (status === 'finished') return 'Finalizado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Borrador';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
