import { useState, useEffect } from 'react';
import { useStore, UserRole, Subscription } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Shield, Users, Settings, FileText, Eye, Ban, Check, Search, RefreshCw, Undo2 } from 'lucide-react';

const SITE_KEY = 'blogpost_site_settings';

type SiteSettings = { name: string; description: string; autoModeration: string };

function loadSiteSettings(language: string): SiteSettings {
  try {
    const raw = localStorage.getItem(SITE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    name: 'BlogPost',
    description: language === 'ru'
      ? 'Платформа для блогеров с AI-генерацией контента'
      : 'Blogger platform with AI content generation',
    autoModeration: 'rf',
  };
}

function isBanned(u: any): boolean {
  return u.status === 'banned' || u.role === 'banned';
}

function mapUser(u: any) {
  return {
    id: u.id,
    name: u.name || u.email || '—',
    email: u.email || '',
    role: (u.role && u.role !== 'banned' ? u.role : 'user') as UserRole,
    subscription: (u.subscription || 'free') as Subscription,
    registered: (u.created_at || '').split('T')[0] || '',
    status: isBanned(u) ? 'banned' : 'active',
  };
}

function mapPost(p: any, users: any[]) {
  const author =
    users.find(u => u.id === p.user_id)?.name ||
    users.find(u => u.id === p.user_id)?.email ||
    p.user_id?.slice(0, 8) ||
    '—';
  const statusMap: Record<string, string> = {
    moderating: 'pending',
    queued: 'pending',
    scheduled: 'pending',
    ready: 'pending',
    rejected: 'rejected',
    published: 'approved',
    draft: 'pending',
    generating: 'pending',
  };
  return {
    id: p.id,
    title: p.title || p.topic || '—',
    author,
    status: statusMap[p.status] || 'pending',
    rawStatus: p.status,
    date: (p.created_at || '').split('T')[0] || '',
  };
}

export default function AdminPage() {
  const {
    language,
    platformStats,
    allUsers,
    allPosts,
    loadPlatformStats,
    loadAllUsers,
    loadAllPostsAdmin,
    adminSetRole,
    adminBan,
    adminUnban,
    adminModeratePost,
  } = useStore();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [site, setSite] = useState<SiteSettings>(() => loadSiteSettings(language));

  useEffect(() => {
    loadPlatformStats();
    loadAllUsers();
    loadAllPostsAdmin();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      flash(okMsg);
    } catch (e: any) {
      flash(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const displayUsers = allUsers.map(mapUser);
  const displayPosts = allPosts.map(p => mapPost(p, allUsers));

  const filteredUsers = displayUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'users', icon: Users, label: t.users },
    { id: 'content', icon: FileText, label: language === 'ru' ? 'Контент' : 'Content' },
    { id: 'settings', icon: Settings, label: t.siteSettings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{t.admin}</h1>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Полное управление платформой' : 'Full platform management'}</p>
        </div>
        <button
          onClick={() => {
            loadPlatformStats();
            loadAllUsers();
            loadAllPostsAdmin();
          }}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
          title={language === 'ru' ? 'Обновить' : 'Refresh'}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {notice && (
        <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-800 rounded-lg text-sm">{notice}</div>
      )}

      {/* Admin Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">{platformStats.users.toLocaleString()}</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Пользователей' : 'Users'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">{platformStats.posts.toLocaleString()}</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Постов создано' : 'Posts created'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">₽ {platformStats.revenue.toLocaleString()}</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Доход за месяц' : 'Monthly revenue'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">{platformStats.pending}</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'На модерации' : 'Pending moderation'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-white border hover:border-blue-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {language === 'ru'
                ? 'Пользователи не найдены. Подключите Supabase — данные появятся здесь.'
                : 'No users found. Connect Supabase — data will appear here.'}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{t.name}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{t.email}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Роль' : 'Role'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Подписка' : 'Subscription'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Статус' : 'Status'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Действия' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{user.name}</td>
                    <td className="p-4 text-slate-600 text-sm">{user.email}</td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        disabled={busy || user.status === 'banned'}
                        onChange={e => run(() => adminSetRole(user.id, e.target.value), language === 'ru' ? 'Роль обновлена' : 'Role updated')}
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                      >
                        <option value="user">User</option>
                        <option value="advertiser">Advertiser</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.subscription === 'premium' ? 'bg-amber-50 text-amber-700' :
                        user.subscription === 'pro' ? 'bg-purple-50 text-purple-700' :
                        user.subscription === 'basic' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{user.subscription}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${user.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {user.status === 'active' ? (language === 'ru' ? 'Активен' : 'Active') : (language === 'ru' ? 'Заблокирован' : 'Banned')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {user.status === 'active' ? (
                          <button
                            disabled={busy}
                            title={language === 'ru' ? 'Заблокировать' : 'Ban'}
                            onClick={() => run(() => adminBan(user.id), language === 'ru' ? 'Пользователь заблокирован' : 'User banned')}
                            className="p-1.5 hover:bg-red-50 rounded text-red-600"
                          >
                            <Ban size={14} />
                          </button>
                        ) : (
                          <button
                            disabled={busy}
                            title={language === 'ru' ? 'Разблокировать' : 'Unban'}
                            onClick={() => run(() => adminUnban(user.id), language === 'ru' ? 'Пользователь разблокирован' : 'User unbanned')}
                            className="p-1.5 hover:bg-green-50 rounded text-green-600"
                          >
                            <Undo2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">{t.contentModerationAdmin}</h3>
            <p className="text-sm text-slate-500">{language === 'ru' ? 'Автоматическая проверка + ручная модерация' : 'Automatic check + manual moderation'}</p>
          </div>
          {displayPosts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {language === 'ru'
                ? 'Контент не найден. Посты пользователей появятся здесь из Supabase.'
                : 'No content found. User posts from Supabase will appear here.'}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Заголовок' : 'Title'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Автор' : 'Author'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Статус' : 'Status'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Дата' : 'Date'}</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">{language === 'ru' ? 'Действия' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {displayPosts.map(item => (
                  <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{item.title}</td>
                    <td className="p-4 text-slate-600 text-sm">{item.author}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'approved' ? 'bg-green-50 text-green-700' :
                        item.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {item.status === 'approved' ? (language === 'ru' ? 'Одобрено' : 'Approved') :
                         item.status === 'pending' ? (language === 'ru' ? 'На проверке' : 'Pending') :
                         (language === 'ru' ? 'Отклонено' : 'Rejected')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{item.date}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button
                          disabled={busy}
                          title={language === 'ru' ? 'Одобрить' : 'Approve'}
                          onClick={() => run(() => adminModeratePost(item.id, 'ready'), language === 'ru' ? 'Пост одобрен' : 'Post approved')}
                          className="p-1.5 hover:bg-green-50 rounded text-green-600"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          disabled={busy}
                          title={language === 'ru' ? 'Отклонить' : 'Reject'}
                          onClick={() => run(() => adminModeratePost(item.id, 'rejected'), language === 'ru' ? 'Пост отклонён' : 'Post rejected')}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600"
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-6">{t.siteSettings}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Название сайта' : 'Site name'}</label>
              <input
                type="text"
                value={site.name}
                onChange={e => setSite(s => ({ ...s, name: e.target.value }))}
                className="w-full p-3 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Описание' : 'Description'}</label>
              <textarea
                value={site.description}
                onChange={e => setSite(s => ({ ...s, description: e.target.value }))}
                className="w-full p-3 border border-slate-200 rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Автомодерация' : 'Auto moderation'}</label>
              <select
                value={site.autoModeration}
                onChange={e => setSite(s => ({ ...s, autoModeration: e.target.value }))}
                className="w-full p-3 border border-slate-200 rounded-lg"
              >
                <option value="rf">{language === 'ru' ? 'Включена — соответствие законодательству РФ' : 'Enabled — compliance with Russian law'}</option>
                <option value="auto">{language === 'ru' ? 'Только автоматическая' : 'Automatic only'}</option>
                <option value="off">{language === 'ru' ? 'Отключена' : 'Disabled'}</option>
              </select>
            </div>
            <button
              disabled={busy}
              onClick={() => {
                localStorage.setItem(SITE_KEY, JSON.stringify(site));
                flash(language === 'ru' ? 'Настройки сайта сохранены' : 'Site settings saved');
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
            >
              {t.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
