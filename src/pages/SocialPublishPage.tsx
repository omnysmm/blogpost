import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Share2, Clock, Send, Check, Calendar } from 'lucide-react';

export default function SocialPublishPage() {
  const { language, posts, updatePost } = useStore();
  const t = translations[language];
  const [selectedPost, setSelectedPost] = useState('');
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [published, setPublished] = useState<string[]>([]);

  const networks = [
    { id: 'vk', name: 'VKontakte', color: 'bg-blue-500', emoji: '🔵' },
    { id: 'telegram', name: 'Telegram', color: 'bg-sky-500', emoji: '📨' },
    { id: 'youtube', name: 'YouTube', color: 'bg-red-500', emoji: '📺' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500', emoji: '📷' },
    { id: 'tiktok', name: 'TikTok', color: 'bg-slate-800', emoji: '🎵' },
    { id: 'ok', name: 'OK', color: 'bg-orange-500', emoji: '🟠' },
  ];

  const toggleNetwork = (id: string) => {
    setSelectedNetworks(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const handlePublish = () => {
    if (!selectedPost || selectedNetworks.length === 0) return;
    setPublished(selectedNetworks);
    updatePost(selectedPost, {
      status: 'published',
      socialNetworks: selectedNetworks,
      publishedAt: new Date().toISOString(),
    });
    setTimeout(() => setPublished([]), 3000);
  };

  const handleSchedule = () => {
    if (!selectedPost || !scheduleDate || !scheduleTime) return;
    updatePost(selectedPost, {
      status: 'draft',
      scheduledAt: `${scheduleDate}T${scheduleTime}`,
      socialNetworks: selectedNetworks,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.socialPublish}</h1>
      <p className="text-slate-600 mb-8">{language === 'ru' ? 'Публикуйте контент во все соцсети вручную или по расписанию' : 'Publish content to all social networks manually or on schedule'}</p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left - Select Content */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Выберите контент' : 'Select Content'}</h3>
            {posts.length === 0 ? (
              <p className="text-slate-400 text-sm">{language === 'ru' ? 'Сначала создайте контент в генераторе' : 'First create content in the generator'}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {posts.map(post => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedPost === post.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-sm text-slate-900">{post.title}</p>
                    <p className="text-xs text-slate-500">{post.type} • {new Date(post.createdAt).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Networks */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{t.selectNetworks}</h3>
            <div className="grid grid-cols-2 gap-3">
              {networks.map(network => (
                <button
                  key={network.id}
                  onClick={() => toggleNetwork(network.id)}
                  className={`p-3 rounded-lg border flex items-center gap-3 transition ${
                    selectedNetworks.includes(network.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">{network.emoji}</span>
                  <span className="text-sm font-medium">{network.name}</span>
                  {selectedNetworks.includes(network.id) && <Check size={16} className="ml-auto text-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Publish Actions */}
        <div className="space-y-6">
          {/* Publish Now */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">{t.publishNow}</h3>
            <button
              onClick={handlePublish}
              disabled={!selectedPost || selectedNetworks.length === 0}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {language === 'ru' ? 'Опубликовать сейчас' : 'Publish now'}
            </button>
            {published.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Check size={16} />
                  {language === 'ru' ? `Опубликовано в: ${published.join(', ')}` : `Published to: ${published.join(', ')}`}
                </p>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{t.schedule}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
                <span className="text-sm">{language === 'ru' ? 'Включить' : 'Enable'}</span>
              </label>
            </div>
            {scheduleEnabled && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">{language === 'ru' ? 'Дата' : 'Date'}</label>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">{language === 'ru' ? 'Время' : 'Time'}</label>
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                <button
                  onClick={handleSchedule}
                  disabled={!selectedPost || !scheduleDate || !scheduleTime}
                  className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Calendar size={16} />
                  {language === 'ru' ? 'Запланировать' : 'Schedule'}
                </button>
              </div>
            )}
          </div>

          {/* SEO/GEO Info */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">{language === 'ru' ? 'Адаптация под соцсети' : 'Network adaptation'}</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>✅ {language === 'ru' ? 'SEO-оптимизация для каждой платформы' : 'SEO optimization for each platform'}</p>
              <p>✅ {language === 'ru' ? 'GEO-таргетинг по регионам' : 'Geo-targeting by regions'}</p>
              <p>✅ {language === 'ru' ? 'Адаптация формата под требования сети' : 'Format adaptation per network'}</p>
              <p>✅ {language === 'ru' ? 'Хештеги и ключевые слова' : 'Hashtags and keywords'}</p>
              <p>✅ {language === 'ru' ? 'Оптимальное время публикации' : 'Optimal publishing time'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
