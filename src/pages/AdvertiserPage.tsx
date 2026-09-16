import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import {
  Megaphone, Eye, MousePointer, Image, TrendingUp, DollarSign,
  BarChart3, Plus, Video, Globe, Film, Clock, Tag, Check,
  Upload, Play, Settings, Trash2, Edit, Calendar, CreditCard,
  Zap, Crown, Star, AlertCircle, X, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

type Tab = 'my-ads' | 'create' | 'tariffs' | 'stats' | 'settings';
type Placement = 'site' | 'video' | 'both';
type PaymentModel = 'cpm' | 'cpc' | 'cpd' | 'cph';

interface AdCampaign {
  id: string;
  title: string;
  placement: Placement;
  paymentModel: PaymentModel;
  budget: number;
  spent: number;
  status: 'active' | 'paused' | 'draft' | 'review';
  impressions: number;
  clicks: number;
  ctr: number;
  startDate: string;
  endDate?: string;
  videoPosition?: 'pre-roll' | 'mid-roll' | 'post-roll' | 'overlay';
  sitePosition?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export default function AdvertiserPage() {
  const { language, currency, adBlocks, updateAdBlock, addAdBlock } = useStore();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<Tab>('my-ads');

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${(price / 90).toFixed(2)}`;
    if (currency === 'CNY') return `¥${(price / 12).toFixed(2)}`;
    return `${price.toFixed(2)} ₽`;
  };

  const formatPriceInt = (price: number) => {
    if (currency === 'USD') return `$${Math.round(price / 90)}`;
    if (currency === 'CNY') return `¥${Math.round(price / 12)}`;
    return `${price.toLocaleString()} ₽`;
  };

  // ============ MY ADS ============
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([
    { id: '1', title: language === 'ru' ? 'Продвижение интернет-магазина' : 'Online store promotion', placement: 'both', paymentModel: 'cpc', budget: 50000, spent: 12340, status: 'active', impressions: 45200, clicks: 892, ctr: 1.97, startDate: '2024-03-01', sitePosition: 'hero', videoPosition: 'mid-roll', mediaType: 'image' },
    { id: '2', title: language === 'ru' ? 'Реклама мобильного приложения' : 'Mobile app ad', placement: 'video', paymentModel: 'cpm', budget: 30000, spent: 8900, status: 'active', impressions: 128000, clicks: 340, ctr: 0.27, startDate: '2024-03-05', videoPosition: 'pre-roll', mediaType: 'video' },
    { id: '3', title: language === 'ru' ? 'Баннер новой коллекции' : 'New collection banner', placement: 'site', paymentModel: 'cpd', budget: 100000, spent: 50000, status: 'active', impressions: 89000, clicks: 1200, ctr: 1.35, startDate: '2024-03-10', sitePosition: 'hero', mediaType: 'image' },
    { id: '4', title: language === 'ru' ? 'Акция — распродажа' : 'Sale promotion', placement: 'both', paymentModel: 'cpc', budget: 20000, spent: 0, status: 'draft', impressions: 0, clicks: 0, ctr: 0, startDate: '2024-03-20', mediaType: 'image' },
  ]);

  // ============ CREATE AD FORM ============
  const [newAd, setNewAd] = useState({
    title: '',
    placement: 'both' as Placement,
    paymentModel: 'cpm' as PaymentModel,
    budget: '',
    startDate: '',
    endDate: '',
    videoPosition: 'mid-roll' as 'pre-roll' | 'mid-roll' | 'post-roll' | 'overlay',
    sitePosition: 'hero',
    mediaType: 'image' as 'image' | 'video',
    link: '',
    description: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [created, setCreated] = useState(false);

  // ============ STATS ============
  const chartData = [
    { day: language === 'ru' ? 'Пн' : 'Mon', impressions: 12400, clicks: 245, spend: 3200 },
    { day: language === 'ru' ? 'Вт' : 'Tue', impressions: 18200, clicks: 367, spend: 4800 },
    { day: language === 'ru' ? 'Ср' : 'Wed', impressions: 15600, clicks: 312, spend: 4100 },
    { day: language === 'ru' ? 'Чт' : 'Thu', impressions: 21300, clicks: 489, spend: 6200 },
    { day: language === 'ru' ? 'Пт' : 'Fri', impressions: 25800, clicks: 602, spend: 7800 },
    { day: language === 'ru' ? 'Сб' : 'Sat', impressions: 19400, clicks: 478, spend: 5900 },
    { day: language === 'ru' ? 'Вс' : 'Sun', impressions: 16200, clicks: 361, spend: 4500 },
  ];

  const pieData = [
    { name: language === 'ru' ? 'Площадка' : 'Site', value: 58, color: '#3b82f6' },
    { name: language === 'ru' ? 'Видеоролики' : 'Videos', value: 42, color: '#8b5cf6' },
  ];

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  const handleCreateCampaign = () => {
    const campaign: AdCampaign = {
      id: Date.now().toString(),
      title: newAd.title,
      placement: newAd.placement,
      paymentModel: newAd.paymentModel,
      budget: parseFloat(newAd.budget) || 0,
      spent: 0,
      status: 'review',
      impressions: 0,
      clicks: 0,
      ctr: 0,
      startDate: newAd.startDate,
      endDate: newAd.endDate || undefined,
      videoPosition: newAd.videoPosition,
      sitePosition: newAd.sitePosition,
      mediaType: newAd.mediaType,
    };
    setCampaigns(prev => [...prev, campaign]);
    setCreated(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setCreated(false);
      setNewAd({ title: '', placement: 'both', paymentModel: 'cpm', budget: '', startDate: '', endDate: '', videoPosition: 'mid-roll', sitePosition: 'hero', mediaType: 'image', link: '', description: '' });
    }, 2000);
  };

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: 'my-ads', icon: Megaphone, label: language === 'ru' ? 'Моя реклама' : 'My Ads' },
    { id: 'create', icon: Plus, label: language === 'ru' ? 'Создать' : 'Create' },
    { id: 'tariffs', icon: Tag, label: language === 'ru' ? 'Тарифы' : 'Tariffs' },
    { id: 'stats', icon: BarChart3, label: language === 'ru' ? 'Статистика' : 'Statistics' },
    { id: 'settings', icon: Settings, label: language === 'ru' ? 'Настройки' : 'Settings' },
  ];

  // ============ TARIFFS DATA ============
  const siteTariffs = [
    {
      position: language === 'ru' ? 'Главный баннер (Hero)' : 'Hero Banner',
      size: '1200×300',
      cpm: 150, cpc: 15, cpd: 50000, cph: 2500,
      audience: '50 000+',
      color: 'from-amber-500 to-orange-600',
      popular: true,
      desc: language === 'ru' ? 'Самый заметный блок на главной странице' : 'Most visible block on homepage'
    },
    {
      position: language === 'ru' ? 'Боковой блок' : 'Sidebar Block',
      size: '300×600',
      cpm: 30, cpc: 5, cpd: 5000, cph: 250,
      audience: '30 000+',
      color: 'from-blue-500 to-blue-600',
      desc: language === 'ru' ? 'Вертикальный баннер в боковой панели' : 'Vertical banner in sidebar'
    },
    {
      position: language === 'ru' ? 'Встроенный блок' : 'Inline Block',
      size: '728×90',
      cpm: 20, cpc: 4, cpd: 3000, cph: 150,
      audience: '40 000+',
      color: 'from-green-500 to-emerald-600',
      desc: language === 'ru' ? 'Реклама внутри контента' : 'Ad inside content'
    },
    {
      position: language === 'ru' ? 'Нижний баннер' : 'Footer Banner',
      size: '970×250',
      cpm: 60, cpc: 8, cpd: 10000, cph: 500,
      audience: '45 000+',
      color: 'from-purple-500 to-violet-600',
      desc: language === 'ru' ? 'Баннер внизу каждой страницы' : 'Banner at bottom of every page'
    },
    {
      position: language === 'ru' ? 'Попап-уведомление' : 'Popup Notification',
      size: '400×300',
      cpm: 100, cpc: 12, cpd: 25000, cph: 1200,
      audience: '20 000+',
      color: 'from-pink-500 to-rose-600',
      desc: language === 'ru' ? 'Всплывающее рекламное окно' : 'Popup ad window'
    },
  ];

  const videoTariffs = [
    {
      position: language === 'ru' ? 'Pre-roll (до видео)' : 'Pre-roll (before video)',
      duration: '5-15 сек',
      cpm: 200, cpc: 25, cpd: 80000, cph: 4000,
      audience: '100 000+',
      color: 'from-red-500 to-rose-600',
      popular: true,
      desc: language === 'ru' ? 'Ролик показывается перед основным контентом' : 'Ad plays before main content'
    },
    {
      position: language === 'ru' ? 'Mid-roll (в середине)' : 'Mid-roll (middle)',
      duration: '10-30 сек',
      cpm: 250, cpc: 30, cpd: 100000, cph: 5000,
      audience: '80 000+',
      color: 'from-indigo-500 to-blue-600',
      desc: language === 'ru' ? 'Встраивается в середину видеоролика' : 'Inserted in the middle of video'
    },
    {
      position: language === 'ru' ? 'Post-roll (после видео)' : 'Post-roll (after video)',
      duration: '5-15 сек',
      cpm: 120, cpc: 15, cpd: 40000, cph: 2000,
      audience: '90 000+',
      color: 'from-teal-500 to-cyan-600',
      desc: language === 'ru' ? 'Показывается после окончания видео' : 'Shown after video ends'
    },
    {
      position: language === 'ru' ? 'Overlay (поверх видео)' : 'Overlay (on video)',
      duration: language === 'ru' ? 'Постоянно' : 'Constant',
      cpm: 80, cpc: 10, cpd: 20000, cph: 1000,
      audience: '100 000+',
      color: 'from-orange-500 to-amber-600',
      desc: language === 'ru' ? 'Полупрозрачный баннер поверх видео' : 'Semi-transparent banner over video'
    },
    {
      position: language === 'ru' ? 'Интеграция в контент' : 'Content Integration',
      duration: '30-60 сек',
      cpm: 400, cpc: 50, cpd: 200000, cph: 10000,
      audience: '60 000+',
      color: 'from-violet-500 to-purple-600',
      premium: true,
      desc: language === 'ru' ? 'Нативная интеграция в создаваемый блогером контент' : 'Native integration into blogger content'
    },
  ];

  const paymentModelLabels: Record<PaymentModel, string> = {
    cpm: language === 'ru' ? 'За 1000 показов' : 'Per 1000 views',
    cpc: language === 'ru' ? 'За клик' : 'Per click',
    cpd: language === 'ru' ? 'За день' : 'Per day',
    cph: language === 'ru' ? 'За час' : 'Per hour',
  };

  const placementLabels: Record<Placement, string> = {
    site: language === 'ru' ? 'На площадке' : 'On site',
    video: language === 'ru' ? 'В видеороликах' : 'In videos',
    both: language === 'ru' ? 'Площадка + Видео' : 'Site + Videos',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{language === 'ru' ? 'Рекламный кабинет' : 'Advertiser Dashboard'}</h1>
          <p className="text-slate-600 mt-1">{language === 'ru' ? 'Размещение рекламы на площадке и в видеороликах' : 'Ad placement on site and in videos'}</p>
        </div>
        <button
          onClick={() => { setActiveTab('create'); setShowCreateModal(true); }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          {language === 'ru' ? 'Новая кампания' : 'New campaign'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 border border-slate-100 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === 'create') setShowCreateModal(true); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ MY ADS TAB ============ */}
      {activeTab === 'my-ads' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone size={18} className="text-blue-500" />
                <span className="text-sm text-slate-500">{language === 'ru' ? 'Кампаний' : 'Campaigns'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{campaigns.length}</p>
              <p className="text-xs text-green-600 mt-1">{campaigns.filter(c => c.status === 'active').length} {language === 'ru' ? 'активных' : 'active'}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={18} className="text-purple-500" />
                <span className="text-sm text-slate-500">{t.impressions}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalImpressions.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">+18% {language === 'ru' ? 'за неделю' : 'this week'}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <MousePointer size={18} className="text-green-500" />
                <span className="text-sm text-slate-500">{t.clicks}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalClicks.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">CTR: {avgCtr}%</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-amber-500" />
                <span className="text-sm text-slate-500">{language === 'ru' ? 'Потрачено' : 'Spent'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatPriceInt(totalSpent)}</p>
              <p className="text-xs text-slate-500 mt-1">{language === 'ru' ? 'из бюджета' : 'of budget'}</p>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Мои рекламные кампании' : 'My Ad Campaigns'}</h3>
              <button onClick={() => { setActiveTab('create'); setShowCreateModal(true); }} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> {language === 'ru' ? 'Создать' : 'Create'}
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="p-5 hover:bg-slate-50 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900">{campaign.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          campaign.status === 'active' ? 'bg-green-50 text-green-700' :
                          campaign.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
                          campaign.status === 'review' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {campaign.status === 'active' ? (language === 'ru' ? 'Активна' : 'Active') :
                           campaign.status === 'paused' ? (language === 'ru' ? 'На паузе' : 'Paused') :
                           campaign.status === 'review' ? (language === 'ru' ? 'На проверке' : 'Review') :
                           (language === 'ru' ? 'Черновик' : 'Draft')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded flex items-center gap-1">
                          {campaign.placement === 'site' ? <Globe size={10} /> : campaign.placement === 'video' ? <Video size={10} /> : <><Globe size={10} /><Video size={10} /></>}
                          {placementLabels[campaign.placement]}
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                          {paymentModelLabels[campaign.paymentModel]}
                        </span>
                        {campaign.videoPosition && (
                          <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded flex items-center gap-1">
                            <Film size={10} /> {campaign.videoPosition}
                          </span>
                        )}
                        {campaign.sitePosition && campaign.placement !== 'video' && (
                          <span className="text-xs px-2 py-1 bg-cyan-50 text-cyan-700 rounded">
                            📍 {campaign.sitePosition}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-900">{campaign.impressions.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{t.impressions}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-900">{campaign.clicks}</p>
                        <p className="text-xs text-slate-500">{t.clicks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{campaign.ctr}%</p>
                        <p className="text-xs text-slate-500">CTR</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-900">{formatPriceInt(campaign.spent)}</p>
                        <p className="text-xs text-slate-500">{language === 'ru' ? 'Потрачено' : 'Spent'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"><Edit size={14} /></button>
                        <button className="p-2 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{language === 'ru' ? 'Бюджет' : 'Budget'}: {formatPriceInt(campaign.budget)}</span>
                      <span>{campaign.budget > 0 ? ((campaign.spent / campaign.budget) * 100).toFixed(0) : 0}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${Math.min(100, campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ CREATE AD TAB ============ */}
      {activeTab === 'create' && (
        <CreateAdForm
          newAd={newAd}
          setNewAd={setNewAd}
          handleCreate={handleCreateCampaign}
          language={language}
          currency={currency}
          formatPrice={formatPrice}
          created={created}
          onClose={() => { setShowCreateModal(false); setActiveTab('my-ads'); }}
          placementLabels={placementLabels}
          paymentModelLabels={paymentModelLabels}
        />
      )}

      {/* ============ TARIFFS TAB ============ */}
      {activeTab === 'tariffs' && (
        <div className="space-y-8">
          {/* Payment Models Explainer */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="font-bold text-lg text-slate-900 mb-4">{language === 'ru' ? 'Модели оплаты' : 'Payment Models'}</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Eye size={16} className="text-blue-600" /></div>
                  <span className="font-bold text-sm">CPM</span>
                </div>
                <p className="text-xs text-slate-600">{language === 'ru' ? 'Оплата за 1000 показов. Идеально для повышения узнаваемости бренда.' : 'Pay per 1000 impressions. Ideal for brand awareness.'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><MousePointer size={16} className="text-green-600" /></div>
                  <span className="font-bold text-sm">CPC</span>
                </div>
                <p className="text-xs text-slate-600">{language === 'ru' ? 'Оплата за каждый клик. Платите только за реальные действия.' : 'Pay per click. Pay only for real actions.'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Calendar size={16} className="text-purple-600" /></div>
                  <span className="font-bold text-sm">CPD</span>
                </div>
                <p className="text-xs text-slate-600">{language === 'ru' ? 'Фиксированная оплата за день размещения баннера.' : 'Fixed payment per day of banner placement.'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Clock size={16} className="text-amber-600" /></div>
                  <span className="font-bold text-sm">CPH</span>
                </div>
                <p className="text-xs text-slate-600">{language === 'ru' ? 'Оплата за час показа. Гибкое управление бюджетом.' : 'Pay per hour of display. Flexible budget management.'}</p>
              </div>
            </div>
          </div>

          {/* Site Tariffs */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Globe size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Тарифы на площадке' : 'Site Tariffs'}</h3>
                <p className="text-sm text-slate-500">{language === 'ru' ? 'Размещение баннеров на страницах BlogPro' : 'Banner placement on BlogPro pages'}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {siteTariffs.map((tariff, i) => (
                <div key={i} className={`bg-white rounded-xl border ${tariff.popular ? 'border-amber-300 shadow-lg shadow-amber-50' : 'border-slate-100'} overflow-hidden relative`}>
                  {tariff.popular && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full">
                      {language === 'ru' ? 'Хит' : 'Hot'}
                    </div>
                  )}
                  <div className={`h-2 bg-gradient-to-r ${tariff.color}`}></div>
                  <div className="p-5">
                    <h4 className="font-bold text-slate-900">{tariff.position}</h4>
                    <p className="text-xs text-slate-500 mt-1">{tariff.desc}</p>
                    <p className="text-xs text-slate-400 mt-1">{tariff.size} • {tariff.audience} {language === 'ru' ? 'аудитория' : 'audience'}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPM:</span>
                        <span className="font-medium">{formatPrice(tariff.cpm)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPC:</span>
                        <span className="font-medium">{formatPrice(tariff.cpc)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPD:</span>
                        <span className="font-bold text-slate-900">{formatPriceInt(tariff.cpd)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPH:</span>
                        <span className="font-medium">{formatPrice(tariff.cph)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveTab('create'); setShowCreateModal(true); setNewAd(prev => ({ ...prev, sitePosition: tariff.position, placement: 'site' })); }}
                      className="w-full mt-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                    >
                      {language === 'ru' ? 'Разместить' : 'Place Ad'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Video Tariffs */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <Video size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Тарифы в видеороликах' : 'Video Tariffs'}</h3>
                <p className="text-sm text-slate-500">{language === 'ru' ? 'Встраивание рекламы в создаваемые блогерами видеоролики' : 'Ad insertion into blogger-created videos'}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoTariffs.map((tariff, i) => (
                <div key={i} className={`bg-white rounded-xl border ${tariff.popular ? 'border-purple-300 shadow-lg shadow-purple-50' : tariff.premium ? 'border-amber-300 shadow-lg shadow-amber-50' : 'border-slate-100'} overflow-hidden relative`}>
                  {tariff.popular && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full">
                      {language === 'ru' ? 'Хит' : 'Hot'}
                    </div>
                  )}
                  {tariff.premium && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                      <Crown size={10} /> Premium
                    </div>
                  )}
                  <div className={`h-2 bg-gradient-to-r ${tariff.color}`}></div>
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <Play size={14} className="text-purple-500" />
                      <h4 className="font-bold text-slate-900">{tariff.position}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{tariff.desc}</p>
                    <p className="text-xs text-slate-400 mt-1">{language === 'ru' ? 'Длительность' : 'Duration'}: {tariff.duration} • {tariff.audience} {language === 'ru' ? 'просмотров' : 'views'}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPM:</span>
                        <span className="font-medium">{formatPrice(tariff.cpm)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPC:</span>
                        <span className="font-medium">{formatPrice(tariff.cpc)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPD:</span>
                        <span className="font-bold text-slate-900">{formatPriceInt(tariff.cpd)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CPH:</span>
                        <span className="font-medium">{formatPrice(tariff.cph)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveTab('create'); setShowCreateModal(true); setNewAd(prev => ({ ...prev, placement: 'video', videoPosition: tariff.position.includes('Pre') ? 'pre-roll' : tariff.position.includes('Mid') ? 'mid-roll' : tariff.position.includes('Post') ? 'post-roll' : 'overlay' })); }}
                      className="w-full mt-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition"
                    >
                      {language === 'ru' ? 'Встроить в видео' : 'Insert in video'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yandex Payment */}
          <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-xl flex flex-col md:flex-row items-center gap-4">
            <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard size={28} className="text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="font-bold text-yellow-900">{language === 'ru' ? 'Оплата через Яндекс.Оплата' : 'Payment via Yandex.Pay'}</p>
              <p className="text-sm text-yellow-700">{language === 'ru' ? 'Банковские карты, ЮMoney, СБП — безопасная и быстрая оплата' : 'Bank cards, YooMoney, SBP — secure and fast payment'}</p>
            </div>
            <button className="px-6 py-2.5 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition shrink-0">
              {language === 'ru' ? 'Пополнить баланс' : 'Top up balance'}
            </button>
          </div>
        </div>
      )}

      {/* ============ STATS TAB ============ */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Динамика за неделю' : 'Weekly dynamics'}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} name={t.impressions} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} name={t.clicks} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Распределение' : 'Distribution'}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Расходы по дням' : 'Daily spend'}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="spend" fill="#8b5cf6" name={language === 'ru' ? 'Расходы' : 'Spend'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ============ SETTINGS TAB ============ */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Настройки аккаунта рекламодателя' : 'Advertiser account settings'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Название компании' : 'Company name'}</label>
                <input type="text" className="w-full p-3 border border-slate-200 rounded-lg" placeholder={language === 'ru' ? 'Введите название' : 'Enter name'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Контактный email' : 'Contact email'}</label>
                <input type="email" className="w-full p-3 border border-slate-200 rounded-lg" placeholder="email@company.ru" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Баланс' : 'Balance'}</label>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-slate-900">{formatPriceInt(125000)}</p>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">{language === 'ru' ? 'Пополнить' : 'Top up'}</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Автосписание через Яндекс.Оплата' : 'Auto-charge via Yandex.Pay'}</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-500 rounded" />
                <span className="text-sm">{language === 'ru' ? 'Автоматическое пополнение при балансе ниже 5 000 ₽' : 'Auto top-up when balance below 5,000 ₽'}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-500 rounded" />
                <span className="text-sm">{language === 'ru' ? 'Уведомления о расходах по email' : 'Spend notifications by email'}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                <input type="checkbox" className="w-4 h-4 text-blue-500 rounded" />
                <span className="text-sm">{language === 'ru' ? 'Лимит расходов в день' : 'Daily spend limit'}</span>
              </label>
            </div>
          </div>

          <button className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition">
            {t.save}
          </button>
        </div>
      )}

      {/* ============ CREATE MODAL ============ */}
      {showCreateModal && activeTab === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowCreateModal(false); setActiveTab('my-ads'); }}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {created ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{language === 'ru' ? 'Кампания создана!' : 'Campaign created!'}</h3>
                <p className="text-slate-600">{language === 'ru' ? 'Реклама отправлена на модерацию. После одобрения она будет размещена на площадке и в видеороликах.' : 'Ad sent for moderation. After approval it will be placed on site and in videos.'}</p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Новая рекламная кампания' : 'New Ad Campaign'}</h3>
                  <button onClick={() => { setShowCreateModal(false); setActiveTab('my-ads'); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Название кампании' : 'Campaign name'}</label>
                    <input type="text" value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" placeholder={language === 'ru' ? 'Например: Реклама магазина' : 'e.g.: Store ad'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Размещение' : 'Placement'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['site', 'video', 'both'] as Placement[]).map(p => (
                        <button key={p} onClick={() => setNewAd({ ...newAd, placement: p })} className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition ${newAd.placement === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                          {p === 'site' ? <Globe size={18} /> : p === 'video' ? <Video size={18} /> : <><Globe size={14} /><Video size={14} /></>}
                          {placementLabels[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Video Position */}
                  {(newAd.placement === 'video' || newAd.placement === 'both') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Позиция в видео' : 'Video position'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['pre-roll', 'mid-roll', 'post-roll', 'overlay'] as const).map(pos => (
                          <button key={pos} onClick={() => setNewAd({ ...newAd, videoPosition: pos })} className={`p-3 rounded-lg border text-sm text-left transition ${newAd.videoPosition === pos ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 hover:border-slate-300'}`}>
                            <p className="font-medium">{pos}</p>
                            <p className="text-xs text-slate-500">
                              {pos === 'pre-roll' && (language === 'ru' ? 'До видео' : 'Before video')}
                              {pos === 'mid-roll' && (language === 'ru' ? 'В середине' : 'In the middle')}
                              {pos === 'post-roll' && (language === 'ru' ? 'После видео' : 'After video')}
                              {pos === 'overlay' && (language === 'ru' ? 'Поверх видео' : 'Over video')}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Site Position */}
                  {(newAd.placement === 'site' || newAd.placement === 'both') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Позиция на сайте' : 'Site position'}</label>
                      <select value={newAd.sitePosition} onChange={e => setNewAd({ ...newAd, sitePosition: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg">
                        <option value="hero">{language === 'ru' ? 'Главный баннер (50 000 ₽/день)' : 'Hero banner (50,000 ₽/day)'}</option>
                        <option value="sidebar">{language === 'ru' ? 'Боковой блок (5 000 ₽/день)' : 'Sidebar (5,000 ₽/day)'}</option>
                        <option value="inline">{language === 'ru' ? 'Встроенный блок (3 000 ₽/день)' : 'Inline (3,000 ₽/day)'}</option>
                        <option value="footer">{language === 'ru' ? 'Нижний баннер (10 000 ₽/день)' : 'Footer (10,000 ₽/day)'}</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Модель оплаты' : 'Payment model'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['cpm', 'cpc', 'cpd', 'cph'] as PaymentModel[]).map(model => (
                        <button key={model} onClick={() => setNewAd({ ...newAd, paymentModel: model })} className={`p-3 rounded-lg border text-sm font-medium transition ${newAd.paymentModel === model ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                          {model.toUpperCase()} — {paymentModelLabels[model]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Бюджет' : 'Budget'}</label>
                      <input type="number" value={newAd.budget} onChange={e => setNewAd({ ...newAd, budget: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" placeholder="50000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Тип медиа' : 'Media type'}</label>
                      <select value={newAd.mediaType} onChange={e => setNewAd({ ...newAd, mediaType: e.target.value as 'image' | 'video' })} className="w-full p-3 border border-slate-200 rounded-lg">
                        <option value="image">{language === 'ru' ? 'Изображение' : 'Image'}</option>
                        <option value="video">{language === 'ru' ? 'Видеоролик' : 'Video'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Дата начала' : 'Start date'}</label>
                      <input type="date" value={newAd.startDate} onChange={e => setNewAd({ ...newAd, startDate: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Дата окончания' : 'End date'}</label>
                      <input type="date" value={newAd.endDate} onChange={e => setNewAd({ ...newAd, endDate: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Ссылка' : 'Link'}</label>
                    <input type="url" value={newAd.link} onChange={e => setNewAd({ ...newAd, link: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" placeholder="https://..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Загрузка медиа' : 'Upload media'}</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition cursor-pointer">
                      <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">{language === 'ru' ? 'Перетащите файл или нажмите для загрузки' : 'Drag file or click to upload'}</p>
                      <p className="text-xs text-slate-400 mt-1">{language === 'ru' ? 'PNG, JPG, MP4 до 50 МБ' : 'PNG, JPG, MP4 up to 50 MB'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">{language === 'ru' ? 'Автомодерация' : 'Auto moderation'}</p>
                        <p className="text-xs mt-0.5">{language === 'ru' ? 'Реклама будет проверена на соответствие законодательству РФ. Среднее время проверки — 2 часа.' : 'Ad will be checked for compliance with Russian law. Average review time — 2 hours.'}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateCampaign}
                    disabled={!newAd.title || !newAd.budget}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={18} />
                    {language === 'ru' ? 'Создать и оплатить через Яндекс.Оплата' : 'Create and pay via Yandex.Pay'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ CREATE AD FORM COMPONENT ============
function CreateAdForm({ newAd, setNewAd, handleCreate, language, formatPrice, created, onClose, placementLabels, paymentModelLabels }: any) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-5">
        {created ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{language === 'ru' ? 'Кампания создана!' : 'Campaign created!'}</h3>
            <p className="text-slate-600">{language === 'ru' ? 'Реклама отправлена на модерацию.' : 'Ad sent for moderation.'}</p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Название' : 'Title'}</label>
              <input type="text" value={newAd.title} onChange={(e: any) => setNewAd({ ...newAd, title: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Размещение' : 'Placement'}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['site', 'video', 'both'] as any[]).map((p: any) => (
                  <button key={p} onClick={() => setNewAd({ ...newAd, placement: p })} className={`p-3 rounded-lg border text-sm font-medium ${newAd.placement === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
                    {placementLabels[p]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Оплата' : 'Payment'}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['cpm', 'cpc', 'cpd', 'cph'] as any[]).map((m: any) => (
                  <button key={m} onClick={() => setNewAd({ ...newAd, paymentModel: m })} className={`p-3 rounded-lg border text-sm ${newAd.paymentModel === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>
                    {m.toUpperCase()} — {paymentModelLabels[m]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Бюджет' : 'Budget'}</label>
              <input type="number" value={newAd.budget} onChange={(e: any) => setNewAd({ ...newAd, budget: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" />
            </div>
            <button onClick={handleCreate} disabled={!newAd.title || !newAd.budget} className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50">
              {language === 'ru' ? 'Создать кампанию' : 'Create campaign'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
