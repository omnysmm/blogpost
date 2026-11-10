// Social accounts: Supabase `social_accounts` is the source of truth.
// localStorage['blogpost_socials'] is kept only as an offline mirror so the
// sync readers (socialConfig, publishers) keep working without a round-trip.
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SocialEntry {
  network: string;
  connected?: boolean;
  method?: 'api' | 'manual' | null;
  apiKey?: string;
  accountId?: string;
  name?: string;
  login?: string;
  autoPublish?: boolean;
}

export const SOCIALS_CACHE_KEY = 'blogpost_socials';

const NETWORKS = ['vk', 'telegram', 'youtube', 'instagram', 'tiktok', 'ok', 'rutube'] as const;

// ── Offline mirror ──

export function readSocialsCache(): SocialEntry[] {
  try {
    const raw = localStorage.getItem(SOCIALS_CACHE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeSocialsCache(list: SocialEntry[]): void {
  try {
    localStorage.setItem(SOCIALS_CACHE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('writeSocialsCache failed', e);
  }
}

/** Sync read for publishers — always served from the offline mirror. */
export function getSocialEntry(network: string): SocialEntry | null {
  return readSocialsCache().find(s => s.network === network) || null;
}

// ── Supabase sync ──

function toRow(userId: string, e: SocialEntry) {
  return {
    user_id: userId,
    network: e.network,
    account_name: e.name || e.login || e.network,
    account_id: e.accountId || '',
    access_token: e.apiKey || null,
    connected: e.connected ?? false,
    config: {
      method: e.method ?? null,
      login: e.login || '',
      autoPublish: e.autoPublish ?? false,
    },
  };
}

function fromRow(r: any): SocialEntry {
  const cfg = (r.config && typeof r.config === 'object' ? r.config : {}) as any;
  return {
    network: r.network,
    connected: !!r.connected,
    method: cfg.method ?? null,
    apiKey: r.access_token || '',
    accountId: r.account_id || '',
    name: r.account_name || undefined,
    login: cfg.login || undefined,
    autoPublish: !!cfg.autoPublish,
  };
}

async function pushSocials(userId: string, list: SocialEntry[]): Promise<void> {
  // One upsert per network keeps rows unique on (user_id, network).
  for (const e of list.filter(s => NETWORKS.includes(s.network as any))) {
    const { error } = await supabase.from('social_accounts').upsert(toRow(userId, e), {
      onConflict: 'user_id,network',
    });
    if (error) throw new Error(`social_accounts upsert (${e.network}): ${error.message}`);
  }
}

/**
 * Load social credentials: Supabase first, mirror to localStorage.
 * One-time repair — push mirror-only entries that never reached Supabase.
 */
export async function hydrateSocials(userId: string): Promise<SocialEntry[]> {
  const mirror = readSocialsCache();
  if (!isSupabaseConfigured) return mirror;

  try {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('network, account_name, account_id, access_token, connected, config')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);

    const remote = (data || []).map(fromRow);
    if (remote.length > 0) {
      writeSocialsCache(remote);
      return remote;
    }

    // Supabase empty but the mirror has data — migrate it once.
    if (mirror.length > 0) {
      await pushSocials(userId, mirror);
    }
    return mirror;
  } catch (e) {
    console.error('hydrateSocials failed, using offline mirror:', e);
    return mirror;
  }
}

/**
 * Persist the full list: Supabase first (awaited, errors surface to the caller),
 * then refresh the offline mirror. No fire-and-forget.
 */
export async function saveSocials(userId: string | null, list: SocialEntry[]): Promise<void> {
  if (userId && isSupabaseConfigured) {
    await pushSocials(userId, list);
  }
  writeSocialsCache(list);
}

/** Disconnect one network in Supabase + mirror. */
export async function removeSocial(userId: string | null, network: string): Promise<void> {
  if (userId && isSupabaseConfigured) {
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('network', network);
    if (error) throw new Error(`social_accounts delete (${network}): ${error.message}`);
  }
  writeSocialsCache(readSocialsCache().map(s => (s.network === network ? { ...s, connected: false, apiKey: '' } : s)));
}
