import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Wand2, FileText, Video, Music, Image, Mic, Film, Sparkles, Check, Loader2, Volume2, Globe, Shield } from 'lucide-react';

const aiModels = [
  { id: 'yandexgpt', name: 'YandexGPT', type: 'text', free: true },
  { id: 'gigachat', name: 'GigaChat', type: 'text', free: true },
  { id: 'gpt2ru', name: 'GPT-2 Russian', type: 'text', free: true },
  { id: 'kandinsky', name: 'Kandinsky', type: 'image', free: true },
  { id: 'rudalle', name: 'RuDALL-E', type: 'image', free: true },
  { id: 'silero', name: 'Silero TTS', type: 'audio', free: true },
  { id: 'ruttsgan', name: 'RuTTS-GAN', type: 'audio', free: true },
  { id: 'automl', name: 'AutoML Video', type: 'video', free: true },
];

export default function ContentGeneratorPage() {
  const { language, addPost, currentUser } = useStore();
  const t = translations[language];
  
  const [contentType, setContentType] = useState<'post' | 'article' | 'video' | 'music'>('post');
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [generateAudio, setGenerateAudio] = useState(false);
  const [generateVideo, setGenerateVideo] = useState(false);
  const [generateImage, setGenerateImage] = useState(true);
  const [seoEnabled, setSeoEnabled] = useState(true);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [moderation, setModeration] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [includeAd, setIncludeAd] = useState(false);
  const [adPosition, setAdPosition] = useState('inline');

  const contentTypes = [
    { id: 'post' as const, icon: FileText, label: language === 'ru' ? 'Пост' : 'Post' },
    { id: 'article' as const, icon: Image, label: language === 'ru' ? 'Статья' : 'Article' },
    { id: 'video' as const, icon: Video, label: language === 'ru' ? 'Видео' : 'Video' },
    { id: 'music' as const, icon: Music, label: language === 'ru' ? 'Музыка' : 'Music' },
  ];

  const handleGenerate = () => {
    if (!topic) return;
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      let content = '';
      switch (contentType) {
        case 'post':
          content = `📝 ${topic}\n\n${language === 'ru' ? `Сегодня мы поговорим о "${topic}". Это актуальная тема, которая интересует многих. В данном посте мы рассмотрим основные аспекты и поделимся полезной информацией.\n\n🔹 Первый важный момент — это понимание основ. Каждый начинающий должен знать, с чего начать.\n\n🔹 Второй аспект — это практика. Теория без практики не даст нужного результата.\n\n🔹 Третий момент — это постоянное обучение. Мир меняется, и мы должны меняться вместе с ним.\n\n💡 Вывод: "${topic}" — это то, что стоит изучить каждому. Подписывайтесь на обновления!` : `Today we'll talk about "${topic}". This is a relevant topic that interests many people.\n\n🔹 First important point — understanding the basics.\n🔹 Second aspect — practice.\n🔹 Third point — continuous learning.\n\n💡 Conclusion: "${topic}" is worth studying for everyone!`}`;
          break;
        case 'article':
          content = `# ${topic}\n\n${language === 'ru' ? `## Введение\n\nВ данной статье мы подробно рассмотрим тему "${topic}". Это комплексный материал, который охватывает все ключевые аспекты.\n\n## Основная часть\n\n### 1. Исторический контекст\n\nТема "${topic}" имеет глубокие корни и богатую историю развития.\n\n### 2. Современное состояние\n\nНа сегодняшний день "${topic}" продолжает развиваться и приобретать новые формы.\n\n### 3. Перспективы развития\n\nЭксперты прогнозируют значительный рост в данной области.\n\n## Заключение\n\n"${topic}" — это динамично развивающаяся область, которая заслуживает внимания каждого.` : `# ${topic}\n\n## Introduction\n\nIn this article, we'll explore "${topic}" in detail.\n\n## Main Part\n\n### 1. Historical Context\n### 2. Current State\n### 3. Future Prospects\n\n## Conclusion\n\n"${topic}" is a dynamically developing field.`}`;
          break;
        case 'video':
          content = `🎬 ${language === 'ru' ? 'Сценарий видео' : 'Video Script'}: "${topic}"\n\n${language === 'ru' ? `[00:00] Вступление — приветствие зрителей\n[00:30] Основная тема: ${topic}\n[02:00] Демонстрация примеров\n[04:00] Практические советы\n[06:00] Заключение и призыв к действию\n\n🎵 Фоновая музыка: мотивирующая\n🎤 Озвучка: ${selectedModel === 'auto' ? 'Silero TTS' : selectedModel}\n🎨 Визуальный стиль: современный, минималистичный` : `[00:00] Intro — greeting\n[00:30] Main topic: ${topic}\n[02:00] Examples demonstration\n[04:00] Practical tips\n[06:00] Conclusion and CTA`}`;
          break;
        case 'music':
          content = `🎵 ${language === 'ru' ? 'Музыкальная композиция' : 'Music Track'}: "${topic}"\n\n${language === 'ru' ? `Жанр: Поп/Электроника\nТемп: 120 BPM\nНастроение: Энергичное, позитивное\nДлительность: 3:30\n\nСтруктура:\n- Интро (0:00-0:15)\n- Куплет 1 (0:15-0:45)\n- Припев (0:45-1:15)\n- Куплет 2 (1:15-1:45)\n- Припев (1:45-2:15)\n- Бридж (2:15-2:45)\n- Финал (2:45-3:30)\n\n🎤 Текст песни сгенерирован на тему "${topic}"` : `Genre: Pop/Electronic\nTempo: 120 BPM\nMood: Energetic, positive\nDuration: 3:30`}`;
          break;
      }

      if (includeAd) {
        content += `\n\n---\n📢 ${language === 'ru' ? '[Рекламный блок]' : '[Ad Block]'} — ${language === 'ru' ? 'Ваша реклама здесь' : 'Your ad here'}\n---`;
      }

      setGeneratedContent(content);
      setIsGenerating(false);

      addPost({
        id: Date.now().toString(),
        title: topic,
        content,
        topic,
        type: contentType,
        status: 'ready',
        createdAt: new Date().toISOString(),
        socialNetworks: [],
        hasAudio: generateAudio,
        hasVideo: generateVideo,
        hasImage: generateImage,
        aiModel: selectedModel === 'auto' ? 'AutoML' : selectedModel,
        views: 0,
        likes: 0,
      });
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.contentGenerator}</h1>
      <p className="text-slate-600 mb-8">{language === 'ru' ? 'Создавайте контент с помощью AI-нейросетей' : 'Create content with AI neural networks'}</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Content Type */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">{language === 'ru' ? 'Тип контента' : 'Content Type'}</h3>
            <div className="grid grid-cols-2 gap-2">
              {contentTypes.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setContentType(ct.id)}
                  className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition ${
                    contentType === ct.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ct.icon size={16} />
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">{language === 'ru' ? 'Режим работы' : 'Mode'}</h3>
            <div className="flex gap-2">
              <button onClick={() => setMode('auto')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'auto' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Sparkles size={14} className="inline mr-1" /> {t.autoMode}
              </button>
              <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'manual' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {t.manualMode}
              </button>
            </div>
          </div>

          {/* AI Model */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">{t.aiModel}</h3>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-sm"
            >
              <option value="auto">{language === 'ru' ? '🤖 Автоматический выбор' : '🤖 Auto selection'}</option>
              {aiModels.filter(m => {
                if (contentType === 'video') return m.type === 'video';
                if (contentType === 'music') return m.type === 'audio';
                return m.type === 'text' || m.type === 'image';
              }).map(model => (
                <option key={model.id} value={model.id}>{model.name} {model.free ? '(Free)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-900 mb-3">{language === 'ru' ? 'Дополнительно' : 'Options'}</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={generateAudio} onChange={e => setGenerateAudio(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
              <Volume2 size={16} className="text-slate-500" />
              <span className="text-sm">{t.generateAudio}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={generateVideo} onChange={e => setGenerateVideo(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
              <Film size={16} className="text-slate-500" />
              <span className="text-sm">{t.generateVideoContent}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={generateImage} onChange={e => setGenerateImage(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
              <Image size={16} className="text-slate-500" />
              <span className="text-sm">{t.generateImage}</span>
            </label>
            <hr className="my-2" />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={seoEnabled} onChange={e => setSeoEnabled(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
              <Sparkles size={16} className="text-slate-500" />
              <span className="text-sm">{t.seoOptimization}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={geoEnabled} onChange={e => setGeoEnabled(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
              <Globe size={16} className="text-slate-500" />
              <span className="text-sm">{t.geoTargeting}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={moderation} onChange={e => setModeration(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
              <Shield size={16} className="text-slate-500" />
              <span className="text-sm">{t.contentModeration}</span>
            </label>
            <hr className="my-2" />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={includeAd} onChange={e => setIncludeAd(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
              <span className="text-sm">{language === 'ru' ? '📢 Включить рекламный блок' : '📢 Include ad block'}</span>
            </label>
            {includeAd && (
              <select value={adPosition} onChange={e => setAdPosition(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm ml-7">
                <option value="inline">{language === 'ru' ? 'В середине текста' : 'Middle of text'}</option>
                <option value="bottom">{language === 'ru' ? 'В конце' : 'At the bottom'}</option>
                <option value="top">{language === 'ru' ? 'В начале' : 'At the top'}</option>
              </select>
            )}
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Topic Input */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.topic}</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={t.enterTopic}
                className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !topic}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {t.generating}</> : <><Wand2 size={18} /> {t.generate}</>}
              </button>
            </div>
          </div>

          {/* Generated Content */}
          <div className="bg-white rounded-xl p-5 border border-slate-100 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Результат генерации' : 'Generated Content'}</h3>
              {generatedContent && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <Check size={12} /> {language === 'ru' ? 'Готово' : 'Ready'}
                  </span>
                  {moderation && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1">
                      <Shield size={12} /> {language === 'ru' ? 'Модерация ✓' : 'Moderated ✓'}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {generatedContent ? (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-4 rounded-lg font-sans leading-relaxed">
                  {generatedContent}
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  {generateAudio && <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">🎤 {language === 'ru' ? 'Озвучка готова' : 'Audio ready'}</span>}
                  {generateVideo && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">🎬 {language === 'ru' ? 'Видео готово' : 'Video ready'}</span>}
                  {generateImage && <span className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full">🖼️ {language === 'ru' ? 'Изображение готово' : 'Image ready'}</span>}
                  {seoEnabled && <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">🔍 SEO</span>}
                  {geoEnabled && <span className="px-3 py-1 bg-cyan-50 text-cyan-700 text-xs rounded-full">🌍 GEO</span>}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Mic size={48} className="mb-4 opacity-30" />
                <p>{language === 'ru' ? 'Введите тему и нажмите "Сгенерировать"' : 'Enter a topic and click "Generate"'}</p>
              </div>
            )}
          </div>

          {/* AI Models Info */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">{language === 'ru' ? 'Доступные бесплатные нейросети' : 'Available free neural networks'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {aiModels.map(model => (
                <div key={model.id} className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-sm font-medium text-slate-900">{model.name}</p>
                  <p className="text-xs text-slate-500">{model.type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
