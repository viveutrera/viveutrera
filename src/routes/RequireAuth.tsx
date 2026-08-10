import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/ui/States';
import { useAuth, type UserRole } from './authContext';

export function RequireAuth({ children, roles = ['admin', 'host'], loginPath = '/admin/login' }: { children: ReactNode; roles?: UserRole[]; loginPath?: string }) {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Comprobando sesion" />;
  if (!isAuthenticated || !userRole || !roles.includes(userRole)) return <Navigate to={loginPath} replace state={{ from: location }} />;
  return children;
}
