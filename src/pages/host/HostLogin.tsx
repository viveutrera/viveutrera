import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { ErrorState } from '../../components/ui/States';
import { publicPath } from '../../lib/routing';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../routes/authContext';

export function HostLogin() {
  const { isAuthenticated, isHost, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  if (isAuthenticated && isHost) return <Navigate to="/host" replace />;

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
      </form>
    </main>
  );
}
