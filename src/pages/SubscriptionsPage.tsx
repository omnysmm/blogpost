import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Check, Star, Zap, Crown, CreditCard, ArrowRight, X, Sparkles } from 'lucide-react';

export default function SubscriptionsPage() {
  const { language, currency, currentUser, setCurrentPage } = useStore();
  const t = translations[language];
  const { applyPromo } = useStore();
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount: number; type: string } | null>(null);
  const [promoError, setPromoError] = useState('');

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    setPromoError('');
    const result = await applyPromo(promoCode);
    if (result && result.valid) {
      setPromoResult(result);
    } else {
      setPromoError(language === 'ru' ? 'Промокод не найден или истёк' : 'Promo code not found or expired');
      setPromoResult(null);
    }
  };

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${Math.round(price / 90)}`;
    if (currency === 'CNY') return `¥${Math.round(price / 12)}`;
    return `${price.toLocaleString()} ₽`;
  };

  const plans = [
    {
      id: 'free',
      name: language === 'ru' ? 'Бесплатный' : 'Free',
      price: 0,
      period: language === 'ru' ? '48 часов' : '48 hours',
      icon: Star,
      color: 'from-slate-400 to-slate-500',
      desc: language === 'ru' ? 'Попробуйте все функции бесплатно' : 'Try all features for free',
      features: language === 'ru'
        ? ['Полный доступ ко всем AI-моделям', 'Публикация во все соцсети', 'Базовая аналитика', 'AI-поддержка 24/7']
        : ['Full access to all AI models', 'Publish to all social networks', 'Basic analytics', 'AI support 24/7'],
    },
    {
      id: 'basic',
      name: language === 'ru' ? 'Базовый' : 'Basic',
      price: 990,
      icon: Zap,
      color: 'from-blue-500 to-blue-600',
      desc: language === 'ru' ? 'Для начинающих блогеров' : 'For beginner bloggers',
      features: language === 'ru'
        ? ['10 генераций статей в месяц', '2 соцсети на выбор', 'SEO-оптимизация', 'Планировщик публикаций']
        : ['10 article generations per month', '2 social networks of choice', 'SEO optimization', 'Post scheduler'],
    },
    {
      id: 'pro',
      name: language === 'ru' ? 'Профессиональный' : 'Professional',
      price: 4990,
      icon: Star,
      color: 'from-purple-500 to-indigo-600',
      popular: true,
      desc: language === 'ru' ? 'Для серьёзных создателей' : 'For serious creators',
      features: language === 'ru'
        ? ['60 генераций в месяц', 'Публикация во все соцсети одновременно', 'Генерация видео и музыки', 'Полная аналитика + экспорт', 'Гео-таргетинг', 'Приоритетная поддержка']
        : ['60 generations per month', 'Publish to all social networks simultaneously', 'Video and music generation', 'Full analytics + export', 'Geo targeting', 'Priority support'],
    },
    {
      id: 'premium',
      name: language === 'ru' ? 'Премиум' : 'Premium',
      price: 9990,
      icon: Crown,
      color: 'from-amber-500 to-orange-500',
      desc: language === 'ru' ? 'Максимум возможностей' : 'Maximum capabilities',
      features: language === 'ru'
        ? ['Безлимитные генерации', 'Публикация во все соцсети одновременно', 'API-доступ для интеграций', 'Персональный менеджер', 'White-label отчёты', 'Рекламный кабинет']
        : ['Unlimited generations', 'Publish to all social networks simultaneously', 'API access for integrations', 'Personal manager', 'White-label reports', 'Ad cabinet'],
    },
  ];

  const contentBlocks = [
    { id: 'block-articles', name: language === 'ru' ? 'Публикация статей' : 'Article publishing', price: 1500, desc: language === 'ru' ? 'Генерация и публикация длинных статей с изображениями' : 'Generate and publish long articles with images', icon: '📝' },
    { id: 'block-voice', name: language === 'ru' ? 'Генерация голоса' : 'Voice generation', price: 2000, desc: language === 'ru' ? 'Синтез речи для озвучки контента' : 'Speech synthesis for content voiceover', icon: '🎤' },
    { id: 'block-video', name: language === 'ru' ? 'Генерация видео' : 'Video generation', price: 3500, desc: language === 'ru' ? 'Создание видеороликов из текста, смена фона' : 'Create videos from text, change background', icon: '🎬' },
    { id: 'block-music', name: language === 'ru' ? 'Генерация музыки' : 'Music generation', price: 2500, desc: language === 'ru' ? 'Создание музыки и песен нейросетями' : 'Create music and songs with neural networks', icon: '🎵' },
    { id: 'block-images', name: language === 'ru' ? 'Генерация изображений' : 'Image generation', price: 1800, desc: language === 'ru' ? 'Создание изображений по описанию' : 'Create images from description', icon: '🖼️' },
    { id: 'block-seo', name: language === 'ru' ? 'SEO-оптимизация' : 'SEO optimization', price: 1200, desc: language === 'ru' ? 'Автоматическая SEO-оптимизация контента' : 'Automatic content SEO optimization', icon: '🔍' },
    { id: 'block-analytics', name: language === 'ru' ? 'Расширенная аналитика' : 'Advanced analytics', price: 2200, desc: language === 'ru' ? 'Детальная аналитика и отчёты по всем соцсетям' : 'Detailed analytics and reports across all networks', icon: '📊' },
    { id: 'block-schedule', name: language === 'ru' ? 'Автопубликация' : 'Auto-publishing', price: 1000, desc: language === 'ru' ? 'Публикация по расписанию во все соцсети' : 'Scheduled publishing to all networks', icon: '⏰' },
  ];

  const blocksTotal = selectedBlocks.reduce((sum, id) => {
    const block = contentBlocks.find(b => b.id === id);
    return sum + (block?.price || 0);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full text-purple-700 text-sm font-medium mb-4">
          <Sparkles size={16} />
          {language === 'ru' ? '48 часов бесплатно — без карты' : '48 hours free — no card required'}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{t.subscriptions}</h1>
        <p className="text-slate-600 max-w-xl mx-auto">
          {language === 'ru'
            ? 'Выберите тариф или соберите свой из отдельных блоков — платите только за то, что используете'
            : 'Choose a plan or build your own from individual blocks — pay only for what you use'}
        </p>
      </div>

      {/* ═══ TARIFF PLANS ═══ */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        {plans.map((plan, i) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 cursor-default relative ${plan.popular ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-100' : 'border-slate-100'} ${hoveredPlan === i ? 'shadow-xl -translate-y-1' : ''}`}
            onMouseEnter={() => setHoveredPlan(i)}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            {plan.popular && (
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-center py-1.5 text-xs font-bold uppercase tracking-wider">
                {language === 'ru' ? 'Популярный' : 'Popular'}
              </div>
            )}
            <div className="p-6">
              <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                <plan.icon size={24} className="text-white" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">{plan.name}</h3>
              <p className="text-slate-500 text-sm mt-1 mb-4">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-bold text-slate-900">{formatPrice(plan.price)}</span>
                {plan.price > 0 && <span className="text-slate-500 text-sm">{t.perMonth}</span>}
                {plan.price === 0 && <span className="text-slate-500 text-sm"> / {plan.period}</span>}
              </div>
              <button
                onClick={() => currentUser ? setShowPayModal(true) : setCurrentPage('auth')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  currentUser?.subscription === plan.id
                    ? 'bg-slate-100 text-slate-500 cursor-default'
                    : plan.popular
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                disabled={currentUser?.subscription === plan.id}
              >
                {currentUser?.subscription === plan.id ? t.currentPlan : t.subscribe}
              </button>
              <div className="mt-5 pt-5 border-t border-slate-100 space-y-2.5">
                {plan.features.map((f, fi) => (
                  <div key={fi} className="flex items-start gap-2">
                    <Check size={15} className="text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-600">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ CONSTRUCTOR PROMO ═══ */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100 text-center mb-16">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
          {language === 'ru' ? 'Или соберите свой тариф в конструкторе' : 'Or build your own plan in the constructor'}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto mb-6">
          {language === 'ru'
            ? 'Не хотите переплачивать за неиспользуемые функции? Выберите только те модули, которые вам нужны, и платите только за них.'
            : "Don't want to pay for unused features? Choose only the modules you need and pay only for those."}
        </p>

        {/* Content Blocks */}
        <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto mb-6">
          {contentBlocks.map(block => {
            const isSelected = selectedBlocks.includes(block.id);
            return (
              <div
                key={block.id}
                className={`rounded-xl border p-4 flex items-center gap-4 transition-all cursor-pointer ${isSelected ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                onClick={() => setSelectedBlocks(prev => prev.includes(block.id) ? prev.filter(b => b !== block.id) : [...prev, block.id])}
              >
                <div className="text-3xl">{block.icon}</div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-slate-900 text-sm">{block.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{block.desc}</p>
                  <p className="text-base font-bold text-slate-900 mt-1">{formatPrice(block.price)}<span className="text-xs text-slate-500 font-normal"> / {language === 'ru' ? 'мес' : 'mo'}</span></p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected blocks total */}
        {selectedBlocks.length > 0 && (
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-sm font-medium text-blue-900">
              {language === 'ru' ? `Выбрано блоков: ${selectedBlocks.length}` : `Selected blocks: ${selectedBlocks.length}`}
            </span>
            <span className="text-lg font-bold text-blue-700">{formatPrice(blocksTotal)}<span className="text-xs font-normal">/{language === 'ru' ? 'мес' : 'mo'}</span></span>
            <button
              onClick={() => currentUser ? setShowPayModal(true) : setCurrentPage('auth')}
              className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
            >
              {language === 'ru' ? 'Оплатить' : 'Pay'}
            </button>
          </div>
        )}
      </div>

      {/* ═══ PROMO CODE ═══ */}
      <div className="mb-8 max-w-md mx-auto">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="font-bold text-slate-900 mb-3 text-center">{language === 'ru' ? 'Есть промокод?' : 'Have a promo code?'}</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoResult(null); }}
              placeholder={language === 'ru' ? 'Введите промокод' : 'Enter promo code'}
              className="flex-1 p-3 border border-slate-200 rounded-lg text-sm"
            />
            <button onClick={handleApplyPromo} className="px-5 py-3 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition">
              {language === 'ru' ? 'Применить' : 'Apply'}
            </button>
          </div>
          {promoResult && promoResult.valid && (
            <p className="mt-2 text-sm text-green-600 font-medium">
              {language === 'ru' ? `✓ Скидка ${promoResult.discount}${promoResult.type === 'percent' ? '%' : ' ₽'} применена!` : `✓ Discount ${promoResult.discount}${promoResult.type === 'percent' ? '%' : ' ₽'} applied!`}
            </p>
          )}
          {promoError && <p className="mt-2 text-sm text-red-500">{promoError}</p>}
        </div>
      </div>

      {/* ═══ LEGAL DISCLAIMERS ═══ */}
      <div className="space-y-2 mb-8">
        <p className="text-xs text-slate-400 text-center">
          {language === 'ru'
            ? '* Бесплатный период 48 часов предоставляется один раз при регистрации. По окончании бесплатного периода подписка не активируется автоматически. Для continued использования необходимо выбрать и оплатить тарифный план.'
            : '* Free 48-hour trial is provided once upon registration. After the trial period, subscription is not activated automatically.'}
        </p>
        <p className="text-xs text-slate-400 text-center">
          {language === 'ru'
            ? 'Цены указаны в российских рублях с учётом НДС. Оплата производится через сервис Яндекс.Оплата. Возврат средств осуществляется в соответствии с договором оферты.'
            : 'Prices are in Russian rubles inclusive of VAT. Payment via Yandex.Pay.'}
        </p>
      </div>

      {/* ═══ PAY MODAL ═══ */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <button onClick={() => setShowPayModal(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg">
              <X size={18} className="text-slate-400" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{language === 'ru' ? 'Оплата через Яндекс.Оплата' : 'Payment via Yandex.Pay'}</h3>
              <p className="text-slate-600 text-sm mb-4">{language === 'ru' ? 'Подтвердите оплату' : 'Confirm payment'}</p>
              <div className="space-y-2 mb-4">
                <button className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm font-medium hover:bg-yellow-100 transition flex items-center gap-3">
                  <span className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center text-white font-bold">Я</span>
                  {language === 'ru' ? 'Оплатить через Яндекс.Оплата' : 'Pay via Yandex.Pay'}
                </button>
                <button className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-100 transition flex items-center gap-3">
                  <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><CreditCard size={16} className="text-purple-600" /></span>
                  {language === 'ru' ? 'Банковской картой' : 'By bank card'}
                </button>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-sm text-slate-500 hover:text-slate-700">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}