import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Wand2, BarChart3, Share2, Shield, Zap, Globe, Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { language, currency, currentUser, setCurrentPage, adBlocks } = useStore();
  const t = translations[language];
  const heroAd = adBlocks.find(b => b.position === 'hero' && b.active);

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${Math.round(price / 90)}`;
    if (currency === 'CNY') return `¥${Math.round(price / 12)}`;
    return `${price.toLocaleString()} ₽`;
  };

  const features = [
    { icon: Wand2, title: language === 'ru' ? 'AI Генерация контента' : 'AI Content Generation', desc: language === 'ru' ? 'Посты, статьи, видео, музыка — всё с помощью нейросетей' : 'Posts, articles, videos, music — all powered by AI' },
    { icon: BarChart3, title: language === 'ru' ? 'Полная аналитика' : 'Full Analytics', desc: language === 'ru' ? 'Просмотры, лайки, репосты по каждой соцсети' : 'Views, likes, shares per social network' },
    { icon: Share2, title: language === 'ru' ? 'Мульти-публикация' : 'Multi-publishing', desc: language === 'ru' ? 'Публикация во все соцсети вручную или по расписанию' : 'Publish to all networks manually or on schedule' },
    { icon: Shield, title: language === 'ru' ? 'Автомодерация' : 'Auto Moderation', desc: language === 'ru' ? 'Автоматическая проверка на соответствие законодательству РФ' : 'Automatic compliance check with Russian law' },
    { icon: Zap, title: language === 'ru' ? 'Озвучка и видео' : 'Voice & Video', desc: language === 'ru' ? 'Синтез речи и генерация видеоряда к вашему контенту' : 'Speech synthesis and video generation for your content' },
    { icon: Globe, title: language === 'ru' ? 'SEO и GEO' : 'SEO & GEO', desc: language === 'ru' ? 'Оптимизация под требования каждой платформы' : 'Optimization for each platform requirements' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Ad Banner */}
      {heroAd && (
        <div className="mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 relative">
          <div className="absolute top-2 right-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
            {language === 'ru' ? 'Реклама' : 'Ad'}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg text-amber-900">{heroAd.title}</p>
              <p className="text-amber-700 text-sm">{language === 'ru' ? 'Разместите вашу рекламу здесь' : 'Place your ad here'}</p>
              <p className="text-amber-600 text-xs mt-1">{t.pricePerDay}: {formatPrice(heroAd.pricePerDay)}</p>
            </div>
            <button onClick={() => setCurrentPage('advertising')} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition">
              {language === 'ru' ? 'Подробнее' : 'Details'}
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-6">
          <Sparkles size={16} />
          {language === 'ru' ? 'Платформа нового поколения для блогеров' : 'Next-gen platform for bloggers'}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          {language === 'ru' ? (
            <>Создавайте контент<br /><span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">с помощью AI</span></>
          ) : (
            <>Create content<br /><span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">with AI power</span></>
          )}
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          {language === 'ru'
            ? 'Генерация текстов, озвучка, видеомонтаж, публикация во все соцсети — всё в одном месте. Первые 48 часов бесплатно!'
            : 'Text generation, voiceover, video editing, publishing to all social networks — all in one place. First 48 hours free!'}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button onClick={() => setCurrentPage(currentUser ? 'content-generator' : 'auth')} className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-xl hover:shadow-blue-200 transition-all flex items-center gap-2">
            {language === 'ru' ? 'Начать бесплатно' : 'Start for free'} <ArrowRight size={18} />
          </button>
          <button onClick={() => setCurrentPage('subscriptions')} className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:border-blue-300 transition-all">
            {language === 'ru' ? 'Тарифы' : 'Pricing'}
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          {language === 'ru' ? 'Всё для создания контента' : 'Everything for content creation'}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Models Section */}
      <section className="py-16">
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            {language === 'ru' ? 'Доступные AI модели' : 'Available AI Models'}
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl">
            {language === 'ru'
              ? 'Используйте лучшие бесплатные нейросети: YandexGPT, GigaChat, Kandinsky, Silero для озвучки и другие. Выбор вручную или автоматически.'
              : 'Use the best free neural networks: YandexGPT, GigaChat, Kandinsky, Silero for voiceover and more. Manual or automatic selection.'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['YandexGPT', 'GigaChat', 'Kandinsky', 'Silero', 'GPT-2 Ru', 'RuDALL-E', 'RuTTSGAN', 'AutoML'].map(model => (
              <div key={model} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <p className="font-medium">{model}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Networks */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
          {language === 'ru' ? 'Публикация во все соцсети' : 'Publish to all social networks'}
        </h2>
        <p className="text-center text-slate-600 mb-12">
          {language === 'ru' ? 'Вручную или по расписанию — вы выбираете' : 'Manually or on schedule — you choose'}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { name: 'VKontakte', color: 'bg-blue-500' },
            { name: 'Telegram', color: 'bg-sky-500' },
            { name: 'YouTube', color: 'bg-red-500' },
            { name: 'Instagram', color: 'bg-pink-500' },
            { name: 'TikTok', color: 'bg-slate-800' },
            { name: 'OK', color: 'bg-orange-500' },
          ].map(network => (
            <div key={network.name} className={`${network.color} text-white px-6 py-3 rounded-xl font-medium shadow-lg`}>
              {network.name}
            </div>
          ))}
        </div>
      </section>

      {/* Inline Ad */}
      <div className="my-12 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 p-6 relative">
        <div className="absolute top-2 right-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
          {language === 'ru' ? 'Реклама' : 'Ad'}
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">📢</span>
          </div>
          <div>
            <p className="font-bold text-slate-900">{language === 'ru' ? 'Продвигайте свой бренд' : 'Promote your brand'}</p>
            <p className="text-slate-600 text-sm">{language === 'ru' ? 'Рекламный кабинет — размещение на площадке и в видеороликах. От 3 000 ₽/день' : 'Ad cabinet — placement on site and in videos. From 3,000 RUB/day'}</p>
          </div>
          <button onClick={() => setCurrentPage(currentUser ? 'advertiser' : 'auth')} className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">
            {language === 'ru' ? 'Рекламный кабинет' : 'Ad Cabinet'}
          </button>
        </div>
      </div>
    </div>
  );
}
