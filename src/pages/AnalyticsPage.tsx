import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { buildRecommendations, generateAiRecommendations, type Recommendation } from '../services/recommendations';
import {
  BarChart3, Eye, Heart, Share2, TrendingUp, Calendar,
  Lightbulb, Target, Zap, Award, AlertTriangle, CheckCircle2,
  ArrowUp, ArrowDown, Info, Sparkles, Video, FileText,
  Users, Clock, ThumbsUp, MessageSquare, Share, Send, X, Loader2
} from 'lucide-react';
import SocialIcon from '../components/SocialIcon';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';

export default function AnalyticsPage() {
  const { language, analytics, loadAnalytics, exportAnalyticsCSV, loadPosts, posts } = useStore();
  const t = translations[language];
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [period, setPeriod] = useState('30');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'post' | 'article' | 'video' | 'music'>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [activeChart, setActiveChart] = useState<'views' | 'engagement' | 'growth'>('views');

  useEffect(() => {
    loadPosts();
    loadAnalytics(parseInt(period));
  }, [period]);

  const networks = ['all', 'vk', 'telegram', 'youtube', 'instagram', 'tiktok', 'ok', 'rutube'];
  const networkNames: Record<string, string> = { all: language === 'ru' ? 'Все' : 'All', vk: 'VK', telegram: 'Telegram', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', ok: 'ОК', rutube: 'Rutube' };
  const typeNames: Record<string, string> = {
    all: language === 'ru' ? 'Все типы' : 'All types',
    post: language === 'ru' ? 'Посты' : 'Posts',
    article: language === 'ru' ? 'Статьи' : 'Articles',
    video: language === 'ru' ? 'Видео' : 'Videos',
    music: language === 'ru' ? 'Музыка' : 'Music',
  };

  // Date window: custom range wins, otherwise the preset period
  const rangeEnd = dateTo || new Date().toISOString().split('T')[0];
  const rangeStart = dateFrom || (() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(period));
    return d.toISOString().split('T')[0];
  })();

  const filteredData = analytics.filter(a =>
    (selectedNetwork === 'all' || a.network === selectedNetwork) &&
    a.date >= rangeStart && a.date <= rangeEnd
  );

  // Publications by content type, derived from real posts (analytics rows are network-level)
  const postsInRange = posts.filter(p => {
    const d = (p.publishedAt || p.createdAt || '').slice(0, 10);
    return d >= rangeStart && d <= rangeEnd;
  });
  const publicationsForType = (type: typeof selectedType) =>
    type === 'all' ? postsInRange.length : postsInRange.filter(p => p.type === type).length;

  const dailyData = filteredData.reduce((acc, item) => {
    const existing = acc.find(d => d.date === item.date);
    if (existing) {
      existing.views += item.views;
      existing.likes += item.likes;
      existing.shares += item.shares;
      existing.publications += item.publications || 0;
      existing.comments += Math.floor(item.likes * 0.3);
    } else {
      acc.push({ date: item.date, views: item.views, likes: item.likes, shares: item.shares, publications: item.publications || 0, comments: Math.floor(item.likes * 0.3) });
    }
    return acc;
  }, [] as { date: string; views: number; likes: number; shares: number; publications: number; comments: number }[]).sort((a, b) => a.date.localeCompare(b.date));

  const networkStats = networks.filter(n => n !== 'all').map(network => {
    const data = analytics.filter(a => a.network === network);
    const views = data.reduce((s, a) => s + a.views, 0);
    const likes = data.reduce((s, a) => s + a.likes, 0);
    const shares = data.reduce((s, a) => s + a.shares, 0);
    const publications = data.reduce((s, a) => s + (a.publications || 0), 0);
    const comments = Math.floor(likes * 0.3);
    return {
      network: networkNames[network],
      shortName: network.toUpperCase(),
      views,
      likes,
      shares,
      publications,
      engagement: views > 0 ? (((likes + shares + comments) / views) * 100).toFixed(1) : '0.0',
    };
  });

  const totalViews = filteredData.reduce((s, a) => s + a.views, 0);
  const totalLikes = filteredData.reduce((s, a) => s + a.likes, 0);
  const totalShares = filteredData.reduce((s, a) => s + a.shares, 0);
  const totalPublications = publicationsForType(selectedType);
  const totalComments = Math.floor(totalLikes * 0.3);
  const engagementRate = totalViews > 0 ? (((totalLikes + totalShares + totalComments) / totalViews) * 100).toFixed(2) : '0';

  // ── Period comparison: current window vs the preceding window of equal length ──
  const dayCount = Math.max(1, Math.round((new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) / 86_400_000) + 1);
  const prevEnd = new Date(new Date(rangeStart).getTime() - 86_400_000).toISOString().split('T')[0];
  const prevStart = new Date(new Date(rangeStart).getTime() - dayCount * 86_400_000).toISOString().split('T')[0];
  const prevData = analytics.filter(a =>
    (selectedNetwork === 'all' || a.network === selectedNetwork) &&
    a.date >= prevStart && a.date <= prevEnd
  );
  const sum = (rows: typeof filteredData, key: 'views' | 'likes' | 'shares') => rows.reduce((s, a) => s + a[key], 0);
  const pctDelta = (cur: number, prev: number): { text: string; up: boolean } => {
    if (prev <= 0) return { text: cur > 0 ? 'new' : '0%', up: cur > 0 };
    const v = ((cur - prev) / prev) * 100;
    return { text: `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, up: v >= 0 };
  };
  const prevPostsInRange = posts.filter(p => {
    const d = (p.publishedAt || p.createdAt || '').slice(0, 10);
    return d >= prevStart && d <= prevEnd;
  }).length;
  const deltaPublications = pctDelta(totalPublications, selectedType === 'all' ? prevPostsInRange : prevPostsInRange);
  const deltaViews = pctDelta(totalViews, sum(prevData, 'views'));
  const deltaLikes = pctDelta(totalLikes, sum(prevData, 'likes'));
  const deltaShares = pctDelta(totalShares, sum(prevData, 'shares'));
  const prevComments = Math.floor(sum(prevData, 'likes') * 0.3);
  const deltaComments = pctDelta(totalComments, prevComments);
  const prevEngagement = sum(prevData, 'views') > 0
    ? ((sum(prevData, 'likes') + sum(prevData, 'shares') + prevComments) / sum(prevData, 'views')) * 100
    : 0;
  const deltaEngagement = pctDelta(parseFloat(engagementRate), prevEngagement);

  const deltaBadge = (d: { text: string; up: boolean }) => (
    <p className={`text-xs flex items-center gap-1 mt-1 ${d.up ? 'text-green-600' : 'text-red-600'}`}>
      {d.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {d.text}
      {compareMode && (
        <span className="text-slate-400 font-normal">
          ({language === 'ru' ? 'пред.' : 'prev'} {prevStart}→{prevEnd})
        </span>
      )}
    </p>
  );

  // Growth data (last 7 days vs previous 7 days)
  const last7 = dailyData.slice(-7);
  const prev7 = dailyData.slice(-14, -7);
  const last7Views = last7.reduce((s, d) => s + d.views, 0);
  const prev7Views = prev7.reduce((s, d) => s + d.views, 0);
  const viewsGrowth = prev7Views > 0 ? (((last7Views - prev7Views) / prev7Views) * 100).toFixed(1) : '0';
  const last7Publications = last7.reduce((s, d) => s + d.publications, 0);
  const prev7Publications = prev7.reduce((s, d) => s + d.publications, 0);
  const publicationsGrowth = prev7Publications > 0 ? (((last7Publications - prev7Publications) / prev7Publications) * 100).toFixed(1) : '0';

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

  // Recommendations — computed from real analytics/posts
  const recommendations = useMemo(
    () => buildRecommendations(analytics, posts, language === 'ru' ? 'ru' : 'en', parseInt(period)),
    [analytics, posts, language, period]
  );

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadAiSummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const text = await generateAiRecommendations(analytics, posts, language === 'ru' ? 'ru' : 'en');
      setAiSummary(text);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const priorityColors = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  const recIcon = (type: Recommendation['type']) =>
    type === 'network' ? Users :
    type === 'content' ? Video :
    type === 'seo' ? Target :
    type === 'timing' ? Clock :
    type === 'publications' ? Send :
    MessageSquare;

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
        {/* Custom date range */}
        <div className="flex items-center gap-2 bg-white rounded-lg border p-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-sm border-none outline-none"
            aria-label={language === 'ru' ? 'Дата с' : 'Date from'}
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-sm border-none outline-none"
            aria-label={language === 'ru' ? 'Дата по' : 'Date to'}
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {/* Content type filter */}
        <div className="flex items-center gap-2 bg-white rounded-lg border p-2">
          <FileText size={16} className="text-slate-400" />
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as typeof selectedType)}
            className="text-sm border-none outline-none"
          >
            {(['all', 'post', 'article', 'video', 'music'] as const).map(ty => (
              <option key={ty} value={ty}>{typeNames[ty]}</option>
            ))}
          </select>
        </div>
        {/* Period comparison toggle */}
        <button
          onClick={() => setCompareMode(v => !v)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
            compareMode ? 'bg-indigo-500 text-white' : 'bg-white border hover:border-indigo-200'
          }`}
        >
          <TrendingUp size={14} />
          {language === 'ru' ? 'Сравнить периоды' : 'Compare periods'}
        </button>
        <div className="flex flex-wrap gap-1">
          {networks.map(network => (
            <button
              key={network}
              onClick={() => setSelectedNetwork(network)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                selectedNetwork === network ? 'bg-blue-500 text-white' : 'bg-white border hover:border-blue-200'
              }`}
            >
              {network !== 'all' && <SocialIcon id={network} size={14} mono={selectedNetwork === network} />}
              {networkNames[network]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Send size={18} className="text-indigo-500" />
            <span className="text-sm text-slate-500">{t.publications}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalPublications.toLocaleString()}</p>
          {deltaBadge(deltaPublications)}
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={18} className="text-blue-500" />
            <span className="text-sm text-slate-500">{t.views}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
          {deltaBadge(deltaViews)}
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={18} className="text-pink-500" />
            <span className="text-sm text-slate-500">{t.likes}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalLikes.toLocaleString()}</p>
          {deltaBadge(deltaLikes)}
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={18} className="text-purple-500" />
            <span className="text-sm text-slate-500">{t.shares}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalShares.toLocaleString()}</p>
          {deltaBadge(deltaShares)}
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={18} className="text-amber-500" />
            <span className="text-sm text-slate-500">{language === 'ru' ? 'Комментарии' : 'Comments'}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalComments.toLocaleString()}</p>
          {deltaBadge(deltaComments)}
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-emerald-500" />
            <span className="text-sm text-slate-500">{language === 'ru' ? 'Вовлечённость' : 'Engagement'}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{engagementRate}%</p>
          {deltaBadge(deltaEngagement)}
        </div>
      </div>

      {/* Period comparison summary */}
      {compareMode && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 mb-8">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" />
            {language === 'ru' ? 'Сравнение периодов' : 'Period comparison'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4">{language === 'ru' ? 'Метрика' : 'Metric'}</th>
                  <th className="py-2 pr-4">{rangeStart} → {rangeEnd}</th>
                  <th className="py-2 pr-4">{prevStart} → {prevEnd}</th>
                  <th className="py-2">{language === 'ru' ? 'Динамика' : 'Change'}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: t.publications,
                    cur: totalPublications,
                    prev: selectedType === 'all' ? prevPostsInRange : prevPostsInRange,
                    d: deltaPublications,
                  },
                  { label: t.views, cur: totalViews, prev: sum(prevData, 'views'), d: deltaViews },
                  { label: t.likes, cur: totalLikes, prev: sum(prevData, 'likes'), d: deltaLikes },
                  { label: t.shares, cur: totalShares, prev: sum(prevData, 'shares'), d: deltaShares },
                  { label: language === 'ru' ? 'Комментарии' : 'Comments', cur: totalComments, prev: prevComments, d: deltaComments },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 pr-4 text-slate-600">{row.label}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{row.cur.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-slate-500">{row.prev.toLocaleString()}</td>
                    <td className={`py-2 font-medium ${row.d.up ? 'text-green-600' : 'text-red-600'}`}>
                      {row.d.up ? '+' : ''}{row.d.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <Bar dataKey="publications" fill="#6366f1" radius={[4, 4, 0, 0]} name={t.publications} />
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
              <Bar dataKey="publications" fill="#6366f1" name={t.publications} radius={[0, 4, 4, 0]} />
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
                  <SocialIcon id={networks.find(n => networkNames[n] === stat.network) || 'vk'} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900 truncate">{stat.network}</span>
                    <span className="text-xs text-slate-500">{t.publications}: <span className="text-indigo-600 font-medium">{stat.publications}</span> · <span className="text-emerald-600 font-medium">{stat.engagement}%</span></span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(stat.engagement) * 15)}%` }}></div>
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
                  <td className="p-4 font-medium text-slate-900">
                    <span className="flex items-center gap-2">
                      <SocialIcon id={networks.find(n => networkNames[n] === stat.network) || 'vk'} size={18} />
                      {stat.network}
                    </span>
                  </td>
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
            <span className="text-sm font-medium text-amber-900">
              {recommendations.length} {language === 'ru' ? 'рекомендации' : 'recommendations'}
            </span>
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
                  {(() => { const Icon = recIcon(rec.type); return (
                  <Icon size={18} className={
                    rec.priority === 'high' ? 'text-red-600' :
                    rec.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                  } />
                  ); })()}
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
                <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">+20% {language === 'ru' ? 'публикаций' : 'publications'}</span>
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
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{language === 'ru' ? 'AI-инсайты' : 'AI Insights'}</h3>
            <p className="text-xs text-slate-500">{language === 'ru' ? 'Анализ ваших реальных данных' : 'Analysis of your real data'}</p>
          </div>
          <button
            onClick={loadAiSummary}
            disabled={aiLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition flex items-center gap-2 disabled:opacity-60"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {aiLoading
              ? (language === 'ru' ? 'Анализ...' : 'Analyzing...')
              : (language === 'ru' ? 'Сгенерировать разбор' : 'Generate analysis')}
          </button>
        </div>

        {aiError && (
          <p className="mb-4 text-sm text-red-600">{aiError}</p>
        )}
        {aiSummary && (
          <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{language === 'ru' ? 'Лучшая площадка' : 'Top channel'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {(() => {
                const nets = [...new Set(analytics.map(a => a.network))];
                const best = nets
                  .map(n => ({ n, v: analytics.filter(a => a.network === n).reduce((s, a) => s + a.views, 0) }))
                  .sort((a, b) => b.v - a.v)[0];
                return best && best.v > 0 ? networkNames[best.n] || best.n : '—';
              })()}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {(() => {
                const nets = [...new Set(analytics.map(a => a.network))];
                const best = nets
                  .map(n => ({ n, v: analytics.filter(a => a.network === n).reduce((s, a) => s + a.views, 0) }))
                  .sort((a, b) => b.v - a.v)[0];
                return best && best.v > 0
                  ? `${best.v.toLocaleString()} ${language === 'ru' ? 'просмотров' : 'views'}`
                  : (language === 'ru' ? 'Нет данных' : 'No data');
              })()}
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} className="text-green-600" />
              <span className="text-sm font-bold text-green-900">{language === 'ru' ? 'Топ формат' : 'Top format'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {(() => {
                const counts = { post: 0, article: 0, video: 0, music: 0 } as Record<string, number>;
                posts.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
                const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                return top && top[1] > 0 ? typeNames[top[0]] || top[0] : '—';
              })()}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {(() => {
                const counts = { post: 0, article: 0, video: 0, music: 0 } as Record<string, number>;
                posts.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
                const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                return top && top[1] > 0
                  ? `${top[1]} ${language === 'ru' ? 'публикаций' : 'posts'}`
                  : (language === 'ru' ? 'Нет данных' : 'No data');
              })()}
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span className="text-sm font-bold text-purple-900">{language === 'ru' ? 'Тренд просмотров' : 'Views trend'}</span>
            </div>
            <p className={`text-2xl font-bold ${deltaViews.up ? 'text-slate-900' : 'text-red-600'}`}>{deltaViews.text}</p>
            <p className="text-xs text-slate-600 mt-1">
              {compareMode
                ? `${prevStart} → ${prevEnd}`
                : (language === 'ru' ? 'К предыдущему периоду' : 'vs previous period')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
