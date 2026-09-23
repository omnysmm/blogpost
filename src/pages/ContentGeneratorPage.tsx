import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import {
  Wand2, FileText, Video, Music, Image, Mic, Film, Sparkles, Check, Loader2,
  Volume2, Globe, Shield, Clock, Calendar, Play, Pause, Trash2, Plus,
  Share2, AlertCircle, Settings, Scissors, AudioLines, Edit3, Crown
} from 'lucide-react';
import SocialIcon from '../components/SocialIcon';
import RichTextEditor from '../components/RichTextEditor';
import CalendarPicker from '../components/CalendarPicker';
import EditPostModal from '../components/EditPostModal';
import { generateText, generateImage as aiGenerateImage, generateAudio, checkGenerationLimit } from '../services/ai';
import { buildImagePrompt } from '../services/contentEngine';
import { loadGeneratorPrefs, saveGeneratorPrefs } from '../services/persistence';
import { publishToTelegram } from '../services/telegram';
import { getDueIso } from '../services/scheduler';
import type { Post } from '../store/types';

const standardAiModels = [
  { id: 'yandexgpt', name: 'YandexGPT', type: 'text' },
  { id: 'gigachat', name: 'GigaChat', type: 'text' },
  { id: 'gpt2ru', name: 'GPT-2 Russian', type: 'text' },
  { id: 'kandinsky', name: 'Kandinsky', type: 'image' },
  { id: 'rudalle', name: 'RuDALL-E', type: 'image' },
  { id: 'silero', name: 'Silero TTS', type: 'audio' },
  { id: 'ruttsgan', name: 'RuTTS-GAN', type: 'audio' },
  { id: 'automl', name: 'AutoML Video', type: 'video' },
];

const premiumAiModels = [
  { id: 'gpt4o', name: 'GPT-4o', type: 'text' },
  { id: 'claude', name: 'Claude Opus', type: 'text' },
  { id: 'midjourney', name: 'Midjourney', type: 'image' },
  { id: 'dalle3', name: 'DALL·E 3', type: 'image' },
  { id: 'elevenlabs', name: 'ElevenLabs Voice', type: 'audio' },
  { id: 'suno', name: 'Suno Music', type: 'audio' },
  { id: 'runway', name: 'Runway Video', type: 'video' },
  { id: 'pika', name: 'Pika Labs', type: 'video' },
];

type ContentKind = 'post' | 'article' | 'video' | 'music' | 'voiceover' | 'editing';
type AutoTask = import('../store/types').AutoTask;

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
    autoTasks, loadAutoTasks, upsertAutoTask, removeAutoTask, processDueAutoTasks,
  } = useStore();
  const t = translations[language];
  const ru = language === 'ru';

  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  const [contentType, setContentType] = useState<ContentKind>('post');
  const [topic, setTopic] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [selectedPremiumModel, setSelectedPremiumModel] = useState('');
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
  const [showQueueAll, setShowQueueAll] = useState(false);
  const [showArchiveAll, setShowArchiveAll] = useState(false);

  // Auto-generation
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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

  useEffect(() => {
    loadAutoTasks();
    // Restore generator prefs (content type, mode, model, options, networks)
    if (currentUser?.id) {
      const prefs = loadGeneratorPrefs(currentUser.id);
      if (prefs.contentType) setContentType(prefs.contentType as ContentKind);
      if (prefs.mode) setMode(prefs.mode);
      if (prefs.selectedModel) setSelectedModel(prefs.selectedModel);
      if (prefs.selectedPremiumModel) setSelectedPremiumModel(prefs.selectedPremiumModel);
      if (typeof prefs.generateAudioOpt === 'boolean') setGenerateAudioOpt(prefs.generateAudioOpt);
      if (typeof prefs.generateVideoOpt === 'boolean') setGenerateVideoOpt(prefs.generateVideoOpt);
      if (typeof prefs.generateImageOpt === 'boolean') setGenerateImageOpt(prefs.generateImageOpt);
      if (typeof prefs.seoEnabled === 'boolean') setSeoEnabled(prefs.seoEnabled);
      if (typeof prefs.geoEnabled === 'boolean') setGeoEnabled(prefs.geoEnabled);
      if (typeof prefs.moderation === 'boolean') setModeration(prefs.moderation);
      if (typeof prefs.includeAd === 'boolean') setIncludeAd(prefs.includeAd);
      if (prefs.adPosition) setAdPosition(prefs.adPosition);
      if (Array.isArray(prefs.selectedNetworks)) {
        const connected = loadConnectedNetworks();
        setSelectedNetworks(prefs.selectedNetworks.filter(n => connected[n]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Persist generator prefs per user (survive refresh / re-login)
  useEffect(() => {
    if (!currentUser?.id) return;
    saveGeneratorPrefs(currentUser.id, {
      contentType,
      mode,
      selectedModel,
      selectedPremiumModel,
      generateAudioOpt,
      generateVideoOpt,
      generateImageOpt,
      seoEnabled,
      geoEnabled,
      moderation,
      includeAd,
      adPosition,
      selectedNetworks,
    });
  }, [currentUser?.id, contentType, mode, selectedModel, selectedPremiumModel, generateAudioOpt, generateVideoOpt, generateImageOpt, seoEnabled, geoEnabled, moderation, includeAd, adPosition, selectedNetworks]);

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
  const isPremiumPlan = currentUser?.subscription === 'premium';
  const activeAiModel = selectedPremiumModel || (selectedModel === 'auto' ? 'AutoML' : selectedModel);

  const buildPrompt = (kind: ContentKind, theme: string, extra = ''): string => {
    const base = ru
      ? `Тема запроса: «${theme}». Пиши СТРОГО о ней, без общих шаблонных фраз. Конкретика, факты, шаги, примеры именно про «${theme}». Формат — готовый текст материала.`
      : `Topic: «${theme}». Write STRICTLY about it, no generic filler. Be concrete about «${theme}». Return final content only.`;
    const marketing = ru
      ? `\nМаркетинг и SEO: цепляющее начало, вовлечение, ключевые слова из темы, обязательно хэштег #BlogPost, в конце — призыв к действию (лайк, комментарий, сохранить, поделиться).`
      : `\nMarketing & SEO: strong hook, engagement, keywords from the topic, include #BlogPost, end with CTA (like, comment, save, share).`;
    const custom = extra.trim()
      ? (ru
        ? `\nДополнительный промпт пользователя (учти обязательно):\n${extra.trim()}`
        : `\nUser prompt (follow strictly):\n${extra.trim()}`)
      : '';
    if (ru) {
      switch (kind) {
        case 'post':
          return `Создай пост для соцсетей. ${base}${marketing}${custom}\nДо 500 символов, живой стиль, эмодзи, 3–5 хештегов по теме + #BlogPost.`;
        case 'article':
          return `Напиши полную статью. ${base}${marketing}${custom}\nЗаголовок, введение, подразделы с пользой, заключение. 1200–2000 символов.`;
        case 'video':
          return `Напиши сценарий видеоролика. ${base}${marketing}${custom}\nТайм-коды, реплики ведущего, визуальные подсказки.`;
        case 'music':
          return `Напиши текст песни. ${base}${custom}\nКуплет, припев, бридж — образы из темы.`;
        case 'voiceover':
          return `Напиши текст для озвучки. ${base}${marketing}${custom}\n4–7 предложений, разговорный стиль.`;
        case 'editing':
          return `Опиши план монтажа. ${base}${custom}\nСцены, склейки, тайм-коды, титры, музыка.`;
      }
    }
    switch (kind) {
      case 'post':
        return `Write a social media post. ${base}${marketing}${custom}\nUp to 500 chars, emojis, hashtags + #BlogPost.`;
      case 'article':
        return `Write a full article. ${base}${marketing}${custom}\nTitle, intro, useful sections, conclusion. 1200–2000 chars.`;
      case 'video':
        return `Write a video script. ${base}${marketing}${custom}\nTimestamps, host lines, visuals.`;
      case 'music':
        return `Write song lyrics. ${base}${custom}\nVerse, chorus, bridge.`;
      case 'voiceover':
        return `Write a voiceover script. ${base}${marketing}${custom}\n4–7 sentences, conversational.`;
      case 'editing':
        return `Describe an editing plan. ${base}${custom}\nScenes, cuts, timestamps, titles, music.`;
    }
  };

  const handleGenerate = async () => {
    const hasTopic = !!topic.trim();
    const hasPrompt = !!userPrompt.trim();
    if (!hasTopic && !hasPrompt) return;
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
      const theme = topic.trim() || userPrompt.trim().slice(0, 80);
      const prompt = buildPrompt(contentType, theme, userPrompt);
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
        aiModel: activeAiModel,
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

  /** Text of the active content block (the one the user fills). */
  const getActiveBody = (): string => {
    if (contentType === 'video') return videoScript || (mode === 'auto' ? generatedHtml : '');
    if (contentType === 'music') return musicLyrics || (mode === 'auto' ? generatedHtml : '');
    if (contentType === 'voiceover') return voiceText || (mode === 'auto' ? generatedHtml : '');
    if (contentType === 'editing') return editNotes || (mode === 'auto' ? generatedHtml : '');
    return generatedHtml;
  };

  /** Plain text length of the active block must be at least 3 chars to enable Publish. */
  const activeBodyText = htmlToPlain(getActiveBody()).trim();
  const canPublish = activeBodyText.length >= 3 && selectedNetworks.length > 0;
  const canSchedule = activeBodyText.length >= 3;

  const handleManualSave = (): string | null => {
    const body = getActiveBody();
    if (htmlToPlain(body).trim().length < 3 && !uploadedImage) return currentPostId;
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
        aiModel: activeAiModel,
        views: 0,
        likes: 0,
      });
    }
    return id;
  };

  const toggleNetwork = (id: string) => {
    if (!connectedMap[id]) return;
    setSelectedNetworks(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const handlePublish = async () => {
    const body = getActiveBody();
    const bodyText = htmlToPlain(body).trim();
    if (bodyText.length < 3 || selectedNetworks.length === 0) return;
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
      if (successNetworkIds.length > 0 && errors.length === 0) {
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
            aiModel: activeAiModel,
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
        clearGeneratorForm();
        // Keep success toast visible; do not wipe it immediately
        setTimeout(() => setPublishStatus(null), 8000);
        return;
      }

      if (successNetworkIds.length > 0 && errors.length > 0) {
        // Partial success — save what was published, keep the form for retry of the rest
        setPublishStatus({
          type: 'error',
          text: ru
            ? `Частично опубликовано (${successfulNetworks.join(', ')}). Ошибки:\n${errors.join('\n')}\nТекст сохранён — можно повторить.`
            : `Partially published (${successfulNetworks.join(', ')}). Errors:\n${errors.join('\n')}\nContent kept for retry.`,
        });
        setTimeout(() => setPublishStatus(null), 12000);
        return;
      }

      if (errors.length > 0) {
        // Full failure — leave topic and result untouched
        setPublishStatus({ type: 'error', text: errors.join('\n') });
        setTimeout(() => setPublishStatus(null), 12000);
      }
    } catch (err: any) {
      setPublishStatus({ type: 'error', text: `Ошибка: ${err.message}` });
    }
  };

  /** Clear topic + generated result after successful publish/schedule. */
  /** Clear topic + generated result after successful publish/schedule. Keeps user prefs (type, mode, model, options, networks). */
  const clearGeneratorForm = () => {
    setTopic('');
    setUserPrompt('');
    setGeneratedHtml('');
    setGeneratedImage(null);
    setUploadedImage(null);
    setVoiceText('');
    setAudioUrl(null);
    setVideoScript('');
    setMusicLyrics('');
    setEditNotes('');
    setCurrentPostId(null);
    setScheduleDays([]);
    setScheduleDate('');
    setGenStatus(null);
  };

  const handleSchedule = () => {
    const body = getActiveBody();
    if (htmlToPlain(body).trim().length < 3 && !uploadedImage) return;
    if (!scheduleDays.length && !scheduleDate) {
      setPublishStatus({
        type: 'error',
        text: ru ? 'Выберите дату в календаре или одну дату.' : 'Pick calendar day(s) or a single date.',
      });
      return;
    }

    // Save first and use returned id (avoid stale currentPostId)
    const id = handleManualSave();
    if (!id) {
      setPublishStatus({
        type: 'error',
        text: ru ? 'Не удалось сохранить материал в очередь.' : 'Failed to save content to queue.',
      });
      return;
    }

    const days = scheduleDays.length ? scheduleDays : [scheduleDate];
    const nets = selectedNetworks.filter(n => connectedMap[n]);
    try {
      enqueueForPublish(
        id,
        days.length === 1 ? `${days[0]}T${scheduleTime || '10:00'}` : undefined,
        days,
        scheduleTime || '10:00',
        nets
      );
      void loadPosts();
      setPublishStatus({
        type: 'success',
        text: ru
          ? `Успешно добавлено в очередь: ${days.length} дн. (${days.slice(0, 3).join(', ')}${days.length > 3 ? '…' : ''}) в ${scheduleTime || '10:00'}`
          : `Queued: ${days.length} day(s) at ${scheduleTime || '10:00'}`,
      });
      clearGeneratorForm();
      setTimeout(() => setPublishStatus(null), 8000);
    } catch (e: any) {
      setPublishStatus({
        type: 'error',
        text: ru ? `Ошибка постановки в очередь: ${e?.message || e}` : `Queue error: ${e?.message || e}`,
      });
    }
  };

  // Queue / Archive / Moderation lists
  const queuePosts = posts
    .filter(p => ['moderating', 'queued', 'scheduled', 'ready', 'rejected'].includes(p.status))
    .sort((a, b) => (getDueIso(b) || b.createdAt).localeCompare(getDueIso(a) || a.createdAt));
  const archivePosts = posts
    .filter(p => p.status === 'published')
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));

  const VISIBLE_LIMIT = 3;
  const visibleQueue = showQueueAll ? queuePosts : queuePosts.slice(0, VISIBLE_LIMIT);
  const visibleArchive = showArchiveAll ? archivePosts : archivePosts.slice(0, VISIBLE_LIMIT);
  const hiddenQueueCount = Math.max(0, queuePosts.length - visibleQueue.length);
  const hiddenArchiveCount = Math.max(0, archivePosts.length - visibleArchive.length);

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

  const contentTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      post: ru ? 'Пост' : 'Post',
      article: ru ? 'Статья' : 'Article',
      video: ru ? 'Видео' : 'Video',
      music: ru ? 'Музыка' : 'Music',
      voiceover: ru ? 'Озвучивание' : 'Voiceover',
      editing: ru ? 'Монтаж' : 'Editing',
    };
    return map[type] || (ru ? 'Пост' : 'Post');
  };

  const formatDue = (iso: string | null) => {
    if (!iso) return ru ? 'без расписания' : 'unscheduled';
    return new Date(iso).toLocaleString(ru ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 mb-1">{t.aiModel}</h3>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{ru ? 'Стандарт' : 'Standard'}</label>
                <select
                  value={selectedPremiumModel ? 'auto' : selectedModel}
                  onChange={e => {
                    setSelectedModel(e.target.value);
                    setSelectedPremiumModel('');
                  }}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="auto">{ru ? '🤖 Автоматический выбор' : '🤖 Auto selection'}</option>
                  {standardAiModels.filter(m => {
                    if (contentType === 'video' || contentType === 'editing') return m.type === 'video' || m.type === 'text';
                    if (contentType === 'music') return m.type === 'audio' || m.type === 'text';
                    if (contentType === 'voiceover') return m.type === 'audio' || m.type === 'text';
                    return m.type === 'text' || m.type === 'image';
                  }).map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>

              {isPremiumPlan ? (
                <div>
                  <label className="block text-xs font-medium text-amber-600 mb-1">
                    {ru ? 'Премиум' : 'Premium'}
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                      {ru ? 'Премиум-тариф' : 'Premium plan'}
                    </span>
                  </label>
                  <select
                    value={selectedPremiumModel}
                    onChange={e => {
                      setSelectedPremiumModel(e.target.value);
                      if (e.target.value) setSelectedModel('auto');
                    }}
                    className="w-full p-3 border border-amber-200 bg-amber-50/40 rounded-lg text-sm"
                  >
                    <option value="">{ru ? '— Не использовать премиум —' : '— Don’t use premium —'}</option>
                    {premiumAiModels.filter(m => {
                      if (contentType === 'video' || contentType === 'editing') return m.type === 'video' || m.type === 'text';
                      if (contentType === 'music') return m.type === 'audio' || m.type === 'text';
                      if (contentType === 'voiceover') return m.type === 'audio' || m.type === 'text';
                      return m.type === 'text' || m.type === 'image';
                    }).map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-3">
                  <p className="text-xs text-amber-800 flex items-center gap-1.5">
                    <Crown size={14} className="shrink-0" />
                    {ru
                      ? 'Премиум-нейросети (GPT-4o, Claude, Midjourney…) — на тарифе «Премиум».'
                      : 'Premium AI (GPT-4o, Claude, Midjourney…) — on the Premium plan.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('subscriptions')}
                    className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                  >
                    {ru ? 'Смотреть тарифы' : 'View plans'}
                  </button>
                </div>
              )}
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  {ru ? 'Укажите тему публикации' : 'Specify publication topic'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {topic.length}/200
                </span>
              </div>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value.slice(0, 200))}
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && mode === 'auto') {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder={ru ? 'Например: польза утренней зарядки' : 'e.g.: benefits of morning exercise'}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {ru
                    ? 'Коротко опишите тему материала. Enter — генерация.'
                    : 'Briefly describe the topic. Enter — generate.'}
                </p>
                {mode === 'auto' && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !(topic.trim() || userPrompt.trim())}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {t.generating}</> : <><Wand2 size={18} /> {ru ? 'Сгенерировать' : 'Generate'}</>}
                  </button>
                )}
              </div>
              {genStatus && (
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> {genStatus}
                </p>
              )}
            </div>

            {/* или */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-sm font-medium text-slate-400">{ru ? 'или' : 'or'}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* User prompt for generation */}
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  {ru ? 'Напишите свой промпт' : 'Write your own prompt'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {userPrompt.length}/800
                </span>
              </div>
              <textarea
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value.slice(0, 800))}
                rows={3}
                placeholder={
                  ru
                    ? 'Например: сделай дружелюбный пост с 3 лайфхаками, без сложных терминов, добавь смайлики…'
                    : 'e.g.: friendly post with 3 tips, no jargon, add emojis…'
                }
                className="w-full p-3 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {ru
                    ? 'Дополнительные указания: тон, структура, что включить или исключить.'
                    : 'Extra instructions: tone, structure, what to include or skip.'}
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !(topic.trim() || userPrompt.trim())}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {t.generating}</> : <><Wand2 size={18} /> {ru ? 'Сгенерировать' : 'Generate'}</>}
                </button>
              </div>
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

              {/* Publish / Schedule — bottom of generation result */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {publishStatus && (
                  <div className={`mb-3 p-3 rounded-lg text-sm flex items-start gap-2 ${publishStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {publishStatus.type === 'success' ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                    <span className="whitespace-pre-line">{publishStatus.text}</span>
                  </div>
                )}

                {/* Schedule current post */}
                <div className="mb-3 rounded-lg border border-slate-100 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      <Calendar size={14} /> {ru ? 'Публикация по расписанию' : 'Scheduled publishing'}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">{ru ? 'Время' : 'Time'}</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>
                  <details className="text-xs text-slate-500">
                    <summary className="cursor-pointer text-blue-600">
                      {ru ? 'Календарь (несколько дней)' : 'Calendar (multiple days)'}
                    </summary>
                    <div className="mt-2 max-w-md">
                      <CalendarPicker selected={scheduleDays} onChange={setScheduleDays} language={language} />
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={!canSchedule}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Clock size={14} /> {ru ? 'Добавить в очередь по расписанию' : 'Add to schedule queue'}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3">
                  {!canPublish && (
                    <span className="text-xs text-slate-400">
                      {activeBodyText.length < 3
                        ? (ru ? 'Введите текст (мин. 3 символа)' : 'Enter text (min 3 chars)')
                        : (ru ? 'Выберите хотя бы одну соцсеть' : 'Select at least one network')}
                    </span>
                  )}
                  <button
                    onClick={async () => { handleManualSave(); await handlePublish(); }}
                    disabled={!canPublish}
                    title={canPublish ? (ru ? 'Опубликовать' : 'Publish') : (ru ? 'Нужен текст от 3 символов' : 'Need at least 3 characters')}
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
                  {visibleQueue.map(p => {
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
                              <span className="font-medium text-slate-600">{contentTypeLabel(p.type)}</span>
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

                        {/* Bottom-left: scheduled publish date & time */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Clock size={12} className="text-indigo-500" />
                            <span>
                              {ru ? 'Публикация:' : 'Publish at:'}{' '}
                              <span className="font-medium text-slate-700">{formatDue(due)}</span>
                            </span>
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
                  {hiddenQueueCount > 0 && (
                    <button type="button" onClick={() => setShowQueueAll(true)} className="w-full py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200">
                      {ru ? `Показать ещё ${hiddenQueueCount}` : `Show ${hiddenQueueCount} more`}
                    </button>
                  )}
                  {showQueueAll && queuePosts.length > VISIBLE_LIMIT && (
                    <button type="button" onClick={() => setShowQueueAll(false)} className="w-full py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200">
                      {ru ? 'Свернуть' : 'Show less'}
                    </button>
                  )}
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
                  {visibleArchive.map(p => (
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
                  {hiddenArchiveCount > 0 && (
                    <button type="button" onClick={() => setShowArchiveAll(true)} className="w-full py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200">
                      {ru ? `Показать ещё ${hiddenArchiveCount}` : `Show ${hiddenArchiveCount} more`}
                    </button>
                  )}
                  {showArchiveAll && archivePosts.length > VISIBLE_LIMIT && (
                    <button type="button" onClick={() => setShowArchiveAll(false)} className="w-full py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200">
                      {ru ? 'Свернуть' : 'Show less'}
                    </button>
                  )}
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
                    <button
                      onClick={() => {
                        setEditingTaskId(task.id);
                        setNewTask({
                          name: task.name,
                          contentType: task.contentType,
                          frequency: task.frequency,
                          schedule: task.schedule,
                          scheduledDates: task.scheduledDates,
                          networks: task.networks,
                          topics: task.topics,
                          active: task.active,
                        });
                        setScheduleDays(task.scheduledDates || []);
                        setScheduleTime(task.schedule?.time || '10:00');
                        setScheduleDate('');
                        setShowCreateTask(true);
                      }}
                      className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"
                      title={ru ? 'Редактировать' : 'Edit'}
                    >
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => upsertAutoTask({ ...task, active: !task.active })} className="p-2 rounded-lg hover:bg-slate-50">
                      {task.active ? <Pause size={18} className="text-yellow-600" /> : <Play size={18} className="text-green-600" />}
                    </button>
                    <button onClick={() => removeAutoTask(task.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
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
                <h3 className="font-bold text-xl">{editingTaskId ? (ru ? 'Редактирование задачи' : 'Edit task') : (ru ? 'Новая задача' : 'New task')}</h3>
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
                      upsertAutoTask({
                        id: editingTaskId || Date.now().toString(),
                        name: newTask.name!,
                        contentType: newTask.contentType || 'post',
                        frequency: newTask.frequency || 'daily',
                        schedule: { time: scheduleTime || '10:00', days: newTask.schedule?.days || [] },
                        scheduledDates: days,
                        networks: newTask.networks || [],
                        topics: newTask.topics!,
                        active: newTask.active !== false,
                        generatedCount: editingTaskId
                          ? (autoTasks.find(t => t.id === editingTaskId)?.generatedCount || 0)
                          : 0,
                      });
                      setScheduleDays([]);
                      setScheduleDate('');
                      setEditingTaskId(null);
                      setShowCreateTask(false);
                    }}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
                  >
                    {editingTaskId ? (ru ? 'Сохранить' : 'Save') : (ru ? 'Создать' : 'Create')}
                  </button>
                  <button onClick={() => { setShowCreateTask(false); setEditingTaskId(null); }} className="px-4 py-3 bg-slate-100 rounded-lg">{ru ? 'Отмена' : 'Cancel'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
