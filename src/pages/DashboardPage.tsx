import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { FileText, Video, Music, Image, Eye, Heart, Share2, Clock, TrendingUp, Megaphone } from 'lucide-react';

export default function DashboardPage() {
  const { language, currentUser, posts, analytics, setCurrentPage } = useStore();
  const t = translations[language];

  const totalViews = analytics.reduce((s, a) => s + a.views, 0);
  const totalLikes = analytics.reduce((s, a) => s + a.likes, 0);
  const totalShares = analytics.reduce((s, a) => s + a.shares, 0);

  const stats = [
    { icon: FileText, label: language === 'ru' ? 'Всего постов' : 'Total Posts', value: posts.length, color: 'from-blue-500 to-blue-600' },
    { icon: Eye, label: t.views, value: totalViews.toLocaleString(), color: 'from-green-500 to-emerald-600' },
    { icon: Heart, label: t.likes, value: totalLikes.toLocaleString(), color: 'from-pink-500 to-rose-600' },
    { icon: Share2, label: t.shares, value: totalShares.toLocaleString(), color: 'from-purple-500 to-violet-600' },
  ];

  const isFreeTrial = currentUser?.subscription === 'free';
  const trialEnd = currentUser?.freeTrialEnd ? new Date(currentUser.freeTrialEnd) : null;
  const hoursLeft = trialEnd ? Math.max(0, Math.floor((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60))) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t.welcome}, {currentUser?.name}! 👋</h1>
        <p className="text-slate-600 mt-1">{language === 'ru' ? 'Ваша панель управления контентом' : 'Your content management dashboard'}</p>
      </div>

      {/* Free Trial Banner */}
      {isFreeTrial && trialEnd && (
        <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">{language === 'ru' ? 'Бесплатный пробный период' : 'Free trial period'}</p>
              <p className="text-sm text-green-700">{language === 'ru' ? `Осталось ${hoursLeft} часов` : `${hoursLeft} hours remaining`}</p>
            </div>
          </div>
          <button onClick={() => setCurrentPage('subscriptions')} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition">
            {language === 'ru' ? 'Продлить' : 'Upgrade'}
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-md transition">
            <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon size={20} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { icon: FileText, label: language === 'ru' ? 'Создать пост' : 'Create Post', page: 'content-generator' },
          { icon: Video, label: language === 'ru' ? 'Создать видео' : 'Create Video', page: 'content-generator' },
          { icon: Music, label: language === 'ru' ? 'Создать музыку' : 'Create Music', page: 'content-generator' },
          { icon: Image, label: language === 'ru' ? 'Создать статью' : 'Create Article', page: 'content-generator' },
          { icon: Megaphone, label: language === 'ru' ? 'Рекламный кабинет' : 'Ad Cabinet', page: 'advertiser' },
        ].map((action, i) => (
          <button key={i} onClick={() => setCurrentPage(action.page)} className="bg-white rounded-xl p-5 border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all text-left group">
            <action.icon size={24} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-slate-900">{action.label}</p>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Последний контент' : 'Recent Content'}</h3>
            <button onClick={() => setCurrentPage('content-generator')} className="text-blue-600 text-sm hover:underline">
              {language === 'ru' ? 'Все' : 'All'}
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
                    <p className="text-xs text-slate-500">{post.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Тренды' : 'Trends'}</h3>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <div className="space-y-4">
            {[
              { label: language === 'ru' ? 'Просмотры за неделю' : 'Weekly views', change: '+23%', up: true },
              { label: language === 'ru' ? 'Новые подписчики' : 'New followers', change: '+12%', up: true },
              { label: language === 'ru' ? 'Вовлечённость' : 'Engagement', change: '+8%', up: true },
              { label: language === 'ru' ? 'Публикации' : 'Publications', change: '15', up: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className={`text-sm font-medium ${item.up ? 'text-green-600' : 'text-red-600'}`}>{item.change}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
