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
  const [isPasswordRecovery, setPasswordRecovery] = useState(() => isPasswordRecoveryUrl());
  const [isLoading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;
    if (isPasswordRecoveryUrl()) setPasswordRecovery(true);

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

    async function initializeAuth() {
      await processPasswordRecoveryUrl();
      await loadSession();
    }

    void initializeAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
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
    isPasswordRecovery,
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
      setPasswordRecovery(false);
    },
    async resetPassword(email) {
      if (!email.trim()) throw new Error('Indica el correo para restaurar la contrasena.');
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/host/login`
        });
        if (error) throw new Error('No se pudo enviar el correo de restauracion.');
      }
    },
    async updatePassword(password) {
      if (password.trim().length < 8) throw new Error('La nueva contrasena debe tener al menos 8 caracteres.');
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error('No se pudo actualizar la contrasena.');
        await supabase.auth.signOut();
      }
      setMockEmail(undefined);
      setUserRole(undefined);
      setPasswordRecovery(false);
    }
  }), [isLoading, isPasswordRecovery, mockEmail, userRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isPasswordRecoveryUrl() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('type') === 'recovery') return true;
  if (isHostLoginPath() && params.has('code')) return true;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  return hashParams.get('type') === 'recovery';
}

async function processPasswordRecoveryUrl() {
  if (!supabase || typeof window === 'undefined' || !isPasswordRecoveryUrl()) return;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn('No se pudo intercambiar el codigo de recuperacion.', error);
    cleanRecoveryUrl();
    return;
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) console.warn('No se pudo activar la sesion de recuperacion.', error);
    cleanRecoveryUrl();
  }
}

function cleanRecoveryUrl() {
  window.history.replaceState(null, '', window.location.pathname);
}

function isHostLoginPath() {
  return window.location.pathname.endsWith('/host/login');
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
