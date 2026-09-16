import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Megaphone, Eye, MousePointer, Image, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdvertiserPage() {
  const { language, currency, adBlocks, updateAdBlock } = useStore();
  const t = translations[language];
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'views' | 'clicks' | 'banner'>('banner');
  const [budget, setBudget] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adLink, setAdLink] = useState('');

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${Math.round(price / 90)}`;
    if (currency === 'CNY') return `¥${Math.round(price / 12)}`;
    return `${price.toLocaleString()} ₽`;
  };

  const chartData = [
    { day: language === 'ru' ? 'Пн' : 'Mon', impressions: 1200, clicks: 45 },
    { day: language === 'ru' ? 'Вт' : 'Tue', impressions: 1800, clicks: 67 },
    { day: language === 'ru' ? 'Ср' : 'Wed', impressions: 1500, clicks: 52 },
    { day: language === 'ru' ? 'Чт' : 'Thu', impressions: 2100, clicks: 89 },
    { day: language === 'ru' ? 'Пт' : 'Fri', impressions: 2500, clicks: 102 },
    { day: language === 'ru' ? 'Сб' : 'Sat', impressions: 1900, clicks: 78 },
    { day: language === 'ru' ? 'Вс' : 'Sun', impressions: 1600, clicks: 61 },
  ];

  const handleCreateAd = () => {
    if (!selectedBlock || !adTitle) return;
    updateAdBlock(selectedBlock, {
      title: adTitle,
      link: adLink,
      type: paymentType,
      active: true,
    });
    alert(language === 'ru' ? 'Реклама создана! Оплата через Яндекс.Оплата' : 'Ad created! Payment via Yandex.Pay');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{language === 'ru' ? 'Рекламный кабинет' : 'Advertiser Dashboard'}</h1>
      <p className="text-slate-600 mb-8">{language === 'ru' ? 'Управление рекламой на платформе BlogPro' : 'Manage advertising on BlogPro platform'}</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Ad Blocks */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Доступные блоки' : 'Available blocks'}</h3>
          {adBlocks.map(block => (
            <button
              key={block.id}
              onClick={() => setSelectedBlock(block.id)}
              className={`w-full text-left p-4 rounded-xl border transition ${
                selectedBlock === block.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{block.title}</p>
                <span className={`w-3 h-3 rounded-full ${block.active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{block.position} • {formatPrice(block.pricePerDay)}/{language === 'ru' ? 'день' : 'day'}</p>
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span>{t.impressions}: {block.impressions.toLocaleString()}</span>
                <span>{t.clicks}: {block.clicks}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right - Ad Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Ad Form */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Настройка рекламы' : 'Ad Configuration'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Название рекламы' : 'Ad title'}</label>
                <input type="text" value={adTitle} onChange={e => setAdTitle(e.target.value)} placeholder={language === 'ru' ? 'Введите название...' : 'Enter title...'} className="w-full p-3 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Ссылка' : 'Link'}</label>
                <input type="url" value={adLink} onChange={e => setAdLink(e.target.value)} placeholder="https://..." className="w-full p-3 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Способ оплаты' : 'Payment method'}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setPaymentType('views')} className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 ${paymentType === 'views' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
                    <Eye size={18} />
                    {t.payPerView}
                  </button>
                  <button onClick={() => setPaymentType('clicks')} className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 ${paymentType === 'clicks' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
                    <MousePointer size={18} />
                    {t.payPerClick}
                  </button>
                  <button onClick={() => setPaymentType('banner')} className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 ${paymentType === 'banner' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
                    <Image size={18} />
                    {t.payPerBanner}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Бюджет (в день)' : 'Budget (per day)'}</label>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="10000" className="w-full p-3 border border-slate-200 rounded-lg" />
              </div>
              <button
                onClick={handleCreateAd}
                disabled={!selectedBlock || !adTitle}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Megaphone size={18} />
                {language === 'ru' ? 'Создать и оплатить через Яндекс' : 'Create and pay via Yandex'}
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Статистика рекламы' : 'Ad Statistics'}</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-xl font-bold text-blue-700">12,600</p>
                <p className="text-xs text-blue-600">{t.impressions}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-xl font-bold text-green-700">494</p>
                <p className="text-xs text-green-600">{t.clicks}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-xl font-bold text-purple-700">3.9%</p>
                <p className="text-xs text-purple-600">CTR</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="impressions" fill="#3b82f6" name={t.impressions} radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" fill="#10b981" name={t.clicks} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment via Yandex */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-yellow-900">{language === 'ru' ? 'Яндекс.Оплата' : 'Yandex.Pay'}</p>
              <p className="text-sm text-yellow-700">{language === 'ru' ? 'Безопасная оплата. Банковские карты, ЮMoney, СБП.' : 'Secure payment. Bank cards, YooMoney, SBP.'}</p>
            </div>
            <TrendingUp size={20} className="text-yellow-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
