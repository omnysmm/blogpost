import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import {
  Wand2, FileText, Video, Music, Image, Mic, Film, Sparkles, Check, Loader2,
  Volume2, Globe, Shield, Clock, Calendar, Play, Pause, Trash2, Plus,
  Share2, AlertCircle, Settings, Scissors, AudioLines
} from 'lucide-react';
import SocialIcon from '../components/SocialIcon';
import RichTextEditor from '../components/RichTextEditor';
import CalendarPicker from '../components/CalendarPicker';
import EditPostModal from '../components/EditPostModal';
import { generateText, generateImage as aiGenerateImage, generateAudio, checkGenerationLimit } from '../services/ai';
import { buildImagePrompt } from '../services/contentEngine';
import { publishToTelegram } from '../services/telegram';
import { getDueIso } from '../services/scheduler';
import type { Post } from '../store/types';

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

type ContentKind = 'post' | 'article' | 'video' | 'music' | 'voiceover' | 'editing';

interface AutoTask {
  id: string;
  name: string;
  contentType: ContentKind;
  frequency: 'hourly' | 'daily' | 'weekly' | 'custom';
  schedule: { time: string; days: string[] };
  /** Calendar dates YYYY-MM-DD for auto-publish */
  scheduledDates?: string[];
  networks: string[];
  topics: string[];
  active: boolean;
  lastRun?: string;
  nextRun?: string;
  generatedCount: number;
}

interface SocialConnectionLite {
  network: string;
  name: string;
  connected: boolean;
}

const NETWORKS = [
  { id: 'vk', name: 'VK' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'ok', name: 'ОК' },
  { id: 'rutube', name: 'Rutube' },
];

function loadConnectedNetworks(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('blogpost_socials');
    if (!raw) return {};
    const list = JSON.parse(raw) as SocialConnectionLite[];
    const map: Record<string, boolean> = {};
    list.forEach(s => { map[s.network] = !!s.connected; });
    return map;
  } catch {
    return {};
  }
}

function htmlToPlain(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export default function ContentGeneratorPage() {
  const {
    language, addPost, currentUser, posts, updatePost, deletePost, moderatePost,
    enqueueForPublish, processDuePosts,
    recordPublication, loadPosts, loadAnalytics, setCurrentPage,
  } = useStore();
  const t = translations[language];
  const ru = language === 'ru';

  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  const [contentType, setContentType] = useState<ContentKind>('post');
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [generateAudioOpt, setGenerateAudioOpt] = useState(false);
  const [generateVideoOpt, setGenerateVideoOpt] = useState(false);
  const [generateImageOpt, setGenerateImageOpt] = useState(true);
  const [seoEnabled, setSeoEnabled] = useState(true);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [moderation, setModeration] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string | null>(null);

  // Content payload
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoScript, setVideoScript] = useState('');
  const [musicLyrics, setMusicLyrics] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);

  // Publishing
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>(loadConnectedNetworks);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [includeAd, setIncludeAd] = useState(false);
  const [adPosition, setAdPosition] = useState('inline');
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hoveredNet, setHoveredNet] = useState<string | null>(null);
  const [modNote, setModNote] = useState<Record<string, string>>({});
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Auto-generation
  const [autoTasks, setAutoTasks] = useState<AutoTask[]>([
    {
      id: '1',
      name: ru ? 'Ежедневные посты о технологиях' : 'Daily tech posts',
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
      name: ru ? 'Еженедельные статьи' : 'Weekly articles',
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

  // Refresh connection status when page mounts / socials change
  useEffect(() => {
    setConnectedMap(loadConnectedNetworks());
  }, []);

  const contentTypes: { id: ContentKind; icon: typeof FileText; label: string }[] = [
    { id: 'post', icon: FileText, label: ru ? 'Пост' : 'Post' },
    { id: 'article', icon: Image, label: ru ? 'Статья' : 'Article' },
    { id: 'video', icon: Video, label: ru ? 'Видео' : 'Video' },
    { id: 'music', icon: Music, label: ru ? 'Музыка' : 'Music' },
    { id: 'voiceover', icon: AudioLines, label: ru ? 'Озвучивание' : 'Voiceover' },
    { id: 'editing', icon: Scissors, label: ru ? 'Монтаж' : 'Editing' },
  ];

  const isTextType = contentType === 'post' || contentType === 'article';
  const supportsImage = contentType === 'post' || contentType === 'article';

  const buildPrompt = (kind: ContentKind, theme: string): string => {
    const base = ru
      ? `Тема запроса: «${theme}». Пиши СТРОГО о ней, без общих шаблонных фраз. Конкретика, факты, шаги, примеры именно про «${theme}». Формат — готовый текст материала.`
      : `Topic: «${theme}». Write STRICTLY about it, no generic filler. Be concrete about «${theme}». Return final content only.`;
    if (ru) {
      switch (kind) {
        case 'post':
          return `Создай пост для соцсетей. ${base}\nДо 500 символов, живой стиль, эмодзи, 3–5 хештегов по теме.`;
        case 'article':
          return `Напиши полную статью. ${base}\nЗаголовок, введение, подразделы с пользой, заключение. 1200–2000 символов.`;
        case 'video':
          return `Напиши сценарий видеоролика. ${base}\nТайм-коды, реплики ведущего, визуальные подсказки — показывай предмет/тему запроса.`;
        case 'music':
          return `Напиши текст песни. ${base}\nКуплет, припев, бридж — образы строго из темы запроса.`;
        case 'voiceover':
          return `Напиши текст для озвучки. ${base}\n4–7 предложений, разговорный стиль, только по теме.`;
        case 'editing':
          return `Опиши план монтажа. ${base}\nСцены, склейки, тайм-коды, титры, музыка — под тему запроса.`;
      }
    }
    switch (kind) {
      case 'post':
        return `Write a social media post. ${base}\nUp to 500 chars, emojis, 3–5 hashtags.`;
      case 'article':
        return `Write a full article. ${base}\nTitle, intro, useful sections, conclusion. 1200–2000 chars.`;
      case 'video':
        return `Write a video script. ${base}\nTimestamps, host lines, visuals of the actual subject.`;
      case 'music':
        return `Write song lyrics. ${base}\nVerse, chorus, bridge with images from the topic.`;
      case 'voiceover':
        return `Write a voiceover script. ${base}\n4–7 sentences, conversational.`;
      case 'editing':
        return `Describe an editing plan. ${base}\nScenes, cuts, timestamps, titles, music.`;
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (currentUser) {
      const { allowed } = await checkGenerationLimit(currentUser.id, currentUser.subscription);
      if (!allowed) {
        alert(ru ? 'Лимит генераций исчерпан. Обновите тариф.' : 'Generation limit reached. Upgrade your plan.');
        return;
      }
    }

    setIsGenerating(true);
    setGenStatus(ru ? 'Генерируем текст по теме…' : 'Generating text for topic…');
    setAudioUrl(null);

    try {
      const prompt = buildPrompt(contentType, topic.trim());
      let content = await generateText({
        prompt,
        language,
        tone: 'creative',
      });

      // Bind secondary fields by type
      if (contentType === 'video') setVideoScript(content);
      if (contentType === 'music') setMusicLyrics(content);
      if (contentType === 'voiceover') setVoiceText(htmlToPlain(content));
      if (contentType === 'editing') setEditNotes(content);

      // Image for the same topic (post / article always when enabled; video/editing optional)
      if (generateImageOpt && supportsImage) {
        setGenStatus(ru ? `Генерируем изображение по теме «${topic}»…` : `Generating image for «${topic}»…`);
        try {
          const imagePrompt = buildImagePrompt(topic, language);
          const imageUrl = await aiGenerateImage({ prompt: imagePrompt, width: 1024, height: 640 });
          if (imageUrl) {
            setGeneratedImage(imageUrl);
            // Escape quotes in attributes; keep query string intact
            const src = imageUrl.replace(/"/g, '&quot;');
            const alt = topic.replace(/"/g, '');
            content = `<p><img src="${src}" alt="${alt}" style="max-width:100%;border-radius:12px;display:block" /></p>\n\n${content}`;
          } else {
            setGenStatus(ru ? 'Изображение не удалось создать — текст готов.' : 'Image failed — text is ready.');
          }
        } catch (e) {
          console.warn('Image generation failed:', e);
          setGenStatus(ru ? 'Изображение не удалось создать — текст готов.' : 'Image failed — text is ready.');
        }
      }

      // Voiceover audio for voiceover type (and optional for others)
      if (contentType === 'voiceover' || generateAudioOpt) {
        const speakText = contentType === 'voiceover' ? (voiceText || htmlToPlain(content)) : htmlToPlain(content).slice(0, 500);
        if (speakText) {
          setGenStatus(ru ? 'Озвучиваем текст…' : 'Generating voiceover…');
          try {
            const url = await generateAudio({ text: speakText });
            if (url) setAudioUrl(url);
          } catch (e) {
            console.warn('Audio generation failed:', e);
          }
        }
      }

      // Video stub note when video type + generateVideo
      if (contentType === 'video' || generateVideoOpt) {
        content = `🎬 ${ru ? 'Видеоролик по теме' : 'Video on topic'}: «${topic}»\n\n${content}`;
      }

      if (includeAd) {
        const adLabels: Record<string, string> = {
          inline: `📢 [${ru ? 'Рекламный блок — в тексте' : 'Ad block — in text'}]`,
          bottom: `📢 [${ru ? 'Рекламный блок — внизу' : 'Ad block — bottom'}]`,
          top: `📢 [${ru ? 'Рекламный блок — в начале' : 'Ad block — top'}]`,
          'video-preroll': `🎬 [PRE-ROLL ${ru ? 'реклама' : 'ad'}]`,
          'video-midroll': `🎬 [MID-ROLL ${ru ? 'реклама' : 'ad'}]`,
          'video-postroll': `🎬 [POST-ROLL ${ru ? 'реклама' : 'ad'}]`,
          'video-overlay': `🎬 [OVERLAY ${ru ? 'реклама' : 'ad'}]`,
        };
        content += `\n\n---\n${adLabels[adPosition] || '📢 [Ad]'}\n---`;
      }

      const html = content
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
      const finalHtml = `<p>${html}</p>`;

      setGeneratedHtml(finalHtml);
      setGenStatus(null);
      setIsGenerating(false);

      const newPostId = Date.now().toString();
      setCurrentPostId(newPostId);
      addPost({
        id: newPostId,
        title: topic,
        content: finalHtml,
        topic,
        type: contentType === 'post' || contentType === 'article' || contentType === 'video' || contentType === 'music' ? contentType : 'post',
        status: moderation ? 'moderating' : 'queued',
        createdAt: new Date().toISOString(),
        socialNetworks: [],
        hasAudio: contentType === 'voiceover' || generateAudioOpt,
        hasVideo: contentType === 'video' || contentType === 'editing' || generateVideoOpt,
        hasImage: !!generatedImage || !!uploadedImage,
        aiModel: selectedModel === 'auto' ? 'AutoML' : selectedModel,
        views: 0,
        likes: 0,
      });
    } catch (error) {
      console.error('Generation failed:', error);
      setGenStatus(null);
      setIsGenerating(false);
      alert(error instanceof Error ? error.message : (ru ? 'Ошибка генерации. Попробуйте ещё раз.' : 'Generation failed. Try again.'));
    }
  };

  const handleManualSave = () => {
    const body = generatedHtml || videoScript || musicLyrics || editNotes || voiceText;
    if (!body && !uploadedImage) return;
    const id = currentPostId || Date.now().toString();
    const image = uploadedImage || generatedImage;
    const contentHtml = image
      ? `<p><img src="${image}" alt="${topic || 'image'}" style="max-width:100%;border-radius:12px" /></p>\n\n${body}`
      : body;

    if (currentPostId) {
      updatePost(id, {
        content: contentHtml,
        title: topic || htmlToPlain(body).slice(0, 40) || 'Draft',
        topic,
        hasImage: !!image,
        hasAudio: !!audioUrl,
        hasVideo: contentType === 'video' || contentType === 'editing',
      });
    } else {
      setCurrentPostId(id);
      addPost({
        id,
        title: topic || htmlToPlain(body).slice(0, 40) || 'Draft',
        content: contentHtml,
        topic,
        type: contentType === 'post' || contentType === 'article' || contentType === 'video' || contentType === 'music' ? contentType : 'post',
        status: moderation ? 'moderating' : 'queued',
        createdAt: new Date().toISOString(),
        socialNetworks: [],
        hasAudio: !!audioUrl,
        hasVideo: contentType === 'video' || contentType === 'editing',
        hasImage: !!image,
        aiModel: selectedModel === 'auto' ? 'AutoML' : selectedModel,
        views: 0,
        likes: 0,
      });
    }
  };

  const toggleNetwork = (id: string) => {
    if (!connectedMap[id]) return;
    setSelectedNetworks(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const handlePublish = async () => {
    const body = generatedHtml || videoScript || musicLyrics || editNotes || voiceText;
    if (!body || selectedNetworks.length === 0) return;
    setPublishStatus(null);

    const successfulNetworks: string[] = [];
    const successNetworkIds: string[] = [];
    const errors: string[] = [];

    for (const network of selectedNetworks) {
      if (!connectedMap[network]) {
        errors.push(`${network}: ${ru ? 'соединение не настроено' : 'connection not configured'}`);
        continue;
      }
      try {
        if (network === 'telegram') {
          const result = await publishToTelegram(topic || 'BlogPost', htmlToPlain(body));
          if (result.success) {
            successfulNetworks.push('Telegram');
            successNetworkIds.push('telegram');
          } else {
            errors.push(`Telegram: ${result.error}`);
          }
        } else {
          successfulNetworks.push(network.charAt(0).toUpperCase() + network.slice(1));
          successNetworkIds.push(network);
        }
      } catch (err: any) {
        errors.push(`${network}: ${err.message || 'error'}`);
      }
    }

    try {
      if (successNetworkIds.length > 0) {
        setPublishStatus({
          type: 'success',
          text: ru ? `Опубликовано: ${successfulNetworks.join(', ')}` : `Published to: ${successfulNetworks.join(', ')}`,
        });

        let postId = currentPostId;
        const image = uploadedImage || generatedImage;
        const contentHtml = image
          ? `<p><img src="${image}" alt="${topic}" style="max-width:100%;border-radius:12px" /></p>\n\n${body}`
          : body;

        if (!postId) {
          postId = Date.now().toString();
          setCurrentPostId(postId);
          addPost({
            id: postId,
            title: topic || 'BlogPost',
            content: contentHtml,
            topic: topic || '',
            type: contentType === 'post' || contentType === 'article' || contentType === 'video' || contentType === 'music' ? contentType : 'post',
            status: 'published',
            createdAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            socialNetworks: successNetworkIds,
            hasAudio: !!audioUrl,
            hasVideo: contentType === 'video' || contentType === 'editing',
            hasImage: !!image,
            aiModel: selectedModel === 'auto' ? 'AutoML' : selectedModel,
            views: 0,
            likes: 0,
          });
        } else {
          updatePost(postId, {
            status: 'published',
            content: contentHtml,
            title: topic || 'BlogPost',
            socialNetworks: successNetworkIds,
            publishedAt: new Date().toISOString(),
          });
        }

        for (const network of successNetworkIds) {
          await recordPublication(network, postId);
        }
        await loadPosts();
        await loadAnalytics();
        setTimeout(() => setPublishStatus(null), 5000);
      }
      if (errors.length > 0) {
        setPublishStatus({ type: 'error', text: errors.join('\n') });
        setTimeout(() => setPublishStatus(null), 10000);
      }
    } catch (err: any) {
      setPublishStatus({ type: 'error', text: `Ошибка: ${err.message}` });
    }
  };

  const handleSchedule = () => {
    const body = generatedHtml || videoScript || musicLyrics || editNotes || voiceText;
    if (!body) return;
    if (!scheduleDays.length && !scheduleDate) return;

    handleManualSave();
    const id = currentPostId;
    if (!id) return;

    // Prefer multi-day calendar; fallback to single date
    const days = scheduleDays.length ? scheduleDays : [scheduleDate];
    const nets = selectedNetworks.filter(n => connectedMap[n]);
    enqueueForPublish(id, days.length === 1 ? `${days[0]}T${scheduleTime || '10:00'}` : undefined, days, scheduleTime || '10:00', nets);
    setPublishStatus({
      type: 'success',
      text: ru
        ? `В очереди на публикацию: ${days.length} дн. (${days.slice(0, 3).join(', ')}${days.length > 3 ? '…' : ''})`
        : `Queued for publish: ${days.length} day(s)`,
    });
  };

  // Queue / Archive / Moderation lists
  const queuePosts = posts
    .filter(p => ['moderating', 'queued', 'scheduled', 'ready', 'rejected'].includes(p.status))
    .sort((a, b) => (getDueIso(a) || a.createdAt).localeCompare(getDueIso(b) || b.createdAt));
  const archivePosts = posts
    .filter(p => p.status === 'published')
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      moderating: { label: ru ? 'На модерации' : 'Moderating', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
      queued: { label: ru ? 'В очереди' : 'Queued', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
      scheduled: { label: ru ? 'По расписанию' : 'Scheduled', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      ready: { label: ru ? 'Готов' : 'Ready', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      published: { label: ru ? 'Опубликовано' : 'Published', cls: 'bg-green-50 text-green-700 border-green-200' },
      rejected: { label: ru ? 'Отклонено' : 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
      draft: { label: ru ? 'Черновик' : 'Draft', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
      generating: { label: ru ? 'Генерация' : 'Generating', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    };
    const b = map[s] || map.draft;
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${b.cls}`}>{b.label}</span>;
  };

  const canModerate = !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'user');

  const frequencyLabels = {
    hourly: ru ? 'Каждый час' : 'Hourly',
    daily: ru ? 'Ежедневно' : 'Daily',
    weekly: ru ? 'Еженедельно' : 'Weekly',
    custom: ru ? 'Настраиваемое' : 'Custom',
  };

  const dayLabels: Record<string, string> = {
    mon: ru ? 'Пн' : 'Mon', tue: ru ? 'Вт' : 'Tue', wed: ru ? 'Ср' : 'Wed',
    thu: ru ? 'Чт' : 'Thu', fri: ru ? 'Пт' : 'Fri', sat: ru ? 'Сб' : 'Sat', sun: ru ? 'Вс' : 'Sun',
  };

  const connectedCount = useMemo(() => NETWORKS.filter(n => connectedMap[n.id]).length, [connectedMap]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.contentGenerator}</h1>
      <p className="text-slate-600 mb-6">
        {ru ? 'Создавайте и публикуйте контент по вашей теме с помощью AI' : 'Create and publish content on your topic with AI'}
      </p>

      {/* Tabs: generation settings / auto */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 border border-slate-100">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === 'manual' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Wand2 size={16} />
          {ru ? 'Создание контента' : 'Content creation'}
        </button>
        <button
          onClick={() => setActiveTab('auto')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === 'auto' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={16} />
          {ru ? 'Автогенерация' : 'Auto-generation'}
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Left: settings — normal flow, no sticky (blocks stay put on scroll) */}
          <div className="lg:col-span-1 space-y-6 relative z-0">
            {/* Content type */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3">{ru ? 'Тип контента' : 'Content type'}</h3>
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
              <p className="text-xs text-slate-500 mt-3">
                {contentType === 'post' && (ru ? 'Короткий текст для соцсетей + изображение по теме.' : 'Short social text + topic image.')}
                {contentType === 'article' && (ru ? 'Развёрнутая статья с заголовками + иллюстрация.' : 'Long-form article with headings + illustration.')}
                {contentType === 'video' && (ru ? 'Сценарий видеоролика с хронометражом.' : 'Video script with timeline.')}
                {contentType === 'music' && (ru ? 'Текст песни: куплет, припев, бридж.' : 'Song lyrics: verse, chorus, bridge.')}
                {contentType === 'voiceover' && (ru ? 'Текст для начитки и аудио-озвучка.' : 'Voiceover script and audio.')}
                {contentType === 'editing' && (ru ? 'План монтажа: сцены, склейки, эффекты.' : 'Editing plan: scenes, cuts, effects.')}
              </p>
            </div>

            {/* Mode */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3">{ru ? 'Режим работы' : 'Mode'}</h3>
              <div className="flex gap-2">
                <button onClick={() => setMode('auto')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'auto' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Sparkles size={14} className="inline mr-1" /> {t.autoMode}
                </button>
                <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'manual' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {t.manualMode}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {mode === 'auto'
                  ? (ru ? 'AI создаст материал строго по вашей теме.' : 'AI will create material strictly on your topic.')
                  : (ru ? 'Вы сами пишете текст, добавляете картинки и эмодзи.' : 'You write text yourself, add images and emojis.')}
              </p>
            </div>

            {/* AI model */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3">{t.aiModel}</h3>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg text-sm">
                <option value="auto">{ru ? '🤖 Автоматический выбор' : '🤖 Auto selection'}</option>
                {aiModels.filter(m => {
                  if (contentType === 'video' || contentType === 'editing') return m.type === 'video' || m.type === 'text';
                  if (contentType === 'music') return m.type === 'audio' || m.type === 'text';
                  if (contentType === 'voiceover') return m.type === 'audio' || m.type === 'text';
                  return m.type === 'text' || m.type === 'image';
                }).map(model => (
                  <option key={model.id} value={model.id}>{model.name} {model.free ? '(Free)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 mb-3">{ru ? 'Дополнительно' : 'Options'}</h3>
              {(contentType === 'post' || contentType === 'article' || contentType === 'video' || contentType === 'editing') && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={generateImageOpt} onChange={e => setGenerateImageOpt(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
                  <Image size={16} className="text-slate-500" />
                  <span className="text-sm">{ru ? 'Изображение по теме' : 'Image for the topic'}</span>
                </label>
              )}
              {contentType !== 'voiceover' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={generateAudioOpt} onChange={e => setGenerateAudioOpt(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
                  <Volume2 size={16} className="text-slate-500" />
                  <span className="text-sm">{t.generateAudio}</span>
                </label>
              )}
              {(contentType === 'video' || contentType === 'editing') && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={generateVideoOpt} onChange={e => setGenerateVideoOpt(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
                  <Film size={16} className="text-slate-500" />
                  <span className="text-sm">{ru ? 'Видеоряд / монтаж' : 'Video / editing'}</span>
                </label>
              )}
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
                <span className="text-sm">{ru ? '📢 Рекламный блок' : '📢 Ad block'}</span>
              </label>
              {includeAd && (
                <select value={adPosition} onChange={e => setAdPosition(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                  <option value="inline">{ru ? 'В середине текста' : 'Middle of text'}</option>
                  <option value="bottom">{ru ? 'В конце' : 'At the bottom'}</option>
                  <option value="top">{ru ? 'В начале' : 'At the top'}</option>
                  <option value="video-preroll">🎬 Pre-roll</option>
                  <option value="video-midroll">🎬 Mid-roll</option>
                  <option value="video-postroll">🎬 Post-roll</option>
                  <option value="video-overlay">🎬 Overlay</option>
                </select>
              )}
            </div>

            {/* Select networks — next to Options */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 relative">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-900">{ru ? 'Выберите соцсети' : 'Select networks'}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${connectedCount ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {ru ? `Активных: ${connectedCount}` : `Active: ${connectedCount}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {ru ? 'Доступны только соцсети с настроенным соединением.' : 'Only networks with a configured connection are available.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NETWORKS.map(network => {
                  const active = !!connectedMap[network.id];
                  const selected = selectedNetworks.includes(network.id);
                  return (
                    <div key={network.id} className="relative isolate">
                      <button
                        type="button"
                        onClick={() => toggleNetwork(network.id)}
                        onMouseEnter={() => setHoveredNet(network.id)}
                        onMouseLeave={() => setHoveredNet(null)}
                        disabled={!active}
                        className={`w-full p-2.5 rounded-lg border flex items-center gap-2 transition ${
                          selected ? 'border-blue-500 bg-blue-50' : active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <SocialIcon id={network.id} size={20} />
                        <span className="text-sm font-medium">{network.name}</span>
                        {selected && <Check size={14} className="ml-auto text-blue-500" />}
                        {!active && <span className="ml-auto text-[10px] text-slate-400">{ru ? 'нет связи' : 'no link'}</span>}
                      </button>

                      {!active && hoveredNet === network.id && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl">
                          <p className="mb-1.5">
                            {ru
                              ? `Требуется настройка соединения с ${network.name}.`
                              : `You need to set up a connection with ${network.name}.`}
                          </p>
                          <button
                            type="button"
                            onClick={() => setCurrentPage('settings')}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-400 rounded-md font-medium"
                          >
                            <Settings size={12} />
                            {ru ? 'Настройки соединения' : 'Connection settings'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Adaptation — bottom of Select networks */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2 text-sm">{ru ? 'Адаптация под соцсети' : 'Network adaptation'}</h4>
                <div className="space-y-1.5 text-sm text-slate-600">
                  <p>✅ {ru ? 'SEO-оптимизация для каждой платформы' : 'SEO per platform'}</p>
                  <p>✅ {ru ? 'GEO-таргетинг по регионам' : 'Geo-targeting'}</p>
                  <p>✅ {ru ? 'Формат под требования сети' : 'Format per network'}</p>
                  <p>✅ {ru ? 'Хештеги по теме публикации' : 'Topic hashtags'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center: topic + content + queue + archive */}
          <div className="lg:col-span-2 space-y-6 relative z-0">
            {/* Topic */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {ru ? 'Тема публикации' : 'Publication topic'}
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && mode === 'auto' && handleGenerate()}
                  placeholder={ru ? 'Например: польза утренней зарядки' : 'e.g.: benefits of morning exercise'}
                  className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {mode === 'auto' && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {t.generating}</> : <><Wand2 size={18} /> {t.generate}</>}
                  </button>
                )}
              </div>
              {genStatus && (
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> {genStatus}
                </p>
              )}
            </div>

            {/* Result / Manual editor */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-bold text-slate-900">
                  {mode === 'auto' ? (ru ? 'Результат генерации' : 'Generated content') : (ru ? 'Ваш материал' : 'Your content')}
                </h3>
                <div className="flex items-center gap-2">
                  {mode === 'manual' && (
                    <button
                      onClick={handleManualSave}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700"
                    >
                      {ru ? 'Сохранить черновик' : 'Save draft'}
                    </button>
                  )}
                  {moderation && (generatedHtml || mode === 'manual') && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1">
                      <Shield size={12} /> {ru ? 'Модерация ✓' : 'Moderated ✓'}
                    </span>
                  )}
                </div>
              </div>

              {/* Type-specific manual fields */}
              {mode === 'manual' && (contentType === 'video' || contentType === 'editing') && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {contentType === 'video' ? (ru ? 'Сценарий / тайм-коды' : 'Script / timeline') : (ru ? 'План монтажа (сцены, склейки, эффекты)' : 'Editing plan (scenes, cuts, effects)')}
                  </label>
                  <RichTextEditor
                    value={contentType === 'video' ? videoScript : editNotes}
                    onChange={contentType === 'video' ? setVideoScript : setEditNotes}
                    placeholder={ru ? 'Опишите сцены, склейки, титры…' : 'Describe scenes, cuts, titles…'}
                    minHeight={220}
                    allowImageUpload
                    uploadedImage={uploadedImage}
                    onImageUpload={url => setUploadedImage(url)}
                    onRemoveImage={() => setUploadedImage(null)}
                  />
                </div>
              )}

              {mode === 'manual' && contentType === 'music' && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Текст песни / ноты' : 'Lyrics / notes'}</label>
                  <RichTextEditor
                    value={musicLyrics}
                    onChange={setMusicLyrics}
                    placeholder={ru ? 'Куплет, припев, бридж…' : 'Verse, chorus, bridge…'}
                    minHeight={220}
                  />
                </div>
              )}

              {mode === 'manual' && contentType === 'voiceover' && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Текст для озвучивания' : 'Voiceover text'}</label>
                    <RichTextEditor
                      value={voiceText}
                      onChange={setVoiceText}
                      placeholder={ru ? 'Текст, который будет начитан…' : 'Text to be spoken…'}
                      minHeight={180}
                    />
                  </div>
                  {audioUrl && (
                    <audio controls src={audioUrl} className="w-full" />
                  )}
                </div>
              )}

              {/* Main text editor (post / article / and as common editor) */}
              {(isTextType || mode === 'auto') && (
                <div>
                  {mode === 'manual' && (
                    <p className="text-xs text-slate-500 mb-2">
                      {ru ? 'Форматирование, ссылки, смайлы и эмодзи — на панели выше. Можно прикрепить изображение.' : 'Formatting, links, emojis on the toolbar. You can attach an image.'}
                    </p>
                  )}
                  <RichTextEditor
                    value={generatedHtml}
                    onChange={setGeneratedHtml}
                    placeholder={
                      mode === 'manual'
                        ? (ru ? `Напишите ${contentType === 'article' ? 'статью' : 'пост'} на тему «${topic || '…'}»…` : `Write your ${contentType} about «${topic || '…'}»…`)
                        : (ru ? 'Результат появится здесь после генерации…' : 'Result will appear here…')
                    }
                    minHeight={320}
                    allowImageUpload={supportsImage}
                    uploadedImage={uploadedImage}
                    onImageUpload={url => setUploadedImage(url)}
                    onRemoveImage={() => setUploadedImage(null)}
                  />
                </div>
              )}

              {/* Generated image preview */}
              {generatedImage && !uploadedImage && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    {ru ? `Изображение по теме «${topic}»` : `Image for topic «${topic}»`}
                  </p>
                  <img
                    src={generatedImage}
                    alt={topic}
                    className="max-h-56 rounded-xl border border-slate-200 bg-slate-50"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (!el.dataset.fallback) {
                        el.dataset.fallback = '1';
                        el.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#e2e8f0"/><text x="320" y="200" text-anchor="middle" fill="#64748b" font-size="20">${topic}</text></svg>`
                        )}`;
                      }
                    }}
                  />
                </div>
              )}

              {/* Audio preview for optional voice */}
              {mode === 'auto' && audioUrl && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">{ru ? 'Озвучка' : 'Voiceover'}</p>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              )}

              {/* Publish — bottom-right of generation result */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {publishStatus && (
                  <div className={`mb-3 p-3 rounded-lg text-sm flex items-start gap-2 ${publishStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {publishStatus.type === 'success' ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                    <span className="whitespace-pre-line">{publishStatus.text}</span>
                  </div>
                )}
                <div className="flex items-center justify-end gap-3">
                  {selectedNetworks.length === 0 && (
                    <span className="text-xs text-slate-400">
                      {ru ? 'Выберите хотя бы одну соцсеть' : 'Select at least one network'}
                    </span>
                  )}
                  <button
                    onClick={async () => { handleManualSave(); await handlePublish(); }}
                    disabled={(!(generatedHtml || voiceText || videoScript || musicLyrics || editNotes)) || selectedNetworks.length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <Share2 size={18} /> {t.publishNow}
                  </button>
                </div>
              </div>
            </div>

            {/* ═══ QUEUE (under Generation result, right content) ═══ */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">{ru ? 'Очередь на публикацию' : 'Publication queue'}</h3>
                <button
                  onClick={async () => {
                    const n = await processDuePosts();
                    await loadPosts();
                    setPublishStatus({
                      type: 'success',
                      text: n > 0
                        ? (ru ? `Автопубликация выполнена: ${n}` : `Auto-published: ${n}`)
                        : (ru ? 'Нет постов, готовых к публикации сейчас' : 'No posts due right now'),
                    });
                  }}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium"
                >
                  {ru ? 'Проверить сейчас' : 'Run now'}
                </button>
              </div>
              {queuePosts.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  {ru ? 'Очередь пуста. Сгенерируйте контент и добавьте в расписание.' : 'Queue is empty. Generate content and schedule it.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {queuePosts.map(p => {
                    const due = getDueIso(p);
                    return (
                      <div key={p.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-slate-900 truncate">{p.title || p.topic}</p>
                              {statusBadge(p.status)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {p.type}
                              {due && <> • {ru ? 'следующая' : 'next'}: {new Date(due).toLocaleString(ru ? 'ru-RU' : 'en-US')}</>}
                              {p.scheduledDates?.length ? <> • {ru ? 'дней' : 'days'}: {p.scheduledDates.length}</> : null}
                              {p.socialNetworks?.length ? <> • {p.socialNetworks.join(', ')}</> : null}
                            </p>
                            {p.moderationNote && (
                              <p className={`text-xs mt-1 ${p.status === 'rejected' ? 'text-red-600' : 'text-green-600'}`}>{p.moderationNote}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingPost(p)}
                                className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 font-medium"
                                title={ru ? 'Редактировать' : 'Edit'}
                              >
                                {ru ? 'Править' : 'Edit'}
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(ru ? `Удалить «${p.title || p.topic}» из очереди на модерацию?` : `Delete «${p.title || p.topic}» from moderation queue?`)) {
                                    deletePost(p.id);
                                  }
                                }}
                                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-1"
                                title={ru ? 'Удалить из очереди' : 'Delete from queue'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            {canModerate && (p.status === 'moderating' || p.status === 'rejected' || p.status === 'ready') && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => moderatePost(p.id, 'approve', modNote[p.id] || 'Одобрено')}
                                  className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                                  title={ru ? 'Одобрить' : 'Approve'}
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => moderatePost(p.id, 'reject', modNote[p.id] || 'Отклонено модератором')}
                                  className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                                  title={ru ? 'Отклонить' : 'Reject'}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => setExpandedPost(expandedPost === p.id ? null : p.id)}
                              className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 text-slate-600"
                            >
                              {expandedPost === p.id ? (ru ? 'Скрыть' : 'Hide') : (ru ? 'Ещё' : 'More')}
                            </button>
                          </div>
                        </div>

                        {expandedPost === p.id && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            <div
                              className="text-xs text-slate-700 bg-slate-50 rounded p-2 max-h-40 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: p.content }}
                            />
                            {canModerate && (
                              <div className="flex gap-2 flex-wrap">
                                <input
                                  value={modNote[p.id] || ''}
                                  onChange={e => setModNote(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  placeholder={ru ? 'Комментарий модерации…' : 'Moderation note…'}
                                  className="flex-1 min-w-[160px] p-2 border border-slate-200 rounded text-xs"
                                />
                                <button
                                  onClick={() => moderatePost(p.id, 'approve', modNote[p.id] || 'Одобрено')}
                                  className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg"
                                >
                                  {ru ? 'Одобрить' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => moderatePost(p.id, 'reject', modNote[p.id] || 'Отклонено')}
                                  className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg"
                                >
                                  {ru ? 'Отклонить' : 'Reject'}
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm(ru ? 'Удалить этот пост из очереди?' : 'Delete this post from queue?')) {
                                  deletePost(p.id);
                                }
                              }}
                              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-1"
                            >
                              <Trash2 size={12} /> {ru ? 'Удалить из очереди' : 'Remove from queue'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══ ARCHIVE ═══ */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3">{ru ? 'Архив' : 'Archive'}</h3>
              {archivePosts.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  {ru ? 'Здесь появятся опубликованные посты.' : 'Published posts will appear here.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {archivePosts.slice(0, 20).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-slate-50">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                        <Check size={14} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.title || p.topic}</p>
                        <p className="text-xs text-slate-500">
                          {p.publishedAt ? new Date(p.publishedAt).toLocaleString(ru ? 'ru-RU' : 'en-US') : ''}
                          {p.socialNetworks?.length ? ` • ${p.socialNetworks.join(', ')}` : ''}
                        </p>
                      </div>
                      {statusBadge(p.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit post modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          language={language}
          onSave={(id, updates) => updatePost(id, updates)}
          onClose={() => setEditingPost(null)}
        />
      )}

      {/* ═══ Auto-generation tab ═══ */}

      {/* Auto-generation tab */}
      {activeTab === 'auto' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{ru ? 'Автоматическая генерация' : 'Automatic generation'}</h2>
              <p className="text-slate-600 mt-1">{ru ? 'AI создаёт контент по темам и публикует по расписанию' : 'AI creates content on topics and publishes on schedule'}</p>
            </div>
            <button onClick={() => setShowCreateTask(true)} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium flex items-center gap-2">
              <Plus size={18} /> {ru ? 'Создать задачу' : 'Create task'}
            </button>
          </div>

          <div className="space-y-4">
            {autoTasks.map(task => (
              <div key={task.id} className={`bg-white rounded-xl border ${task.active ? 'border-slate-100' : 'border-slate-100 opacity-60'} p-5`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    task.contentType === 'post' ? 'bg-blue-100' :
                    task.contentType === 'article' ? 'bg-green-100' :
                    task.contentType === 'video' ? 'bg-purple-100' :
                    task.contentType === 'music' ? 'bg-amber-100' :
                    task.contentType === 'voiceover' ? 'bg-cyan-100' : 'bg-slate-100'
                  }`}>
                    {task.contentType === 'post' && <FileText size={20} className="text-blue-600" />}
                    {task.contentType === 'article' && <Image size={20} className="text-green-600" />}
                    {task.contentType === 'video' && <Video size={20} className="text-purple-600" />}
                    {task.contentType === 'music' && <Music size={20} className="text-amber-600" />}
                    {task.contentType === 'voiceover' && <AudioLines size={20} className="text-cyan-600" />}
                    {task.contentType === 'editing' && <Scissors size={20} className="text-slate-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900">{task.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                      <span>{frequencyLabels[task.frequency]}</span>
                      <span>•</span>
                      <span>{task.schedule.time}</span>
                      <span>•</span>
                      <span>{ru ? 'Создано' : 'Created'}: {task.generatedCount}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {task.topics.map((th, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">{th}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {task.networks.map(n => (
                        <span key={n} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded flex items-center gap-1">
                          <SocialIcon id={n} size={14} /> {n.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAutoTasks(prev => prev.map(x => x.id === task.id ? { ...x, active: !x.active } : x))} className="p-2 rounded-lg hover:bg-slate-50">
                      {task.active ? <Pause size={18} className="text-yellow-600" /> : <Play size={18} className="text-green-600" />}
                    </button>
                    <button onClick={() => setAutoTasks(prev => prev.filter(x => x.id !== task.id))} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showCreateTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateTask(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
                <h3 className="font-bold text-xl">{ru ? 'Новая задача' : 'New task'}</h3>
                <input
                  value={newTask.name || ''}
                  onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder={ru ? 'Название задачи' : 'Task name'}
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
                <div className="grid grid-cols-3 gap-2">
                  {contentTypes.map(ct => (
                    <button
                      key={ct.id}
                      onClick={() => setNewTask({ ...newTask, contentType: ct.id })}
                      className={`p-2 rounded-lg border text-xs font-medium ${newTask.contentType === ct.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
                <input
                  value={newTask.topics?.join(', ') || ''}
                  onChange={e => setNewTask({ ...newTask, topics: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder={ru ? 'Темы через запятую' : 'Topics, comma separated'}
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
                <div className="grid grid-cols-3 gap-2">
                  {NETWORKS.map(n => {
                    const active = !!connectedMap[n.id];
                    return (
                      <button
                        key={n.id}
                        disabled={!active}
                        onClick={() => {
                          const nets = newTask.networks || [];
                          setNewTask({ ...newTask, networks: nets.includes(n.id) ? nets.filter(x => x !== n.id) : [...nets, n.id] });
                        }}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-1 ${!active ? 'opacity-50' : newTask.networks?.includes(n.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                      >
                        <SocialIcon id={n.id} size={14} /> {n.name}
                      </button>
                    );
                  })}
                </div>

                {/* Schedule / calendar — bottom of New Task modal */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{ru ? 'По расписанию / календарь' : 'Schedule / calendar'}</h4>
                    <span className="text-xs text-slate-500">
                      {ru ? `Дней: ${scheduleDays.length}` : `Days: ${scheduleDays.length}`}
                    </span>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-slate-100">
                    <CalendarPicker selected={scheduleDays} onChange={setScheduleDays} language={language} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">{ru ? 'Время публикации' : 'Publish time'}</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">{ru ? 'Или одна дата' : 'Or single date'}</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {ru
                      ? 'Задача будет создавать и ставить в очередь посты на выбранные дни.'
                      : 'The task will generate and queue posts on the selected days.'}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (!newTask.name || !newTask.topics?.length) return;
                      const days = scheduleDays.length
                        ? scheduleDays
                        : (scheduleDate ? [scheduleDate] : []);
                      setAutoTasks(prev => [...prev, {
                        id: Date.now().toString(),
                        name: newTask.name!,
                        contentType: newTask.contentType || 'post',
                        frequency: newTask.frequency || 'daily',
                        schedule: { time: scheduleTime || '10:00', days: [] },
                        scheduledDates: days,
                        networks: newTask.networks || [],
                        topics: newTask.topics!,
                        active: true,
                        generatedCount: 0,
                      }]);
                      setScheduleDays([]);
                      setScheduleDate('');
                      setShowCreateTask(false);
                    }}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
                  >
                    {ru ? 'Создать' : 'Create'}
                  </button>
                  <button onClick={() => setShowCreateTask(false)} className="px-4 py-3 bg-slate-100 rounded-lg">{ru ? 'Отмена' : 'Cancel'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
