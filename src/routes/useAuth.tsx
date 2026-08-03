import { useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mockEmail, setMockEmail] = useState(() => sessionStorage.getItem('mock-admin-email') ?? undefined);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: Boolean(mockEmail),
    userEmail: mockEmail,
    async signIn(email, password) {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('No se pudo iniciar sesion con Supabase.');
      }
      sessionStorage.setItem('mock-admin-email', email);
      setMockEmail(email);
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      sessionStorage.removeItem('mock-admin-email');
      setMockEmail(undefined);
    }
  }), [mockEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
