// Social Media Integration Service
// Handles OAuth connections and publishing to social networks

export type SocialNetwork = 'vk' | 'telegram' | 'youtube' | 'instagram' | 'tiktok' | 'ok' | 'rutube';

interface SocialAccount {
  network: SocialNetwork;
  accountName: string;
  connected: boolean;
  connectedAt?: string;
}

interface PublishOptions {
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  scheduledAt?: Date;
  networks: SocialNetwork[];
}

interface PublishResult {
  network: SocialNetwork;
  success: boolean;
  postId?: string;
  error?: string;
}

// ═══ Network Configurations ═══
export const NETWORK_CONFIG: Record<SocialNetwork, { name: string; color: string; icon: string; oauthUrl: string }> = {
  vk: { name: 'VK', color: '#0077FF', icon: 'vk', oauthUrl: 'https://oauth.vk.com/authorize' },
  telegram: { name: 'Telegram', color: '#26A5E4', icon: 'telegram', oauthUrl: 'https://t.me' },
  youtube: { name: 'YouTube', color: '#FF0000', icon: 'youtube', oauthUrl: 'https://accounts.google.com/o/oauth2/auth' },
  instagram: { name: 'Instagram', color: '#E1306C', icon: 'instagram', oauthUrl: 'https://www.facebook.com/v18.0/dialog/oauth' },
  tiktok: { name: 'TikTok', color: '#010101', icon: 'tiktok', oauthUrl: 'https://www.tiktok.com/auth/authorize' },
  ok: { name: 'ОК', color: '#EE8208', icon: 'ok', oauthUrl: 'https://connect.ok.ru/oauth' },
  rutube: { name: 'Rutube', color: '#0ECF6C', icon: 'rutube', oauthUrl: 'https://rutube.ru/auth' },
};

// ═══ OAuth Connection ═══
export function initiateOAuth(network: SocialNetwork, userId?: string): void {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('Supabase not configured. OAuth connection unavailable.');
    return;
  }

  if (network === 'telegram') {
    // Telegram uses Bot API token in Settings — no OAuth redirect
    console.warn('Telegram connects via Bot token in Settings → Соцсети');
    return;
  }

  // Redirect to Supabase Edge Function which handles OAuth flow
  const params = new URLSearchParams({
    network,
    redirect: window.location.origin + '/#/settings',
  });
  if (userId) params.set('user_id', userId);
  window.location.href = `${supabaseUrl}/functions/v1/social-oauth?${params}`;
}

// ═══ Get Connected Accounts ═══
export async function getConnectedAccounts(userId: string): Promise<SocialAccount[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    // Offline: read SettingsPage localStorage
    try {
      const raw = localStorage.getItem('blogpost_socials');
      if (!raw) return [];
      return (JSON.parse(raw) as any[])
        .filter((s) => s.connected)
        .map((s) => ({
          network: s.network,
          accountName: s.login || s.name || s.network,
          connected: true,
        }));
    } catch {
      return [];
    }
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/social_accounts?user_id=eq.${userId}&select=network,account_name,connected,connected_at`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });
    const data = await response.json();
    return data.map((acc: any) => ({
      network: acc.network,
      accountName: acc.account_name,
      connected: acc.connected,
      connectedAt: acc.connected_at,
    }));
  } catch {
    return [];
  }
}

// ═══ Disconnect Account ═══
export async function disconnectAccount(userId: string, network: SocialNetwork): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    await fetch(`${supabaseUrl}/rest/v1/social_accounts?user_id=eq.${userId}&network=eq.${network}`, {
      method: 'DELETE',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ═══ Publish Content ═══
export async function publishContent(userId: string, options: PublishOptions): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  for (const network of options.networks) {
    try {
      const result = await publishToNetwork(userId, network, options);
      results.push({ network, success: true, postId: result.postId });
    } catch (error: any) {
      results.push({ network, success: false, error: error.message });
    }
  }

  return results;
}

async function publishToNetwork(userId: string, network: SocialNetwork, options: PublishOptions): Promise<{ postId?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Telegram has a dedicated, proven path
  if (network === 'telegram') {
    const { publishToTelegram } = await import('./telegram');
    const title = options.content.slice(0, 80).replace(/\n+/g, ' ');
    const body = options.content;
    const result = await publishToTelegram(title, body, options.imageUrl);
    if (!result.success) throw new Error(result.error || 'Telegram publish failed');
    return { postId: result.messageId != null ? String(result.messageId) : undefined };
  }

  if (!supabaseUrl) {
    // Dev-only: simulate so UI is testable without backend
    console.warn(`[dev] social-publish skipped for ${network} (no Supabase)`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return { postId: `local-${Date.now()}` };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/social-publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId,
      network,
      content: options.content,
      imageUrl: options.imageUrl,
      videoUrl: options.videoUrl,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error || `Publish to ${network} failed (${response.status})`);
  }
  return { postId: data.postId };
}

// ═══ Schedule Publication ═══
export async function schedulePublication(userId: string, postId: string, scheduledAt: Date, networks: SocialNetwork[]): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('Supabase not configured. Scheduling unavailable.');
    return false;
  }

  try {
    await fetch(`${supabaseUrl}/functions/v1/schedule-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, postId, scheduledAt: scheduledAt.toISOString(), networks }),
    });
    return true;
  } catch {
    return false;
  }
}

// ═══ Best Time to Publish ═══
export function getBestPublishTime(network: SocialNetwork): string {
  const bestTimes: Record<SocialNetwork, string> = {
    vk: '18:00-21:00',
    telegram: '09:00-11:00, 19:00-21:00',
    youtube: '14:00-16:00',
    instagram: '11:00-13:00, 19:00-21:00',
    tiktok: '07:00-09:00, 12:00-13:00, 19:00-22:00',
    ok: '19:00-22:00',
    rutube: '18:00-22:00',
  };
  return bestTimes[network] || '18:00-21:00';
}