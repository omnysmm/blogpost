// YouTube Data API v3 — real video upload (resumable)
// OAuth access_token stored in blogpost_socials[apiKey]; accountId = privacy status.

import { loadSocialCreds, resolveMediaBase64, postSocialJson } from './socialConfig';

export interface YoutubePublishResult {
  success: boolean;
  videoId?: string;
  url?: string;
  error?: string;
}

interface YtCreds {
  token: string;
  privacy: 'public' | 'unlisted' | 'private';
}

function getYtCreds(): YtCreds | null {
  const c = loadSocialCreds('youtube');
  if (!c) return null;
  const privacyRaw = (c.accountId || 'public').toLowerCase();
  const privacy = (['public', 'unlisted', 'private'].includes(privacyRaw) ? privacyRaw : 'public') as YtCreds['privacy'];
  return { token: c.token, privacy };
}

function extractVideoSrc(html: string): string | undefined {
  const m = (html || '').match(/<video\b[^>]*?\bsrc\s*=\s*(["'])([\s\S]*?)\1/i);
  return m?.[2]?.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * Publish a video to YouTube.
 * Requires a video source (post.hasVideo / videoUrl / <video src> in content).
 * Text-only posts cannot go to YouTube public API — returns a clear error.
 */
export async function publishToYoutube(
  title: string,
  content: string,
  videoUrl?: string | null
): Promise<YoutubePublishResult> {
  const creds = getYtCreds();
  if (!creds?.token) {
    return {
      success: false,
      error: 'YouTube не подключён. Добавьте OAuth access_token в Настройки → Соцсети → YouTube.',
    };
  }

  const description = (content || '').slice(0, 4800);
  const safeTitle = (title || 'BlogPost video').slice(0, 100);

  if (!videoUrl || !String(videoUrl).trim()) {
    return {
      success: false,
      error: 'Для публикации на YouTube нужен видеофайл (MP4/WebM). Текст/фото YouTube API не принимает.',
    };
  }

  const media = await resolveMediaBase64(videoUrl);
  if (!media?.base64) {
    return { success: false, error: 'Не удалось прочитать видеофайл для YouTube' };
  }

  // Resumable upload via local proxy (CORS-safe) or edge
  const payload = {
    accessToken: creds.token,
    title: safeTitle,
    description,
    privacyStatus: creds.privacy,
    videoBase64: media.base64,
    videoMime: media.mime || 'video/mp4',
  };

  let lastErr = '';

  // 1) Local proxy
  try {
    const data = await postSocialJson('/api/youtube/upload', payload);
    if (data?.success || data?.videoId) {
      const videoId = data.videoId || data.id;
      return {
        success: true,
        videoId,
        url: data.url || (videoId ? `https://youtu.be/${videoId}` : undefined),
      };
    }
    if (data?.error) lastErr = String(data.error);
  } catch (e: any) {
    lastErr = e?.message || 'proxy failed';
  }

  // 2) Edge
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/social-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({ network: 'youtube', action: 'upload', ...payload }),
      });
      const data = await res.json();
      if (data?.success || data?.videoId) {
        const videoId = data.videoId || data.id;
        return {
          success: true,
          videoId,
          url: data.url || (videoId ? `https://youtu.be/${videoId}` : undefined),
        };
      }
      return { success: false, error: data?.error || `YouTube HTTP ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e?.message || lastErr || 'YouTube upload failed' };
    }
  }

  return { success: false, error: lastErr || 'YouTube proxy unavailable' };
}

/** channels.list — verifies the OAuth token works. */
export async function testYoutubeConnection(): Promise<{ ok: boolean; label?: string; error?: string }> {
  const creds = getYtCreds();
  if (!creds?.token) return { ok: false, error: 'Нет access_token' };

  try {
    const data = await postSocialJson('/api/youtube/channels', { accessToken: creds.token });
    const item = data?.items?.[0];
    if (item?.snippet?.title) return { ok: true, label: item.snippet.title };
    if (data?.error) return { ok: false, error: String(data.error) };
    return { ok: true, label: 'YouTube' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'YouTube API error' };
  }
}

/** Pull video src from generated post HTML if present. */
export function pickVideoFromHtml(html: string): string | undefined {
  return extractVideoSrc(html);
}
