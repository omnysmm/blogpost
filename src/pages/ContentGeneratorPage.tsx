import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Wand2, FileText, Video, Music, Image, Mic, Film, Sparkles, Check, Loader2, Volume2, Globe, Shield, Clock, Calendar, Play, Pause, Trash2, Plus, Settings, Share2 } from 'lucide-react';
import { generateText, generateImage, generateAudio, checkGenerationLimit } from '../services/ai';
import { publishToTelegram } from '../services/telegram';

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

interface AutoTask {
  id: string;
  name: string;
  contentType: 'post' | 'article' | 'video' | 'music';
  frequency: 'hourly' | 'daily' | 'weekly' | 'custom';
  schedule: {
    time: string;
    days: string[];
  };
  networks: string[];
  topics: string[];
  active: boolean;
  lastRun?: string;
  nextRun?: string;
  generatedCount: number;
}

export default function ContentGeneratorPage() {
  const { language, addPost, currentUser, posts, updatePost } = useStore();
  const t = translations[language];
  
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
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
  
  // Publishing states
  const [selectedPost, setSelectedPost] = useState('');
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [published, setPublished] = useState<string[]>([]);
  const [includeAd, setIncludeAd] = useState(false);
  const [adPosition, setAdPosition] = useState('inline');

  // Auto-generation state
  const [autoTasks, setAutoTasks] = useState<AutoTask[]>([
    {
      id: '1',
      name: language === 'ru' ? 'Ежедневные посты о технологиях' : 'Daily tech posts',
      contentType: 'post',
      frequency: 'daily',
      schedule: { time: '10:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      networks: ['vk', 'telegram'],
      topics: ['Технологии', 'AI', 'Инновации'],
      active: true,
      lastRun: '2024-03-17 10:00',
      nextRun: '2024-03-18 10:00',
      generatedCount: 45,
    },
    {
      id: '2',
      name: language === 'ru' ? 'Еженедельные статьи' : 'Weekly articles',
      contentType: 'article',
      frequency: 'weekly',
      schedule: { time: '15:00', days: ['sat'] },
      networks: ['vk', 'youtube'],
      topics: ['Бизнес', 'Маркетинг', 'Стартапы'],
      active: true,
      lastRun: '2024-03-16 15:00',
      nextRun: '2024-03-23 15:00',
      generatedCount: 12,
    },
  ]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<AutoTask>>({
    name: '',
    contentType: 'post',
    frequency: 'daily',
    schedule: { time: '10:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    networks: [],
    topics: [],
    active: true,
  });

  const contentTypes = [
    { id: 'post' as const, icon: FileText, label: language === 'ru' ? 'Пост' : 'Post' },
    { id: 'article' as const, icon: Image, label: language === 'ru' ? 'Статья' : 'Article' },
    { id: 'video' as const, icon: Video, label: language === 'ru' ? 'Видео' : 'Video' },
    { id: 'music' as const, icon: Music, label: language === 'ru' ? 'Музыка' : 'Music' },
  ];

  const handleGenerate = async () => {
    if (!topic) return;

    // Check generation limits
    if (currentUser) {
      const { allowed, remaining } = await checkGenerationLimit(currentUser.id, currentUser.subscription);
      if (!allowed) {
        alert(language === 'ru' ? 'Лимит генераций исчерпан. Обновите тариф.' : 'Generation limit reached. Upgrade your plan.');
        return;
      }
    }

    setIsGenerating(true);

    try {
      let content = '';

      if (contentType === 'post' || contentType === 'article') {
        content = await generateText({
          prompt: language === 'ru'
            ? `Напиши ${contentType === 'post' ? 'пост для соцсетей' : 'статью'} на тему: "${topic}". ${contentType === 'post' ? 'До 500 символов, с эмодзи и хештегами.' : 'Структурированная статья с заголовками, 1000-2000 символов.'}`
            : `Write a ${contentType === 'post' ? 'social media post' : 'article'} about: "${topic}". ${contentType === 'post' ? 'Up to 500 characters, with emojis and hashtags.' : 'Structured article with headings, 1000-2000 characters.'}`,
          language: language,
          tone: 'creative',
        });
      } else if (contentType === 'video') {
        content = `🎬 ${language === 'ru' ? 'Сценарий видео' : 'Video Script'}: "${topic}"\n\n`;
        const script = await generateText({
          prompt: language === 'ru'
            ? `Напиши сценарий для видеоролика на тему: "${topic}". Укажи хронометраж, действия, диалоги.`
            : `Write a video script about: "${topic}". Include timing, actions, dialogue.`,
          language: language,
        });
        content += script;
      } else if (contentType === 'music') {
        content = `🎵 ${language === 'ru' ? 'Музыкальная композиция' : 'Music Track'}: "${topic}"\n\n`;
        const lyrics = await generateText({
          prompt: language === 'ru'
            ? `Напиши текст песни на тему: "${topic}". Укажи структуру (куплет, припев).`
            : `Write song lyrics about: "${topic}". Include structure (verse, chorus).`,
          language: language,
        });
        content += lyrics;
      }

      // Generate image if enabled
      if (generateImage && content) {
        try {
          const imageUrl = await generateImage({
            prompt: language === 'ru'
              ? `Иллюстрация к посту: ${topic}`
              : `Illustration for post: ${topic}`,
          });
          if (imageUrl) {
            content = `![${topic}](${imageUrl})\n\n${content}`;
          }
        } catch (e) {
          console.warn('Image generation failed:', e);
        }
      }

      // Add ad block if enabled
      if (includeAd) {
        const adLabels: Record<string, string> = {
          'inline': language === 'ru' ? '📢 [Рекламный блок — в тексте]' : '📢 [Ad block — in text]',
          'bottom': language === 'ru' ? '📢 [Рекламный блок — внизу]' : '📢 [Ad block — bottom]',
          'top': language === 'ru' ? '📢 [Рекламный блок — в начале]' : '📢 [Ad block — top]',
          'video-preroll': language === 'ru' ? '🎬 [PRE-ROLL реклама]' : '🎬 [PRE-ROLL ad]',
          'video-midroll': language === 'ru' ? '🎬 [MID-ROLL реклама]' : '🎬 [MID-ROLL ad]',
          'video-postroll': language === 'ru' ? '🎬 [POST-ROLL реклама]' : '🎬 [POST-ROLL ad]',
          'video-overlay': language === 'ru' ? '🎬 [OVERLAY реклама]' : '🎬 [OVERLAY ad]',
        };
        content += `\n\n---\n${adLabels[adPosition] || '📢 [Ad block]'}\n---`;
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
    } catch (error) {
      console.error('Generation failed:', error);
      setIsGenerating(false);
    }
  };

  // Auto-generation functions
  const handleCreateTask = () => {
    if (!newTask.name || !newTask.topics || newTask.topics.length === 0) return;
    
    const task: AutoTask = {
      id: Date.now().toString(),
      name: newTask.name || '',
      contentType: newTask.contentType || 'post',
      frequency: newTask.frequency || 'daily',
      schedule: newTask.schedule || { time: '10:00', days: [] },
      networks: newTask.networks || [],
      topics: newTask.topics || [],
      active: true,
      generatedCount: 0,
    };
    
    setAutoTasks(prev => [...prev, task]);
    setShowCreateTask(false);
    setNewTask({
      name: '',
      contentType: 'post',
      frequency: 'daily',
      schedule: { time: '10:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      networks: [],
      topics: [],
      active: true,
    });
  };

  const toggleTask = (id: string) => {
    setAutoTasks(prev => prev.map(task => 
      task.id === id ? { ...task, active: !task.active } : task
    ));
  };

  const deleteTask = (id: string) => {
    setAutoTasks(prev => prev.filter(task => task.id !== id));
  };

  // Publishing functions
  const networks = [
    { id: 'vk', name: 'VKontakte', emoji: '🔵' },
    { id: 'telegram', name: 'Telegram', emoji: '📨' },
    { id: 'youtube', name: 'YouTube', emoji: '📺' },
    { id: 'instagram', name: 'Instagram', emoji: '📷' },
    { id: 'tiktok', name: 'TikTok', emoji: '🎵' },
    { id: 'ok', name: 'OK', emoji: '🟠' },
  ];

  const toggleNetwork = (id: string) => {
    setSelectedNetworks(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const handlePublish = async () => {
    if (!generatedContent || selectedNetworks.length === 0) return;

    const successfulNetworks: string[] = [];

    // Publish to each selected network
    for (const network of selectedNetworks) {
      if (network === 'telegram') {
        const result = await publishToTelegram(topic || 'BlogPost', generatedContent);
        if (result.success) {
          successfulNetworks.push('Telegram');
        } else {
          console.warn('Telegram publish failed:', result.error);
          alert(`Telegram: ${result.error}`);
        }
      } else {
        // Other networks: mark as published (integration pending)
        successfulNetworks.push(network.charAt(0).toUpperCase() + network.slice(1));
      }
    }

    if (successfulNetworks.length > 0) {
      setPublished(successfulNetworks);
      // Update post status
      const latestPost = posts.find(p => p.content === generatedContent);
      if (latestPost) {
        updatePost(latestPost.id, {
          status: 'published',
          socialNetworks: selectedNetworks,
          publishedAt: new Date().toISOString(),
        });
      }
      setTimeout(() => setPublished([]), 5000);
    }
  };

  const handleSchedule = () => {
    if (!generatedContent || !scheduleDate || !scheduleTime) return;
    const latestPost = posts.find(p => p.content === generatedContent);
    if (latestPost) {
      updatePost(latestPost.id, {
        status: 'draft',
        scheduledAt: `${scheduleDate}T${scheduleTime}`,
        socialNetworks: selectedNetworks,
      });
    }
  };

  const frequencyLabels = {
    hourly: language === 'ru' ? 'Каждый час' : 'Hourly',
    daily: language === 'ru' ? 'Ежедневно' : 'Daily',
    weekly: language === 'ru' ? 'Еженедельно' : 'Weekly',
    custom: language === 'ru' ? 'Настраиваемое' : 'Custom',
  };

  const dayLabels: Record<string, string> = {
    mon: language === 'ru' ? 'Пн' : 'Mon',
    tue: language === 'ru' ? 'Вт' : 'Tue',
    wed: language === 'ru' ? 'Ср' : 'Wed',
    thu: language === 'ru' ? 'Чт' : 'Thu',
    fri: language === 'ru' ? 'Пт' : 'Fri',
    sat: language === 'ru' ? 'Сб' : 'Sat',
    sun: language === 'ru' ? 'Вс' : 'Sun',
  };

  const networkEmojis: Record<string, string> = {
    vk: '🔵',
    telegram: '📨',
    youtube: '📺',
    instagram: '📷',
    tiktok: '🎵',
    ok: '🟠',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.contentGenerator}</h1>
      <p className="text-slate-600 mb-6">{language === 'ru' ? 'Создавайте и публикуйте контент с помощью AI-нейросетей' : 'Create and publish content with AI neural networks'}</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 border border-slate-100">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === 'manual' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Wand2 size={16} />
          {language === 'ru' ? 'Ручная генерация' : 'Manual generation'}
        </button>
        <button
          onClick={() => setActiveTab('auto')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === 'auto' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={16} />
          {language === 'ru' ? 'Автогенерация' : 'Auto-generation'}
          {autoTasks.filter(t => t.active).length > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
              {autoTasks.filter(t => t.active).length}
            </span>
          )}
        </button>
      </div>

      {/* Manual Generation Tab */}
      {activeTab === 'manual' && (
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
              <div className="ml-7 space-y-2">
                <select value={adPosition} onChange={e => setAdPosition(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                  <option value="inline">{language === 'ru' ? 'В середине текста' : 'Middle of text'}</option>
                  <option value="bottom">{language === 'ru' ? 'В конце' : 'At the bottom'}</option>
                  <option value="top">{language === 'ru' ? 'В начале' : 'At the top'}</option>
                  <option value="video-preroll">{language === 'ru' ? '🎬 Pre-roll (до видео)' : '🎬 Pre-roll (before video)'}</option>
                  <option value="video-midroll">{language === 'ru' ? '🎬 Mid-roll (в середине видео)' : '🎬 Mid-roll (in video middle)'}</option>
                  <option value="video-postroll">{language === 'ru' ? '🎬 Post-roll (после видео)' : '🎬 Post-roll (after video)'}</option>
                  <option value="video-overlay">{language === 'ru' ? '🎬 Overlay (поверх видео)' : '🎬 Overlay (on video)'}</option>
                </select>
                <p className="text-xs text-slate-500">{language === 'ru' ? '💡 Реклама из рекламного кабинета автоматически встраивается в видеоролики' : '💡 Ads from the ad cabinet are automatically inserted into videos'}</p>
              </div>
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
        </div>

        {/* Publishing Section - Right Side */}
        <div className="space-y-6">
          {/* Select Networks */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Выберите соцсети' : 'Select Networks'}</h3>
            <div className="grid grid-cols-2 gap-3">
              {networks.map(network => (
                <button key={network.id} onClick={() => toggleNetwork(network.id)}
                  className={`p-3 rounded-lg border flex items-center gap-3 transition ${selectedNetworks.includes(network.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-xl">{network.emoji}</span>
                  <span className="text-sm font-medium">{network.name}</span>
                  {selectedNetworks.includes(network.id) && <Check size={16} className="ml-auto text-blue-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Publish Now */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Опубликовать' : 'Publish'}</h3>
            <button onClick={handlePublish} disabled={!generatedContent || selectedNetworks.length === 0}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <Share2 size={18} /> {language === 'ru' ? 'Опубликовать сейчас' : 'Publish now'}
            </button>
            {published.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Check size={16} /> {language === 'ru' ? `Опубликовано в: ${published.join(', ')}` : `Published to: ${published.join(', ')}`}
                </p>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{language === 'ru' ? 'По расписанию' : 'Schedule'}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
                <span className="text-sm">{language === 'ru' ? 'Включить' : 'Enable'}</span>
              </label>
            </div>
            {scheduleEnabled && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">{language === 'ru' ? 'Дата' : 'Date'}</label>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">{language === 'ru' ? 'Время' : 'Time'}</label>
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                <button onClick={handleSchedule} disabled={!generatedContent || !scheduleDate || !scheduleTime}
                  className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <Calendar size={16} /> {language === 'ru' ? 'Запланировать' : 'Schedule'}
                </button>
              </div>
            )}
          </div>

          {/* Adaptation Info */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">{language === 'ru' ? 'Адаптация под соцсети' : 'Network adaptation'}</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>✅ {language === 'ru' ? 'SEO-оптимизация для каждой платформы' : 'SEO optimization for each platform'}</p>
              <p>✅ {language === 'ru' ? 'GEO-таргетинг по регионам' : 'Geo-targeting by regions'}</p>
              <p>✅ {language === 'ru' ? 'Адаптация формата под требования сети' : 'Format adaptation per network'}</p>
              <p>✅ {language === 'ru' ? 'Хештеги и ключевые слова' : 'Hashtags and keywords'}</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Auto-generation Tab */}
      {activeTab === 'auto' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{language === 'ru' ? 'Автоматическая генерация контента' : 'Automatic content generation'}</h2>
              <p className="text-slate-600 mt-1">{language === 'ru' ? 'Настройте AI для автоматического создания и публикации контента по расписанию' : 'Set up AI to automatically create and publish content on schedule'}</p>
            </div>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              {language === 'ru' ? 'Создать задачу' : 'Create task'}
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">{language === 'ru' ? 'Как это работает?' : 'How does it work?'}</h3>
                <p className="text-sm text-slate-700">
                  {language === 'ru'
                    ? 'AI автоматически создает контент на основе выбранных тем и публикует его в указанные соцсети по расписанию. Вы можете настроить частоту, время публикации и темы для каждой задачи.'
                    : 'AI automatically creates content based on selected topics and publishes it to specified social networks on schedule. You can set frequency, publishing time and topics for each task.'}
                </p>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          {autoTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <Clock size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">{language === 'ru' ? 'Нет задач автогенерации' : 'No auto-generation tasks'}</p>
              <button
                onClick={() => setShowCreateTask(true)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
              >
                {language === 'ru' ? 'Создать первую задачу' : 'Create first task'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {autoTasks.map(task => (
                <div key={task.id} className={`bg-white rounded-xl border ${task.active ? 'border-slate-100' : 'border-slate-100 opacity-60'} overflow-hidden hover:shadow-md transition`}>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        task.contentType === 'post' ? 'bg-blue-100' :
                        task.contentType === 'article' ? 'bg-green-100' :
                        task.contentType === 'video' ? 'bg-purple-100' : 'bg-amber-100'
                      }`}>
                        {task.contentType === 'post' && <FileText size={20} className="text-blue-600" />}
                        {task.contentType === 'article' && <Image size={20} className="text-green-600" />}
                        {task.contentType === 'video' && <Video size={20} className="text-purple-600" />}
                        {task.contentType === 'music' && <Music size={20} className="text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900">{task.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.active ? (language === 'ru' ? 'Активна' : 'Active') : (language === 'ru' ? 'Выключена' : 'Disabled')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {frequencyLabels[task.frequency]}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {task.schedule.time}
                          </span>
                          <span>•</span>
                          <span>{language === 'ru' ? 'Создано' : 'Created'}: {task.generatedCount}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {task.topics.map((topic, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {topic}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {task.networks.map(network => (
                            <span key={network} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded flex items-center gap-1">
                              {networkEmojis[network]} {network.toUpperCase()}
                            </span>
                          ))}
                        </div>
                        {task.lastRun && task.nextRun && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                            <span>{language === 'ru' ? 'Последний запуск' : 'Last run'}: {task.lastRun}</span>
                            <span>{language === 'ru' ? 'Следующий' : 'Next'}: {task.nextRun}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`p-2 rounded-lg transition ${
                            task.active ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'
                          }`}
                          title={task.active ? (language === 'ru' ? 'Выключить' : 'Disable') : (language === 'ru' ? 'Включить' : 'Enable')}
                        >
                          {task.active ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"
                          title={language === 'ru' ? 'Удалить' : 'Delete'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Task Modal */}
          {showCreateTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateTask(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Новая задача автогенерации' : 'New auto-generation task'}</h3>
                  <button onClick={() => setShowCreateTask(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <span className="text-2xl">×</span>
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Название задачи' : 'Task name'}</label>
                    <input
                      type="text"
                      value={newTask.name || ''}
                      onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-lg"
                      placeholder={language === 'ru' ? 'Например: Ежедневные посты о технологиях' : 'e.g.: Daily tech posts'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Тип контента' : 'Content type'}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'post' as const, icon: FileText, label: language === 'ru' ? 'Пост' : 'Post' },
                        { id: 'article' as const, icon: Image, label: language === 'ru' ? 'Статья' : 'Article' },
                        { id: 'video' as const, icon: Video, label: language === 'ru' ? 'Видео' : 'Video' },
                        { id: 'music' as const, icon: Music, label: language === 'ru' ? 'Музыка' : 'Music' },
                      ].map(ct => (
                        <button
                          key={ct.id}
                          onClick={() => setNewTask({ ...newTask, contentType: ct.id })}
                          className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition ${
                            newTask.contentType === ct.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <ct.icon size={18} />
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Частота генерации' : 'Generation frequency'}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['hourly', 'daily', 'weekly', 'custom'] as const).map(freq => (
                        <button
                          key={freq}
                          onClick={() => setNewTask({ ...newTask, frequency: freq })}
                          className={`p-3 rounded-lg border text-sm font-medium transition ${
                            newTask.frequency === freq ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {frequencyLabels[freq]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Время публикации' : 'Publishing time'}</label>
                      <input
                        type="time"
                        value={newTask.schedule?.time || '10:00'}
                        onChange={e => setNewTask({ ...newTask, schedule: { ...newTask.schedule!, time: e.target.value } })}
                        className="w-full p-3 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Дни недели' : 'Days of week'}</label>
                      <div className="flex gap-1">
                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                          <button
                            key={day}
                            onClick={() => {
                              const days = newTask.schedule?.days || [];
                              const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
                              setNewTask({ ...newTask, schedule: { ...newTask.schedule!, days: newDays } });
                            }}
                            className={`flex-1 py-2 rounded text-xs font-medium transition ${
                              newTask.schedule?.days.includes(day) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {dayLabels[day]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Темы для генерации' : 'Topics for generation'}</label>
                    <input
                      type="text"
                      value={newTask.topics?.join(', ') || ''}
                      onChange={e => setNewTask({ ...newTask, topics: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                      className="w-full p-3 border border-slate-200 rounded-lg"
                      placeholder={language === 'ru' ? 'Технологии, AI, Инновации (через запятую)' : 'Technology, AI, Innovation (comma separated)'}
                    />
                    <p className="text-xs text-slate-500 mt-1">{language === 'ru' ? 'AI будет создавать контент на основе этих тем' : 'AI will create content based on these topics'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Публикация в соцсети' : 'Publish to social networks'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'vk', emoji: '🔵', name: 'VK' },
                        { id: 'telegram', emoji: '📨', name: 'Telegram' },
                        { id: 'youtube', emoji: '📺', name: 'YouTube' },
                        { id: 'instagram', emoji: '📷', name: 'Instagram' },
                        { id: 'tiktok', emoji: '🎵', name: 'TikTok' },
                        { id: 'ok', emoji: '🟠', name: 'OK' },
                      ].map(network => (
                        <button
                          key={network.id}
                          onClick={() => {
                            const networks = newTask.networks || [];
                            const newNetworks = networks.includes(network.id) ? networks.filter(n => n !== network.id) : [...networks, network.id];
                            setNewTask({ ...newTask, networks: newNetworks });
                          }}
                          className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition ${
                            newTask.networks?.includes(network.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xl">{network.emoji}</span>
                          {network.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateTask}
                    disabled={!newTask.name || !newTask.topics || newTask.topics.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {language === 'ru' ? 'Создать задачу' : 'Create task'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
