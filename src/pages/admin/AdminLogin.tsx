import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { ErrorState } from '../../components/ui/States';
import { publicPath } from '../../lib/routing';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../routes/authContext';

export function AdminLogin() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/admin';
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesion. Revisa las credenciales y la configuracion de Supabase.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src={publicPath('brand/logo-vive-utrera.png')} alt="Vive Utrera" />
          <strong>VIVE UTRERA</strong>
          <span>ADMINISTRACIÓN</span>
        </div>
        {!isSupabaseConfigured ? (
          <p className="hint">Modo maqueta: se acepta cualquier correo y contraseña hasta configurar Supabase.</p>
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        <FormField label="Correo" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <FormField label="Contraseña" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando' : 'Entrar'}</Button>
      </form>
      <Link className="login-guide-link" to="/guia/es">Ir a la guia</Link>
    </main>
  );
}
