// Telegram Bot API Service
// Uses Supabase Edge Function as proxy (avoids CORS issues)

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

// ═══ Publish to Telegram via Edge Function ═══
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

  // Try Edge Function first
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
          imageUrl,
        }),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      return { success: false, error: `Не удалось подключиться к серверу: ${err.message}` };
    }
  }

  return { success: false, error: 'Supabase не настроен. Настройте подключение для публикации.' };
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