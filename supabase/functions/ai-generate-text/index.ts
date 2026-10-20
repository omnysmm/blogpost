// Supabase Edge Function: ai-generate-text
// YandexGPT + GigaChat with auto model selection and optional SSE streaming.
// API keys stay server-side.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function env(name: string): string {
  return Deno.env.get(name) || '';
}

const YANDEX_API_KEY = env('YANDEX_GPT_API_KEY') || env('YANDEX_API_KEY');
const YANDEX_FOLDER_ID = env('YANDEX_FOLDER_ID');
const GIGACHAT_API_KEY = env('GIGACHAT_API_KEY');

type Model = 'yandexgpt' | 'gigachat' | 'auto';

function pickModel(requested: Model | undefined, language: string, prompt: string): 'yandexgpt' | 'gigachat' {
  if (requested === 'yandexgpt' || requested === 'gigachat') return requested;
  // Auto: RU → YandexGPT, EN → GigaChat; creative long-form prefers GigaChat when available
  const looksRu = language === 'ru' || /[а-яё]/i.test(prompt);
  if (looksRu) return 'yandexgpt';
  return GIGACHAT_API_KEY ? 'gigachat' : 'yandexgpt';
}

async function callYandexGPT(
  prompt: string,
  systemPrompt: string,
  maxTokens: number,
  temperature: number,
  stream: boolean,
): Promise<string> {
  const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${YANDEX_API_KEY}`,
      'x-folder-id': YANDEX_FOLDER_ID,
    },
    body: JSON.stringify({
      modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt-lite`,
      completionOptions: {
        stream,
        temperature,
        maxTokens,
      },
      messages: [
        { role: 'system', text: systemPrompt || 'Ты — профессиональный контент-мейкер.' },
        { role: 'user', text: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`YandexGPT HTTP ${res.status}: ${await res.text()}`);

  if (stream) {
    // Yandex streams NDJSON / SSE-like chunks depending on version
    const raw = await res.text();
    return raw
      .split('\n')
      .map((line) => line.replace(/^data:\s*/, '').trim())
      .filter((line) => line && line !== '[DONE]')
      .map((line) => {
        try {
          const j = JSON.parse(line);
          return j.result?.alternatives?.[0]?.message?.text || j.result?.alternatives?.[0]?.text || '';
        } catch {
          return '';
        }
      })
      .join('');
  }

  const data = await res.json();
  return data.result?.alternatives?.[0]?.message?.text || '';
}

async function callGigaChat(
  prompt: string,
  systemPrompt: string,
  maxTokens: number,
  temperature: number,
  stream: boolean,
): Promise<string> {
  const res = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GIGACHAT_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'GigaChat',
      stream,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt || 'Ты — профессиональный контент-мейкер.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GigaChat HTTP ${res.status}: ${await res.text()}`);

  if (stream) {
    const raw = await res.text();
    return raw
      .split('\n')
      .map((line) => line.replace(/^data:\s*/, '').trim())
      .filter((line) => line && line !== '[DONE]')
      .map((line) => {
        try {
          const j = JSON.parse(line);
          return j.choices?.[0]?.delta?.content || '';
        } catch {
          return '';
        }
      })
      .join('');
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function mockText(prompt: string): string {
  const topic = prompt.match(/тему[:\s]*["«](.+?)["»]/i)?.[1] || prompt.slice(0, 60).replace(/\s+/g, ' ');
  return `📝 ${topic}

Сегодня поговорим о «${topic}». Тема, которая интересует многих.

🔹 Начните с основ — понимание фундамента экономит месяцы ошибок.
🔹 Практика важнее теории: применяйте знания сразу.
🔹 Учитесь постоянно — рынок меняется быстрее учебников.
🔹 Сообщество ускоряет рост: ищите единомышленников.

💡 «${topic}» — направление, которое заслуживает внимания. Начните сегодня.

👇 Напишите в комментариях, что думаете, поставьте лайк и сохраните пост!

#BlogPost #${topic.replace(/\s+/g, '')}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const prompt = String(body.prompt || body.text || '');
    const systemPrompt = String(body.systemPrompt || body.system || '');
    const model = (body.model as Model) || 'auto';
    const language = String(body.language || 'ru');
    const maxLength = Number(body.maxLength || 2000);
    const temperature = Number(body.temperature || 0.7);
    const maxTokens = Math.min(Math.max(Math.floor(maxLength / 3), 200), 4000);
    const stream = body.stream === true;

    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const primary = pickModel(model, language, prompt);
    const order: Array<'yandexgpt' | 'gigachat'> =
      primary === 'yandexgpt' ? ['yandexgpt', 'gigachat'] : ['gigachat', 'yandexgpt'];

    let text = '';
    let usedModel = '';
    let lastErr = '';

    for (const m of order) {
      try {
        if (m === 'yandexgpt') {
          if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
            lastErr = 'YandexGPT not configured';
            continue;
          }
          text = await callYandexGPT(prompt, systemPrompt, maxTokens, temperature, stream);
        } else {
          if (!GIGACHAT_API_KEY) {
            lastErr = 'GigaChat not configured';
            continue;
          }
          text = await callGigaChat(prompt, systemPrompt, maxTokens, temperature, stream);
        }
        if (text.trim().length > 0) {
          usedModel = m;
          break;
        }
        lastErr = `${m} returned empty text`;
      } catch (e) {
        lastErr = String(e?.message || e);
        console.warn(`model ${m} failed:`, lastErr);
      }
    }

    if (!text.trim()) {
      text = mockText(prompt);
      usedModel = 'mock';
    }

    return new Response(
      JSON.stringify({
        text,
        model: usedModel,
        mock: usedModel === 'mock',
        warning: usedModel === 'mock' ? lastErr : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

