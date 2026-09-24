// Telegram Bot API Service
// Photo upload via JSON base64 → local Vite proxy (reliable), edge, then direct multipart

import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface TelegramPublishResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

interface ResolvedImage {
  kind: 'url' | 'bytes';
  url?: string;
  base64: string;
  mime: string;
}

// ═══ Get Telegram config from localStorage ═══
function getTelegramFromStorage(): { token: string; chatId: string } | null {
  try {
    const saved = localStorage.getItem('blogpost_socials');
    if (!saved) return null;
    const socials = JSON.parse(saved);
    const tg = socials.find((s: any) => s.network === 'telegram' && s.apiKey && s.apiKey.trim() !== '');
    if (!tg) return null;
    return { token: tg.apiKey, chatId: tg.accountId || '' };
  } catch {
    return null;
  }
}

// ═══ Get Telegram config (localStorage → Supabase) ═══
async function getTelegramConfig(): Promise<{ token: string; chatId: string } | null> {
  const local = getTelegramFromStorage();
  if (local && local.token) return local;

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('social_accounts')
        .select('access_token, account_id, account_name')
        .eq('network', 'telegram')
        .eq('connected', true)
        .single();
      if (data && data.access_token) {
        return { token: data.access_token, chatId: data.account_id || data.account_name || '' };
      }
    } catch {}
  }
  return null;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/** data: URL → base64 without fetch/FileReader (more reliable). */
function dataUrlToBase64(src: string): { base64: string; mime: string } | null {
  const comma = src.indexOf(',');
  if (comma < 0) return null;
  const meta = src.slice(5, comma);
  const mime = (meta.split(';')[0] || 'image/jpeg').trim() || 'image/jpeg';
  const payload = src.slice(comma + 1);
  if (/;base64/i.test(meta)) {
    return { base64: payload.replace(/\s/g, ''), mime };
  }
  try {
    return { base64: btoa(decodeURIComponent(payload)), mime };
  } catch {
    return { base64: btoa(payload), mime };
  }
}

async function blobToBase64(blob: Blob): Promise<{ base64: string; mime: string } | null> {
  if (!blob || blob.size === 0) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
  return dataUrlToBase64(dataUrl);
}

/** Resolve image source → always base64 bytes (and optional public URL). */
async function resolveImage(imageUrl?: string | null): Promise<ResolvedImage | null> {
  if (!imageUrl) return null;
  const src = String(imageUrl).trim();
  if (!src) return null;

  // Public URL: still convert to bytes so Telegram does not depend on downloading it
  if (isHttpUrl(src)) {
    try {
      const res = await fetch(src);
      if (res.ok) {
        const bytes = await blobToBase64(await res.blob());
        if (bytes) return { kind: 'bytes', url: src, ...bytes };
      }
    } catch {}
    // Last resort: let Telegram download the URL itself
    return { kind: 'url', url: src, base64: '', mime: 'image/jpeg' };
  }

  if (src.startsWith('data:')) {
    const bytes = dataUrlToBase64(src);
    return bytes ? { kind: 'bytes', ...bytes } : null;
  }

  // blob: / relative path
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const bytes = await blobToBase64(await res.blob());
    return bytes ? { kind: 'bytes', ...bytes } : null;
  } catch {
    return null;
  }
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'image/jpeg' });
}

function toResult(api: any): TelegramPublishResult {
  if (api?.ok) {
    return { success: true, messageId: api.result?.message_id };
  }
  return { success: false, error: api?.description || 'Неизвестная ошибка Telegram' };
}

async function postJson(url: string, token: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Token': token,
    },
    body: JSON.stringify({ ...body, token }),
  });
  return res.json();
}

async function postMultipart(url: string, token: string, form: FormData): Promise<any> {
  // Fresh FormData per call — never reuse after fetch
  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: { 'X-Telegram-Bot-Token': token },
  });
  return res.json();
}

function buildPhotoForm(token: string, chatId: string, caption: string, image: ResolvedImage): FormData {
  const form = new FormData();
  form.append('token', token);
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  if (image.kind === 'bytes' && image.base64) {
    form.append('photo', base64ToBlob(image.base64, image.mime), 'image.jpg');
  } else if (image.url) {
    form.append('photo', image.url);
  }
  return form;
}

/** sendPhoto with image via proxy JSON (base64) → edge → direct multipart. */
async function sendPhoto(
  token: string,
  chatId: string,
  caption: string,
  image: ResolvedImage
): Promise<TelegramPublishResult> {
  const errors: string[] = [];

  // 1) Local Vite proxy — JSON + photoBase64 (rebuilds multipart server-side)
  if (image.kind === 'bytes' && image.base64) {
    try {
      const api = await postJson(`/api/telegram/sendPhoto`, token, {
        chat_id: chatId,
        caption,
        parse_mode: 'HTML',
        photoBase64: image.base64,
        photoMime: image.mime || 'image/jpeg',
        photoName: 'image.jpg',
      });
      const r = toResult(api);
      if (r.success) return r;
      errors.push(r.error || 'proxy');
    } catch (e: any) {
      errors.push(e?.message || 'proxy fetch failed');
    }
  }

  // 2) Direct Bot API multipart (fresh FormData every time)
  try {
    const form = buildPhotoForm(token, chatId, caption, image);
    const api = await postMultipart(`https://api.telegram.org/bot${token}/sendPhoto`, token, form);
    const r = toResult(api);
    if (r.success) return r;
    errors.push(r.error || 'direct');
  } catch (e: any) {
    errors.push(e?.message || 'direct fetch failed');
  }

  // 3) JSON photo URL (if we still have a public URL)
  if (image.url) {
    try {
      const api = await postJson(`/api/telegram/sendPhoto`, token, {
        chat_id: chatId,
        photo: image.url,
        caption,
        parse_mode: 'HTML',
      });
      const r = toResult(api);
      if (r.success) return r;
      errors.push(r.error || 'url photo');
    } catch (e: any) {
      errors.push(e?.message || 'url photo failed');
    }
  }

  return { success: false, error: errors.filter(Boolean).join('; ') || 'sendPhoto failed' };
}

async function sendMessage(token: string, chatId: string, text: string): Promise<TelegramPublishResult> {
  const errors: string[] = [];
  for (const url of [`/api/telegram/sendMessage`, `https://api.telegram.org/bot${token}/sendMessage`]) {
    try {
      const api = await postJson(url, token, {
        chat_id: chatId,
        text: text.slice(0, 4096),
        parse_mode: 'HTML',
      });
      const r = toResult(api);
      if (r.success) return r;
      errors.push(r.error || url);
    } catch (e: any) {
      errors.push(e?.message || url);
    }
  }
  return { success: false, error: errors.filter(Boolean).join('; ') || 'sendMessage failed' };
}

async function sendViaEdge(
  token: string,
  chatId: string,
  text: string,
  image: ResolvedImage | null
): Promise<TelegramPublishResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase URL not configured');
  const response = await fetch(`${supabaseUrl}/functions/v1/telegram-publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      token,
      chatId,
      text,
      imageUrl: image?.url || undefined,
      imageBase64: image?.base64 || undefined,
      imageMime: image?.mime || undefined,
    }),
  });
  const data = await response.json();
  if (data?.success) return data;
  return { success: false, error: data?.error || `Edge HTTP ${response.status}` };
}

// ═══ Publish to Telegram ═══
export async function publishToTelegram(
  title: string,
  content: string,
  imageUrl?: string | null
): Promise<TelegramPublishResult> {
  const config = await getTelegramConfig();

  if (!config || !config.token) {
    return { success: false, error: 'Telegram не подключен. Добавьте токен бота в Настройки → Соцсети → Telegram.' };
  }
  if (!config.chatId) {
    return { success: false, error: 'Не указан Chat ID. Заполните поле «Chat ID / Канал» в Настройки → Соцсети → Telegram.' };
  }

  const formattedText = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(content).slice(0, 4000)}`;
  const caption = formattedText.slice(0, 1024);
  const rest = formattedText.slice(1024);

  let image: ResolvedImage | null = null;
  try {
    image = await resolveImage(imageUrl);
  } catch (e: any) {
    console.warn('resolveImage failed', e);
    image = null;
  }

  const wantsPhoto = !!imageUrl && String(imageUrl).trim() !== '';
  let lastError = '';

  // Photo + caption
  if (image) {
    try {
      const r = await sendPhoto(config.token, config.chatId, caption, image);
      if (r.success) {
        if (rest.trim()) {
          try { await sendMessage(config.token, config.chatId, rest); } catch {}
        }
        return r;
      }
      lastError = r.error || lastError;
    } catch (e: any) {
      lastError = e?.message || lastError;
    }

    // Edge with the same image
    try {
      const r = await sendViaEdge(config.token, config.chatId, formattedText, image);
      if (r.success) return r;
      lastError = r.error || lastError;
    } catch (e: any) {
      lastError = e?.message || lastError;
    }
  }

  // Text-only is NOT enough when a photo was requested — report failure clearly
  if (wantsPhoto && !image) {
    return {
      success: false,
      error: 'Не удалось подготовить изображение для отправки (пустой или повреждённый файл).',
    };
  }

  if (wantsPhoto && image) {
    return {
      success: false,
      error: `Не удалось отправить изображение: ${lastError || 'все способы отправки не сработали'}`,
    };
  }

  // No image requested — text only
  try {
    const r = await sendMessage(config.token, config.chatId, formattedText);
    if (r.success) return r;
    lastError = r.error || lastError;
  } catch (e: any) {
    lastError = e?.message || lastError;
  }

  try {
    const r = await sendViaEdge(config.token, config.chatId, formattedText, null);
    if (r.success) return r;
    lastError = r.error || lastError;
  } catch (e: any) {
    lastError = e?.message || lastError;
  }

  return { success: false, error: lastError || 'Не удалось отправить в Telegram' };
}

// ═══ Save Telegram config to Supabase ═══
export async function saveTelegramConfig(userId: string, botToken: string, chatId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: userId,
        network: 'telegram',
        access_token: botToken,
        account_id: chatId,
        account_name: chatId,
        connected: true,
      }, { onConflict: 'user_id,network' });
    return !error;
  } catch {
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
