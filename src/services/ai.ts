// AI Service — единый интерфейс для всех AI-моделей
// Использует Supabase Edge Functions для защиты API-ключей

import { type ContentKind } from './contentEngine';

export type AIModel = 'yandexgpt' | 'gigachat' | 'auto';
export type ContentType = 'post' | 'article' | 'video_script' | 'music' | 'image';

interface GenerateTextOptions {
  prompt: string;
  model?: AIModel;
  maxLength?: number;
  language?: 'ru' | 'en';
  tone?: 'professional' | 'casual' | 'creative';
  /** Override default system prompt (for free-form user prompts). */
  system?: string;
  /** When true, return model output as-is (no forced SEO/CTA/#BlogPost). */
  raw?: boolean;
}

interface GenerateImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  style?: 'realistic' | 'artistic' | 'anime';
}

interface GenerateAudioOptions {
  text: string;
  voice?: 'male' | 'female';
  speed?: number;
}

function extractLlmText(raw: string): string {
  let text = '';
  try {
    const data = JSON.parse(raw);
    text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.text ||
      data?.message?.content ||
      '';
    if (!text && typeof data?.choices?.[0]?.message?.reasoning === 'string') {
      text = data.choices[0].message.reasoning;
    }
    if (!text && Array.isArray(data?.choices)) {
      text = data.choices.map((c: any) => c?.message?.content || c?.text || '').join('\n');
    }
  } catch {
    text = raw;
  }
  return String(text)
    .replace(/^[\s\S]*?<\/think>/i, '')
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}

// ═══ Text Generation ═══
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { prompt, maxLength = 2000, language = 'ru', system, raw } = options;

  const systemPrompt = system || (language === 'ru'
    ? `Ты — маркетолог и редактор. Пиши связный текст СТРОГО по теме запроса.
Обязательно:
1) Маркетинговые приёмы вовлечения: цепляющий первый абзац/крючок, интрига, социальное доказательство, польза.
2) SEO: ключевые слова из темы в тексте и в конце; понятная структура.
3) Обязательный хэштег #BlogPost (можно в конце с другими).
4) Чёткий призыв к действию: просить лайк, комментарий, сохранение, репост или ответ.
Не больше ${maxLength} символов. Только готовый материал без служебных пометок.`
    : `You are a marketer and editor. Write coherent content STRICTLY on the topic.
Always include: (1) engagement hooks, (2) SEO keywords, (3) hashtag #BlogPost, (4) clear CTA (like/comment/save/share).
Max ${maxLength} chars. Ready material only.`);

  const MIN_LEN = 20;
  const accept = (t: string) => {
    if (!t || t.length <= MIN_LEN) return null;
    return raw ? t : ensureSeoEngagement(t, language);
  };

  // 1) Local Vite middleware (server-side LLM) — most reliable
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system: systemPrompt, language }),
    });
    const data = await res.json();
    const text = String(data?.text || '').trim();
    const ok = res.ok ? accept(text) : null;
    if (ok) return ok;
    console.warn('Vite /api/generate returned weak result', res.status, data?.error, text.slice(0, 80));
  } catch (e) {
    console.warn('Vite /api/generate failed:', e);
  }

  // 2) Direct / proxied OpenAI-compatible endpoints
  const tries: Array<{ url: string; model: string }> = [
    { url: '/api/llm/openai', model: 'openai' },
    { url: '/api/llm/openai', model: 'openai-fast' },
    { url: 'https://text.pollinations.ai/openai', model: 'openai' },
    { url: 'https://text.pollinations.ai/openai', model: 'openai-fast' },
  ];
  for (const t of tries) {
    try {
      const text = await postOpenAI(t.url, {
        model: t.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}` },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      });
      const ok = accept(text);
      if (ok) return ok;
    } catch (e) {
      console.warn(`LLM ${t.model} @ ${t.url} failed:`, e);
    }
  }

  // 3) Simple GET text API (no CORS / no chat schema) — last resort
  for (const base of [
    '/api/llm/',
    'https://text.pollinations.ai/',
  ]) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 90_000);
      const url = base.endsWith('/')
        ? `${base}${encodeURIComponent(`${systemPrompt}\n\n${prompt}`)}`
        : base;
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: 'text/plain' },
      });
      window.clearTimeout(timer);
      if (!res.ok) continue;
      const raw = await res.text();
      const ok = accept(extractLlmText(raw));
      if (ok) return ok;
    } catch (e) {
      console.warn('Simple LLM GET failed:', base, e);
    }
  }

  throw new Error(
    language === 'ru'
      ? 'Не удалось сгенерировать текст по теме. Проверьте соединение и попробуйте ещё раз.'
      : 'Failed to generate topic text. Check connection and try again.'
  );
}

/** Guarantee #BlogPost and a CTA if the model omitted them. */
export function ensureSeoEngagement(text: string, language: 'ru' | 'en' = 'ru'): string {
  let out = text.trim();
  if (!/#BlogPost/i.test(out)) {
    out += language === 'ru' ? '\n\n#BlogPost' : '\n\n#BlogPost';
  }
  const hasCta = language === 'ru'
    ? /(лайк|коммент|сохран|репост|подпиш|ответьте|напишите)/i.test(out)
    : /(like|comment|save|share|follow|reply)/i.test(out);
  if (!hasCta) {
    out += language === 'ru'
      ? '\n\n👇 А как вы относитесь к этой теме? Напишите в комментариях, поставьте лайк и сохраните пост!'
      : '\n\n👇 What do you think? Drop a comment, like this post, and save it for later!';
  }
  return out;
}

async function postOpenAI(endpoint: string, body: Record<string, unknown>): Promise<string> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const raw = await res.text();
    return extractLlmText(raw);
  } finally {
    window.clearTimeout(timer);
  }
}

// ═══ Image Generation ═══
export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, width = 1024, height = 640, style = 'realistic' } = options;
  const cleanPrompt = String(prompt || 'beautiful photo')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  const fullPrompt = `${cleanPrompt}, ${style}, high quality`;
  const seed = Math.floor(Math.random() * 1_000_000);

  const candidates = [
    `/api/image?prompt=${encodeURIComponent(fullPrompt)}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`,
  ];

  for (const url of candidates) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 90_000);
      const res = await fetch(url, { signal: ctrl.signal });
      window.clearTimeout(timer);
      if (res.ok) {
        const blob = await res.blob();
        // data: URL — survives reload and can be uploaded to Telegram (blob: cannot)
        if (blob.size > 400) {
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Image read failed'));
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (e) {
      console.warn('Image fetch failed for', url, e);
    }
  }
  throw new Error('Не удалось сгенерировать изображение. Попробуйте ещё раз.');
}

// ═══ Audio Generation (TTS) ═══
export async function generateAudio(options: GenerateAudioOptions): Promise<string> {
  const { text, voice = 'female', speed = 1.0 } = options;

  try {
    const response = await callEdgeFunction('ai-generate-audio', {
      text,
      voice,
      speed,
      model: 'silero',
    });
    return response.audioUrl || response.base64 || '';
  } catch (error) {
    console.error('AI audio generation failed:', error);
    throw new Error('Ошибка генерации аудио. Попробуйте позже.');
  }
}

// ═══ Video Generation ═══
export async function generateVideo(prompt: string): Promise<string> {
  try {
    const response = await callEdgeFunction('ai-generate-video', {
      prompt,
      model: 'default',
    });
    return response.videoUrl || '';
  } catch (error) {
    console.error('AI video generation failed:', error);
    throw new Error('Ошибка генерации видео. Попробуйте позже.');
  }
}

// ═══ Music Generation ═══
export async function generateMusic(prompt: string): Promise<string> {
  try {
    const response = await callEdgeFunction('ai-generate-music', {
      prompt,
      model: 'default',
    });
    return response.musicUrl || '';
  } catch (error) {
    console.error('AI music generation failed:', error);
    throw new Error('Ошибка генерации музыки. Попробуйте позже.');
  }
}

// ═══ SEO Optimization ═══
export async function optimizeSEO(content: string, keywords: string[]): Promise<{
  title: string;
  description: string;
  tags: string[];
  optimizedContent: string;
}> {
  try {
    const response = await callEdgeFunction('ai-seo-optimize', {
      content,
      keywords,
    });
    return response;
  } catch (error) {
    console.error('SEO optimization failed:', error);
    throw new Error('Ошибка SEO-оптимизации.');
  }
}

// ═══ Auto Model Selection ═══
function selectBestModel(task: string, language: string): string {
  // Russian content → YandexGPT (better Russian understanding)
  // English content → GigaChat (good multilingual)
  // Complex creative → YandexGPT Pro
  if (language === 'ru') return 'yandexgpt';
  return 'gigachat';
}

// ═══ Edge Function Caller ═══
async function callEdgeFunction(functionName: string, payload: Record<string, unknown>): Promise<any> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    // Fallback: mock responses for development (marked so generateText can try live AI)
    return { ...mockResponse(functionName, payload), __mock: true };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Edge function ${functionName} returned ${response.status}, using mock`);
      return { ...mockResponse(functionName, payload), __mock: true };
    }

    const data = await response.json();
    if (data && (data.text || data.imageUrl || data.audioUrl || data.videoUrl || data.musicUrl)) {
      return data;
    }
    return { ...mockResponse(functionName, payload), __mock: true };
  } catch (err) {
    console.warn(`Edge function ${functionName} unreachable, using mock:`, err);
    return { ...mockResponse(functionName, payload), __mock: true };
  }
}

// ═══ Mock Response (development fallback) ═══
function mockResponse(functionName: string, payload: Record<string, unknown>): any {
  const promptAny = String((payload as any).prompt || (payload as any).text || '');
  const topicMatch = promptAny.match(/["«]([^"»]+)["»]/);
  const topic = topicMatch ? topicMatch[1] : promptAny.slice(0, 80);

  switch (functionName) {
    case 'ai-generate-text': {
      // Never return a generic stub — force callers to use live LLM / fail loudly
      return { text: '', __mock: true };
    }
    case 'ai-generate-image':
      // Images are built in generateImage() with a real AI URL
      return { imageUrl: '', base64: '' };
    case 'ai-generate-audio':
      return { audioUrl: '', base64: '' };
    case 'ai-generate-video':
      return { videoUrl: '' };
    case 'ai-generate-music':
      return { musicUrl: '' };
    case 'ai-seo-optimize':
      return {
        title: 'Оптимизированный заголовок',
        description: 'SEO-описание для поисковых систем',
        tags: ['блог', 'контент', 'AI'],
        optimizedContent: (payload as any).content || '',
      };
    default:
      return {};
  }
}

// ═══ Usage Limits Check ═══
export async function checkGenerationLimit(userId: string, subscription: string): Promise<{ allowed: boolean; remaining: number }> {
  const limits: Record<string, number> = {
    free: 10,
    basic: 10,
    pro: 60,
    premium: Infinity,
  };

  const limit = limits[subscription] ?? 0;

  // In production: query Supabase for actual usage count this month
  // const { count } = await supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', userId).gte('created_at', startOfMonth);

  return { allowed: true, remaining: limit };
}