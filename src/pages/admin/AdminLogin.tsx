import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { ErrorState } from '../../components/ui/States';
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
    } catch {
      setError('No se pudo iniciar sesion. Revisa las credenciales y la configuracion de Supabase.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={`${import.meta.env.BASE_URL}brand/logo-horizontal-placeholder.svg`} alt="Vive Utrera" />
        <h1>Administracion</h1>
        {!isSupabaseConfigured ? (
          <p className="hint">Modo maqueta: se acepta cualquier correo y contrasena hasta configurar Supabase.</p>
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        <FormField label="Correo" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <FormField label="Contrasena" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando' : 'Entrar'}</Button>
      </form>
    </main>
  );
}
