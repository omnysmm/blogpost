// Shared social credentials from localStorage['blogpost_socials'] (Telegram-style fields)
// VK:        apiKey = access_token, accountId = owner_id (e.g. -123456 or 123)
// YouTube:   apiKey = access_token (OAuth), accountId = video privacy (public|unlisted|private) or channel title
// TikTok:    apiKey = access_token, accountId = open_id (optional)
// OK:        apiKey = access_token, accountId = "application_key|secret_key"
// Rutube:    apiKey = Rutube-Api-Key, accountId = '1' private / '0' public
// Instagram: apiKey = Graph access_token, accountId = ig_user_id (optional)

export type RealNetwork = 'vk' | 'youtube' | 'tiktok' | 'telegram' | 'ok' | 'rutube' | 'instagram';

export interface SocialCreds {
  token: string;
  accountId: string;
  name?: string;
}

export function loadSocialEntry(network: string): {
  connected: boolean;
  apiKey?: string;
  accountId?: string;
  name?: string;
} | null {
  try {
    const raw = localStorage.getItem('blogpost_socials');
    if (!raw) return null;
    const list = JSON.parse(raw) as Array<{
      network: string;
      connected?: boolean;
      apiKey?: string;
      accountId?: string;
      name?: string;
    }>;
    const found = list.find(s => s.network === network);
    if (!found) return null;
    return {
      connected: !!found.connected,
      apiKey: found.apiKey,
      accountId: found.accountId,
      name: found.name,
    };
  } catch {
    return null;
  }
}

export function loadSocialCreds(network: RealNetwork): SocialCreds | null {
  const entry = loadSocialEntry(network);
  if (!entry?.apiKey || !entry.apiKey.trim()) return null;
  return {
    token: entry.apiKey.trim(),
    accountId: (entry.accountId || '').trim(),
    name: entry.name,
  };
}

export function isNetworkReady(network: string): boolean {
  const entry = loadSocialEntry(network);
  return !!(entry?.connected && entry.apiKey && entry.apiKey.trim());
}

/** Resolve image src to base64 bytes (data:/blob:/http). */
export async function resolveImageBase64(imageUrl?: string | null): Promise<{ base64: string; mime: string; url?: string } | null> {
  if (!imageUrl) return null;
  const src = String(imageUrl).trim();
  if (!src) return null;

  const dataUrlToB64 = (s: string) => {
    const comma = s.indexOf(',');
    if (comma < 0) return null;
    const meta = s.slice(5, comma);
    const mime = (meta.split(';')[0] || 'image/jpeg').trim();
    const payload = s.slice(comma + 1);
    if (/;base64/i.test(meta)) return { base64: payload.replace(/\s/g, ''), mime };
    try {
      return { base64: btoa(decodeURIComponent(payload)), mime };
    } catch {
      return { base64: btoa(payload), mime };
    }
  };

  if (src.startsWith('data:')) return dataUrlToB64(src);

  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('FileReader failed'));
      r.readAsDataURL(blob);
    });
    const parsed = dataUrlToB64(dataUrl);
    return parsed ? { ...parsed, url: src.startsWith('http') ? src : undefined } : null;
  } catch {
    return null;
  }
}

/** Resolve a media URL to base64 (video for YT/TikTok). */
export async function resolveMediaBase64(mediaUrl?: string | null): Promise<{ base64: string; mime: string; url?: string } | null> {
  if (!mediaUrl) return null;
  const src = String(mediaUrl).trim();
  if (!src) return null;

  if (src.startsWith('data:')) {
    const comma = src.indexOf(',');
    if (comma < 0) return null;
    const meta = src.slice(5, comma);
    const mime = (meta.split(';')[0] || 'video/mp4').trim();
    const payload = src.slice(comma + 1);
    if (/;base64/i.test(meta)) return { base64: payload.replace(/\s/g, ''), mime };
    try {
      return { base64: btoa(decodeURIComponent(payload)), mime };
    } catch {
      return { base64: btoa(payload), mime };
    }
  }

  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('FileReader failed'));
      r.readAsDataURL(blob);
    });
    return resolveMediaBase64(dataUrl);
  } catch {
    return null;
  }
}

/** POST JSON to a same-origin social proxy path. */
export async function postSocialJson<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || `HTTP ${res.status}` };
  }
  if (!res.ok && !data?.error) data = { ...data, error: `HTTP ${res.status}` };
  return data as T;
}
