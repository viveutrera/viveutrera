import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/ui/States';
import { defaultLanguageCode, getPersistedLanguage } from '../lib/language';
import { useAuth, type UserRole } from './authContext';

export function RequireAuth({ children, roles = ['admin', 'host'], loginPath = '/admin/login' }: { children: ReactNode; roles?: UserRole[]; loginPath?: string }) {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Comprobando sesion" />;
  if (!isAuthenticated || !userRole) return <Navigate to={loginPath} replace state={{ from: location }} />;
  if (!roles.includes(userRole)) return <UnauthorizedRoleRedirect />;
  return children;
}

function UnauthorizedRoleRedirect() {
  const navigate = useNavigate();
  const guideLanguage = getPersistedLanguage() ?? defaultLanguageCode;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      navigate(`/guia/${guideLanguage}`, { replace: true });
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [guideLanguage, navigate]);

  return (
    <main className="auth-feedback-page">
      <ErrorState
        title="Acceso no permitido"
        message="Tu usuario no tiene permisos para entrar en la administracion. Te redirigiremos a la guia en unos segundos."
      />
    </main>
  );
}
