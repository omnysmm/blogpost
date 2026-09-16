import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Megaphone, Eye, MousePointer, Image, TrendingUp } from 'lucide-react';

export default function AdvertisingPage() {
  const { language, currency, adBlocks, setCurrentPage } = useStore();
  const t = translations[language];

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${Math.round(price / 90)}`;
    if (currency === 'CNY') return `¥${Math.round(price / 12)}`;
    return `${price.toLocaleString()} ₽`;
  };

  const adPositions = [
    { id: 'hero', name: t.heroBanner, price: 50000, desc: language === 'ru' ? 'Самый дорогой и заметный блок на главной странице' : 'Most expensive and visible block on homepage', size: '1200x300', icon: Megaphone, color: 'from-amber-500 to-orange-600' },
    { id: 'sidebar', name: t.sidebarAd, price: 5000, desc: language === 'ru' ? 'Боковой блок, виден при прокрутке' : 'Sidebar block, visible on scroll', size: '300x600', icon: Eye, color: 'from-blue-500 to-blue-600' },
    { id: 'inline', name: t.inlineAd, price: 3000, desc: language === 'ru' ? 'Встроенная реклама в контенте' : 'Inline ad in content', size: '728x90', icon: MousePointer, color: 'from-green-500 to-emerald-600' },
    { id: 'footer', name: t.footerBanner, price: 10000, desc: language === 'ru' ? 'Нижний баннер на всех страницах' : 'Bottom banner on all pages', size: '970x250', icon: Image, color: 'from-purple-500 to-violet-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.advertising}</h1>
        <p className="text-slate-600">{language === 'ru' ? 'Разместите рекламу на BlogPro и охватите тысячи блогеров' : 'Place ads on BlogPro and reach thousands of bloggers'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-slate-100 text-center">
          <p className="text-2xl font-bold text-slate-900">50K+</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Пользователей' : 'Users'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 text-center">
          <p className="text-2xl font-bold text-slate-900">1M+</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Просмотров/мес' : 'Views/month'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 text-center">
          <p className="text-2xl font-bold text-slate-900">3.2%</p>
          <p className="text-sm text-slate-500">CTR</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 text-center">
          <p className="text-2xl font-bold text-slate-900">95%</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Релевантность' : 'Relevance'}</p>
        </div>
      </div>

      {/* Ad Positions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {adPositions.map(position => (
          <div key={position.id} className="bg-white rounded-xl p-6 border border-slate-100 hover:shadow-lg transition">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${position.color} rounded-xl flex items-center justify-center shrink-0`}>
                <position.icon size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900">{position.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{position.desc}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">{position.size}px</span>
                  <span className="text-lg font-bold text-slate-900">{formatPrice(position.price)}<span className="text-sm text-slate-500 font-normal">/{language === 'ru' ? 'день' : 'day'}</span></span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCurrentPage('advertiser')} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition">
                {language === 'ru' ? 'Разместить' : 'Place Ad'}
              </button>
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
                {language === 'ru' ? 'Подробнее' : 'Details'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Options */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <h3 className="font-bold text-lg text-slate-900 mb-4">{language === 'ru' ? 'Способы оплаты рекламы' : 'Ad payment methods'}</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={18} className="text-blue-600" />
              <span className="font-medium text-blue-900">{t.payPerView}</span>
            </div>
            <p className="text-sm text-blue-700">{language === 'ru' ? 'Оплата за каждый показ рекламы' : 'Pay for each ad impression'}</p>
            <p className="text-xs text-blue-600 mt-2">{language === 'ru' ? 'от 0.5 ₽ за показ' : 'from 0.5 RUB per view'}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer size={18} className="text-green-600" />
              <span className="font-medium text-green-900">{t.payPerClick}</span>
            </div>
            <p className="text-sm text-green-700">{language === 'ru' ? 'Оплата за каждый клик по рекламе' : 'Pay for each ad click'}</p>
            <p className="text-xs text-green-600 mt-2">{language === 'ru' ? 'от 5 ₽ за клик' : 'from 5 RUB per click'}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Image size={18} className="text-purple-600" />
              <span className="font-medium text-purple-900">{t.payPerBanner}</span>
            </div>
            <p className="text-sm text-purple-700">{language === 'ru' ? 'Фиксированная оплата за размещение баннера' : 'Fixed payment for banner placement'}</p>
            <p className="text-xs text-purple-600 mt-2">{language === 'ru' ? 'от 3 000 ₽/день' : 'from 3,000 RUB/day'}</p>
          </div>
        </div>
      </div>

      {/* Yandex Payment */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-4">
        <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">Я</span>
        </div>
        <div>
          <p className="font-medium text-yellow-900">{language === 'ru' ? 'Яндекс.Оплата' : 'Yandex.Pay'}</p>
          <p className="text-sm text-yellow-700">{language === 'ru' ? 'Безопасная оплата через платёжную систему Яндекс' : 'Secure payment via Yandex payment system'}</p>
        </div>
        <TrendingUp size={20} className="ml-auto text-yellow-600" />
      </div>
    </div>
  );
}
