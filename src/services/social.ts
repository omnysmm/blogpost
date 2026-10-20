// Social Media Integration Service
// Real publish goes through vk/telegram/youtube/tiktok/ok/rutube/instagram services.
// This module is a thin dispatcher used by higher-level flows.

export type SocialNetwork = 'vk' | 'telegram' | 'youtube' | 'instagram' | 'tiktok' | 'ok' | 'rutube';

interface SocialAccount {
  network: SocialNetwork;
  accountName: string;
  connected: boolean;
  connectedAt?: string;
}

interface PublishOptions {
  content: string;
  title?: string;
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
    console.warn('Telegram connects via Bot token in Settings → Соцсети');
    return;
  }

  const params = new URLSearchParams({
    network,
    redirect: window.location.origin + '/#/settings',
  });
  if (userId) params.set('user_id', userId);
  window.location.href = `${supabaseUrl}/functions/v1/social-oauth?${params}`;
}

// ═══ Get Connected Accounts ═══
export async function getConnectedAccounts(_userId: string): Promise<SocialAccount[]> {
  try {
    const raw = localStorage.getItem('blogpost_socials');
    if (!raw) return [];
    const list = JSON.parse(raw) as Array<{
      network: string;
      name?: string;
      login?: string;
      connected?: boolean;
      connectedAt?: string;
    }>;
    return list.map(s => ({
      network: s.network as SocialNetwork,
      accountName: s.login || s.name || s.network,
      connected: !!s.connected,
      connectedAt: s.connectedAt,
    }));
  } catch {
    return [];
  }
}

export async function disconnectAccount(_userId: string, network: SocialNetwork): Promise<boolean> {
  try {
    const raw = localStorage.getItem('blogpost_socials');
    if (!raw) return false;
    const list = JSON.parse(raw) as any[];
    const next = list.map(s => (s.network === network ? { ...s, connected: false, apiKey: '' } : s));
    localStorage.setItem('blogpost_socials', JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

// ═══ Publish Content (real publishers) ═══
export async function publishContent(_userId: string, options: PublishOptions): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  const title = options.title || 'BlogPost';
  const content = options.content || '';

  for (const network of options.networks) {
    try {
      let ok = false;
      let postId: string | undefined;
      let error: string | undefined;

      if (network === 'telegram') {
        const { publishToTelegram } = await import('./telegram');
        const r = await publishToTelegram(title, content, options.imageUrl);
        ok = r.success; postId = r.messageId != null ? String(r.messageId) : undefined; error = r.error;
      } else if (network === 'vk') {
        const { publishToVk } = await import('./vk');
        const r = await publishToVk(title, content, options.imageUrl);
        ok = r.success; postId = r.postId; error = r.error;
      } else if (network === 'youtube') {
        const { publishToYoutube } = await import('./youtube');
        const r = await publishToYoutube(title, content, options.videoUrl);
        ok = r.success; postId = r.videoId; error = r.error;
      } else if (network === 'tiktok') {
        const { publishToTiktok } = await import('./tiktok');
        const r = await publishToTiktok(title, content, options.videoUrl);
        ok = r.success; postId = r.publishId; error = r.error;
      } else if (network === 'ok') {
        const { publishToOk } = await import('./ok');
        const r = await publishToOk(title, content, options.imageUrl);
        ok = r.success; postId = r.postId; error = r.error;
      } else if (network === 'rutube') {
        const { publishToRutube } = await import('./rutube');
        const r = await publishToRutube(title, content, options.videoUrl);
        ok = r.success; postId = r.videoId; error = r.error;
      } else if (network === 'instagram') {
        const { publishToInstagram } = await import('./instagram');
        const r = await publishToInstagram(title, content, options.imageUrl, options.videoUrl);
        ok = r.success; postId = r.mediaId; error = r.error;
      } else {
        error = `Unknown network: ${network}`;
      }

      results.push({ network, success: ok, postId, error });
    } catch (error: any) {
      results.push({ network, success: false, error: error?.message || 'publish failed' });
    }
  }

  return results;
}

// ═══ Schedule Publication ═══
export async function schedulePublication(userId: string, postId: string, scheduledAt: Date, networks: SocialNetwork[]): Promise<boolean> {
  try {
    const { updatePost } = await import('./crud');
    await updatePost(postId, {
      scheduledAt: scheduledAt.toISOString(),
      socialNetworks: networks,
      status: 'scheduled',
    } as any);
    return true;
  } catch (e) {
    console.warn('schedulePublication failed', e);
    return false;
  }
}
