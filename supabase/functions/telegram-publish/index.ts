// Supabase Edge Function: telegram-publish
// Proxies Telegram Bot API calls (avoids CORS issues from browser)
// Supports photo as public URL (imageUrl) or binary upload (imageBase64)

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
    const { token, chatId, text, imageUrl, imageBase64, imageMime } = await req.json()

    if (!token) {
      return jsonResponse({ success: false, error: 'Не указан токен бота Telegram' }, 400)
    }
    if (!chatId) {
      return jsonResponse({ success: false, error: 'Не указан Chat ID' }, 400)
    }

    const fullText = text || ''
    const caption = fullText.slice(0, 1024)
    const rest = fullText.slice(1024)

    let result: any

    if (imageBase64) {
      // Manual multipart — more reliable than FormData+Blob across Deno versions
      const binary = atob(imageBase64.replace(/\s/g, ''))
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      const boundary = '----BlogPostEdge' + Math.random().toString(16).slice(2)
      const chunks: Uint8Array[] = []
      const enc = (s: string) => new TextEncoder().encode(s)
      chunks.push(enc(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`))
      chunks.push(enc(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`))
      chunks.push(enc(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`))
      chunks.push(enc(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="image.jpg"\r\nContent-Type: ${imageMime || 'image/jpeg'}\r\n\r\n`))
      chunks.push(bytes)
      chunks.push(enc(`\r\n--${boundary}--\r\n`))

      let total = 0
      for (const c of chunks) total += c.length
      const body = new Uint8Array(total)
      let offset = 0
      for (const c of chunks) {
        body.set(c, offset)
        offset += c.length
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      })
      result = await response.json()
    } else if (imageUrl) {
      // Send photo with caption (Telegram downloads the public URL)
      result = await callTelegram(token, 'sendPhoto', {
        chat_id: chatId,
        photo: imageUrl,
        caption,
        parse_mode: 'HTML',
      })
    } else {
      // Send text message
      result = await callTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: fullText.slice(0, 4096),
        parse_mode: 'HTML',
      })
    }

    if (result.ok) {
      // Caption max is 1024 — send the rest as a follow-up text message
      if (rest.trim()) {
        await callTelegram(token, 'sendMessage', {
          chat_id: chatId,
          text: rest.slice(0, 4096),
          parse_mode: 'HTML',
        })
      }
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
  if (lower.includes('bad request: photo')) return 'Не удалось загрузить изображение. Проверьте файл (JPEG/PNG, до 10 МБ).'
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
