// Telegram Bot API Service
// Tries Supabase Edge Function first, falls back to direct Bot API
// (needed for blob:/data: images that Telegram cannot fetch by URL)

import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface TelegramPublishResult {
  success: boolean;
  messageId?: number;
  error?: string;
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
  // 1. Try localStorage first
  const local = getTelegramFromStorage();
  if (local && local.token) return local;

  // 2. Fallback to Supabase
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

/** Convert blob:/data:/relative image source to base64 (no data: prefix). */
async function imageToBase64(src: string): Promise<{ base64: string; mime: string } | null> {
  try {
    let blob: Blob;
    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/') || src.startsWith('./')) {
      const res = await fetch(src);
      if (!res.ok) return null;
      blob = await res.blob();
    } else {
      return null;
    }
    if (!blob || blob.size === 0) return null;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    const meta = dataUrl.slice(5, comma);
    const mime = (meta.split(';')[0] || 'image/jpeg').trim() || 'image/jpeg';
    return { base64: dataUrl.slice(comma + 1), mime };
  } catch {
    return null;
  }
}

/** Resolve image for Telegram: public URL as-is, local (blob/data) as base64. */
async function resolveImage(imageUrl?: string): Promise<
  | { kind: 'url'; url: string }
  | { kind: 'bytes'; base64: string; mime: string }
  | null
> {
  if (!imageUrl) return null;
  if (isHttpUrl(imageUrl)) return { kind: 'url', url: imageUrl };
  const bytes = await imageToBase64(imageUrl);
  if (bytes) return { kind: 'bytes', ...bytes };
  return null;
}

// ═══ Direct Telegram Bot API (browser CORS is allowed by api.telegram.org) ═══
async function callTelegramJson(token: string, method: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function callTelegramForm(token: string, method: string, form: FormData): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

function toResult(api: any): TelegramPublishResult {
  if (api?.ok) {
    return { success: true, messageId: api.result?.message_id };
  }
  return { success: false, error: api?.description || 'Неизвестная ошибка Telegram' };
}

async function sendDirect(
  token: string,
  chatId: string,
  text: string,
  image: Awaited<ReturnType<typeof resolveImage>>
): Promise<TelegramPublishResult> {
  const caption = (text || '').slice(0, 1024);
  const rest = (text || '').slice(1024);

  let result: any;
  if (image?.kind === 'bytes') {
    const binary = atob(image.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([bytes], { type: image.mime || 'image/jpeg' }), 'image.jpg');
    result = await callTelegramForm(token, 'sendPhoto', form);
  } else if (image?.kind === 'url') {
    result = await callTelegramJson(token, 'sendPhoto', {
      chat_id: chatId,
      photo: image.url,
      caption,
      parse_mode: 'HTML',
    });
  } else {
    result = await callTelegramJson(token, 'sendMessage', {
      chat_id: chatId,
      text: (text || '').slice(0, 4096),
      parse_mode: 'HTML',
    });
  }

  const primary = toResult(result);
  if (primary.success && rest.trim()) {
    await callTelegramJson(token, 'sendMessage', {
      chat_id: chatId,
      text: rest.slice(0, 4096),
      parse_mode: 'HTML',
    });
  }
  return primary;
}

// ═══ Publish to Telegram via Edge Function (fallback: direct Bot API) ═══
export async function publishToTelegram(
  title: string,
  content: string,
  imageUrl?: string
): Promise<TelegramPublishResult> {
  const config = await getTelegramConfig();

  if (!config || !config.token) {
    return { success: false, error: 'Telegram не подключен. Добавьте токен бота в Настройки → Соцсети → Telegram.' };
  }
  if (!config.chatId) {
    return { success: false, error: 'Не указан Chat ID. Заполните поле «Chat ID / Канал» в Настройки → Соцсети → Telegram.' };
  }

  // Format message
  const formattedText = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(content).slice(0, 4000)}`;

  const image = await resolveImage(imageUrl);

  // Prefer direct Bot API when we must upload binary (blob:/data: images)
  if (image?.kind === 'bytes') {
    try {
      return await sendDirect(config.token, config.chatId, formattedText, image);
    } catch (err: any) {
      return { success: false, error: `Не удалось отправить изображение: ${err.message}` };
    }
  }

  // Try Edge Function first (public URL images / text-only)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/telegram-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          token: config.token,
          chatId: config.chatId,
          text: formattedText,
          imageUrl: image?.kind === 'url' ? image.url : undefined,
        }),
      });
      const data = await response.json();
      if (data?.success) return data;

      // Edge failed (e.g. old function without image upload) → try direct
      try {
        return await sendDirect(config.token, config.chatId, formattedText, image);
      } catch {
        return data;
      }
    } catch (err: any) {
      // Network/CORS to edge → try direct Bot API
      try {
        return await sendDirect(config.token, config.chatId, formattedText, image);
      } catch {
        return { success: false, error: `Не удалось подключиться к серверу: ${err.message}` };
      }
    }
  }

  try {
    return await sendDirect(config.token, config.chatId, formattedText, image);
  } catch (err: any) {
    return { success: false, error: `Не удалось отправить в Telegram: ${err.message}` };
  }
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

// ═══ HTML Escape ═══
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
