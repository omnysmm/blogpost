// Centralized auth: Supabase email/password + custom OAuth (VK, Yandex, OK)
// No Google — RU providers only, per product requirements.
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, UserRole, Subscription } from '../store/types';

export type SocialProvider = 'vk' | 'yandex' | 'ok';

export const SOCIAL_LOGIN_PROVIDERS: Array<{
  id: SocialProvider;
  name: string;
  nameRu: string;
  color: string;
  textColor: string;
}> = [
  { id: 'vk', name: 'VK', nameRu: 'ВКонтакте', color: '#0077FF', textColor: '#fff' },
  { id: 'yandex', name: 'Yandex', nameRu: 'Яндекс', color: '#FC3F1D', textColor: '#fff' },
  { id: 'ok', name: 'OK', nameRu: 'Одноклассники', color: '#EE8208', textColor: '#fff' },
];

export interface AuthResult {
  ok: boolean;
  user?: User;
  error?: string;
  needsEmailConfirm?: boolean;
}

/** Map Supabase auth user + profiles row to app User. */
export function mapProfile(row: Record<string, any>): User {
  return {
    id: row.id,
    name: row.name || row.email || '',
    email: row.email || '',
    role: (row.role as UserRole) || 'user',
    subscription: (row.subscription as Subscription) || 'free',
    registeredAt: row.created_at || new Date().toISOString(),
    freeTrialEnd: row.free_trial_end || undefined,
    avatar: row.avatar_url || undefined,
  };
}

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return mapProfile(data);
}

/** Ensure a profiles row exists (trigger should create it; this is a safety net). */
async function ensureProfile(userId: string, name: string, email: string): Promise<User | null> {
  let profile = await fetchProfile(userId);
  if (profile) return profile;

  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    name: name || email,
    email,
  });
  if (error) {
    console.error('ensureProfile failed:', error);
    return null;
  }
  return fetchProfile(userId);
}

// ═══ Email / password ═══

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  // Dev admin shortcut (works without Supabase)
  if (email.trim().toLowerCase() === 'admin@admin.ru' && password === 'admin') {
    const admin: User = {
      id: 'admin-1',
      name: 'Администратор',
      email: 'admin@admin.ru',
      role: 'admin',
      subscription: 'premium',
      registeredAt: new Date().toISOString(),
    };
    return { ok: true, user: admin };
  }

  if (!isSupabaseConfigured) {
    return { ok: false, error: 'supabase_not_configured' };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, error: error?.message || 'invalid_credentials' };
  }
  const user = await ensureProfile(data.user.id, data.user.user_metadata?.name || '', data.user.email || email);
  if (!user) return { ok: false, error: 'profile_load_failed' };
  return { ok: true, user };
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'supabase_not_configured' };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data.user) return { ok: false, error: 'signup_failed' };

  // If email confirmation is on, session is null until confirmed
  if (!data.session) {
    return { ok: true, needsEmailConfirm: true, error: 'email_confirmation_required' };
  }

  const user = await ensureProfile(data.user.id, name, email);
  if (!user) return { ok: false, error: 'profile_load_failed' };
  return { ok: true, user };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'supabase_not_configured' };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/auth`,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}

// ═══ Session restore ═══

export async function getSessionUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  const authUser = data.session?.user;
  if (!authUser) return null;
  return ensureProfile(authUser.id, authUser.user_metadata?.name || '', authUser.email || '');
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  if (!isSupabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session?.user) {
      callback(null);
      return;
    }
    const user = await ensureProfile(
      session.user.id,
      session.user.user_metadata?.name || '',
      session.user.email || ''
    );
    callback(user);
  });
  return () => data.subscription.unsubscribe();
}

// ═══ Social OAuth (VK / Yandex / OK) ═══

/**
 * Redirect to Supabase Edge Function `social-auth`, which runs the OAuth
 * code flow with the provider and returns a Supabase session via magic-link OTP.
 */
export function signInWithSocial(provider: SocialProvider): void {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.warn('Supabase not configured — social login unavailable');
    return;
  }
  const redirect = `${window.location.origin}/#/auth`;
  const fnUrl = `${supabaseUrl}/functions/v1/social-auth?provider=${provider}&redirect=${encodeURIComponent(redirect)}`;
  window.location.href = fnUrl;
}

/**
 * Complete social login after Edge Function redirects back with OTP.
 * Expected query/hash params: `token` (email_otp) and `email`.
 */
export async function completeSocialLogin(email: string, token: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'supabase_not_configured' };
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    email,
    token,
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message || 'social_login_failed' };
  }
  const user = await ensureProfile(
    data.user.id,
    data.user.user_metadata?.name || '',
    data.user.email || email
  );
  if (!user) return { ok: false, error: 'profile_load_failed' };
  return { ok: true, user };
}

/** Parse social-login callback params from URL (hash or search). */
export function parseSocialCallback(): { email: string; token: string } | null {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : hash);
  const search = new URLSearchParams(window.location.search);
  const email = params.get('email') || search.get('email') || '';
  const token = params.get('token') || search.get('token') || '';
  if (email && token) return { email, token };
  return null;
}
