import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import {
  Megaphone, Plus, Settings, BarChart3, Target, DollarSign,
  Calendar, Eye, MousePointer, Video, Image, Globe, Users,
  MapPin, Hash, TrendingUp, TrendingDown, Check, X, Edit,
  Trash2, Play, Pause, Copy, Download, Upload, Filter,
  Search, Bell, Zap, Award, Shield, Clock, AlertCircle,
  CheckCircle2, XCircle, ChevronRight, ChevronDown,
  PieChart as PieIcon, Activity, Layers, RefreshCw,
  FileText, Link2, Tag, Sliders, Cpu, Database
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, Legend
} from 'recharts';

type CabinetTab = 'campaigns' | 'create' | 'analytics' | 'targeting' | 'creatives' | 'billing' | 'settings' | 'api';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'review' | 'rejected' | 'completed';
  format: 'banner' | 'video' | 'native' | 'popup' | 'interstitial';
  placement: 'site' | 'video' | 'both';
  targeting: {
    geo: string[];
    age: string;
    gender: 'all' | 'male' | 'female';
    interests: string[];
    devices: string[];
    languages: string[];
  };
  budget: {
    total: number;
    daily: number;
    spent: number;
    model: 'cpm' | 'cpc' | 'cpd' | 'cph' | 'cpa';
    bid: number;
  };
  schedule: {
    startDate: string;
    endDate?: string;
    hours: string;
    days: string[];
  };
  stats: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
  };
  creatives: number;
  createdAt: string;
}

export default function AdvertiserCabinetPage() {
  const { language, currency, currentUser } = useStore();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<CabinetTab>('campaigns');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${(price / 90).toFixed(2)}`;
    if (currency === 'CNY') return `¥${(price / 12).toFixed(2)}`;
    return `${price.toFixed(2)} ₽`;
  };

  // Campaigns data
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: language === 'ru' ? 'Весенняя распродажа' : 'Spring Sale',
      status: 'active',
      format: 'banner',
      placement: 'both',
      targeting: {
        geo: ['Москва', 'Санкт-Петербург', 'Казань'],
        age: '25-45',
        gender: 'all',
        interests: ['Шоппинг', 'Мода', 'Скидки'],
        devices: ['desktop', 'mobile'],
        languages: ['ru'],
      },
      budget: { total: 150000, daily: 5000, spent: 45000, model: 'cpc', bid: 15 },
      schedule: { startDate: '2024-03-01', endDate: '2024-04-30', hours: '09:00-22:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
      stats: { impressions: 245000, clicks: 3200, conversions: 180, ctr: 1.31, cpc: 14.06, cpa: 250 },
      creatives: 4,
      createdAt: '2024-03-01',
    },
    {
      id: '2',
      name: language === 'ru' ? 'Продвижение приложения' : 'App Promotion',
      status: 'active',
      format: 'video',
      placement: 'video',
      targeting: {
        geo: ['Россия'],
        age: '18-35',
        gender: 'all',
        interests: ['Технологии', 'Приложения', 'Гаджеты'],
        devices: ['mobile'],
        languages: ['ru', 'en'],
      },
      budget: { total: 200000, daily: 8000, spent: 72000, model: 'cpm', bid: 200 },
      schedule: { startDate: '2024-03-05', hours: '00:00-23:59', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
      stats: { impressions: 890000, clicks: 12500, conversions: 890, ctr: 1.40, cpc: 5.76, cpa: 80.9 },
      creatives: 3,
      createdAt: '2024-03-05',
    },
    {
      id: '3',
      name: language === 'ru' ? 'Новая коллекция' : 'New Collection',
      status: 'paused',
      format: 'native',
      placement: 'site',
      targeting: {
        geo: ['Москва'],
        age: '30-50',
        gender: 'female',
        interests: ['Красота', 'Косметика', 'Уход'],
        devices: ['desktop', 'mobile', 'tablet'],
        languages: ['ru'],
      },
      budget: { total: 80000, daily: 3000, spent: 28000, model: 'cpd', bid: 3000 },
      schedule: { startDate: '2024-02-15', endDate: '2024-03-15', hours: '10:00-20:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      stats: { impressions: 156000, clicks: 2100, conversions: 95, ctr: 1.35, cpc: 13.33, cpa: 294.7 },
      creatives: 2,
      createdAt: '2024-02-15',
    },
  ]);

  // Analytics data
  const analyticsData = {
    daily: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      impressions: Math.floor(Math.random() * 50000) + 20000,
      clicks: Math.floor(Math.random() * 1000) + 500,
      conversions: Math.floor(Math.random() * 100) + 20,
      spend: Math.floor(Math.random() * 10000) + 3000,
    })),
    byFormat: [
      { name: language === 'ru' ? 'Баннеры' : 'Banners', value: 45, color: '#3b82f6' },
      { name: language === 'ru' ? 'Видео' : 'Video', value: 30, color: '#8b5cf6' },
      { name: language === 'ru' ? 'Нативная' : 'Native', value: 15, color: '#10b981' },
      { name: language === 'ru' ? 'Попапы' : 'Popups', value: 10, color: '#f59e0b' },
    ],
    byDevice: [
      { device: 'Desktop', value: 52 },
      { device: 'Mobile', value: 38 },
      { device: 'Tablet', value: 10 },
    ],
  };

  const totalBudget = campaigns.reduce((s, c) => s + c.budget.total, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.budget.spent, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.stats.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.stats.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.stats.conversions, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  const tabs = [
    { id: 'campaigns' as CabinetTab, icon: Megaphone, label: language === 'ru' ? 'Кампании' : 'Campaigns', count: campaigns.length },
    { id: 'create' as CabinetTab, icon: Plus, label: language === 'ru' ? 'Создать' : 'Create' },
    { id: 'analytics' as CabinetTab, icon: BarChart3, label: language === 'ru' ? 'Аналитика' : 'Analytics' },
    { id: 'targeting' as CabinetTab, icon: Target, label: language === 'ru' ? 'Таргетинг' : 'Targeting' },
    { id: 'creatives' as CabinetTab, icon: Image, label: language === 'ru' ? 'Креативы' : 'Creatives' },
    { id: 'billing' as CabinetTab, icon: DollarSign, label: language === 'ru' ? 'Биллинг' : 'Billing' },
    { id: 'settings' as CabinetTab, icon: Settings, label: language === 'ru' ? 'Настройки' : 'Settings' },
    { id: 'api' as CabinetTab, icon: Cpu, label: 'API' },
  ];

  const statusColors = {
    active: 'bg-green-50 text-green-700 border-green-200',
    paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    draft: 'bg-slate-50 text-slate-700 border-slate-200',
    review: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    completed: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const statusLabels = {
    active: language === 'ru' ? 'Активна' : 'Active',
    paused: language === 'ru' ? 'На паузе' : 'Paused',
    draft: language === 'ru' ? 'Черновик' : 'Draft',
    review: language === 'ru' ? 'На проверке' : 'Review',
    rejected: language === 'ru' ? 'Отклонена' : 'Rejected',
    completed: language === 'ru' ? 'Завершена' : 'Completed',
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Megaphone size={24} className="text-white" />
            </div>
            {language === 'ru' ? 'Рекламный кабинет' : 'Advertiser Cabinet'}
          </h1>
          <p className="text-slate-600 mt-1">{language === 'ru' ? 'Полное управление рекламными кампаниями' : 'Full advertising campaign management'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">{language === 'ru' ? 'Баланс' : 'Balance'}</p>
            <p className="text-lg font-bold text-green-900">{formatPrice(125400)}</p>
          </div>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition">
            {language === 'ru' ? 'Пополнить' : 'Top up'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">{language === 'ru' ? 'Кампаний' : 'Campaigns'}</p>
          <p className="text-2xl font-bold text-slate-900">{campaigns.length}</p>
          <p className="text-xs text-green-600 mt-1">{campaigns.filter(c => c.status === 'active').length} {language === 'ru' ? 'активных' : 'active'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">{language === 'ru' ? 'Бюджет' : 'Budget'}</p>
          <p className="text-2xl font-bold text-slate-900">{formatPrice(totalBudget)}</p>
          <p className="text-xs text-slate-500 mt-1">{language === 'ru' ? 'общий' : 'total'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">{language === 'ru' ? 'Потрачено' : 'Spent'}</p>
          <p className="text-2xl font-bold text-slate-900">{formatPrice(totalSpent)}</p>
          <p className="text-xs text-blue-600 mt-1">{((totalSpent / totalBudget) * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">{t.impressions}</p>
          <p className="text-2xl font-bold text-slate-900">{(totalImpressions / 1000).toFixed(0)}K</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={10} /> +18%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">{t.clicks}</p>
          <p className="text-2xl font-bold text-slate-900">{totalClicks.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={10} /> +12%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">CTR</p>
          <p className="text-2xl font-bold text-slate-900">{avgCtr}%</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={10} /> +0.3%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 border border-slate-100 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-orange-100 text-orange-700'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-100 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="all">{language === 'ru' ? 'Все статусы' : 'All statuses'}</option>
              <option value="active">{statusLabels.active}</option>
              <option value="paused">{statusLabels.paused}</option>
              <option value="draft">{statusLabels.draft}</option>
              <option value="review">{statusLabels.review}</option>
            </select>
            <button className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50">
              <Filter size={14} /> {language === 'ru' ? 'Фильтры' : 'Filters'}
            </button>
            <button onClick={() => setActiveTab('create')} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition flex items-center gap-2">
              <Plus size={14} /> {language === 'ru' ? 'Создать кампанию' : 'Create campaign'}
            </button>
          </div>

          {/* Campaigns List */}
          {filteredCampaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition">
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    campaign.format === 'banner' ? 'bg-blue-100' :
                    campaign.format === 'video' ? 'bg-purple-100' :
                    campaign.format === 'native' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    {campaign.format === 'banner' && <Image size={20} className="text-blue-600" />}
                    {campaign.format === 'video' && <Video size={20} className="text-purple-600" />}
                    {campaign.format === 'native' && <FileText size={20} className="text-green-600" />}
                    {campaign.format === 'popup' && <Layers size={20} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">{campaign.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[campaign.status]}`}>
                        {statusLabels[campaign.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Globe size={12} /> {campaign.targeting.geo.join(', ')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {campaign.targeting.age} {language === 'ru' ? 'лет' : 'yo'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Tag size={12} /> {campaign.budget.model.toUpperCase()}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Image size={12} /> {campaign.creatives} {language === 'ru' ? 'креативов' : 'creatives'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><Edit size={16} /></button>
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><Copy size={16} /></button>
                    {campaign.status === 'active' ? (
                      <button className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600"><Pause size={16} /></button>
                    ) : campaign.status === 'paused' ? (
                      <button className="p-2 hover:bg-green-50 rounded-lg text-green-600"><Play size={16} /></button>
                    ) : null}
                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">{t.impressions}</p>
                    <p className="text-lg font-bold text-slate-900">{campaign.stats.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t.clicks}</p>
                    <p className="text-lg font-bold text-slate-900">{campaign.stats.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{language === 'ru' ? 'Конверсии' : 'Conversions'}</p>
                    <p className="text-lg font-bold text-slate-900">{campaign.stats.conversions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CTR</p>
                    <p className="text-lg font-bold text-green-600">{campaign.stats.ctr}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CPC</p>
                    <p className="text-lg font-bold text-slate-900">{formatPrice(campaign.stats.cpc)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{language === 'ru' ? 'Потрачено' : 'Spent'}</p>
                    <p className="text-lg font-bold text-slate-900">{formatPrice(campaign.budget.spent)}</p>
                  </div>
                </div>

                {/* Budget Progress */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{language === 'ru' ? 'Бюджет' : 'Budget'}: {formatPrice(campaign.budget.total)}</span>
                    <span>{((campaign.budget.spent / campaign.budget.total) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                      style={{ width: `${(campaign.budget.spent / campaign.budget.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Tab */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-bold text-xl text-slate-900 mb-6">{language === 'ru' ? 'Создание рекламной кампании' : 'Create advertising campaign'}</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Название кампании' : 'Campaign name'}</label>
              <input type="text" className="w-full p-3 border border-slate-200 rounded-lg" placeholder={language === 'ru' ? 'Введите название' : 'Enter name'} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Формат рекламы' : 'Ad format'}</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: 'banner', icon: Image, label: language === 'ru' ? 'Баннер' : 'Banner' },
                  { id: 'video', icon: Video, label: language === 'ru' ? 'Видео' : 'Video' },
                  { id: 'native', icon: FileText, label: language === 'ru' ? 'Нативная' : 'Native' },
                  { id: 'popup', icon: Layers, label: language === 'ru' ? 'Попап' : 'Popup' },
                  { id: 'interstitial', icon: Zap, label: language === 'ru' ? 'Interstitial' : 'Interstitial' },
                ].map(format => (
                  <button key={format.id} className="p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition text-center">
                    <format.icon size={24} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-medium">{format.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Модель оплаты' : 'Payment model'}</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: 'cpm', label: 'CPM', desc: language === 'ru' ? 'За 1000 показов' : 'Per 1000 views' },
                  { id: 'cpc', label: 'CPC', desc: language === 'ru' ? 'За клик' : 'Per click' },
                  { id: 'cpd', label: 'CPD', desc: language === 'ru' ? 'За день' : 'Per day' },
                  { id: 'cph', label: 'CPH', desc: language === 'ru' ? 'За час' : 'Per hour' },
                  { id: 'cpa', label: 'CPA', desc: language === 'ru' ? 'За действие' : 'Per action' },
                ].map(model => (
                  <button key={model.id} className="p-3 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition">
                    <p className="font-bold text-lg">{model.label}</p>
                    <p className="text-xs text-slate-500">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Общий бюджет' : 'Total budget'}</label>
                <input type="number" className="w-full p-3 border border-slate-200 rounded-lg" placeholder="100000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Дневной лимит' : 'Daily limit'}</label>
                <input type="number" className="w-full p-3 border border-slate-200 rounded-lg" placeholder="5000" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Дата начала' : 'Start date'}</label>
                <input type="date" className="w-full p-3 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Дата окончания' : 'End date'}</label>
                <input type="date" className="w-full p-3 border border-slate-200 rounded-lg" />
              </div>
            </div>

            <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium hover:shadow-lg transition">
              {language === 'ru' ? 'Создать кампанию' : 'Create campaign'}
            </button>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Динамика показов и кликов' : 'Impressions and clicks dynamics'}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="impressions" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name={t.impressions} />
                  <Area type="monotone" dataKey="clicks" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name={t.clicks} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Расходы по дням' : 'Daily spend'}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="spend" fill="#f59e0b" name={language === 'ru' ? 'Расходы' : 'Spend'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'По форматам' : 'By formats'}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={analyticsData.byFormat} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {analyticsData.byFormat.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'По устройствам' : 'By devices'}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.byDevice}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="device" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" name="%" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Targeting Tab */}
      {activeTab === 'targeting' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-bold text-xl text-slate-900 mb-6">{language === 'ru' ? 'Настройки таргетинга' : 'Targeting settings'}</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" />
                {language === 'ru' ? 'Географический таргетинг' : 'Geo targeting'}
              </label>
              <input type="text" className="w-full p-3 border border-slate-200 rounded-lg" placeholder={language === 'ru' ? 'Москва, Санкт-Петербург, Казань...' : 'Moscow, Saint Petersburg, Kazan...'} />
              <p className="text-xs text-slate-500 mt-1">{language === 'ru' ? 'Введите города или регионы через запятую' : 'Enter cities or regions separated by commas'}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Users size={16} className="text-purple-500" />
                  {language === 'ru' ? 'Возраст' : 'Age'}
                </label>
                <div className="flex gap-2">
                  <input type="number" placeholder="18" className="flex-1 p-3 border border-slate-200 rounded-lg" />
                  <span className="flex items-center text-slate-400">—</span>
                  <input type="number" placeholder="45" className="flex-1 p-3 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Users size={16} className="text-pink-500" />
                  {language === 'ru' ? 'Пол' : 'Gender'}
                </label>
                <select className="w-full p-3 border border-slate-200 rounded-lg">
                  <option>{language === 'ru' ? 'Все' : 'All'}</option>
                  <option>{language === 'ru' ? 'Мужчины' : 'Male'}</option>
                  <option>{language === 'ru' ? 'Женщины' : 'Female'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Hash size={16} className="text-green-500" />
                {language === 'ru' ? 'Интересы' : 'Interests'}
              </label>
              <input type="text" className="w-full p-3 border border-slate-200 rounded-lg" placeholder={language === 'ru' ? 'Технологии, Спорт, Путешествия...' : 'Technology, Sports, Travel...'} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Globe size={16} className="text-amber-500" />
                {language === 'ru' ? 'Устройства' : 'Devices'}
              </label>
              <div className="flex flex-wrap gap-2">
                {['Desktop', 'Mobile', 'Tablet', 'Smart TV'].map(device => (
                  <label key={device} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" className="w-4 h-4 text-orange-500 rounded" />
                    <span className="text-sm">{device}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition">
              {t.save}
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab - Ad Blocks */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-xl text-slate-900 mb-1">{language === 'ru' ? 'Настройки рекламы' : 'Ad settings'}</h3>
            <p className="text-sm text-slate-500 mb-6">{language === 'ru' ? 'Выберите рекламные блоки для размещения вашей рекламы' : 'Select ad blocks for your ad placement'}</p>
          </div>

          {/* Site Ad Blocks */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Globe size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{language === 'ru' ? 'Рекламные блоки на площадке' : 'Site ad blocks'}</h4>
                <p className="text-xs text-slate-500">{language === 'ru' ? 'Размещение баннеров на страницах BlogPost' : 'Banner placement on BlogPost pages'}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { id: 'ad-hero', name: language === 'ru' ? 'Главный баннер (Hero)' : 'Hero Banner', price: 50000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Самый заметный блок на главной странице' : 'Most visible block on homepage', size: '1200×300', icon: '🏆' },
                { id: 'ad-sidebar', name: language === 'ru' ? 'Боковой блок' : 'Sidebar Block', price: 5000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Вертикальный баннер в боковой панели' : 'Vertical banner in sidebar', size: '300×600', icon: '📐' },
                { id: 'ad-inline', name: language === 'ru' ? 'Встроенный блок' : 'Inline Block', price: 3000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Реклама внутри контента' : 'Ad inside content', size: '728×90', icon: '📄' },
                { id: 'ad-footer', name: language === 'ru' ? 'Нижний баннер' : 'Footer Banner', price: 10000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Баннер внизу каждой страницы' : 'Banner at bottom of every page', size: '970×250', icon: '⬇️' },
              ].map(block => (
                <div key={block.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{block.icon}</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-slate-900">{block.name}</h5>
                      <p className="text-xs text-slate-500 mt-0.5">{block.desc}</p>
                      <p className="text-xs text-slate-400 mt-1">{block.size}</p>
                      <p className="text-lg font-bold text-slate-900 mt-2">{formatPrice(block.price)}<span className="text-xs text-slate-500 font-normal"> / {block.period}</span></p>
                    </div>
                  </div>
                  <button className="w-full mt-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
                    {language === 'ru' ? 'Разместить рекламу' : 'Place ad'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Video Ad Blocks */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <Video size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{language === 'ru' ? 'Рекламные блоки в видеороликах' : 'Video ad blocks'}</h4>
                <p className="text-xs text-slate-500">{language === 'ru' ? 'Встраивание рекламы в видеоконтент' : 'Ad insertion in video content'}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { id: 'ad-preroll', name: language === 'ru' ? 'Pre-roll (до видео)' : 'Pre-roll (before video)', price: 80000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Ролик показывается перед основным контентом' : 'Ad plays before main content', duration: '5-15 сек', icon: '▶️' },
                { id: 'ad-midroll', name: language === 'ru' ? 'Mid-roll (в середине)' : 'Mid-roll (middle)', price: 100000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Встраивается в середину видеоролика' : 'Inserted in the middle of video', duration: '10-30 сек', icon: '⏸️' },
                { id: 'ad-postroll', name: language === 'ru' ? 'Post-roll (после видео)' : 'Post-roll (after video)', price: 40000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Показывается после окончания видео' : 'Shown after video ends', duration: '5-15 сек', icon: '⏹️' },
                { id: 'ad-overlay', name: language === 'ru' ? 'Overlay (поверх видео)' : 'Overlay (on video)', price: 20000, period: language === 'ru' ? 'день' : 'day', desc: language === 'ru' ? 'Полупрозрачный баннер поверх видео' : 'Semi-transparent banner over video', duration: language === 'ru' ? 'Постоянно' : 'Constant', icon: '🔲' },
              ].map(block => (
                <div key={block.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{block.icon}</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-slate-900">{block.name}</h5>
                      <p className="text-xs text-slate-500 mt-0.5">{block.desc}</p>
                      <p className="text-xs text-slate-400 mt-1">{language === 'ru' ? 'Длительность' : 'Duration'}: {block.duration}</p>
                      <p className="text-lg font-bold text-slate-900 mt-2">{formatPrice(block.price)}<span className="text-xs text-slate-500 font-normal"> / {block.period}</span></p>
                    </div>
                  </div>
                  <button className="w-full mt-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition">
                    {language === 'ru' ? 'Встроить в видео' : 'Insert in video'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Models Info */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-orange-600" />
              {language === 'ru' ? 'Модели оплаты рекламы' : 'Ad payment models'}
            </h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { model: 'CPM', desc: language === 'ru' ? 'За 1000 показов' : 'Per 1000 views', price: 'от 30₽' },
                { model: 'CPC', desc: language === 'ru' ? 'За клик' : 'Per click', price: 'от 5₽' },
                { model: 'CPD', desc: language === 'ru' ? 'За день' : 'Per day', price: language === 'ru' ? 'Фиксированная' : 'Fixed' },
                { model: 'CPH', desc: language === 'ru' ? 'За час' : 'Per hour', price: language === 'ru' ? 'Гибкая' : 'Flexible' },
              ].map(item => (
                <div key={item.model} className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="font-bold text-lg text-orange-700">{item.model}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.desc}</p>
                  <p className="text-sm font-medium text-slate-900 mt-2">{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Other Tabs - Placeholder */}
      {(activeTab === 'creatives' || activeTab === 'billing' || activeTab === 'api') && (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {activeTab === 'creatives' && <Image size={32} className="text-orange-600" />}
            {activeTab === 'billing' && <DollarSign size={32} className="text-orange-600" />}
            {activeTab === 'api' && <Cpu size={32} className="text-orange-600" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {activeTab === 'creatives' && (language === 'ru' ? 'Управление креативами' : 'Creatives management')}
            {activeTab === 'billing' && (language === 'ru' ? 'Биллинг и оплата' : 'Billing and payment')}
            {activeTab === 'api' && 'API интеграция'}
          </h3>
          <p className="text-slate-500">{language === 'ru' ? 'Раздел в разработке' : 'Section under development'}</p>
        </div>
      )}
    </div>
  );
}
