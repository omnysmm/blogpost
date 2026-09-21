// Supabase Edge Function: ai-generate-text
// Handles text generation via YandexGPT and GigaChat

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const YANDEX_API_KEY = Deno.env.get('YANDEX_GPT_API_KEY') || ''
const YANDEX_FOLDER_ID = Deno.env.get('YANDEX_FOLDER_ID') || ''
const GIGACHAT_API_KEY = Deno.env.get('GIGACHAT_API_KEY') || ''

serve(async (req) => {
  // CORS headers
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
    const { prompt, systemPrompt, model, maxLength = 2000 } = await req.json()

    let text = ''

    if (model === 'yandexgpt' && YANDEX_API_KEY && YANDEX_FOLDER_ID) {
      text = await callYandexGPT(prompt, systemPrompt, maxLength)
    } else if (model === 'gigachat' && GIGACHAT_API_KEY) {
      text = await callGigaChat(prompt, systemPrompt, maxLength)
    } else {
      // Fallback: enhanced mock
      text = generateMockResponse(prompt, maxLength)
    }

    return new Response(JSON.stringify({ text }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})

// ═══ YandexGPT ═══
async function callYandexGPT(prompt: string, systemPrompt: string, maxLength: number): Promise<string> {
  const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Api-Key ${YANDEX_API_KEY}`,
      'x-folder-id': YANDEX_FOLDER_ID,
    },
    body: JSON.stringify({
      modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt-lite`,
      completionOptions: {
        stream: false,
        temperature: 0.7,
        maxTokens: Math.min(maxLength, 4000),
      },
      messages: [
        { role: 'system', text: systemPrompt || 'Ты — профессиональный контент-мейкер.' },
        { role: 'user', text: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`YandexGPT error: ${err}`)
  }

  const data = await response.json()
  return data.result?.alternatives?.[0]?.message?.text || ''
}

// ═══ GigaChat ═══
async function callGigaChat(prompt: string, systemPrompt: string, maxLength: number): Promise<string> {
  const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GIGACHAT_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'GigaChat',
      messages: [
        { role: 'system', content: systemPrompt || 'Ты — профессиональный контент-мейкер.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: Math.min(maxLength, 4000),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`GigaChat error: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// ═══ Enhanced Mock ═══
function generateMockResponse(prompt: string, maxLength: number): string {
  const topic = prompt.match(/тему[:\s]*["«](.+?)["»]/i)?.[1] || prompt.slice(0, 50)

  return `📝 ${topic}

Сегодня мы поговорим о «${topic}». Это актуальная тема, которая интересует многих.

🔹 Первый важный момент — понимание основ. Каждый начинающий должен знать, с чего начать свой путь.

🔹 Второй аспект — практика. Теория без практики не даст нужного результата. Применяйте знания на деле.

🔹 Третий момент — постоянное обучение. Мир меняется, и мы должны меняться вместе с ним.

🔹 Четвёртый фактор — сообщество. Окружите себя единомышленниками, которые разделяют ваши цели.

💡 Вывод: «${topic}» — это направление, которое заслуживает вашего внимания. Начните уже сегодня, и результат не заставит себя ждать.

#контент #блог #AI #BlogPost`
}