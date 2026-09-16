import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { BarChart3, Eye, Heart, Share2, TrendingUp, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function AnalyticsPage() {
  const { language, analytics } = useStore();
  const t = translations[language];
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [period, setPeriod] = useState('30');

  const networks = ['all', 'vk', 'telegram', 'youtube', 'instagram', 'tiktok', 'ok'];
  const networkNames: Record<string, string> = { all: language === 'ru' ? 'Все' : 'All', vk: 'VKontakte', telegram: 'Telegram', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', ok: 'OK' };

  const filteredData = analytics.filter(a => selectedNetwork === 'all' || a.network === selectedNetwork);
  
  const dailyData = filteredData.reduce((acc, item) => {
    const existing = acc.find(d => d.date === item.date);
    if (existing) {
      existing.views += item.views;
      existing.likes += item.likes;
      existing.shares += item.shares;
    } else {
      acc.push({ date: item.date, views: item.views, likes: item.likes, shares: item.shares });
    }
    return acc;
  }, [] as { date: string; views: number; likes: number; shares: number }[]).sort((a, b) => a.date.localeCompare(b.date));

  const networkStats = networks.filter(n => n !== 'all').map(network => {
    const data = analytics.filter(a => a.network === network);
    return {
      network: networkNames[network],
      views: data.reduce((s, a) => s + a.views, 0),
      likes: data.reduce((s, a) => s + a.likes, 0),
      shares: data.reduce((s, a) => s + a.shares, 0),
      publications: Math.floor(Math.random() * 30) + 5,
    };
  });

  const totalViews = filteredData.reduce((s, a) => s + a.views, 0);
  const totalLikes = filteredData.reduce((s, a) => s + a.likes, 0);
  const totalShares = filteredData.reduce((s, a) => s + a.shares, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.analytics}</h1>
      <p className="text-slate-600 mb-8">{language === 'ru' ? 'Полная аналитика по публикациям и вовлечённости' : 'Full analytics on publications and engagement'}</p>

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={18} className="text-blue-500" />
            <span className="text-sm text-slate-500">{t.views}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><TrendingUp size={12} /> +12%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={18} className="text-pink-500" />
            <span className="text-sm text-slate-500">{t.likes}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalLikes.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><TrendingUp size={12} /> +8%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={18} className="text-purple-500" />
            <span className="text-sm text-slate-500">{t.shares}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalShares.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><TrendingUp size={12} /> +5%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={18} className="text-green-500" />
            <span className="text-sm text-slate-500">{t.publications}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{Math.floor(Math.random() * 50) + 20}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><TrendingUp size={12} /> +15%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">{t.views} & {t.likes}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="views" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name={t.views} />
              <Area type="monotone" dataKey="likes" stackId="2" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} name={t.likes} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">{t.byNetwork}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={networkStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="network" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#3b82f6" name={t.views} radius={[4, 4, 0, 0]} />
              <Bar dataKey="likes" fill="#ec4899" name={t.likes} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Network Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
