import { createContext, useContext } from 'react';

export type UserRole = 'admin' | 'host';

export interface AuthContextValue {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isHost: boolean;
  isLoading: boolean;
  userEmail?: string;
  userRole?: UserRole;
  signIn: (email: string, password: string, allowedRoles?: UserRole[]) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
