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
export function initiateOAuth(network: SocialNetwork): void {
  const config = NETWORK_CONFIG[network];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('Supabase not configured. OAuth connection unavailable.');
    return;
  }

  // Redirect to Supabase Edge Function which handles OAuth flow
  const redirectUrl = `${supabaseUrl}/functions/v1/social-oauth?network=${network}&redirect=${encodeURIComponent(window.location.origin)}`;
  window.location.href = redirectUrl;
}

// ═══ Get Connected Accounts ═══
export async function getConnectedAccounts(userId: string): Promise<SocialAccount[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    // Return mock data for development
    return [
      { network: 'vk', accountName: 'Моя страница VK', connected: true, connectedAt: '2024-03-01' },
      { network: 'telegram', accountName: '@mychannel', connected: true, connectedAt: '2024-03-05' },
    ];
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

  if (!supabaseUrl) {
    // Mock: simulate successful publish
    await new Promise(resolve => setTimeout(resolve, 500));
    return { postId: `mock-${Date.now()}` };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/social-publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ userId, network, ...options }),
  });

  if (!response.ok) throw new Error(`Publish to ${network} failed`);
  return response.json();
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