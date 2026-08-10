import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { ErrorState } from '../../components/ui/States';
import { publicPath } from '../../lib/routing';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../routes/authContext';

export function HostLogin() {
  const { isAuthenticated, isHost, isPasswordRecovery, signIn, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  if (isAuthenticated && isHost && !isPasswordRecovery) return <Navigate to="/host" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password, ['host', 'admin']);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/host';
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesion como anfitrion.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(email);
      setNotice('Si el correo pertenece a un anfitrion, recibira un enlace para restaurar la contrasena.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo solicitar la restauracion.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await updatePassword(newPassword);
      setNotice('Contrasena actualizada correctamente. Ya puedes entrar como anfitrion.');
      setNewPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar la contrasena.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isPasswordRecovery) {
    return (
      <main className="login-page host-login-page">
        <form className="login-card" onSubmit={handleUpdatePassword}>
          <div className="login-brand">
            <img src={publicPath('brand/logo-vive-utrera.png')} alt="Vive Utrera" />
            <strong>VIVE UTRERA</strong>
            <span>NUEVA CONTRASENA</span>
          </div>
          {error ? <ErrorState message={error} /> : null}
          <FormField label="Nueva contrasena" name="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar nueva contrasena'}</Button>
        </form>
        <Modal title="Contrasena actualizada" isOpen={Boolean(notice)} onClose={() => setNotice('')}>
          <p>{notice}</p>
          <div className="modal-actions">
            <Button type="button" onClick={() => setNotice('')}>Aceptar</Button>
          </div>
        </Modal>
      </main>
    );
  }

  return (
    <main className="login-page host-login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src={publicPath('brand/logo-vive-utrera.png')} alt="Vive Utrera" />
          <strong>VIVE UTRERA</strong>
          <span>ANFITRIONES</span>
        </div>
        {!isSupabaseConfigured ? (
          <p className="hint">Modo maqueta: se acepta cualquier correo y contrasena hasta configurar Supabase.</p>
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        <FormField label="Correo" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <FormField label="Contrasena" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando...' : 'Entrar como anfitrion'}</Button>
        <button className="text-button" type="button" onClick={handleResetPassword} disabled={isSubmitting}>
          Restablecer contrasena
        </button>
      </form>
      <Modal title="Solicitud enviada" isOpen={Boolean(notice)} onClose={() => setNotice('')}>
        <p>{notice}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setNotice('')}>Aceptar</Button>
        </div>
      </Modal>
    </main>
  );
}
