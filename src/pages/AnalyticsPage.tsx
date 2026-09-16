import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import {
  BarChart3, Eye, Heart, Share2, TrendingUp, Calendar,
  Lightbulb, Target, Zap, Award, AlertTriangle, CheckCircle2,
  ArrowUp, ArrowDown, Info, Sparkles, Video, FileText,
  Users, Clock, ThumbsUp, MessageSquare, Share
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';

export default function AnalyticsPage() {
  const { language, analytics } = useStore();
  const t = translations[language];
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [period, setPeriod] = useState('30');
  const [activeChart, setActiveChart] = useState<'views' | 'engagement' | 'growth'>('views');

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
      publications: Math.floor(Math.random() * 30) + 5,
      engagement: (Math.random() * 5 + 2).toFixed(1),
    };
  });

  const totalViews = filteredData.reduce((s, a) => s + a.views, 0);
  const totalLikes = filteredData.reduce((s, a) => s + a.likes, 0);
  const totalShares = filteredData.reduce((s, a) => s + a.shares, 0);
  const totalComments = Math.floor(totalLikes * 0.3);
  const engagementRate = totalViews > 0 ? (((totalLikes + totalShares + totalComments) / totalViews) * 100).toFixed(2) : '0';

  // Growth data (last 7 days vs previous 7 days)
  const last7 = dailyData.slice(-7);
  const prev7 = dailyData.slice(-14, -7);
  const last7Views = last7.reduce((s, d) => s + d.views, 0);
  const prev7Views = prev7.reduce((s, d) => s + d.views, 0);
  const viewsGrowth = prev7Views > 0 ? (((last7Views - prev7Views) / prev7Views) * 100).toFixed(1) : '0';

  // Hourly distribution (simulated)
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    views: Math.floor(Math.random() * 500) + (i >= 9 && i <= 22 ? 300 : 50),
    engagement: Math.floor(Math.random() * 50) + (i >= 12 && i <= 14 ? 40 : i >= 19 && i <= 22 ? 50 : 10),
  }));

  // Content type distribution
  const contentTypes = [
    { name: language === 'ru' ? 'Посты' : 'Posts', value: 45, color: '#3b82f6' },
    { name: language === 'ru' ? 'Видео' : 'Videos', value: 25, color: '#8b5cf6' },
    { name: language === 'ru' ? 'Статьи' : 'Articles', value: 20, color: '#10b981' },
    { name: language === 'ru' ? 'Музыка' : 'Music', value: 10, color: '#f59e0b' },
  ];

  // Radar data for quality metrics
  const qualityRadar = [
    { metric: language === 'ru' ? 'Качество' : 'Quality', A: 85, fullMark: 100 },
    { metric: language === 'ru' ? 'SEO' : 'SEO', A: 72, fullMark: 100 },
    { metric: 'GEO', A: 68, fullMark: 100 },
    { metric: language === 'ru' ? 'Вовлечение' : 'Engagement', A: 78, fullMark: 100 },
    { metric: language === 'ru' ? 'Вирусность' : 'Virality', A: 55, fullMark: 100 },
    { metric: language === 'ru' ? 'Конверсия' : 'Conversion', A: 63, fullMark: 100 },
  ];

  // Recommendations
  const recommendations = [
    {
      id: '1',
      type: 'content',
      priority: 'high',
      icon: Video,
      title: language === 'ru' ? 'Увеличьте количество видеоконтента' : 'Increase video content',
      description: language === 'ru' ? 'Видео получает в 3.2 раза больше просмотров, чем текстовые посты. Рекомендуем публиковать минимум 2 видео в неделю.' : 'Videos get 3.2x more views than text posts. We recommend publishing at least 2 videos per week.',
      impact: '+45% ' + (language === 'ru' ? 'просмотров' : 'views'),
      metric: 'views',
    },
    {
      id: '2',
      type: 'seo',
      priority: 'high',
      icon: Target,
      title: language === 'ru' ? 'Оптимизируйте SEO-теги' : 'Optimize SEO tags',
      description: language === 'ru' ? 'Ваш SEO-скор 72/100. Добавьте ключевые слова в заголовки и описания для улучшения видимости.' : 'Your SEO score is 72/100. Add keywords to titles and descriptions to improve visibility.',
      impact: '+28% ' + (language === 'ru' ? 'охвата' : 'reach'),
      metric: 'reach',
    },
    {
      id: '3',
      type: 'timing',
      priority: 'medium',
      icon: Clock,
      title: language === 'ru' ? 'Публикуйте в пиковые часы' : 'Publish at peak hours',
      description: language === 'ru' ? 'Ваша аудитория наиболее активна с 12:00 до 14:00 и с 19:00 до 22:00. Планируйте публикации на это время.' : 'Your audience is most active from 12:00-14:00 and 19:00-22:00. Schedule posts for these times.',
      impact: '+35% ' + (language === 'ru' ? 'вовлечения' : 'engagement'),
      metric: 'engagement',
    },
    {
      id: '4',
      type: 'geo',
      priority: 'medium',
      icon: Users,
      title: language === 'ru' ? 'Расширьте GEO-таргетинг' : 'Expand GEO targeting',
      description: language === 'ru' ? 'GEO-показатель 68/100. Добавьте региональные хештеги и адаптируйте контент для разных регионов.' : 'GEO score is 68/100. Add regional hashtags and adapt content for different regions.',
      impact: '+22% ' + (language === 'ru' ? 'подписчиков' : 'followers'),
      metric: 'followers',
    },
    {
      id: '5',
      type: 'engagement',
      priority: 'low',
      icon: MessageSquare,
      title: language === 'ru' ? 'Увеличьте взаимодействие с аудиторией' : 'Increase audience interaction',
      description: language === 'ru' ? 'Отвечайте на комментарии в течение первого часа — это повышает вовлечённость на 40%. Задавайте вопросы в постах.' : 'Reply to comments within the first hour — this increases engagement by 40%. Ask questions in posts.',
      impact: '+40% ' + (language === 'ru' ? 'комментариев' : 'comments'),
      metric: 'comments',
    },
    {
      id: '6',
      type: 'content',
      priority: 'medium',
      icon: FileText,
      title: language === 'ru' ? 'Используйте длинные статьи' : 'Use long-form articles',
      description: language === 'ru' ? 'Статьи от 1500 слов получают в 2.5 раза больше репостов. Добавьте экспертный контент в вашу стратегию.' : 'Articles over 1500 words get 2.5x more shares. Add expert content to your strategy.',
      impact: '+30% ' + (language === 'ru' ? 'репостов' : 'shares'),
      metric: 'shares',
    },
  ];

  const priorityColors = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  const priorityLabels = {
    high: language === 'ru' ? 'Высокий' : 'High',
    medium: language === 'ru' ? 'Средний' : 'Medium',
    low: language === 'ru' ? 'Низкий' : 'Low',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.analytics}</h1>
      <p className="text-slate-600 mb-8">{language === 'ru' ? 'Полная аналитика по публикациям, вовлечённости и качеству контента' : 'Full analytics on publications, engagement and content quality'}</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-lg border p-2">
          <Calendar size={16} className="text-slate-400" />
          <select value={period} onChange={e => setPeriod(e.target.value)} className="text-sm border-none outline-none">
            <option value="7">{language === 'ru' ? '7 дней' : '7 days'}</option>
            <option value="14">{language === 'ru' ? '14 дней' : '14 days'}</option>
            <option value="30">{language === 'ru' ? '30 дней' : '30 days'}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {networks.map(network => (
            <button
              key={network}
              onClick={() => setSelectedNetwork(network)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                selectedNetwork === network ? 'bg-blue-500 text-white' : 'bg-white border hover:border-blue-200'
              }`}
            >
              {networkNames[network]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={18} className="text-blue-500" />
            <span className="text-sm text-slate-500">{t.views}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUp size={12} /> +{viewsGrowth}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={18} className="text-pink-500" />
            <span className="text-sm text-slate-500">{t.likes}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalLikes.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUp size={12} /> +12%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={18} className="text-purple-500" />
            <span className="text-sm text-slate-500">{t.shares}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalShares.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUp size={12} /> +8%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={18} className="text-amber-500" />
            <span className="text-sm text-slate-500">{language === 'ru' ? 'Комментарии' : 'Comments'}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalComments.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUp size={12} /> +15%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-emerald-500" />
            <span className="text-sm text-slate-500">{language === 'ru' ? 'Вовлечённость' : 'Engagement'}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{engagementRate}%</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUp size={12} /> +5%</p>
        </div>
      </div>

      {/* Main Chart with Tabs */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Ежедневные показатели' : 'Daily metrics'}</h3>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setActiveChart('views')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeChart === 'views' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600'}`}>
              {t.views}
            </button>
            <button onClick={() => setActiveChart('engagement')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeChart === 'engagement' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600'}`}>
              {language === 'ru' ? 'Вовлечение' : 'Engagement'}
            </button>
            <button onClick={() => setActiveChart('growth')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeChart === 'growth' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600'}`}>
              {language === 'ru' ? 'Рост' : 'Growth'}
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          {activeChart === 'views' ? (
            <ComposedChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="views" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2} name={t.views} />
              <Bar dataKey="likes" fill="#ec4899" radius={[4, 4, 0, 0]} name={t.likes} />
              <Bar dataKey="shares" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t.shares} />
            </ComposedChart>
          ) : activeChart === 'engagement' ? (
            <LineChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} name={t.likes} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} name={language === 'ru' ? 'Комментарии' : 'Comments'} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="shares" stroke="#8b5cf6" strokeWidth={2} name={t.shares} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <AreaChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
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
            <Clock size={18} className="text-blue-500" />
            {language === 'ru' ? 'Активность по часам' : 'Hourly activity'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="views" fill="#3b82f6" radius={[2, 2, 0, 0]} name={t.views} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Network Comparison */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-500" />
            {t.byNetwork}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={networkStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="shortName" type="category" tick={{ fontSize: 11 }} width={60} />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#3b82f6" name={t.views} radius={[0, 4, 4, 0]} />
              <Bar dataKey="likes" fill="#ec4899" name={t.likes} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Quality Radar & Content Types */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            {language === 'ru' ? 'Качество контента' : 'Content quality'}
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
            <FileText size={18} className="text-green-500" />
            {language === 'ru' ? 'Типы контента' : 'Content types'}
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
            <TrendingUp size={18} className="text-emerald-500" />
            {language === 'ru' ? 'Показатели сетей' : 'Network metrics'}
          </h3>
          <div className="space-y-3">
            {networkStats.slice(0, 5).map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-700">{stat.shortName}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900 truncate">{stat.network}</span>
                    <span className="text-xs text-emerald-600 font-medium">{stat.engagement}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${parseFloat(stat.engagement) * 15}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Network Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Детальная статистика по сетям' : 'Detailed network statistics'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Соцсеть' : 'Network'}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t.publications}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t.views}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t.likes}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t.shares}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Вовлечённость' : 'Engagement'}</th>
              </tr>
            </thead>
            <tbody>
              {networkStats.map((stat, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">{stat.network}</td>
                  <td className="p-4 text-slate-600">{stat.publications}</td>
                  <td className="p-4 text-slate-600">{stat.views.toLocaleString()}</td>
                  <td className="p-4 text-slate-600">{stat.likes.toLocaleString()}</td>
                  <td className="p-4 text-slate-600">{stat.shares.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">{stat.engagement}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ RECOMMENDATIONS BLOCK ============ */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border border-amber-200 p-6 mb-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Lightbulb size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {language === 'ru' ? 'Рекомендации по улучшению' : 'Improvement recommendations'}
              <Sparkles size={20} className="text-amber-500" />
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              {language === 'ru'
                ? 'AI проанализировал ваши показатели и подготовил персональные рекомендации для роста аудитории и вовлечённости'
                : 'AI analyzed your metrics and prepared personalized recommendations for audience growth and engagement'}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-amber-200">
            <Award size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-900">{language === 'ru' ? 'Потенциал роста' : 'Growth potential'}: +45%</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {recommendations.map(rec => (
            <div key={rec.id} className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-lg transition group">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  rec.priority === 'high' ? 'bg-red-50' :
                  rec.priority === 'medium' ? 'bg-amber-50' : 'bg-blue-50'
                }`}>
                  <rec.icon size={18} className={
                    rec.priority === 'high' ? 'text-red-600' :
                    rec.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 text-sm">{rec.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[rec.priority as keyof typeof priorityColors]}`}>
                      {priorityLabels[rec.priority as keyof typeof priorityLabels]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">{rec.impact}</span>
                </div>
                <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {language === 'ru' ? 'Применить' : 'Apply'} <ArrowUp size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-white rounded-xl border border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">{language === 'ru' ? 'Прогноз при применении всех рекомендаций' : 'Forecast when applying all recommendations'}</p>
              <div className="flex flex-wrap gap-3 mt-1.5">
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">+45% {language === 'ru' ? 'просмотров' : 'views'}</span>
                <span className="text-xs px-2 py-1 bg-pink-50 text-pink-700 rounded">+35% {language === 'ru' ? 'вовлечения' : 'engagement'}</span>
                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">+28% {language === 'ru' ? 'подписчиков' : 'followers'}</span>
                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">+30% {language === 'ru' ? 'монетизации' : 'monetization'}</span>
              </div>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition shrink-0">
              {language === 'ru' ? 'Применить всё' : 'Apply all'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{language === 'ru' ? 'AI-инсайты' : 'AI Insights'}</h3>
            <p className="text-xs text-slate-500">{language === 'ru' ? 'Автоматический анализ ваших данных' : 'Automatic analysis of your data'}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{language === 'ru' ? 'Лучшее время' : 'Best time'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">12:00 — 14:00</p>
            <p className="text-xs text-slate-600 mt-1">{language === 'ru' ? 'Пик активности аудитории' : 'Audience activity peak'}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} className="text-green-600" />
              <span className="text-sm font-bold text-green-900">{language === 'ru' ? 'Топ контент' : 'Top content'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{language === 'ru' ? 'Видео' : 'Video'}</p>
            <p className="text-xs text-slate-600 mt-1">{language === 'ru' ? 'В 3.2 раза эффективнее постов' : '3.2x more effective than posts'}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span className="text-sm font-bold text-purple-900">{language === 'ru' ? 'Тренд' : 'Trend'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">+{viewsGrowth}%</p>
            <p className="text-xs text-slate-600 mt-1">{language === 'ru' ? 'Рост за последнюю неделю' : 'Growth over the last week'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
