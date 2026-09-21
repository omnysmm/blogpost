import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { useState, useEffect, useRef } from 'react';
import CookieBanner from '../components/CookieBanner';
import {
  Wand2, BarChart3, Share2, Shield, Zap, Globe, Sparkles, ArrowRight,
  Clock, TrendingUp, AlertTriangle, CheckCircle2, X, Users, Video,
  Music, Image, FileText, Mic, Target, Rocket, Star, ChevronRight,
  Play, Eye, Heart, Repeat2, Smartphone, Monitor, Tablet, MessageSquare, Upload
} from 'lucide-react';

export default function HomePage() {
  const { language, currency, currentUser, setCurrentPage } = useStore();
  const t = translations[language];
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.15 }
    );
    sectionRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const registerSection = (id: string) => (el: HTMLElement | null) => {
    if (el) { sectionRefs.current.set(id, el); el.id = id; }
  };

  const isVisible = (id: string) => visibleSections.has(id);

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${Math.round(price / 90)}`;
    if (currency === 'CNY') return `¥${Math.round(price / 12)}`;
    return `${price.toLocaleString()} ₽`;
  };

  // ─── Pain Points ───
  const painPoints = [
    { icon: Clock, title: language === 'ru' ? 'Теряете часы на контент' : 'Hours wasted on content', desc: language === 'ru' ? '4-6 часов на один пост: текст, картинки, хештеги, адаптация под каждую соцсеть' : '4-6 hours per post: text, images, hashtags, adapting to each social network', color: 'text-red-500', bg: 'bg-red-50' },
    { icon: AlertTriangle, title: language === 'ru' ? '10+ сервисов одновременно' : '10+ services at once', desc: language === 'ru' ? 'ChatGPT для текста, Canva для картинок, CapCut для видео, отдельно аналитика и планировщик' : 'ChatGPT for text, Canva for images, CapCut for video, separate analytics and scheduler', color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: TrendingUp, title: language === 'ru' ? 'Нет единой аналитики' : 'No unified analytics', desc: language === 'ru' ? 'Данные разбросаны по разным соцсетям. Невозможно увидеть общую картину и ROI' : 'Data scattered across different social networks. Impossible to see the big picture and ROI', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Users, title: language === 'ru' ? 'Сложная монетизация' : 'Complex monetization', desc: language === 'ru' ? 'Площадки забирают до 70% дохода. Нет контроля над рекламой и партнёрскими программами' : 'Platforms take up to 70% of revenue. No control over advertising and affiliate programs', color: 'text-pink-500', bg: 'bg-pink-50' },
    { icon: X, title: language === 'ru' ? 'Выгорание и рутина' : 'Burnout and routine', desc: language === 'ru' ? 'Ежедневный контент-план без автоматизации ведёт к выгоранию 73% блогеров за первый год' : 'Daily content plan without automation leads to burnout for 73% of bloggers in the first year', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Target, title: language === 'ru' ? 'Нет SEO-оптимизации' : 'No SEO optimization', desc: language === 'ru' ? 'Контент не оптимизирован под алгоритмы соцсетей и поисковиков — охваты падают' : 'Content not optimized for social media algorithms and search engines — reach drops', color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  // ─── Solution Features ───
  const features = [
    { icon: Wand2, title: language === 'ru' ? 'AI-генерация контента' : 'AI Content Generation', desc: language === 'ru' ? 'Посты, статьи, сценарии видео и музыка — создаются десятками нейросетей за секунды' : 'Posts, articles, video scripts and music — created by dozens of neural networks in seconds', color: 'from-blue-500 to-indigo-600' },
    { icon: Share2, title: language === 'ru' ? 'Публикация в разные соцсети' : 'Publish to different social networks', desc: language === 'ru' ? 'VK, Telegram, YouTube, Instagram, TikTok, OK — один клик или расписание на неделю вперёд' : 'VK, Telegram, YouTube, Instagram, TikTok, OK — one click or schedule a week ahead', color: 'from-cyan-500 to-blue-500' },
    { icon: BarChart3, title: language === 'ru' ? 'Единая аналитика' : 'Unified analytics', desc: language === 'ru' ? 'Все метрики в одном дашборде: просмотры, лайки, репосты, конверсии по каждой соцсети' : 'All metrics in one dashboard: views, likes, shares, conversions per social network', color: 'from-purple-500 to-pink-500' },
    { icon: Video, title: language === 'ru' ? 'Генерация видео' : 'Video generation', desc: language === 'ru' ? 'AI создаёт видеоролики, добавляет озвучку Silero TTS, субтитры и музыкальное сопровождение' : 'AI creates videos, adds Silero TTS voiceover, subtitles and background music', color: 'from-rose-500 to-red-500' },
    { icon: Shield, title: language === 'ru' ? 'Автомодерация' : 'Auto moderation', desc: language === 'ru' ? 'Контент автоматически проверяется на соответствие законодательству РФ перед публикацией' : 'Content is automatically checked for compliance with Russian law before publishing', color: 'from-emerald-500 to-green-500' },
    { icon: Globe, title: language === 'ru' ? 'SEO и гео-таргетинг' : 'SEO & geo targeting', desc: language === 'ru' ? 'AI оптимизирует заголовки, теги и время публикации под целевую аудиторию и регион' : 'AI optimizes titles, tags and publishing time for target audience and region', color: 'from-amber-500 to-orange-500' },
  ];

  // ─── Pricing Plans ───
  const plans = [
    {
      name: language === 'ru' ? 'Бесплатный' : 'Free',
      price: '0',
      period: language === 'ru' ? '48 часов' : '48 hours',
      desc: language === 'ru' ? 'Попробуйте все функции бесплатно' : 'Try all features for free',
      features: [
        language === 'ru' ? 'Полный доступ ко всем AI-моделям' : 'Full access to all AI models',
        language === 'ru' ? 'Публикация во все соцсети' : 'Publish to all social networks',
        language === 'ru' ? 'Базовая аналитика' : 'Basic analytics',
        language === 'ru' ? 'AI-поддержка 24/7' : 'AI support 24/7',
      ],
      color: 'from-slate-500 to-slate-600',
      btn: language === 'ru' ? 'Попробовать бесплатно' : 'Try for free',
      popular: false,
    },
    {
      name: language === 'ru' ? 'Базовый' : 'Basic',
      price: '990',
      period: language === 'ru' ? '/мес' : '/mo',
      desc: language === 'ru' ? 'Для начинающих блогеров' : 'For beginner bloggers',
      features: [
        language === 'ru' ? '10 генераций статей в месяц' : '10 article generations per month',
        language === 'ru' ? '2 соцсети на выбор' : '2 social networks of choice',
        language === 'ru' ? 'SEO-оптимизация' : 'SEO optimization',
        language === 'ru' ? 'Планировщик публикаций' : 'Post scheduler',
      ],
      color: 'from-blue-500 to-blue-600',
      btn: language === 'ru' ? 'Выбрать Базовый' : 'Choose Basic',
      popular: false,
    },
    {
      name: language === 'ru' ? 'Профессиональный' : 'Professional',
      price: '4990',
      period: language === 'ru' ? '/мес' : '/mo',
      desc: language === 'ru' ? 'Для серьёзных создателей' : 'For serious creators',
      features: [
        language === 'ru' ? '60 генераций в месяц' : '60 generations per month',
        language === 'ru' ? 'Публикация во все соцсети одновременно' : 'Publish to all social networks simultaneously',
        language === 'ru' ? 'Генерация видео и музыки' : 'Video and music generation',
        language === 'ru' ? 'Полная аналитика + экспорт' : 'Full analytics + export',
        language === 'ru' ? 'Гео-таргетинг' : 'Geo targeting',
        language === 'ru' ? 'Приоритетная поддержка' : 'Priority support',
      ],
      color: 'from-purple-500 to-indigo-600',
      btn: language === 'ru' ? 'Выбрать Про' : 'Choose Pro',
      popular: true,
    },
    {
      name: language === 'ru' ? 'Премиум' : 'Premium',
      price: '9990',
      period: language === 'ru' ? '/мес' : '/mo',
      desc: language === 'ru' ? 'Максимум возможностей' : 'Maximum capabilities',
      features: [
        language === 'ru' ? 'Безлимитные генерации' : 'Unlimited generations',
        language === 'ru' ? 'Публикация во все соцсети одновременно' : 'Publish to all social networks simultaneously',
        language === 'ru' ? 'API-доступ для интеграций' : 'API access for integrations',
        language === 'ru' ? 'Персональный менеджер' : 'Personal manager',
        language === 'ru' ? 'White-label отчёты' : 'White-label reports',
        language === 'ru' ? 'Рекламный кабинет' : 'Ad cabinet',
      ],
      color: 'from-amber-500 to-orange-500',
      btn: language === 'ru' ? 'Выбрать Премиум' : 'Choose Premium',
      popular: false,
    },
  ];

  // ─── AI Models ───
  const aiModels = [
    { name: language === 'ru' ? 'Генерация текстов' : 'Text generation', desc: language === 'ru' ? 'Посты, статьи, сценарии' : 'Posts, articles, scripts', icon: FileText },
    { name: language === 'ru' ? 'Генерация изображений' : 'Image generation', desc: language === 'ru' ? 'Уникальные картинки и обложки' : 'Unique images and covers', icon: Image },
    { name: language === 'ru' ? 'Монтаж видео' : 'Video editing', desc: language === 'ru' ? 'AI создаёт и монтирует видеоролики, меняет фон на вашем видео' : 'AI creates and edits videos', icon: Video },
    { name: language === 'ru' ? 'Озвучка и музыка' : 'Voiceover and music', desc: language === 'ru' ? 'Синтез речи, фоновая музыка' : 'Speech synthesis, background music', icon: Mic },
    { name: language === 'ru' ? 'Автоматическая SEO-оптимизация' : 'Automatic SEO optimization', desc: language === 'ru' ? 'Заголовки, теги, ключевые слова' : 'Titles, tags, keywords', icon: Globe },
    { name: language === 'ru' ? 'Расширенная аналитика' : 'Advanced analytics', desc: language === 'ru' ? 'Метрики по всем соцсетям' : 'Metrics across all social networks', icon: BarChart3 },
    { name: language === 'ru' ? 'Публикация вручную или по расписанию' : 'Publish manually or on schedule', desc: language === 'ru' ? 'Один клик или автоматический план' : 'One click or automatic plan', icon: Clock },
    { name: language === 'ru' ? 'Свой или сгенерированный контент' : 'Own or generated content', desc: language === 'ru' ? 'Используйте AI или загружайте своё' : 'Use AI or upload your own', icon: Upload },
  ];

  // ─── Social Networks ───
  const socialNetworks = [
    { name: 'VKontakte', abbr: 'VK', color: 'from-blue-500 to-blue-600', users: '100M+' },
    { name: 'Telegram', abbr: 'TG', color: 'from-cyan-400 to-sky-500', users: '900M+' },
    { name: 'YouTube', abbr: 'YT', color: 'from-red-500 to-rose-600', users: '2.5B+' },
    { name: 'Instagram', abbr: 'IG', color: 'from-pink-500 to-fuchsia-500', users: '2B+' },
    { name: 'TikTok', abbr: 'TK', color: 'from-slate-700 to-slate-900', users: '1.5B+' },
    { name: 'Одноклассники', abbr: 'OK', color: 'from-orange-400 to-amber-500', users: '40M+' },
    { name: 'Rutube', abbr: 'RT', color: 'from-teal-500 to-cyan-600', users: '50M+' },
  ];

  // ─── Stats ───
  const heroStats = [
    { value: '50K+', label: language === 'ru' ? 'блогеров' : 'bloggers' },
    { value: '2.4M', label: language === 'ru' ? 'постов создано' : 'posts created' },
    { value: '30 сек', label: language === 'ru' ? 'среднее время генерации' : 'avg generation time' },
    { value: '6+', label: language === 'ru' ? 'соцсетей' : 'social networks' },
  ];

  return (
    <div className="min-h-screen">
      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white">
        {/* Futuristic background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '50px 50px'}} />
          {/* Glow orbs */}
          <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-indigo-400/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[10%] w-[450px] h-[450px] bg-purple-400/15 rounded-full blur-[80px]" />
          <div className="absolute top-[20%] right-[30%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[60px]" />
          {/* Circuit lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
            <path d="M0 400 Q300 350 500 500 T1000 450 T1500 550 T1920 480" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1.5"/>
            <path d="M0 600 Q400 550 700 700 T1200 600 T1920 650" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1"/>
            <path d="M200 0 Q250 200 350 400 T500 800 T600 1080" fill="none" stroke="rgba(6,182,212,0.12)" strokeWidth="0.8"/>
            <path d="M1600 0 Q1550 300 1500 500 T1400 900 T1350 1080" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="0.8"/>
            {/* Nodes */}
            <circle cx="500" cy="500" r="4" fill="rgba(139,92,246,0.6)"/>
            <circle cx="500" cy="500" r="12" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="0.5"/>
            <circle cx="1000" cy="450" r="3" fill="rgba(6,182,212,0.5)"/>
            <circle cx="1000" cy="450" r="10" fill="none" stroke="rgba(6,182,212,0.2)" strokeWidth="0.5"/>
            <circle cx="1500" cy="550" r="4" fill="rgba(99,102,241,0.6)"/>
            <circle cx="1500" cy="550" r="14" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="0.5"/>
            {/* Hexagons */}
            <g opacity="0.12" transform="translate(1100,250)">
              <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="none" stroke="#8b5cf6" strokeWidth="0.8"/>
              <polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" fill="none" stroke="#6366f1" strokeWidth="0.5"/>
            </g>
          </svg>
          {/* Animated pulse */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-16 md:pt-16 md:pb-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-6 py-3 bg-white/15 backdrop-blur-sm rounded-full text-white text-base font-semibold mb-6 border border-white/25 shadow-lg shadow-white/5">
              <Sparkles size={20} className="text-amber-300" />
              {language === 'ru' ? 'Всё в одном — платформа для бизнеса, блогеров и создателей контента' : 'All in one — platform for business, bloggers and content creators'}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
              {language === 'ru' ? (
                <>Перестаньте использовать<br /><span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 bg-clip-text text-transparent">десятки разных сервисов</span></>
              ) : (
                <>Stop using<br /><span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 bg-clip-text text-transparent">10 different services</span></>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              {language === 'ru'
                ? 'BlogPost объединяет AI-генерацию контента, публикацию в разные соцсети, аналитику и монетизацию в одной платформе. Размещайте контент на все площадки одновременно по клику или автоматически по расписанию. Экономьте 4+ часа ежедневно.'
                : 'BlogPost combines AI content generation, publishing to different social networks, analytics and monetization in one platform. Save 4+ hours daily.'}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center mb-14">
              <button onClick={() => setCurrentPage('auth')} className="px-8 py-4 bg-white text-indigo-700 rounded-xl font-bold text-base hover:bg-white/90 hover:shadow-2xl hover:shadow-white/20 transition-all flex items-center gap-2 group">
                {language === 'ru' ? 'Начать бесплатно на 48 часов' : 'Start free for 48 hours'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all flex items-center gap-2">
                {language === 'ru' ? 'Смотреть тарифы' : 'View pricing'} <ChevronRight size={18} />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {heroStats.map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                  <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                  <p className="text-white/60 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wavy bottom */}
        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{height: '50px', display: 'block'}}>
            <path d="M0,50 C240,20 480,70 720,40 C960,10 1200,60 1440,30 L1440,80 L0,80 Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* ═══════ PAIN POINTS ═══════ */}
      <section ref={registerSection('painpoints')} className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-14 transition-all duration-700 ${isVisible('painpoints') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-block px-5 py-2 bg-red-50 text-red-600 rounded-full text-base font-bold mb-4 uppercase tracking-widest">
              {language === 'ru' ? 'Проблемы' : 'Problems'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {language === 'ru' ? 'Знакомые боли блогеров и бизнеса?' : 'Familiar pains of bloggers and business?'}
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              {language === 'ru'
                ? 'Каждый день миллионы создателей контента сталкиваются с одними и теми же проблемами'
                : 'Every day millions of content creators face the same problems'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {painPoints.map((pain, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-6 border border-slate-100 hover:border-red-200 hover:shadow-lg hover:shadow-red-50 transition-all duration-500 cursor-default ${isVisible('painpoints') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`w-12 h-12 ${pain.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <pain.icon size={24} className={pain.color} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{pain.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SOLUTION ═══════ */}
      <section ref={registerSection('solution')} className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-14 transition-all duration-700 ${isVisible('solution') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-block px-5 py-2 bg-green-50 text-green-600 rounded-full text-base font-bold mb-4 uppercase tracking-widest">
              {language === 'ru' ? 'Решение' : 'Solution'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {language === 'ru' ? 'BlogPost — всё в одной платформе' : 'BlogPost — everything in one platform'}
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              {language === 'ru'
                ? 'Больше не нужно переключаться между 10 сервисами. Генерируйте контент, публикуйте, анализируйте и монетизируйте — из одного места.'
                : 'No more switching between 10 services. Generate content, publish, analyze and monetize — from one place.'}
            </p>
          </div>

          {/* Before / After comparison */}
          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
            {/* Before */}
            <div className={`bg-red-50 rounded-2xl p-6 border border-red-100 transition-all duration-700 ${isVisible('solution') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="flex items-center gap-2 mb-5">
                <X size={20} className="text-red-500" />
                <span className="font-bold text-red-700">{language === 'ru' ? 'Раньше' : 'Before'}</span>
              </div>
              <div className="space-y-3">
                {(language === 'ru'
                  ? ['ChatGPT для текстов', 'Canva для картинок', 'CapCut для видео', 'Отдельный планировщик', 'Аналитика вручную', 'Поиск SEO-ключей']
                  : ['ChatGPT for texts', 'Canva for images', 'CapCut for video', 'Separate scheduler', 'Analytics manually', 'SEO keyword search']
                ).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-red-700">
                    <X size={14} className="text-red-400 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-red-600 font-semibold text-sm">
                {language === 'ru' ? '~6 часов на пост • $50-200/мес за подписки' : '~6 hours per post • $50-200/mo for subscriptions'}
              </p>
            </div>

            {/* After */}
            <div className={`bg-green-50 rounded-2xl p-6 border border-green-100 transition-all duration-700 ${isVisible('solution') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="font-bold text-green-700">{language === 'ru' ? 'С BlogPost' : 'With BlogPost'}</span>
              </div>
              <div className="space-y-3">
                {(language === 'ru'
                  ? ['AI генерирует текст, видео, музыку', 'Изображения от Kandinsky', 'Публикация в разные соцсети одним кликом', 'Расписание на неделю вперёд', 'Единый дашборд аналитики', 'SEO-оптимизация автоматически']
                  : ['AI generates text, video, music', 'Images from Kandinsky', 'Publish to 6 networks with one click', 'Schedule a week ahead', 'Unified analytics dashboard', 'SEO optimization automatically']
                ).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-green-700">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-green-600 font-semibold text-sm">
                {language === 'ru' ? '30 секунд на пост • от 990 ₽/мес' : '30 seconds per post • from 990 ₽/mo'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section ref={registerSection('features')} className="py-20 bg-slate-50 relative">
        {/* Decorative tech pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-30">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <circle cx="200" cy="200" r="100" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.3"/>
            <circle cx="200" cy="200" r="160" fill="none" stroke="#8b5cf6" strokeWidth="0.4" opacity="0.2"/>
            <circle cx="200" cy="200" r="8" fill="#6366f1" opacity="0.4"/>
            <circle cx="200" cy="100" r="4" fill="#8b5cf6" opacity="0.5"/>
            <circle cx="300" cy="200" r="3" fill="#06b6d4" opacity="0.4"/>
            <circle cx="200" cy="300" r="4" fill="#a78bfa" opacity="0.5"/>
            <circle cx="100" cy="200" r="3" fill="#818cf8" opacity="0.4"/>
            <line x1="200" y1="100" x2="200" y2="200" stroke="#6366f1" strokeWidth="0.5" opacity="0.3"/>
            <line x1="300" y1="200" x2="200" y2="200" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.3"/>
            <line x1="200" y1="300" x2="200" y2="200" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3"/>
            <line x1="100" y1="200" x2="200" y2="200" stroke="#a78bfa" strokeWidth="0.5" opacity="0.3"/>
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-14 transition-all duration-700 ${isVisible('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-block px-5 py-2 bg-blue-50 text-blue-600 rounded-full text-base font-bold mb-4 uppercase tracking-widest">
              {language === 'ru' ? 'Возможности' : 'Features'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {language === 'ru' ? 'Всё что нужно для создания контента' : 'Everything you need for content creation'}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group cursor-default ${hoveredCard === i ? 'border-blue-200 shadow-blue-50' : ''} ${isVisible('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon size={26} className="text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ AI MODELS ═══════ */}
      <section ref={registerSection('ai-models')} className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
            {/* Neural network background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px'}} />
              <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-indigo-400/10 rounded-full blur-[60px]" />
              <div className="absolute bottom-[10%] right-[10%] w-[250px] h-[250px] bg-purple-400/10 rounded-full blur-[50px]" />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
                <line x1="100" y1="100" x2="300" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
                <line x1="100" y1="200" x2="300" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
                <line x1="100" y1="300" x2="300" y2="250" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
                <line x1="300" y1="150" x2="500" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
                <line x1="300" y1="250" x2="500" y2="200" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
                <line x1="500" y1="200" x2="700" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
                <line x1="500" y1="200" x2="700" y2="280" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
                <circle cx="100" cy="100" r="4" fill="rgba(255,255,255,0.3)"/>
                <circle cx="100" cy="200" r="3" fill="rgba(255,255,255,0.25)"/>
                <circle cx="100" cy="300" r="4" fill="rgba(255,255,255,0.3)"/>
                <circle cx="300" cy="150" r="4" fill="rgba(255,255,255,0.35)"/>
                <circle cx="300" cy="250" r="3" fill="rgba(255,255,255,0.25)"/>
                <circle cx="500" cy="200" r="5" fill="rgba(255,255,255,0.4)"/>
                <circle cx="700" cy="180" r="3" fill="rgba(255,255,255,0.25)"/>
                <circle cx="700" cy="280" r="3" fill="rgba(255,255,255,0.25)"/>
              </svg>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {language === 'ru' ? 'Десятки нейросетей в одном месте' : 'Dozens of neural networks in one place'}
              </h2>
              <p className="text-indigo-100 mb-10 text-lg whitespace-nowrap">
                {language === 'ru'
                  ? 'Российские нейросети и не только. Автоматический или ручной выбор лучшей модели.'
                  : 'Russian neural networks and more. Automatic or manual best model selection.'}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {aiModels.map((model, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-5 hover:bg-white/20 transition-all group cursor-default border border-white/10">
                    <model.icon size={28} className="text-white/80 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-white text-sm">{model.name}</p>
                    <p className="text-indigo-200 text-xs mt-1">{model.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL NETWORKS ═══════ */}
      <section ref={registerSection('social')} className="py-20 bg-slate-50 relative">
        {/* Connection hub background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px]" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 600" preserveAspectRatio="xMidYMid slice">
            <g opacity="0.15">
              <circle cx="960" cy="300" r="6" fill="#6366f1"/>
              <circle cx="960" cy="300" r="18" fill="none" stroke="#6366f1" strokeWidth="0.5"/>
              <circle cx="400" cy="180" r="4" fill="#4680C2"/>
              <circle cx="650" cy="120" r="4" fill="#26A5E4"/>
              <circle cx="960" cy="100" r="4" fill="#FF4444"/>
              <circle cx="1270" cy="120" r="4" fill="#E1306C"/>
              <circle cx="1520" cy="180" r="4" fill="#333"/>
              <line x1="400" y1="180" x2="960" y2="300" stroke="#4680C2" strokeWidth="0.6"/>
              <line x1="650" y1="120" x2="960" y2="300" stroke="#26A5E4" strokeWidth="0.6"/>
              <line x1="960" y1="100" x2="960" y2="300" stroke="#FF4444" strokeWidth="0.6"/>
              <line x1="1270" y1="120" x2="960" y2="300" stroke="#E1306C" strokeWidth="0.6"/>
              <line x1="1520" y1="180" x2="960" y2="300" stroke="#333" strokeWidth="0.6"/>
            </g>
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-14 transition-all duration-700 ${isVisible('social') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-block px-5 py-2 bg-cyan-50 text-cyan-600 rounded-full text-base font-bold mb-4 uppercase tracking-widest">
              {language === 'ru' ? 'Интеграции' : 'Integrations'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {language === 'ru' ? 'Публикуйте во все соцсети одним кликом' : 'Publish to all social networks with one click'}
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              {language === 'ru' ? 'Автоматически или по расписанию — выбираете вы' : 'Automatically or on schedule — you choose'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 max-w-5xl mx-auto">
            {socialNetworks.map((net, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-5 border border-slate-100 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group ${isVisible('social') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${net.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="text-white font-bold text-sm">{net.abbr}</span>
                </div>
                <p className="font-semibold text-slate-900 text-sm">{net.name}</p>
                <p className="text-slate-500 text-xs mt-1">{net.users}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section ref={registerSection('pricing')} id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-14 transition-all duration-700 ${isVisible('pricing') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-block px-5 py-2 bg-purple-50 text-purple-600 rounded-full text-base font-bold mb-4 uppercase tracking-widest">
              {language === 'ru' ? 'Тарифы' : 'Pricing'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {language === 'ru' ? 'Начните бесплатно. Растите с нами.' : 'Start free. Grow with us.'}
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              {language === 'ru' ? '48 часов полного доступа без карты и обязательств' : '48 hours of full access without card or obligations'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 cursor-default relative ${hoveredPlan === i ? 'shadow-2xl -translate-y-2 border-blue-200' : 'shadow-sm border-slate-100'} ${plan.popular ? 'ring-2 ring-purple-500 shadow-purple-100' : ''} ${isVisible('pricing') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
                onMouseEnter={() => setHoveredPlan(i)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-center py-1.5 text-xs font-bold uppercase tracking-wider">
                    {language === 'ru' ? 'Популярный' : 'Popular'}
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-bold text-lg text-slate-900">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mt-1 mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-slate-900">{formatPrice(parseInt(plan.price))}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                  <button onClick={() => setCurrentPage('auth')} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r ${plan.color} text-white hover:shadow-lg hover:shadow-${plan.color.split(' ')[0].replace('from-', '')}/25`}>
                    {plan.btn}
                  </button>
                  <div className="mt-5 space-y-3">
                    {plan.features.map((f, fi) => (
                      <div key={fi} className="flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment methods */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              {language === 'ru' ? 'Оплата через Яндекс.Оплата: банковские карты, ЮMoney, СБП' : 'Payment via Yandex.Pay: bank cards, YooMoney, SBP'}
            </p>
          </div>

          {/* Constructor promo */}
          <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100 text-center">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
              {language === 'ru' ? 'Или соберите свой тариф в конструкторе' : 'Or build your own plan in the constructor'}
            </h3>
            <p className="text-slate-600 max-w-2xl mx-auto mb-4">
              {language === 'ru'
                ? 'Не хотите переплачивать за неиспользуемые функции? Выберите только те модули, которые вам нужны: генерация контента, публикация, аналитика, SEO или реклама — и платите только за них.'
                : "Don't want to pay for unused features? Choose only the modules you need: content generation, publishing, analytics, SEO or advertising — and pay only for those."}
            </p>
            <button onClick={() => setCurrentPage('auth')} className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              {language === 'ru' ? 'Собрать свой тариф' : 'Build your plan'}
            </button>
          </div>

          {/* Legal disclaimers */}
          <div className="mt-10 space-y-2">
            <p className="text-xs text-slate-400 text-center">
              {language === 'ru'
                ? '* Бесплатный период 48 часов предоставляется один раз при регистрации. По окончании бесплатного периода подписка не активируется автоматически. Для continued использования необходимо выбрать и оплатить тарифный план.'
                : '* Free 48-hour trial is provided once upon registration. After the trial period, subscription is not activated automatically. To continue, select and pay for a plan.'}
            </p>
            <p className="text-xs text-slate-400 text-center">
              {language === 'ru'
                ? 'Цены указаны в российских рублях с учётом НДС. Оплата производится через сервис Яндекс.Оплата. Возврат средств осуществляется в соответствии с договором оферты.'
                : 'Prices are in Russian rubles inclusive of VAT. Payment is processed via Yandex.Pay. Refunds are processed according to the public offer agreement.'}
            </p>
            <p className="text-xs text-slate-400 text-center">
              {language === 'ru'
                ? 'ИП Герасимов А.В. · ИНН: 644305186327 · ОГРН: 324680000019019 · Адрес: Россия · support@blogpost.ru'
                : 'IE / LLC «BlogPost» · INN: 000000000000 · OGRN: 0000000000000 · Address: Moscow, Russia · support@blogpost.ru'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section ref={registerSection('cta')} className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white relative overflow-hidden">
        {/* CTA background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
          <div className="absolute top-[10%] left-[20%] w-[400px] h-[300px] bg-indigo-400/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[250px] bg-purple-400/10 rounded-full blur-[60px]" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 600" preserveAspectRatio="xMidYMid slice">
            <path d="M960 550 Q940 400 960 250 Q980 100 960 0" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="2"/>
            <path d="M960 550 Q920 380 950 220 Q970 80 960 0" fill="none" stroke="rgba(129,140,248,0.1)" strokeWidth="1"/>
            <circle cx="200" cy="450" r="3" fill="rgba(129,140,248,0.4)"/>
            <circle cx="500" cy="350" r="2" fill="rgba(167,139,250,0.3)"/>
            <circle cx="1100" cy="300" r="2.5" fill="rgba(34,211,238,0.3)"/>
            <circle cx="1700" cy="350" r="3" fill="rgba(167,139,250,0.4)"/>
          </svg>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-400/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className={`text-3xl md:text-5xl font-bold mb-6 transition-all duration-700 ${isVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {language === 'ru' ? 'Готовы создавать контент в 100 раз быстрее?' : 'Ready to create content 100x faster?'}
          </h2>
          <p className={`text-lg text-white/80 mb-10 max-w-2xl mx-auto transition-all duration-700 ${isVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
            {language === 'ru'
              ? 'Присоединяйтесь к 50 000+ блогеров и компаний, которые уже используют BlogPost. 48 часов бесплатно — без карты.'
              : 'Join 50,000+ bloggers and companies already using BlogPost. 48 hours free — no card required.'}
          </p>
          <div className={`flex flex-wrap gap-4 justify-center transition-all duration-700 ${isVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            <button onClick={() => setCurrentPage('auth')} className="px-10 py-4 bg-white text-indigo-700 rounded-xl font-bold text-lg hover:bg-white/90 hover:shadow-2xl transition-all flex items-center gap-2 group">
              {language === 'ru' ? 'Зарегистрироваться бесплатно' : 'Register for free'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="bg-slate-900 text-white pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top section */}
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <span className="font-bold text-lg">BlogPost</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {language === 'ru'
                  ? 'AI-платформа для блогеров, бизнеса и создателей контента.'
                  : 'AI platform for bloggers, business and content creators.'}
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">{language === 'ru' ? 'Платформа' : 'Platform'}</h4>
              <div className="space-y-2">
                <button onClick={() => setCurrentPage('auth')} className="block text-sm text-slate-400 hover:text-white transition-colors">{language === 'ru' ? 'Регистрация' : 'Register'}</button>
                <button onClick={() => setCurrentPage('auth')} className="block text-sm text-slate-400 hover:text-white transition-colors">{language === 'ru' ? 'Войти' : 'Login'}</button>
                <button onClick={() => setCurrentPage('subscriptions')} className="block text-sm text-slate-400 hover:text-white transition-colors">{language === 'ru' ? 'Тарифы' : 'Pricing'}</button>
                <button onClick={() => setCurrentPage('advertising')} className="block text-sm text-slate-400 hover:text-white transition-colors">{language === 'ru' ? 'Реклама' : 'Advertising'}</button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">{language === 'ru' ? 'Документы' : 'Legal'}</h4>
              <div className="space-y-2">
                <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-white transition-colors text-left">{language === 'ru' ? 'Пользовательское соглашение' : 'Terms of Use'}</a>
                <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-white transition-colors text-left">{language === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy'}</a>
                <a href="#/legal/offer" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-white transition-colors text-left">{language === 'ru' ? 'Договор оферты' : 'Public Offer Agreement'}</a>
                <a href="#/legal/rules" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-white transition-colors text-left">{language === 'ru' ? 'Правила использования' : 'Usage Rules'}</a>
                <a href="#/legal/consent" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-white transition-colors text-left">{language === 'ru' ? 'Согласие на обработку персональных данных' : 'Personal Data Consent'}</a>
              </div>
            </div>

            {/* Contacts */}
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">{language === 'ru' ? 'Контакты' : 'Contacts'}</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <p>Email: support@blogpost.ru</p>
                <p>{language === 'ru' ? 'ИП Герасимов А.В.' : 'IE / LLC «BlogPost»'}</p>
                <p>{language === 'ru' ? 'ИНН: 644305186327' : 'INN: 000000000000'}</p>
                <p>{language === 'ru' ? 'ОГРН: 324680000019019' : 'OGRN: 0000000000000'}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-500 text-xs">
                {language === 'ru'
                  ? '© 2025 BlogPost. Все права защищены. Использование сайта означает согласие с пользовательским соглашением и политикой конфиденциальности.'
                  : '© 2025 BlogPost. All rights reserved. Use of the site constitutes acceptance of the terms of use and privacy policy.'}
              </p>
              <p className="text-slate-500 text-xs">
                {language === 'ru'
                  ? 'Сервис не является средством массовой информации'
                  : 'The service is not a mass media outlet'}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════ COOKIE CONSENT ═══════ */}
      <CookieBanner language={language} />
    </div>
  );
}

