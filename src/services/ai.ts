// AI Service — единый интерфейс для всех AI-моделей
// Использует Supabase Edge Functions для защиты API-ключей

export type AIModel = 'yandexgpt' | 'gigachat' | 'auto';
export type ContentType = 'post' | 'article' | 'video_script' | 'music' | 'image';

interface GenerateTextOptions {
  prompt: string;
  model?: AIModel;
  maxLength?: number;
  language?: 'ru' | 'en';
  tone?: 'professional' | 'casual' | 'creative';
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

// ═══ Text Generation ═══
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { prompt, model = 'auto', maxLength = 2000, language = 'ru', tone = 'professional' } = options;

  const systemPrompt = language === 'ru'
    ? `Ты — профессиональный контент-мейкер. Создай ${tone === 'professional' ? 'профессиональный' : tone === 'casual' ? 'неформальный' : 'креативный'} текст на тему. Максимум ${maxLength} символов.`
    : `You are a professional content creator. Create a ${tone} text on the topic. Max ${maxLength} characters.`;

  const selectedModel = model === 'auto' ? selectBestModel('text', language) : model;

  try {
    const response = await callEdgeFunction('ai-generate-text', {
      prompt,
      systemPrompt,
      model: selectedModel,
      maxLength,
    });
    return response.text || '';
  } catch (error) {
    console.error('AI text generation failed:', error);
    throw new Error('Ошибка генерации текста. Попробуйте позже.');
  }
}

// ═══ Image Generation ═══
export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, width = 1024, height = 1024, style = 'realistic' } = options;

  try {
    const response = await callEdgeFunction('ai-generate-image', {
      prompt: `${prompt}, ${style} style`,
      width,
      height,
      model: 'kandinsky',
    });
    return response.imageUrl || response.base64 || '';
  } catch (error) {
    console.error('AI image generation failed:', error);
    throw new Error('Ошибка генерации изображения. Попробуйте позже.');
  }
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
    // Fallback: mock responses for development
    return mockResponse(functionName, payload);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Edge function ${functionName} failed: ${response.statusText}`);
  }

  return response.json();
}

// ═══ Mock Response (development fallback) ═══
function mockResponse(functionName: string, payload: Record<string, unknown>): any {
  switch (functionName) {
    case 'ai-generate-text':
      return {
        text: `[AI-сгенерированный текст по теме: "${(payload as any).prompt?.slice(0, 50)}..."]

Это демонстрационный ответ. Для реальной генерации подключите Supabase и настройте API-ключи AI-моделей в .env файле.

Возможности:
- YandexGPT — лучшее качество для русскоязычного контента
- GigaChat — мультиязычная генерация
- Автоматический выбор модели под задачу`,
      };
    case 'ai-generate-image':
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