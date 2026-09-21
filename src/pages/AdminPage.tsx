import { useState } from 'react';
import { useStore, UserRole, Subscription } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Shield, Users, Settings, FileText, Eye, Ban, Check, Search } from 'lucide-react';

export default function AdminPage() {
  const { language, currentUser } = useStore();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  const mockUsers = [
    { id: '1', name: 'Иван Петров', email: 'ivan@mail.ru', role: 'user' as UserRole, subscription: 'pro' as Subscription, registered: '2024-01-15', status: 'active' },
    { id: '2', name: 'Мария Сидорова', email: 'maria@gmail.com', role: 'user' as UserRole, subscription: 'basic' as Subscription, registered: '2024-02-20', status: 'active' },
    { id: '3', name: 'Алексей Козлов', email: 'alex@yandex.ru', role: 'advertiser' as UserRole, subscription: 'premium' as Subscription, registered: '2024-01-05', status: 'active' },
    { id: '4', name: 'Елена Волкова', email: 'elena@mail.ru', role: 'user' as UserRole, subscription: 'free' as Subscription, registered: '2024-03-01', status: 'banned' },
    { id: '5', name: 'Дмитрий Новиков', email: 'dmitry@bk.ru', role: 'user' as UserRole, subscription: 'pro' as Subscription, registered: '2024-02-10', status: 'active' },
  ];

  const mockContent = [
    { id: '1', title: 'Как начать блог', author: 'Иван Петров', status: 'approved', date: '2024-03-15' },
    { id: '2', title: 'Топ-10 тем для YouTube', author: 'Мария Сидорова', status: 'pending', date: '2024-03-16' },
    { id: '3', title: 'Монетизация блога', author: 'Алексей Козлов', status: 'approved', date: '2024-03-14' },
    { id: '4', title: 'Запрещённый контент', author: 'Елена Волкова', status: 'rejected', date: '2024-03-16' },
  ];

  const filteredUsers = mockUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.admin}</h1>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Полное управление платформой' : 'Full platform management'}</p>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">1,247</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Пользователей' : 'Users'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">8,934</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Постов создано' : 'Posts created'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">₽ 456,000</p>
          <p className="text-sm text-slate-500">{language === 'ru' ? 'Доход за месяц' : 'Monthly revenue'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">23</p>
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
                      <select defaultValue={user.role} className="text-xs border border-slate-200 rounded px-2 py-1">
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
                        <button className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Eye size={14} /></button>
                        <button className="p-1.5 hover:bg-red-50 rounded text-red-600"><Ban size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">{t.contentModerationAdmin}</h3>
            <p className="text-sm text-slate-500">{language === 'ru' ? 'Автоматическая проверка + ручная модерация' : 'Automatic check + manual moderation'}</p>
          </div>
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
                {mockContent.map(item => (
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
                        <button className="p-1.5 hover:bg-green-50 rounded text-green-600"><Check size={14} /></button>
                        <button className="p-1.5 hover:bg-red-50 rounded text-red-600"><Ban size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-6">{t.siteSettings}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Название сайта' : 'Site name'}</label>
              <input type="text" defaultValue="BlogPost" className="w-full p-3 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Описание' : 'Description'}</label>
              <textarea defaultValue={language === 'ru' ? 'Платформа для блогеров с AI-генерацией контента' : 'Blogger platform with AI content generation'} className="w-full p-3 border border-slate-200 rounded-lg" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Автомодерация' : 'Auto moderation'}</label>
              <select className="w-full p-3 border border-slate-200 rounded-lg">
                <option>{language === 'ru' ? 'Включена — соответствие законодательству РФ' : 'Enabled — compliance with Russian law'}</option>
                <option>{language === 'ru' ? 'Только автоматическая' : 'Automatic only'}</option>
                <option>{language === 'ru' ? 'Отключена' : 'Disabled'}</option>
              </select>
            </div>
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition">
              {t.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
