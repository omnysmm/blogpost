// TikTok Content Posting API v2 — real video publish
// OAuth access_token in blogpost_socials[apiKey]; accountId = open_id (optional).

import { loadSocialCreds, resolveMediaBase64, postSocialJson } from './socialConfig';

export interface TiktokPublishResult {
  success: boolean;
  publishId?: string;
  error?: string;
}

interface TtCreds {
  token: string;
  openId: string;
}

function getTtCreds(): TtCreds | null {
  const c = loadSocialCreds('tiktok');
  if (!c) return null;
  return { token: c.token, openId: c.accountId || '' };
}

function extractVideoSrc(html: string): string | undefined {
  const m = (html || '').match(/<video\b[^>]*?\bsrc\s*=\s*(["'])([\s\S]*?)\1/i);
  return m?.[2]?.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * Publish a video to TikTok.
 * Content Posting API requires a video (PULL_FROM_URL or FILE_UPLOAD).
 */
export async function publishToTiktok(
  title: string,
  content: string,
  videoUrl?: string | null
): Promise<TiktokPublishResult> {
  const creds = getTtCreds();
  if (!creds?.token) {
    return {
      success: false,
      error: 'TikTok не подключён. Добавьте access_token в Настройки → Соцсети → TikTok.',
    };
  }

  const text = [title, content].filter(Boolean).join('\n\n').trim().slice(0, 2200);

  if (!videoUrl || !String(videoUrl).trim()) {
    return {
      success: false,
      error: 'Для публикации в TikTok нужен видеофайл (MP4/WebM/MOV). Текст/фото TikTok API не принимает.',
    };
  }

  const src = String(videoUrl).trim();
  const isHttp = /^https?:\/\//i.test(src);

  // Prefer PULL_FROM_URL when we have a public URL (TikTok pulls it server-side)
  if (isHttp) {
    try {
      const data = await postSocialJson('/api/tiktok/publish', {
        accessToken: creds.token,
        openId: creds.openId || undefined,
        title: text,
        videoUrl: src,
        mode: 'pull',
      });
      if (data?.success || data?.publishId) {
        return { success: true, publishId: data.publishId || data.publish_id };
      }
      if (data?.error && !data.fallback_upload) {
        // fall through to FILE_UPLOAD only when proxy says so
      }
    } catch {
      /* try file upload */
    }
  }

  // FILE_UPLOAD — send bytes to proxy
  const media = await resolveMediaBase64(src);
  if (!media?.base64) {
    return { success: false, error: 'Не удалось прочитать видеофайл для TikTok' };
  }

  try {
    const data = await postSocialJson('/api/tiktok/publish', {
      accessToken: creds.token,
      openId: creds.openId || undefined,
      title: text,
      videoBase64: media.base64,
      videoMime: media.mime || 'video/mp4',
      mode: 'upload',
    });
    if (data?.success || data?.publishId) {
      return { success: true, publishId: data.publishId || data.publish_id };
    }
    return { success: false, error: data?.error || 'TikTok publish failed' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'TikTok publish failed' };
  }
}

/** GET /v2/user/info/ — verifies the OAuth token. */
export async function testTiktokConnection(): Promise<{ ok: boolean; label?: string; error?: string }> {
  const creds = getTtCreds();
  if (!creds?.token) return { ok: false, error: 'Нет access_token' };

  try {
    const data = await postSocialJson('/api/tiktok/user', {
      accessToken: creds.token,
      openId: creds.openId || undefined,
    });
    const user = data?.data?.user;
    if (user?.display_name || user?.username) {
      return { ok: true, label: user.display_name || user.username };
    }
    if (data?.error) return { ok: false, error: String(data.error) };
    return { ok: true, label: 'TikTok' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'TikTok API error' };
  }
}

export function pickVideoFromHtml(html: string): string | undefined {
  return extractVideoSrc(html);
}
