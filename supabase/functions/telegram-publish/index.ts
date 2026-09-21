// Supabase Edge Function: telegram-publish
// Proxies Telegram Bot API calls (avoids CORS issues from browser)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { token, chatId, text, imageUrl } = await req.json()

    if (!token) {
      return jsonResponse({ success: false, error: 'Не указан токен бота Telegram' }, 400)
    }
    if (!chatId) {
      return jsonResponse({ success: false, error: 'Не указан Chat ID' }, 400)
    }

    let result: any

    if (imageUrl) {
      // Send photo with caption
      result = await callTelegram(token, 'sendPhoto', {
        chat_id: chatId,
        photo: imageUrl,
        caption: (text || '').slice(0, 1024),
        parse_mode: 'HTML',
      })
    } else {
      // Send text message
      result = await callTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: (text || '').slice(0, 4096),
        parse_mode: 'HTML',
      })
    }

    if (result.ok) {
      return jsonResponse({
        success: true,
        messageId: result.result?.message_id,
      })
    } else {
      // Translate common Telegram errors to Russian
      const errorMsg = translateTelegramError(result.description || 'Неизвестная ошибка')
      return jsonResponse({ success: false, error: errorMsg })
    }
  } catch (error: any) {
    return jsonResponse({ success: false, error: `Ошибка сервера: ${error.message}` }, 500)
  }
})

async function callTelegram(token: string, method: string, body: Record<string, any>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json()
}

function translateTelegramError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('chat not found')) return 'Чат не найден. Проверьте Chat ID и убедитесь, что бот добавлен в канал/группу.'
  if (lower.includes('bot was blocked')) return 'Бот заблокирован пользователем. Попросите пользователя разблокировать бота.'
  if (lower.includes('not enough rights')) return 'У бота недостаточно прав. Назначьте бота администратором канала/группы.'
  if (lower.includes('bad request')) return 'Неверный запрос. Проверьте формат сообщения и Chat ID.'
  if (lower.includes('unauthorized')) return 'Неверный токен бота. Проверьте API Key в настройках.'
  if (lower.includes('forbidden')) return 'Доступ запрещён. Бот не имеет прав на отправку сообщений в этот чат.'
  if (lower.includes('message is too long')) return 'Сообщение слишком длинное. Максимум 4096 символов.'
  if (lower.includes('wrong file identifier')) return 'Неверный URL изображения. Проверьте ссылку на изображение.'
  return `Telegram: ${msg}`
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}