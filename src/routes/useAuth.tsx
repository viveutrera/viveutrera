import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mockEmail, setMockEmail] = useState(() => supabase ? undefined : sessionStorage.getItem('mock-admin-email') ?? undefined);
  const [isLoading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase!.auth.getSession();
      const email = data.session?.user.email;
      if (email && data.session?.user.id) {
        const { data: profile } = await supabase!
          .from('admin_profiles')
          .select('user_id')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        if (isMounted && profile) {
          setMockEmail(email);
        } else {
          sessionStorage.removeItem('mock-admin-email');
          await supabase!.auth.signOut();
          if (isMounted) setMockEmail(undefined);
        }
      } else {
        sessionStorage.removeItem('mock-admin-email');
        if (isMounted) setMockEmail(undefined);
      }
      if (isMounted) setLoading(false);
    }

    void loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadSession();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isLoading,
    isAuthenticated: Boolean(mockEmail),
    userEmail: mockEmail,
    async signIn(email, password) {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('No se pudo iniciar sesion con Supabase.');
        const { data: profile, error: profileError } = await supabase
          .from('admin_profiles')
          .select('user_id')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (profileError || !profile) {
          await supabase.auth.signOut();
          throw new Error('El usuario no esta autorizado como administrador.');
        }
        sessionStorage.removeItem('mock-admin-email');
        setMockEmail(email);
        return;
      }
      sessionStorage.setItem('mock-admin-email', email);
      setMockEmail(email);
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      sessionStorage.removeItem('mock-admin-email');
      setMockEmail(undefined);
    }
  }), [isLoading, mockEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
