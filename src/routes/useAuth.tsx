import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext, type AuthContextValue, type UserRole } from './authContext';

interface ProfileAuth {
  email: string;
  role: UserRole;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mockEmail, setMockEmail] = useState(() => supabase ? undefined : sessionStorage.getItem('mock-admin-email') ?? undefined);
  const [userRole, setUserRole] = useState<UserRole | undefined>(() => supabase ? undefined : 'admin');
  const [isLoading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase!.auth.getSession();
      const email = data.session?.user.email;
      if (email && data.session?.user.id) {
        const profile = await loadAuthorizedProfile(data.session.user.id, email);

        if (isMounted && profile) {
          setMockEmail(profile.email);
          setUserRole(profile.role);
        } else {
          sessionStorage.removeItem('mock-admin-email');
          await supabase!.auth.signOut();
          if (isMounted) setMockEmail(undefined);
          if (isMounted) setUserRole(undefined);
        }
      } else {
        sessionStorage.removeItem('mock-admin-email');
        if (isMounted) setMockEmail(undefined);
        if (isMounted) setUserRole(undefined);
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
    isAdmin: userRole === 'admin',
    isHost: userRole === 'host' || userRole === 'admin',
    userEmail: mockEmail,
    userRole,
    async signIn(email, password, allowedRoles = ['admin']) {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('No se pudo iniciar sesion con Supabase.');
        const profile = await loadAuthorizedProfile(data.user.id, data.user.email ?? email);
        if (!profile || !allowedRoles.includes(profile.role)) {
          await supabase.auth.signOut();
          throw new Error(allowedRoles.includes('host') ? 'El usuario no esta autorizado como anfitrion.' : 'El usuario no esta autorizado como administrador.');
        }
        sessionStorage.removeItem('mock-admin-email');
        setMockEmail(profile.email);
        setUserRole(profile.role);
        return;
      }
      sessionStorage.setItem('mock-admin-email', email);
      setMockEmail(email);
      setUserRole('admin');
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      sessionStorage.removeItem('mock-admin-email');
      setMockEmail(undefined);
      setUserRole(undefined);
    }
  }), [isLoading, mockEmail, userRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function loadAuthorizedProfile(userId: string, fallbackEmail: string): Promise<ProfileAuth | undefined> {
  if (!supabase) return undefined;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, role, active')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profileError && profile?.active && (profile.role === 'admin' || profile.role === 'host')) {
    return { email: profile.email ?? fallbackEmail, role: profile.role };
  }

  const { data: legacyProfile, error: legacyError } = await supabase
    .from('admin_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!legacyError && legacyProfile) return { email: fallbackEmail, role: 'admin' };
  return undefined;
}
