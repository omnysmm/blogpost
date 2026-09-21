import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { FileText, Video, Music, Image, Eye, Heart, Share2, Clock, TrendingUp, Megaphone, BarChart3, Zap, MessageSquare, ArrowUp, Users, Target, Award, Calendar } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';

export default function DashboardPage() {
  const { language, currentUser, posts, analytics, setCurrentPage, loadAnalytics } = useStore();
  const t = translations[language];
  const [period, setPeriod] = useState('30');
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [activeChart, setActiveChart] = useState<'views' | 'engagement' | 'growth'>('views');

  useEffect(() => { loadAnalytics(parseInt(period)); }, [period]);

  const networks = ['all', 'vk', 'telegram', 'youtube', 'instagram', 'tiktok', 'ok'];
  const networkNames: Record<string, string> = { all: language === 'ru' ? 'Все' : 'All', vk: 'VKontakte', telegram: 'Telegram', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', ok: 'OK' };

  const filteredData = analytics.filter(a => selectedNetwork === 'all' || a.network === selectedNetwork);

  const dailyData = filteredData.reduce((acc, item) => {
    const existing = acc.find(d => d.date === item.date);
    if (existing) {
      existing.views += item.views;
      existing.likes += item.likes;
      existing.shares += item.shares;
      existing.comments += Math.floor(item.likes * 0.3);
    } else {
      acc.push({ date: item.date, views: item.views, likes: item.likes, shares: item.shares, comments: Math.floor(item.likes * 0.3) });
    }
    return acc;
  }, [] as { date: string; views: number; likes: number; shares: number; comments: number }[]).sort((a, b) => a.date.localeCompare(b.date));

  const networkStats = networks.filter(n => n !== 'all').map(network => {
    const data = analytics.filter(a => a.network === network);
    return {
      network: networkNames[network],
      shortName: network.toUpperCase(),
      views: data.reduce((s, a) => s + a.views, 0),
      likes: data.reduce((s, a) => s + a.likes, 0),
      shares: data.reduce((s, a) => s + a.shares, 0),
    };
  });

  const totalViews = filteredData.reduce((s, a) => s + a.views, 0);
  const totalLikes = filteredData.reduce((s, a) => s + a.likes, 0);
  const totalShares = filteredData.reduce((s, a) => s + a.shares, 0);
  const totalComments = Math.floor(totalLikes * 0.3);
  const engagementRate = totalViews > 0 ? (((totalLikes + totalShares + totalComments) / totalViews) * 100).toFixed(2) : '0';

  const last7 = dailyData.slice(-7);
  const prev7 = dailyData.slice(-14, -7);
  const last7Views = last7.reduce((s, d) => s + d.views, 0);
  const prev7Views = prev7.reduce((s, d) => s + d.views, 0);
  const viewsGrowth = prev7Views > 0 ? (((last7Views - prev7Views) / prev7Views) * 100).toFixed(1) : '0';

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    views: Math.floor(Math.random() * 500) + (i >= 9 && i <= 22 ? 300 : 50),
  }));

  const contentTypes = [
    { name: language === 'ru' ? 'Посты' : 'Posts', value: 45, color: '#3b82f6' },
    { name: language === 'ru' ? 'Видео' : 'Videos', value: 25, color: '#8b5cf6' },
    { name: language === 'ru' ? 'Статьи' : 'Articles', value: 20, color: '#10b981' },
    { name: language === 'ru' ? 'Музыка' : 'Music', value: 10, color: '#f59e0b' },
  ];

  const qualityRadar = [
    { metric: language === 'ru' ? 'Качество' : 'Quality', A: 85, fullMark: 100 },
    { metric: 'SEO', A: 72, fullMark: 100 },
    { metric: 'GEO', A: 68, fullMark: 100 },
    { metric: language === 'ru' ? 'Вовлечение' : 'Engagement', A: 78, fullMark: 100 },
    { metric: language === 'ru' ? 'Вирусность' : 'Virality', A: 55, fullMark: 100 },
    { metric: language === 'ru' ? 'Конверсия' : 'Conversion', A: 63, fullMark: 100 },
  ];

  const isFreeTrial = currentUser?.subscription === 'free';
  const trialEnd = currentUser?.freeTrialEnd ? new Date(currentUser.freeTrialEnd) : null;
  const hoursLeft = trialEnd ? Math.max(0, Math.floor((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60))) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{t.welcome}, {currentUser?.name}!</h1>
        <p className="text-slate-600 mt-1">{language === 'ru' ? 'Ваша панель управления и аналитика' : 'Your dashboard and analytics'}</p>
      </div>

      {/* Free Trial Banner */}
      {isFreeTrial && trialEnd && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-green-600" />
            <div>
              <p className="font-medium text-green-900">{language === 'ru' ? 'Бесплатный пробный период' : 'Free trial'}</p>
              <p className="text-sm text-green-700">{language === 'ru' ? `Осталось ${hoursLeft}ч` : `${hoursLeft}h left`}</p>
            </div>
          </div>
          <button onClick={() => setCurrentPage('subscriptions')} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition">
            {language === 'ru' ? 'Продлить' : 'Upgrade'}
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { icon: FileText, label: language === 'ru' ? 'Создать пост' : 'Create Post', page: 'content-generator' },
          { icon: Video, label: language === 'ru' ? 'Создать видео' : 'Create Video', page: 'content-generator' },
          { icon: Music, label: language === 'ru' ? 'Создать музыку' : 'Create Music', page: 'content-generator' },
          { icon: Image, label: language === 'ru' ? 'Создать статью' : 'Create Article', page: 'content-generator' },
          { icon: Megaphone, label: language === 'ru' ? 'Рекламный кабинет' : 'Ad Cabinet', page: 'advertiser' },
        ].map((action, i) => (
          <button key={i} onClick={() => setCurrentPage(action.page)} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all text-left group">
            <action.icon size={20} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-slate-900">{action.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 p-2">
          <Calendar size={16} className="text-slate-400" />
          <select value={period} onChange={e => setPeriod(e.target.value)} className="text-sm border-none outline-none bg-transparent">
            <option value="7">{language === 'ru' ? '7 дней' : '7 days'}</option>
            <option value="14">{language === 'ru' ? '14 дней' : '14 days'}</option>
            <option value="30">{language === 'ru' ? '30 дней' : '30 days'}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {networks.map(network => (
            <button key={network} onClick={() => setSelectedNetwork(network)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${selectedNetwork === network ? 'bg-blue-500 text-white' : 'bg-white border border-slate-100 hover:border-blue-200 text-slate-600'}`}>
              {networkNames[network]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1"><Eye size={16} className="text-blue-500" /><span className="text-xs text-slate-500">{t.views}</span></div>
          <p className="text-xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1"><ArrowUp size={10} /> +{viewsGrowth}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1"><Heart size={16} className="text-pink-500" /><span className="text-xs text-slate-500">{t.likes}</span></div>
          <p className="text-xl font-bold text-slate-900">{totalLikes.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1"><ArrowUp size={10} /> +12%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1"><Share2 size={16} className="text-purple-500" /><span className="text-xs text-slate-500">{t.shares}</span></div>
          <p className="text-xl font-bold text-slate-900">{totalShares.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1"><ArrowUp size={10} /> +8%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1"><MessageSquare size={16} className="text-amber-500" /><span className="text-xs text-slate-500">{language === 'ru' ? 'Комментарии' : 'Comments'}</span></div>
          <p className="text-xl font-bold text-slate-900">{totalComments.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1"><ArrowUp size={10} /> +15%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1"><Zap size={16} className="text-emerald-500" /><span className="text-xs text-slate-500">{language === 'ru' ? 'Вовлечённость' : 'Engagement'}</span></div>
          <p className="text-xl font-bold text-slate-900">{engagementRate}%</p>
          <p className="text-xs text-green-600 flex items-center gap-1"><ArrowUp size={10} /> +5%</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Ежедневные показатели' : 'Daily metrics'}</h3>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['views', 'engagement', 'growth'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveChart(tab)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeChart === tab ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600'}`}>
                {tab === 'views' ? t.views : tab === 'engagement' ? (language === 'ru' ? 'Вовлечение' : 'Engagement') : (language === 'ru' ? 'Рост' : 'Growth')}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          {activeChart === 'views' ? (
            <ComposedChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Legend />
              <Area type="monotone" dataKey="views" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2} name={t.views} />
              <Bar dataKey="likes" fill="#ec4899" radius={[4, 4, 0, 0]} name={t.likes} />
              <Bar dataKey="shares" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t.shares} />
            </ComposedChart>
          ) : activeChart === 'engagement' ? (
            <LineChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} name={t.likes} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} name={language === 'ru' ? 'Комментарии' : 'Comments'} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="shares" stroke="#8b5cf6" strokeWidth={2} name={t.shares} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <AreaChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="views" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name={t.views} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Secondary Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly Activity */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" /> {language === 'ru' ? 'Активность по часам' : 'Hourly activity'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Bar dataKey="views" fill="#3b82f6" radius={[2, 2, 0, 0]} name={t.views} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Network Comparison */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-500" /> {t.byNetwork}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={networkStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="shortName" type="category" tick={{ fontSize: 11 }} width={60} />
              <Tooltip /><Legend />
              <Bar dataKey="views" fill="#3b82f6" name={t.views} radius={[0, 4, 4, 0]} />
              <Bar dataKey="likes" fill="#ec4899" name={t.likes} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality & Content Types */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-500" /> {language === 'ru' ? 'Качество контента' : 'Content quality'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={qualityRadar}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Score" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center">
            <p className="text-2xl font-bold text-slate-900">70<span className="text-sm text-slate-500">/100</span></p>
            <p className="text-xs text-slate-500">{language === 'ru' ? 'Общая оценка качества' : 'Overall quality score'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-green-500" /> {language === 'ru' ? 'Типы контента' : 'Content types'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={contentTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                {contentTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" /> {language === 'ru' ? 'Показатели сетей' : 'Network metrics'}
          </h3>
          <div className="space-y-3">
            {networkStats.slice(0, 5).map((stat, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{stat.shortName}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-900 font-medium">{stat.views.toLocaleString()}</span>
                  <span className="text-pink-600">{stat.likes.toLocaleString()}</span>
                  <span className="text-purple-600">{stat.shares.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Content */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Последний контент' : 'Recent content'}</h3>
          <button onClick={() => setCurrentPage('content-generator')} className="text-blue-600 text-sm hover:underline">
            {language === 'ru' ? 'Создать новый' : 'Create new'}
          </button>
        </div>
        {posts.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">{language === 'ru' ? 'Пока нет контента. Создайте первый!' : 'No content yet. Create your first!'}</p>
        ) : (
          <div className="space-y-3">
            {posts.slice(-5).reverse().map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{post.title}</p>
                  <p className="text-xs text-slate-500">{post.status} • {post.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}