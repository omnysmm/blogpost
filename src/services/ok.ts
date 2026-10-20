// OK.ru (Одноклассники) — real publish via mediatopic.post
// Creds in blogpost_socials:
//   apiKey    = access_token
//   accountId = "application_key|secret_key"  (or just application_key if secret empty)

import { loadSocialEntry, resolveImageBase64, postSocialJson } from './socialConfig';

export interface OkPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

interface OkCreds {
  token: string;
  appKey: string;
  secret: string;
  gid?: string;
}

function getOkCreds(): OkCreds | null {
  const entry = loadSocialEntry('ok');
  if (!entry?.apiKey || !entry.apiKey.trim()) return null;
  const raw = (entry.accountId || '').trim();
  const [appKeyRaw, secretRaw] = raw.includes('|') ? raw.split('|') : [raw, ''];
  return {
    token: entry.apiKey.trim(),
    appKey: (appKeyRaw || '').trim(),
    secret: (secretRaw || '').trim(),
  };
}

/** Call OK fb.do method via local proxy (signing happens server-side). */
async function okMethod(params: Record<string, unknown>): Promise<any> {
  const creds = getOkCreds();
  if (!creds) return { error: 'OK не подключён' };
  const body = {
    accessToken: creds.token,
    applicationKey: creds.appKey,
    secretKey: creds.secret,
    params,
  };
  try {
    const data = await postSocialJson('/api/ok/fb', body);
    return data;
  } catch (e: any) {
    return { error: e?.message || 'OK proxy unavailable' };
  }
}

/**
 * Publish to OK feed (user wall or group).
 * @param title optional bold first line
 * @param content plain text
 * @param imageUrl optional photo
 */
export async function publishToOk(
  title: string,
  content: string,
  imageUrl?: string | null
): Promise<OkPublishResult> {
  const creds = getOkCreds();
  if (!creds?.token) {
    return {
      success: false,
      error: 'ОК не подключён. Добавьте access_token и application_key|secret_key в Настройки → Соцсети → ОК.',
    };
  }
  if (!creds.appKey) {
    return { success: false, error: 'Укажите application_key (и secret_key через |) в поле Account ID для ОК' };
  }

  const text = [title, content].filter(Boolean).join('\n\n').trim().slice(0, 9000);
  if (!text && !imageUrl) {
    return { success: false, error: 'Пустое сообщение для ОК' };
  }

  const isGroup = creds.gid && String(creds.gid).trim() !== '';
  const params: Record<string, unknown> = {
    method: 'mediatopic.post',
    format: 'json',
    type: isGroup ? 'GROUP_THEME' : 'USER',
    v: '1.0',
  };
  if (isGroup) params.gid = String(creds.gid).replace(/^\D+/, '');

  // Optional photo
  let photoId: string | null = null;
  if (imageUrl) {
    try {
      const img = await resolveImageBase64(imageUrl);
      if (img?.base64) photoId = await okUploadPhoto(img.base64, img.mime);
    } catch (e) {
      console.warn('OK photo upload failed, posting text only', e);
    }
  }

  if (photoId) {
    params.attachment = JSON.stringify({
      type: 'photo',
      list: [{ id: photoId, mark: text.slice(0, 500) || '' }],
    });
    // text goes as topic description when photo present
    if (text) params.comment = text.slice(0, 1000);
  } else {
    params.attachment = JSON.stringify({ type: 'text', text });
  }

  const result = await okMethod(params);
  if (result?.error) {
    const msg = typeof result.error === 'string' ? result.error : (result.error.error_msg || result.error.message || 'OK API error');
    return { success: false, error: msg };
  }
  const postId = result?.success || result?.topic_id || result?.tid || result?.id;
  return { success: true, postId: postId != null ? String(postId) : undefined };
}

/** photosV2.getUploadUrl → upload → photosV2.save */
async function okUploadPhoto(base64: string, mime: string): Promise<string | null> {
  const uploadRes = await okMethod({ method: 'photosV2.getUploadUrl', format: 'json', v: '1.0' });
  const uploadUrl = uploadRes?.upload_url || uploadRes?.uploadUrl;
  if (!uploadUrl) return null;

  const uploaded = await postSocialJson('/api/ok/upload-photo', {
    uploadUrl,
    photoBase64: base64,
    photoMime: mime || 'image/jpeg',
    photoName: 'image.jpg',
    accessToken: getOkCreds()?.token,
    applicationKey: getOkCreds()?.appKey,
    secretKey: getOkCreds()?.secret,
  });

  const token = uploaded?.token || uploaded?.photo_token;
  if (!token) return null;

  const saveRes = await okMethod({
    method: 'photosV2.save',
    format: 'json',
    v: '1.0',
    token,
    caption: '',
  });
  return saveRes?.photos?.[0]?.id || saveRes?.photo_id || null;
}

/** users.getCurrentUser — connectivity check. */
export async function testOkConnection(): Promise<{ ok: boolean; label?: string; error?: string }> {
  const creds = getOkCreds();
  if (!creds?.token) return { ok: false, error: 'Нет access_token' };
  if (!creds.appKey) return { ok: false, error: 'Нет application_key (Account ID)' };

  const result = await okMethod({
    method: 'users.getCurrentUser',
    format: 'json',
    v: '1.0',
  });
  if (result?.error) {
    const msg = typeof result.error === 'string' ? result.error : (result.error.error_msg || result.error.message || 'OK API error');
    return { ok: false, error: msg };
  }
  const name = [result?.first_name, result?.last_name].filter(Boolean).join(' ') || result?.name || 'ОК';
  return { ok: true, label: name };
}
