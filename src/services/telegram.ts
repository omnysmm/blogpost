// Telegram Bot API Service
// Handles publishing to Telegram channels/groups via Bot API

import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface TelegramPublishResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

// ═══ Get Bot Token from Supabase ═══
async function getBotToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('access_token')
      .eq('network', 'telegram')
      .eq('connected', true)
      .single();
    if (error || !data) return null;
    return data.access_token;
  } catch {
    return null;
  }
}

// ═══ Send Text Message ═══
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  token?: string
): Promise<TelegramPublishResult> {
  const botToken = token || await getBotToken();
  if (!botToken) {
    return { success: false, error: 'Telegram bot token not configured. Add it in Settings → Social Networks → Telegram.' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4096), // Telegram limit
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    if (data.ok) {
      return { success: true, messageId: data.result.message_id };
    }
    return { success: false, error: data.description || 'Unknown error' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══ Send Photo with Caption ═══
export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption: string,
  token?: string
): Promise<TelegramPublishResult> {
  const botToken = token || await getBotToken();
  if (!botToken) {
    return { success: false, error: 'Telegram bot token not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption.slice(0, 1024),
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    if (data.ok) {
      return { success: true, messageId: data.result.message_id };
    }
    return { success: false, error: data.description || 'Unknown error' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══ Get Chat Info (verify bot access) ═══
export async function getTelegramChatInfo(chatId: string, token?: string): Promise<{ valid: boolean; title?: string; error?: string }> {
  const botToken = token || await getBotToken();
  if (!botToken) return { valid: false, error: 'No bot token' };

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
    const data = await response.json();
    if (data.ok) {
      return { valid: true, title: data.result.title || data.result.first_name || chatId };
    }
    return { valid: false, error: data.description };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

// ═══ Publish Post to Telegram ═══
export async function publishToTelegram(
  title: string,
  content: string,
  imageUrl?: string
): Promise<TelegramPublishResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Get chat_id from social_accounts
  try {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('access_token, account_id, account_name')
      .eq('network', 'telegram')
      .eq('connected', true)
      .single();

    if (error || !data) {
      return { success: false, error: 'Telegram not connected. Add bot token in Settings → Social Networks → Telegram.' };
    }

    const chatId = data.account_id || data.account_name;
    const token = data.access_token;

    if (!chatId) {
      return { success: false, error: 'No Telegram chat/channel ID configured. Set it in Settings.' };
    }

    // Format message
    const formattedText = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(content).slice(0, 4000)}`;

    if (imageUrl) {
      return await sendTelegramPhoto(chatId, imageUrl, formattedText, token);
    }
    return await sendTelegramMessage(chatId, formattedText, token);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══ Save Bot Token to Supabase ═══
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