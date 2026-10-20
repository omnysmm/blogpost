// Rutube — real video publish (upload API)
// Creds in blogpost_socials:
//   apiKey    = Rutube-Api-Key (partner token from rutube.ru/apiconsole)
//   accountId = '1' for private / '0' or empty for public

import { loadSocialCreds, resolveMediaBase64, postSocialJson } from './socialConfig';

export interface RutubePublishResult {
  success: boolean;
  videoId?: string;
  url?: string;
  error?: string;
}

function getRutubeCreds(): { token: string; isPrivate: boolean } | null {
  const c = loadSocialCreds('rutube');
  if (!c) return null;
  const priv = /^(1|true|private|да)$/i.test((c.accountId || '').trim());
  return { token: c.token, isPrivate: priv };
}

function extractVideoSrc(html: string): string | undefined {
  const m = (html || '').match(/<video\b[^>]*?\bsrc\s*=\s*(["'])([\s\S]*?)\1/i);
  return m?.[2]?.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * Publish a video to Rutube.
 * Rutube accepts video files (mp4/avi/mov/…) — not plain text posts.
 */
export async function publishToRutube(
  title: string,
  content: string,
  videoUrl?: string | null
): Promise<RutubePublishResult> {
  const creds = getRutubeCreds();
  if (!creds?.token) {
    return {
      success: false,
      error: 'Rutube не подключён. Добавьте Rutube-Api-Key в Настройки → Соцсети → Rutube.',
    };
  }

  const safeTitle = (title || 'BlogPost video').slice(0, 150);
  const description = (content || '').slice(0, 5000);

  if (!videoUrl || !String(videoUrl).trim()) {
    return {
      success: false,
      error: 'Для публикации на Rutube нужен видеофайл (MP4/AVI/MOV). Текст/фото Rutube API не принимает.',
    };
  }

  const src = String(videoUrl).trim();
  const isHttp = /^https?:\/\//i.test(src);

  // Prefer from_url when we have a public URL
  if (isHttp && !src.startsWith('blob:') && !src.startsWith('data:')) {
    try {
      const data = await postSocialJson('/api/rutube/from-url', {
        apiKey: creds.token,
        url: src,
        title: safeTitle,
        description,
        isPrivate: creds.isPrivate,
      });
      if (data?.success || data?.videoId || data?.id) {
        const videoId = String(data.videoId || data.id);
        return {
          success: true,
          videoId,
          url: data.url || `https://rutube.ru/video/${videoId}/`,
        };
      }
      if (data?.error && !data.fallback_upload) {
        // fall through to file upload
      }
    } catch {
      /* try file upload */
    }
  }

  // FILE_UPLOAD
  const media = await resolveMediaBase64(src);
  if (!media?.base64) {
    return { success: false, error: 'Не удалось прочитать видеофайл для Rutube' };
  }

  try {
    const data = await postSocialJson('/api/rutube/upload', {
      apiKey: creds.token,
      title: safeTitle,
      description,
      isPrivate: creds.isPrivate,
      videoBase64: media.base64,
      videoMime: media.mime || 'video/mp4',
    });
    if (data?.success || data?.videoId || data?.id) {
      const videoId = String(data.videoId || data.id);
      return {
        success: true,
        videoId,
        url: data.url || `https://rutube.ru/video/${videoId}/`,
      };
    }
    return { success: false, error: data?.error || 'Rutube upload failed' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Rutube upload failed' };
  }
}

/** api/video/person/private — verifies the API key. */
export async function testRutubeConnection(): Promise<{ ok: boolean; label?: string; error?: string }> {
  const creds = getRutubeCreds();
  if (!creds?.token) return { ok: false, error: 'Нет Rutube-Api-Key' };

  try {
    const data = await postSocialJson('/api/rutube/me', { apiKey: creds.token });
    const name =
      data?.name ||
      data?.username ||
      data?.data?.name ||
      (data?.id ? `Rutube #${data.id}` : null);
    if (name) return { ok: true, label: name };
    if (data?.error) return { ok: false, error: String(data.error) };
    return { ok: true, label: 'Rutube' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Rutube API error' };
  }
}

export function pickVideoFromHtml(html: string): string | undefined {
  return extractVideoSrc(html);
}
