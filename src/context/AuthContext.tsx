import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  fetchAppConfig,
  getSupabaseClient,
  type AppRuntimeConfig,
} from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  config: AppRuntimeConfig | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    nip?: string;
  }) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<AppRuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async (activeSession: Session | null, appConfig: AppRuntimeConfig | null) => {
    if (!activeSession?.user) {
      setProfile(null);
      return;
    }

    try {
      // First try server-side bootstrap which ensures the first user in Supabase Auth receives 'admin'
      if (appConfig?.serviceRoleConfigured) {
        const res = await fetch('/api/auth/bootstrap-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeSession.access_token}`,
          },
        });

        const payload = await res.json();
        if (res.ok && payload.profile) {
          setProfile(payload.profile as UserProfile);
          setAuthError(null);
          return;
        }
        if (payload?.error) {
          setAuthError(payload.error);
        }
      }

      // Fallback to direct client query (requires schema & trigger in Supabase)
      const client = await getSupabaseClient();
      if (!client) return;

      const { data: directProfile, error: directErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', activeSession.user.id)
        .maybeSingle();

      if (directErr) {
        setAuthError(directErr.message);
        return;
      }

      if (directProfile) {
        setProfile(directProfile as UserProfile);
        setAuthError(null);
      } else {
        // Fallback synthesized from auth metadata if trigger hasn't populated profiles yet
        const meta = activeSession.user.user_metadata || {};
        setProfile({
          id: activeSession.user.id,
          email: activeSession.user.email || '',
          full_name: meta.full_name || activeSession.user.email?.split('@')[0] || 'Pengguna',
          nip: meta.nip || '',
          role:
            meta.role === 'admin' || meta.role === 'guru' || meta.role === 'tenaga_kependidikan'
              ? meta.role
              : 'tenaga_kependidikan',
          jabatan: meta.jabatan || '',
          created_at: activeSession.user.created_at,
        });
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function initAuth() {
      try {
        const appConfig = await fetchAppConfig();
        if (!mounted) return;
        setConfig(appConfig);

        if (!appConfig.configured) {
          setLoading(false);
          return;
        }

        const client = await getSupabaseClient();
        if (!client || !mounted) {
          setLoading(false);
          return;
        }

        const { data } = await client.auth.getSession();
        if (!mounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session) {
          await loadUserProfile(data.session, appConfig);
        }

        const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
          if (!mounted) return;
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          if (nextSession) {
            await loadUserProfile(nextSession, appConfig);
          } else {
            setProfile(null);
          }
        });

        unsubscribe = () => listener.subscription.unsubscribe();
      } catch (err) {
        if (mounted) {
          setAuthError(err instanceof Error ? err.message : 'Gagal menginisialisasi autentikasi.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [loadUserProfile]);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    const client = await getSupabaseClient();
    if (!client) {
      return { error: 'Konfigurasi Supabase belum terpasang pada server.' };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      await loadUserProfile(data.session, config);
    }

    return { error: null };
  };

  const signUp = async ({
    email,
    password,
    fullName,
    nip,
  }: {
    email: string;
    password: string;
    fullName: string;
    nip?: string;
  }) => {
    setAuthError(null);
    const client = await getSupabaseClient();
    if (!client) {
      return { error: 'Konfigurasi Supabase belum terpasang pada server.' };
    }

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          nip: nip?.trim() || '',
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      await loadUserProfile(data.session, config);
      return { error: null, needsEmailConfirmation: false };
    }

    return { error: null, needsEmailConfirmation: true };
  };

  const signOut = async () => {
    const client = await getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  const refreshProfile = async () => {
    if (session) {
      await loadUserProfile(session, config);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        config,
        loading,
        authError,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
