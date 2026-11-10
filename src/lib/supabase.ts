import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// VITE_SUPABASE_URL='same-origin' → resolve at runtime to window.location.origin
// (used when supabase-lite serves the SPA and the API from the same folder, so the
// build stays domain-agnostic and needs no rebuild when a domain is attached later).
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl =
  rawUrl === 'same-origin' && typeof window !== 'undefined' && window.location.protocol.startsWith('http')
    ? window.location.origin
    : rawUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// createClient throws when URL is empty — use a placeholder so the app can run without keys
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
