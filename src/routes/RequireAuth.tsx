import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/ui/States';
import { useAuth } from './authContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Comprobando sesion" />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return children;
}
