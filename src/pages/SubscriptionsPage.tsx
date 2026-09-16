import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Check, Star, Zap, Crown } from 'lucide-react';

export default function SubscriptionsPage() {
  const { language, currency, currentUser } = useStore();
  const t = translations[language];

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
      features: language === 'ru' ? [
        'Полный доступ на 48 часов',
        'Генерация до 10 постов',
        'Базовая аналитика',
        'Публикация в 2 соцсети',
      ] : [
        'Full access for 48 hours',
        'Up to 10 posts',
        'Basic analytics',
        'Publish to 2 networks',
      ],
    },
    {
      id: 'basic',
      name: t.basicPlan,
      price: 990,
      icon: Zap,
      color: 'from-blue-500 to-blue-600',
      features: language === 'ru' ? [
        'Генерация до 50 постов/мес',
        'Публикация в 3 соцсети',
        'Базовая озвучка',
        'Стандартная аналитика',
        'Поддержка по email',
      ] : [
        'Up to 50 posts/month',
        'Publish to 3 networks',
        'Basic voiceover',
        'Standard analytics',
        'Email support',
      ],
    },
    {
      id: 'pro',
      name: t.proPlan,
      price: 2990,
      icon: Star,
      color: 'from-purple-500 to-purple-600',
      popular: true,
      features: language === 'ru' ? [
        'Безлимитная генерация',
        'Публикация во все соцсети',
        'Озвучка + видеоряд',
        'Расширенная аналитика',
        'Расписание публикаций',
        'SEO и GEO оптимизация',
        'Приоритетная поддержка',
      ] : [
        'Unlimited generation',
        'Publish to all networks',
        'Voiceover + video',
        'Advanced analytics',
        'Publishing schedule',
        'SEO & GEO optimization',
        'Priority support',
      ],
    },
    {
      id: 'premium',
      name: t.premiumPlan,
      price: 7990,
      icon: Crown,
      color: 'from-amber-500 to-orange-600',
      features: language === 'ru' ? [
        'Всё из Pro',
        'Генерация музыки и песен',
        'Видеомонтаж',
        'API доступ',
        'Белая метка',
        'Персональный менеджер',
        'Монетизация за блок',
        'Рекламный кабинет',
        'Приоритет модерации',
      ] : [
        'Everything in Pro',
        'Music & song generation',
        'Video editing',
        'API access',
        'White label',
        'Personal manager',
        'Per-block monetization',
        'Advertiser dashboard',
        'Priority moderation',
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.subscriptions}</h1>
        <p className="text-slate-600">{language === 'ru' ? 'Выберите подходящий тариф для вашего блога' : 'Choose the right plan for your blog'}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-white rounded-2xl p-6 border ${plan.popular ? 'border-purple-300 shadow-lg shadow-purple-100 relative' : 'border-slate-100'}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium rounded-full">
                {language === 'ru' ? 'Популярный' : 'Popular'}
              </div>
            )}
            <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4`}>
              <plan.icon size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-xl text-slate-900">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold text-slate-900">{formatPrice(plan.price)}</span>
              {plan.price > 0 && <span className="text-slate-500 text-sm">{t.perMonth}</span>}
              {plan.price === 0 && <span className="text-slate-500 text-sm"> / {plan.period}</span>}
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                currentUser?.subscription === plan.id
                  ? 'bg-slate-100 text-slate-500 cursor-default'
                  : plan.popular
                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              disabled={currentUser?.subscription === plan.id}
            >
              {currentUser?.subscription === plan.id ? t.currentPlan : t.subscribe}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Info */}
      <div className="mt-12 bg-white rounded-xl p-6 border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Способы оплаты' : 'Payment Methods'}</h3>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="font-bold text-yellow-700">Я</span>
            <span className="text-sm text-yellow-700">{language === 'ru' ? 'Яндекс.Оплата' : 'Yandex.Pay'}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-sm text-purple-700">{language === 'ru' ? 'Банковская карта' : 'Bank Card'}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm text-blue-700">{language === 'ru' ? 'СБП' : 'SBP'}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
            <span className="text-sm text-green-700">{language === 'ru' ? 'ЮMoney' : 'YooMoney'}</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-4">{language === 'ru' ? 'Оплата через платёжную систему Яндекс. Безопасно и быстро.' : 'Payment via Yandex payment system. Secure and fast.'}</p>
      </div>
    </div>
  );
}
