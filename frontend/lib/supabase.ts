import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

let _supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      // In dev/setup mode before keys are provided, initialize with mock/safe placeholder
      _supabaseClient = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseAnonKey || 'placeholder-anon-key'
      );
    } else {
      _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
  }
  return _supabaseClient;
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Resolves the appropriate redirect URL for Supabase Auth flows (signup confirmation, password reset).
 * - In local development (localhost/127.0.0.1), preserves http://localhost:3000
 * - In production, uses NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL if defined, otherwise window.location.origin
 * - Removes any trailing slashes before appending path
 */
export function getAuthRedirectUrl(path: string = ''): string {
  let origin = '';

  if (typeof window !== 'undefined' && window.location?.origin) {
    const isLocalhost = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      origin = window.location.origin;
    } else {
      // In production / deployed environments, prefer explicit site URL if set, otherwise current origin
      const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
      origin = configuredSiteUrl?.trim() || window.location.origin;
    }
  } else {
    // Fallback for SSR or non-browser contexts
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    origin = configuredSiteUrl?.trim() || 'http://localhost:3000';
  }

  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${cleanOrigin}${cleanPath}`;
}
