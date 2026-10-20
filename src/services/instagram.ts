// Instagram Graph API (Content Publishing) — real photo/reel publish
// Creds in blogpost_socials:
//   apiKey    = access_token (instagram_basic + instagram_content_publish + pages_show_list)
//   accountId = ig_user_id (optional; auto-discovered from /me when empty)

import { loadSocialEntry, postSocialJson } from './socialConfig';

export interface InstagramPublishResult {
  success: boolean;
  mediaId?: string;
  error?: string;
}

interface IgCreds {
  token: string;
  igUserId: string;
}

function getIgCreds(): IgCreds | null {
  const entry = loadSocialEntry('instagram');
  if (!entry?.apiKey || !entry.apiKey.trim()) return null;
  return {
    token: entry.apiKey.trim(),
    igUserId: (entry.accountId || '').trim(),
  };
}

async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ access_token: token, ...params });
  return postSocialJson(`/api/instagram/graph?path=${encodeURIComponent(path)}&${qs.toString()}`, {});
}

async function graphPost(path: string, token: string, body: Record<string, unknown>) {
  return postSocialJson('/api/instagram/graph', {
    path,
    method: 'POST',
    access_token: token,
    ...body,
  });
}

/** Resolve IG user id from the token when accountId is empty. */
async function resolveIgUserId(creds: IgCreds): Promise<string | null> {
  if (creds.igUserId) return creds.igUserId;
  try {
    const data = await graphGet('/me', creds.token, {
      fields: 'instagram_business_account{id,username},instagram_scoped_user_id',
    });
    const id =
      data?.instagram_business_account?.id ||
      data?.instagram_scoped_user_id ||
      data?.id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

/**
 * Publish photo (image_url) or reel (video_url) to Instagram.
 * Instagram requires a PUBLIC https URL for media — data:/blob: will fail.
 */
export async function publishToInstagram(
  title: string,
  content: string,
  imageUrl?: string | null,
  videoUrl?: string | null
): Promise<InstagramPublishResult> {
  const creds = getIgCreds();
  if (!creds?.token) {
    return {
      success: false,
      error: 'Instagram не подключён. Добавьте access_token в Настройки → Соцсети → Instagram.',
    };
  }

  const caption = [title, content].filter(Boolean).join('\n\n').trim().slice(0, 2200);

  // Prefer video (Reels) when present, else photo
  const video = (videoUrl || '').trim();
  const photo = (imageUrl || '').trim();

  if (!video && !photo) {
    return {
      success: false,
      error: 'Для Instagram нужна публичная ссылка на фото или видео (https://). Текст без медиа Instagram API не принимает.',
    };
  }

  const mediaUrl = video || photo;
  if (!/^https?:\/\//i.test(mediaUrl) || mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:')) {
    return {
      success: false,
      error: 'Instagram требует публичную https-ссылку на медиа (не data:/blob:). Загрузите фото на хостинг или используйте URL изображения.',
    };
  }

  const igUserId = await resolveIgUserId(creds);
  if (!igUserId) {
    return {
      success: false,
      error: 'Не удалось определить Instagram Business ID. Укажите его в поле Account ID.',
    };
  }

  const isVideo = !!video;
  const container = await graphPost(`/${igUserId}/media`, creds.token, {
    [isVideo ? 'video_url' : 'image_url']: mediaUrl,
    caption,
    ...(isVideo ? { media_type: 'REELS' } : {}),
  });

  const creationId = container?.id;
  if (!creationId) {
    return {
      success: false,
      error: container?.error?.message || container?.error || 'Instagram media container failed',
    };
  }

  const published = await graphPost(`/${igUserId}/media_publish`, creds.token, {
    creation_id: creationId,
  });
  const mediaId = published?.id;
  if (!mediaId) {
    return {
      success: false,
      error: published?.error?.message || published?.error || 'Instagram publish failed',
    };
  }
  return { success: true, mediaId: String(mediaId) };
}

/** GET /{ig-user-id}?fields=id,username — connectivity check. */
export async function testInstagramConnection(): Promise<{ ok: boolean; label?: string; error?: string }> {
  const creds = getIgCreds();
  if (!creds?.token) return { ok: false, error: 'Нет access_token' };

  const igUserId = await resolveIgUserId(creds);
  if (!igUserId) {
    return {
      ok: false,
      error: 'Не удалось определить Instagram Business ID. Укажите его в Account ID.',
    };
  }

  try {
    const data = await graphGet(`/${igUserId}`, creds.token, { fields: 'id,username,name' });
    if (data?.error) {
      return { ok: false, error: data.error.message || data.error || 'Instagram API error' };
    }
    const label = data?.username || data?.name || `IG ${igUserId}`;
    return { ok: true, label };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Instagram API error' };
  }
}
