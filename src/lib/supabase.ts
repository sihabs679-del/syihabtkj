import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface AppRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configured: boolean;
  serviceRoleConfigured: boolean;
  directDbConfigured?: boolean;
}

let cachedClient: SupabaseClient | null = null;
let cachedConfig: AppRuntimeConfig | null = null;

export async function fetchAppConfig(): Promise<AppRuntimeConfig> {
  if (cachedConfig) return cachedConfig;

  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

  try {
    const res = await fetch('/api/config');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const serverConfig = (await res.json()) as AppRuntimeConfig;
      const supabaseUrl = serverConfig.supabaseUrl || envUrl;
      const supabaseAnonKey = serverConfig.supabaseAnonKey || envAnonKey;
      cachedConfig = {
        supabaseUrl,
        supabaseAnonKey,
        configured: Boolean(supabaseUrl && supabaseAnonKey),
        serviceRoleConfigured: Boolean(serverConfig.serviceRoleConfigured),
        directDbConfigured: Boolean(serverConfig.directDbConfigured),
      };
      return cachedConfig;
    }
  } catch {
    // Fallback to Vite env if /api/config is unreachable
  }

  cachedConfig = {
    supabaseUrl: envUrl,
    supabaseAnonKey: envAnonKey,
    configured: Boolean(envUrl && envAnonKey),
    serviceRoleConfigured: false,
    directDbConfigured: false,
  };
  return cachedConfig;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (cachedClient) return cachedClient;
  const config = await fetchAppConfig();
  if (!config.configured) return null;

  cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

export async function getAccessToken(): Promise<string | null> {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token || null;
}

export function formatDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTimeShort(isoStr: string | null): string {
  if (!isoStr) return '—';
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
