// VK Wall API — real publish (wall.post + optional photo upload)
// Uses local Vite proxy /api/vk/* (CORS-safe) with optional Supabase edge fallback.

import { loadSocialCreds, resolveImageBase64, postSocialJson } from './socialConfig';

export interface VkPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

interface VkCreds {
  token: string;
  ownerId: string;
}

function getVkCreds(): VkCreds | null {
  const c = loadSocialCreds('vk');
  if (!c) return null;
  return { token: c.token, ownerId: c.accountId || '' };
}

/** Call VK API method via local proxy (or edge). */
async function vkMethod(method: string, params: Record<string, unknown>): Promise<any> {
  const body = { method, params };
  // 1) Local Vite proxy
  try {
    const data = await postSocialJson('/api/vk/method', body);
    if (data?.response !== undefined || data?.error) return data;
    if (data?.vk_response !== undefined) return data.vk_response;
  } catch {
    /* try edge */
  }
  // 2) Supabase edge (production)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/social-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({ network: 'vk', action: method, params }),
      });
      return await res.json();
    } catch (e: any) {
      return { error: { error_msg: e?.message || 'edge failed' } };
    }
  }
  return { error: { error_msg: 'VK proxy unavailable' } };
}

/**
 * Publish to VK wall.
 * @param title  optional first-line bold title
 * @param content plain text body
 * @param imageUrl optional image (data:/http)
 */
export async function publishToVk(
  title: string,
  content: string,
  imageUrl?: string | null
): Promise<VkPublishResult> {
  const creds = getVkCreds();
  if (!creds?.token) {
    return {
      success: false,
      error: 'VK не подключён. Добавьте access_token в Настройки → Соцсети → VK.',
    };
  }

  const message = [title, '', content].filter(Boolean).join('\n').trim().slice(0, 15000);
  if (!message && !imageUrl) {
    return { success: false, error: 'Пустое сообщение для VK' };
  }

  const params: Record<string, unknown> = {
    access_token: creds.token,
    v: '5.199',
    message,
  };
  if (creds.ownerId) {
    params.owner_id = creds.ownerId;
    // Group wall: post on behalf of the group
    if (String(creds.ownerId).startsWith('-')) params.from_group = 1;
  }

  // Photo upload when image present
  if (imageUrl) {
    try {
      const img = await resolveImageBase64(imageUrl);
      if (img?.base64) {
        const upload = await vkUploadWallPhoto(creds.token, creds.ownerId, img.base64, img.mime);
        if (upload) {
          params.attachments = upload; // photo{owner}_{id}
        }
      }
    } catch (e: any) {
      console.warn('VK photo upload failed, posting text only', e);
    }
  }

  const result = await vkMethod('wall.post', params);
  if (result?.error) {
    return {
      success: false,
      error: result.error.error_msg || result.error.message || 'VK API error',
    };
  }
  const postId = result?.response?.post_id != null ? String(result.response.post_id) : undefined;
  return { success: true, postId };
}

/** photos.getWallUploadServer → upload → photos.saveWallPhoto → attachment string */
async function vkUploadWallPhoto(
  token: string,
  ownerId: string,
  base64: string,
  mime: string
): Promise<string | null> {
  const serverRes = await vkMethod('photos.getWallUploadServer', {
    access_token: token,
    v: '5.199',
    ...(ownerId ? { group_id: String(ownerId).replace(/^-/, '') } : {}),
  });
  const uploadUrl = serverRes?.response?.upload_url;
  if (!uploadUrl) return null;

  const uploadRes = await postSocialJson('/api/vk/upload-photo', {
    uploadUrl,
    photoBase64: base64,
    photoMime: mime || 'image/jpeg',
    photoName: 'image.jpg',
  });
  const server = uploadRes?.server;
  const photo = uploadRes?.photo;
  const hash = uploadRes?.hash;
  if (!server || !photo || !hash) return null;

  const saveRes = await vkMethod('photos.saveWallPhoto', {
    access_token: token,
    v: '5.199',
    server,
    photo,
    hash,
    ...(ownerId ? { group_id: String(ownerId).replace(/^-/, '') } : {}),
  });
  const saved = saveRes?.response?.[0];
  if (!saved?.id) return null;
  return `photo${saved.owner_id}_${saved.id}`;
}

/** Light connectivity check — users.get (or groups.getById for group tokens). */
export async function testVkConnection(): Promise<{ ok: boolean; label?: string; error?: string }> {
  const creds = getVkCreds();
  if (!creds?.token) return { ok: false, error: 'Нет access_token' };

  const isGroup = creds.ownerId.startsWith('-');
  const result = await vkMethod(isGroup ? 'groups.getById' : 'users.get', {
    access_token: creds.token,
    v: '5.199',
    ...(isGroup ? { group_id: creds.ownerId.replace(/^-/, '') } : {}),
  });
  if (result?.error) {
    return { ok: false, error: result.error.error_msg || 'VK API error' };
  }
  const r = result?.response;
  if (isGroup) {
    const g = Array.isArray(r) ? r[0] : r;
    return { ok: true, label: g?.name || 'VK Group' };
  }
  const u = Array.isArray(r) ? r[0] : r;
  return { ok: true, label: [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'VK' };
}
