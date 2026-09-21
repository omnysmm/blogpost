import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import {
  Settings as SettingsIcon, Share2, Calendar, CreditCard, Tag,
  Key, Link2, Check, Plus, Trash2, Clock, Globe, Video,
  Bell, Shield, Zap, Crown, Star, Edit, Save, Eye, EyeOff,
  AlertCircle, ChevronRight, RefreshCw, X, CheckCircle2,
  HelpCircle, ExternalLink, Copy
} from 'lucide-react';

type SettingsTab = 'social' | 'schedule' | 'payment' | 'plans';

interface SocialConnection {
  id: string;
  network: string;
  name: string;
  emoji: string;
  color: string;
  connected: boolean;
  method: 'api' | 'manual' | null;
  apiKey?: string;
  accountId?: string;
  login?: string;
  autoPublish: boolean;
}

interface ScheduleItem {
  id: string;
  content: string;
  networks: string[];
  days: string[];
  time: string;
  active: boolean;
  nextRun?: string;
}

interface PaymentMethod {
  id: string;
  type: 'yandex' | 'card' | 'yoomoney' | 'sbp';
  name: string;
  details: string;
  isDefault: boolean;
  verified: boolean;
}

export default function SettingsPage() {
  const { language, currency, currentUser } = useStore();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<SettingsTab>('social');

  const formatPrice = (price: number) => {
    if (currency === 'USD') return `$${Math.round(price / 90)}`;
    if (currency === 'CNY') return `¥${Math.round(price / 12)}`;
    return `${price.toLocaleString()} ₽`;
  };

  // ===== SOCIAL NETWORKS =====
  const defaultSocials: SocialConnection[] = [
    { id: '1', network: 'vk', name: 'VKontakte', emoji: '🔵', color: 'from-blue-500 to-blue-600', connected: false, method: null, autoPublish: false },
    { id: '2', network: 'telegram', name: 'Telegram', emoji: '📨', color: 'from-sky-500 to-sky-600', connected: false, method: null, autoPublish: false },
    { id: '3', network: 'youtube', name: 'YouTube', emoji: '📺', color: 'from-red-500 to-red-600', connected: false, method: null, autoPublish: false },
    { id: '4', network: 'instagram', name: 'Instagram', emoji: '📷', color: 'from-pink-500 to-purple-500', connected: false, method: null, autoPublish: false },
    { id: '5', network: 'tiktok', name: 'TikTok', emoji: '🎵', color: 'from-slate-800 to-slate-900', connected: false, method: null, autoPublish: false },
    { id: '6', network: 'ok', name: 'OK', emoji: '🟠', color: 'from-orange-500 to-orange-600', connected: false, method: null, autoPublish: false },
  ];

  const loadSocials = (): SocialConnection[] => {
    try {
      const saved = localStorage.getItem('blogpost_socials');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSocials;
  };

  const [socials, setSocials] = useState<SocialConnection[]>(loadSocials);

  const saveSocials = (updated: SocialConnection[]) => {
    setSocials(updated);
    localStorage.setItem('blogpost_socials', JSON.stringify(updated));
  };
  const [editingSocial, setEditingSocial] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTelegramHelp, setShowTelegramHelp] = useState(false);

  const showSaveSuccess = (msg: string) => {
    setSaveMessage({ type: 'success', text: msg });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const showSaveError = (msg: string) => {
    setSaveMessage({ type: 'error', text: msg });
    setTimeout(() => setSaveMessage(null), 5000);
  };

  // ===== SCHEDULE =====
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    { id: '1', content: language === 'ru' ? 'Ежедневный пост о технологиях' : 'Daily tech post', networks: ['vk', 'telegram'], days: ['mon', 'wed', 'fri'], time: '10:00', active: true, nextRun: '2024-03-18 10:00' },
    { id: '2', content: language === 'ru' ? 'Еженедельный видеоролик' : 'Weekly video', networks: ['youtube', 'vk'], days: ['sat'], time: '15:00', active: true, nextRun: '2024-03-23 15:00' },
    { id: '3', content: language === 'ru' ? 'Stories в Instagram' : 'Instagram Stories', networks: ['instagram'], days: ['mon', 'tue', 'wed', 'thu', 'fri'], time: '12:00', active: false },
  ]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ content: '', networks: [] as string[], days: [] as string[], time: '10:00' });

  // ===== PAYMENT =====
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: 'yandex', name: language === 'ru' ? 'Яндекс.Оплата' : 'Yandex.Pay', details: 'ya.pay@blogpost.ru', isDefault: true, verified: true },
    { id: '2', type: 'card', name: language === 'ru' ? 'Банковская карта' : 'Bank Card', details: '•••• •••• •••• 4242', isDefault: false, verified: true },
    { id: '3', type: 'yoomoney', name: 'ЮMoney', details: '4100••••••••1234', isDefault: false, verified: true },
  ]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<'yandex' | 'card' | 'yoomoney' | 'sbp'>('card');
  const [newPaymentDetails, setNewPaymentDetails] = useState('');

  // ===== PLANS =====
  const [selectedPlan, setSelectedPlan] = useState<string>(currentUser?.subscription || 'free');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);

  const tabs = [
    { id: 'social' as SettingsTab, icon: Share2, label: language === 'ru' ? 'Соцсети' : 'Social Networks' },
    { id: 'schedule' as SettingsTab, icon: Calendar, label: language === 'ru' ? 'Расписание' : 'Schedule' },
    { id: 'payment' as SettingsTab, icon: CreditCard, label: language === 'ru' ? 'Оплата' : 'Payment' },
    { id: 'plans' as SettingsTab, icon: Tag, label: language === 'ru' ? 'Тарифы и блоки' : 'Plans & Blocks' },
  ];

  const dayLabels: Record<string, string> = {
    mon: language === 'ru' ? 'Пн' : 'Mon',
    tue: language === 'ru' ? 'Вт' : 'Tue',
    wed: language === 'ru' ? 'Ср' : 'Wed',
    thu: language === 'ru' ? 'Чт' : 'Thu',
    fri: language === 'ru' ? 'Пт' : 'Fri',
    sat: language === 'ru' ? 'Сб' : 'Sat',
    sun: language === 'ru' ? 'Вс' : 'Sun',
  };

  const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // ===== SOCIAL HANDLERS =====
  const toggleConnect = (id: string) => {
    saveSocials(socials.map(s => s.id === id ? { ...s, connected: !s.connected } : s));
  };

  const setSocialMethod = (id: string, method: 'api' | 'manual') => {
    saveSocials(socials.map(s => s.id === id ? { ...s, method, connected: true } : s));
  };

  const updateApiKey = (id: string, apiKey: string) => {
    saveSocials(socials.map(s => s.id === id ? { ...s, apiKey } : s));
  };

  const updateLogin = (id: string, login: string) => {
    saveSocials(socials.map(s => s.id === id ? { ...s, login } : s));
  };

  const toggleAutoPublish = (id: string) => {
    saveSocials(socials.map(s => s.id === id ? { ...s, autoPublish: !s.autoPublish } : s));
  };

  // ===== SCHEDULE HANDLERS =====
  const addSchedule = () => {
    if (!newSchedule.content || newSchedule.networks.length === 0 || newSchedule.days.length === 0) return;
    const item: ScheduleItem = {
      id: Date.now().toString(),
      content: newSchedule.content,
      networks: newSchedule.networks,
      days: newSchedule.days,
      time: newSchedule.time,
      active: true,
    };
    setSchedules(prev => [...prev, item]);
    setShowScheduleModal(false);
    setNewSchedule({ content: '', networks: [], days: [], time: '10:00' });
  };

  const toggleScheduleActive = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  // ===== PAYMENT HANDLERS =====
  const addPaymentMethod = () => {
    if (!newPaymentDetails) return;
    const method: PaymentMethod = {
      id: Date.now().toString(),
      type: newPaymentType,
      name: newPaymentType === 'yandex' ? 'Яндекс.Оплата' : newPaymentType === 'card' ? (language === 'ru' ? 'Банковская карта' : 'Bank Card') : newPaymentType === 'yoomoney' ? 'ЮMoney' : 'СБП',
      details: newPaymentDetails,
      isDefault: false,
      verified: false,
    };
    setPaymentMethods(prev => [...prev, method]);
    setShowPaymentModal(false);
    setNewPaymentDetails('');
  };

  const setDefaultPayment = (id: string) => {
    setPaymentMethods(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
  };

  const deletePayment = (id: string) => {
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <SettingsIcon size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.settings}</h1>
          <p className="text-slate-600">{language === 'ru' ? 'Управление подключениями, расписанием и оплатой' : 'Manage connections, schedule and payments'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 border border-slate-100 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Save message toast */}
      {saveMessage && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in ${saveMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {saveMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {saveMessage.text}
        </div>
      )}

      {/* ============ SOCIAL TAB ============ */}
      {activeTab === 'social' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">{language === 'ru' ? 'Подключение соцсетей' : 'Social network connection'}</p>
              <p className="text-xs mt-1">{language === 'ru' ? 'Подключите аккаунты через API-ключи (автоматическая публикация) или вручную (через логин/пароль). API-подключение рекомендуется для автоматических публикаций по расписанию.' : 'Connect accounts via API keys (auto publishing) or manually (via login/password). API connection is recommended for scheduled auto-publishing.'}</p>
            </div>
          </div>

          {socials.map(social => (
            <div key={social.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${social.color} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                  {social.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{social.name}</h3>
                    {social.connected && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> {language === 'ru' ? 'Подключено' : 'Connected'}
                      </span>
                    )}
                  </div>
                  {social.connected && social.method && (
                    <p className="text-xs text-slate-500 mt-1">
                      {social.method === 'api' ? `API: ${showApiKeys[social.id] ? social.apiKey : '••••••••'}` : `${language === 'ru' ? 'Аккаунт' : 'Account'}: ${social.login}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!social.connected ? (
                    <div className="flex gap-2">
                      <button onClick={() => setSocialMethod(social.id, 'api')} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition flex items-center gap-1.5">
                        <Key size={14} /> API
                      </button>
                      <button onClick={() => setSocialMethod(social.id, 'manual')} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition flex items-center gap-1.5">
                        <Link2 size={14} /> {language === 'ru' ? 'Вручную' : 'Manual'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setEditingSocial(editingSocial === social.id ? null : social.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => toggleConnect(social.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded settings */}
              {editingSocial === social.id && social.connected && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                  {social.method === 'api' && (<>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                      <div className="flex gap-2">
                        <input
                          type={showApiKeys[social.id] ? 'text' : 'password'}
                          value={social.apiKey || ''}
                          onChange={e => updateApiKey(social.id, e.target.value)}
                          className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                          placeholder={language === 'ru' ? 'Введите API ключ' : 'Enter API key'}
                        />
                        <button onClick={() => setShowApiKeys(prev => ({ ...prev, [social.id]: !prev[social.id] }))} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                          {showApiKeys[social.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                          <RefreshCw size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{language === 'ru' ? 'Получите API ключ в настройках разработчика соцсети' : 'Get API key in social network developer settings'}</p>
                    </div>
                    {social.network === 'telegram' && (<>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chat ID / Канал</label>
                        <input
                          type="text"
                          value={social.accountId || ''}
                          onChange={e => saveSocials(socials.map(s => s.id === social.id ? { ...s, accountId: e.target.value } : s))}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                          placeholder={language === 'ru' ? 'Например: @mychannel или -1001234567890' : 'e.g.: @mychannel or -1001234567890'}
                        />
                        <p className="text-xs text-slate-500 mt-1">{language === 'ru' ? 'ID канала, группы или пользователя для публикации' : 'Channel, group or user ID for publishing'}</p>
                      </div>
                      <button
                        onClick={() => setShowTelegramHelp(true)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <HelpCircle size={16} />
                        {language === 'ru' ? 'Где найти API Key и Chat ID?' : 'Where to find API Key and Chat ID?'}
                      </button>
                    </>)}
                  </>)}
                  {social.method === 'manual' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Логин / Имя аккаунта' : 'Login / Account name'}</label>
                      <input
                        type="text"
                        value={social.login || ''}
                        onChange={e => updateLogin(social.id, e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                        placeholder="@username"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                    <input type="checkbox" checked={social.autoPublish} onChange={() => toggleAutoPublish(social.id)} className="w-4 h-4 text-blue-500 rounded" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Автоматическая публикация' : 'Auto publishing'}</p>
                      <p className="text-xs text-slate-500">{language === 'ru' ? 'Контент будет публиковаться в этой сети автоматически' : 'Content will be published to this network automatically'}</p>
                    </div>
                  </label>
                  <button
                    onClick={() => {
                      try {
                        saveSocials(socials);
                        showSaveSuccess(language === 'ru' ? 'Настройки соцсетей сохранены' : 'Social network settings saved');
                      } catch (e: any) {
                        showSaveError(language === 'ru' ? `Ошибка сохранения: ${e.message}` : `Save error: ${e.message}`);
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2"
                  >
                    <Save size={14} /> {t.save}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============ SCHEDULE TAB ============ */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900">{language === 'ru' ? 'Расписание автопубликаций' : 'Auto-publish schedule'}</h3>
              <p className="text-sm text-slate-500">{language === 'ru' ? 'Настройте автоматическую публикацию контента по расписанию' : 'Set up automatic content publishing on schedule'}</p>
            </div>
            <button onClick={() => setShowScheduleModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2">
              <Plus size={16} /> {language === 'ru' ? 'Добавить' : 'Add'}
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">{language === 'ru' ? 'Нет расписаний. Создайте первое!' : 'No schedules. Create your first!'}</p>
            </div>
          ) : (
            schedules.map(schedule => (
              <div key={schedule.id} className={`bg-white rounded-xl border ${schedule.active ? 'border-slate-100' : 'border-slate-100 opacity-60'} overflow-hidden`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${schedule.active ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      <Clock size={18} className={schedule.active ? 'text-blue-600' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900">{schedule.content}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${schedule.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {schedule.active ? (language === 'ru' ? 'Активно' : 'Active') : (language === 'ru' ? 'Выключено' : 'Off')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {schedule.networks.map(n => {
                          const social = socials.find(s => s.network === n);
                          return social ? (
                            <span key={n} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded flex items-center gap-1">
                              {social.emoji} {social.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {allDays.map(day => (
                          <span key={day} className={`text-xs px-2 py-0.5 rounded ${schedule.days.includes(day) ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-slate-50 text-slate-400'}`}>
                            {dayLabels[day]}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <Clock size={12} /> {schedule.time}
                        {schedule.nextRun && ` • ${language === 'ru' ? 'Следующий запуск' : 'Next run'}: ${schedule.nextRun}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleScheduleActive(schedule.id)} className={`p-2 rounded-lg ${schedule.active ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`}>
                        {schedule.active ? <Clock size={16} /> : <Check size={16} />}
                      </button>
                      <button onClick={() => deleteSchedule(schedule.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Schedule Modal */}
          {showScheduleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Новое расписание' : 'New Schedule'}</h3>
                  <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Описание / Тип контента' : 'Description / Content type'}</label>
                    <input type="text" value={newSchedule.content} onChange={e => setNewSchedule({ ...newSchedule, content: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" placeholder={language === 'ru' ? 'Например: Ежедневный пост' : 'e.g.: Daily post'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Соцсети' : 'Social Networks'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {socials.filter(s => s.connected).map(social => (
                        <button
                          key={social.id}
                          onClick={() => setNewSchedule(prev => ({ ...prev, networks: prev.networks.includes(social.network) ? prev.networks.filter(n => n !== social.network) : [...prev.networks, social.network] }))}
                          className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${newSchedule.networks.includes(social.network) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}
                        >
                          {social.emoji} {social.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Дни недели' : 'Days of week'}</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {allDays.map(day => (
                        <button
                          key={day}
                          onClick={() => setNewSchedule(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${newSchedule.days.includes(day) ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {dayLabels[day]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Время публикации' : 'Publishing time'}</label>
                    <input type="time" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" />
                  </div>
                  <button onClick={addSchedule} disabled={!newSchedule.content || newSchedule.networks.length === 0 || newSchedule.days.length === 0} className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50">
                    {language === 'ru' ? 'Создать расписание' : 'Create schedule'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ PAYMENT TAB ============ */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          {/* Balance */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">{language === 'ru' ? 'Баланс счёта' : 'Account balance'}</p>
                <p className="text-4xl font-bold mt-1">{formatPrice(15420)}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <CreditCard size={32} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition">
                {language === 'ru' ? 'Пополнить' : 'Top up'}
              </button>
              <button className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition">
                {language === 'ru' ? 'История' : 'History'}
              </button>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900">{language === 'ru' ? 'Способы оплаты' : 'Payment methods'}</h3>
              <button onClick={() => setShowPaymentModal(true)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition flex items-center gap-1.5">
                <Plus size={14} /> {language === 'ru' ? 'Добавить' : 'Add'}
              </button>
            </div>
            <div className="space-y-3">
              {paymentMethods.map(method => (
                <div key={method.id} className={`bg-white rounded-xl border ${method.isDefault ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100'} p-4 flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    method.type === 'yandex' ? 'bg-yellow-100' :
                    method.type === 'card' ? 'bg-purple-100' :
                    method.type === 'yoomoney' ? 'bg-green-100' :
                    'bg-blue-100'
                  }`}>
                    {method.type === 'yandex' && <span className="font-bold text-yellow-700 text-xl">Я</span>}
                    {method.type === 'card' && <CreditCard size={20} className="text-purple-600" />}
                    {method.type === 'yoomoney' && <span className="font-bold text-green-700 text-sm">ЮM</span>}
                    {method.type === 'sbp' && <span className="font-bold text-blue-700 text-sm">СБП</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{method.name}</p>
                      {method.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{language === 'ru' ? 'По умолчанию' : 'Default'}</span>
                      )}
                      {method.verified && (
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full flex items-center gap-1">
                          <Check size={10} /> {language === 'ru' ? 'Подтверждено' : 'Verified'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 font-mono mt-0.5">{method.details}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!method.isDefault && (
                      <button onClick={() => setDefaultPayment(method.id)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 text-xs font-medium">
                        {language === 'ru' ? 'По умолч.' : 'Default'}
                      </button>
                    )}
                    <button onClick={() => deletePayment(method.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-payment */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="font-bold text-slate-900 mb-3">{language === 'ru' ? 'Автоплатежи' : 'Auto-payments'}</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-500 rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Автопродление подписки' : 'Auto-renew subscription'}</p>
                  <p className="text-xs text-slate-500">{language === 'ru' ? 'Подписка будет продлеваться автоматически' : 'Subscription will renew automatically'}</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-500 rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Уведомления о списаниях' : 'Charge notifications'}</p>
                  <p className="text-xs text-slate-500">{language === 'ru' ? 'Email-уведомления о каждом списании' : 'Email notifications for each charge'}</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                <input type="checkbox" className="w-4 h-4 text-blue-500 rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Автопополнение баланса' : 'Auto top-up balance'}</p>
                  <p className="text-xs text-slate-500">{language === 'ru' ? 'При балансе ниже 1000 ₽ — автопополнение на 5000 ₽' : 'When balance below 1000 ₽ — auto top-up by 5000 ₽'}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Yandex Payment Info */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">Я</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-yellow-900">{language === 'ru' ? 'Яндекс.Оплата — безопасная оплата' : 'Yandex.Pay — secure payment'}</p>
              <p className="text-sm text-yellow-700">{language === 'ru' ? 'Все платежи защищены и проходят через платёжную систему Яндекс' : 'All payments are secured via Yandex payment system'}</p>
            </div>
          </div>

          {/* Add Payment Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Добавить способ оплаты' : 'Add payment method'}</h3>
                  <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'yandex' as const, name: 'Яндекс.Оплата', emoji: 'Я' },
                      { id: 'card' as const, name: language === 'ru' ? 'Карта' : 'Card', emoji: '💳' },
                      { id: 'yoomoney' as const, name: 'ЮMoney', emoji: 'Ю' },
                      { id: 'sbp' as const, name: 'СБП', emoji: '⚡' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setNewPaymentType(type.id)}
                        className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition ${newPaymentType === type.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}
                      >
                        <span>{type.emoji}</span> {type.name}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {newPaymentType === 'card' ? (language === 'ru' ? 'Номер карты' : 'Card number') :
                       newPaymentType === 'yandex' ? (language === 'ru' ? 'Email Яндекс.Почты' : 'Yandex email') :
                       newPaymentType === 'yoomoney' ? (language === 'ru' ? 'Номер кошелька' : 'Wallet number') :
                       (language === 'ru' ? 'Номер телефона' : 'Phone number')}
                    </label>
                    <input type="text" value={newPaymentDetails} onChange={e => setNewPaymentDetails(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg" placeholder="•••• •••• •••• ••••" />
                  </div>
                  {newPaymentType === 'card' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="MM/YY" className="p-3 border border-slate-200 rounded-lg text-sm" />
                      <input type="text" placeholder="CVV" className="p-3 border border-slate-200 rounded-lg text-sm" />
                    </div>
                  )}
                  <button onClick={addPaymentMethod} disabled={!newPaymentDetails} className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50">
                    {language === 'ru' ? 'Добавить и подтвердить' : 'Add and verify'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ PLANS TAB ============ */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* Subscription Plans */}
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">{language === 'ru' ? 'Тарифные планы' : 'Subscription plans'}</h3>
            <p className="text-sm text-slate-500 mb-4">{language === 'ru' ? 'Выберите подходящий тариф для полного функционала' : 'Choose the right plan for full features'}</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'free', name: language === 'ru' ? 'Бесплатный' : 'Free', price: 0, period: '48h', icon: Star, color: 'from-slate-400 to-slate-500', features: language === 'ru' ? ['10 постов', '2 соцсети', 'Базовая аналитика'] : ['10 posts', '2 networks', 'Basic analytics'] },
                { id: 'basic', name: t.basicPlan, price: 990, icon: Zap, color: 'from-blue-500 to-blue-600', features: language === 'ru' ? ['50 постов/мес', '3 соцсети', 'Озвучка'] : ['50 posts/mo', '3 networks', 'Voiceover'] },
                { id: 'pro', name: t.proPlan, price: 2990, icon: Crown, color: 'from-purple-500 to-purple-600', popular: true, features: language === 'ru' ? ['Безлимит', 'Все соцсети', 'Видео + SEO'] : ['Unlimited', 'All networks', 'Video + SEO'] },
                { id: 'premium', name: t.premiumPlan, price: 7990, icon: Crown, color: 'from-amber-500 to-orange-600', features: language === 'ru' ? ['Всё из Pro', 'API', 'Менеджер'] : ['All from Pro', 'API', 'Manager'] },
              ].map(plan => (
                <div key={plan.id} className={`bg-white rounded-xl border ${plan.popular ? 'border-purple-300 shadow-lg' : 'border-slate-100'} p-5 relative ${selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">{language === 'ru' ? 'Популярный' : 'Popular'}</div>
                  )}
                  <div className={`w-10 h-10 bg-gradient-to-br ${plan.color} rounded-lg flex items-center justify-center mb-3`}>
                    <plan.icon size={20} className="text-white" />
                  </div>
                  <h4 className="font-bold text-slate-900">{plan.name}</h4>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{formatPrice(plan.price)}<span className="text-sm text-slate-500 font-normal">{plan.price > 0 ? t.perMonth : ` / ${plan.period}`}</span></p>
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-center gap-1.5"><Check size={12} className="text-green-500" /> {f}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => { setSelectedPlan(plan.id); setShowPayModal(true); }}
                    className={`w-full mt-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedPlan === plan.id ? 'bg-green-50 text-green-700 cursor-default' :
                      plan.popular ? 'bg-purple-500 text-white hover:bg-purple-600' :
                      'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={selectedPlan === plan.id}
                  >
                    {selectedPlan === plan.id ? (language === 'ru' ? '✓ Текущий' : '✓ Current') : t.subscribe}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Content Blocks */}
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">{language === 'ru' ? 'Блоки контента (отдельно)' : 'Content blocks (separate)'}</h3>
            <p className="text-sm text-slate-500 mb-4">{language === 'ru' ? 'Приобретайте блоки контента отдельно для расширения возможностей' : 'Purchase content blocks separately to extend features'}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { id: 'block-articles', name: language === 'ru' ? 'Публикация статей' : 'Article publishing', price: 1500, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Генерация и публикация длинных статей с изображениями' : 'Generate and publish long articles with images', icon: '📝' },
                { id: 'block-voice', name: language === 'ru' ? 'Генерация голоса' : 'Voice generation', price: 2000, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Синтез речи для озвучки контента' : 'Speech synthesis for content voiceover', icon: '🎤' },
                { id: 'block-video', name: language === 'ru' ? 'Генерация видео' : 'Video generation', price: 3500, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Создание видеороликов из текста' : 'Create videos from text', icon: '🎬' },
                { id: 'block-music', name: language === 'ru' ? 'Генерация музыки' : 'Music generation', price: 2500, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Создание музыки и песен' : 'Create music and songs', icon: '🎵' },
                { id: 'block-images', name: language === 'ru' ? 'Генерация изображений' : 'Image generation', price: 1800, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Создание изображений по описанию' : 'Create images from description', icon: '🖼️' },
                { id: 'block-seo', name: language === 'ru' ? 'SEO-оптимизация' : 'SEO optimization', price: 1200, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Автоматическая SEO-оптимизация контента' : 'Automatic content SEO optimization', icon: '🔍' },
                { id: 'block-analytics', name: language === 'ru' ? 'Расширенная аналитика' : 'Advanced analytics', price: 2200, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Детальная аналитика и отчёты' : 'Detailed analytics and reports', icon: '📊' },
                { id: 'block-schedule', name: language === 'ru' ? 'Автопубликация' : 'Auto-publishing', price: 1000, period: language === 'ru' ? 'мес' : 'mo', desc: language === 'ru' ? 'Публикация по расписанию во все соцсети' : 'Scheduled publishing to all networks', icon: '⏰' },
              ].map(block => (
                <div key={block.id} className={`bg-white rounded-xl border ${selectedBlocks.includes(block.id) ? 'border-blue-300 bg-blue-50/30' : 'border-slate-100'} p-4 flex items-center gap-4`}>
                  <div className="text-3xl">{block.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{block.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{block.desc}</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{formatPrice(block.price)}<span className="text-xs text-slate-500 font-normal"> / {block.period}</span></p>
                  </div>
                  <button
                    onClick={() => setSelectedBlocks(prev => prev.includes(block.id) ? prev.filter(b => b !== block.id) : [...prev, block.id])}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedBlocks.includes(block.id) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {selectedBlocks.includes(block.id) ? (language === 'ru' ? '✓ Подключено' : '✓ Connected') : (language === 'ru' ? 'Подключить' : 'Connect')}
                  </button>
                </div>
              ))}
            </div>

            {selectedBlocks.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">{language === 'ru' ? `Подключено блоков: ${selectedBlocks.length}` : `Connected blocks: ${selectedBlocks.length}`}</p>
                  <p className="text-sm text-blue-700">{language === 'ru' ? 'Итого' : 'Total'}: {formatPrice(selectedBlocks.reduce((sum, id) => {
                    const block = [
                      { id: 'block-articles', price: 1500 },
                      { id: 'block-voice', price: 2000 },
                      { id: 'block-video', price: 3500 },
                      { id: 'block-music', price: 2500 },
                      { id: 'block-images', price: 1800 },
                      { id: 'block-seo', price: 1200 },
                      { id: 'block-analytics', price: 2200 },
                      { id: 'block-schedule', price: 1000 },
                    ].find(b => b.id === id);
                    return sum + (block?.price || 0);
                  }, 0))}/{language === 'ru' ? 'мес' : 'mo'}</p>
                </div>
                <button onClick={() => setShowPayModal(true)} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition">
                  {language === 'ru' ? 'Оплатить' : 'Pay'}
                </button>
              </div>
            )}
          </div>

          {/* Pay Modal */}
          {showPayModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayModal(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{language === 'ru' ? 'Оплата через Яндекс.Оплата' : 'Payment via Yandex.Pay'}</h3>
                  <p className="text-slate-600 text-sm mb-4">{language === 'ru' ? 'Подтвердите оплату выбранного тарифа/блоков' : 'Confirm payment for selected plan/blocks'}</p>
                  <div className="p-4 bg-slate-50 rounded-xl mb-4">
                    {selectedPlan !== currentUser?.subscription && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{language === 'ru' ? 'Тариф' : 'Plan'}:</span>
                        <span className="font-medium">{selectedPlan}</span>
                      </div>
                    )}
                    {selectedBlocks.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{language === 'ru' ? 'Блоки' : 'Blocks'}:</span>
                        <span className="font-medium">{selectedBlocks.length}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mb-4">
                    <button className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm font-medium hover:bg-yellow-100 transition flex items-center gap-3">
                      <span className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center text-white font-bold">Я</span>
                      {language === 'ru' ? 'Оплатить через Яндекс.Оплата' : 'Pay via Yandex.Pay'}
                    </button>
                    <button className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-100 transition flex items-center gap-3">
                      <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><CreditCard size={16} className="text-purple-600" /></span>
                      {language === 'ru' ? 'Банковской картой' : 'By bank card'}
                    </button>
                  </div>
                  <button onClick={() => setShowPayModal(false)} className="text-sm text-slate-500 hover:text-slate-700">{t.cancel}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ TELEGRAM HELP MODAL ============ */}
      {showTelegramHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTelegramHelp(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                <HelpCircle size={20} className="text-blue-500" />
                {language === 'ru' ? 'Настройка Telegram бота' : 'Telegram Bot Setup'}
              </h3>
              <button onClick={() => setShowTelegramHelp(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">

              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">1</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 mb-2">{language === 'ru' ? 'Создайте бота в Telegram' : 'Create a Telegram bot'}</h4>
                  <p className="text-sm text-slate-600 mb-3">{language === 'ru' ? 'Откройте Telegram и найдите @BotFather — официальный бот для создания ботов.' : 'Open Telegram and find @BotFather — the official bot for creating bots.'}</p>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 font-mono text-sm">
                    <p className="text-slate-500 mb-1"># {language === 'ru' ? 'Отправьте команду:' : 'Send the command:'}</p>
                    <p className="text-blue-600">/newbot</p>
                    <p className="text-slate-500 mt-2 mb-1"># {language === 'ru' ? 'Введите имя бота:' : 'Enter bot name:'}</p>
                    <p className="text-slate-700">BlogPost Bot</p>
                    <p className="text-slate-500 mt-2 mb-1"># {language === 'ru' ? 'Введите username бота:' : 'Enter bot username:'}</p>
                    <p className="text-slate-700">myblogpost_bot</p>
                  </div>
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>{language === 'ru' ? 'Результат:' : 'Result:'}</strong> {language === 'ru' ? 'BotFather пришлёт вам токен вида:' : 'BotFather will send you a token like:'}
                    </p>
                    <p className="font-mono text-sm text-amber-900 mt-1">123456789:ABCdefGHIjklMNOpqrsTUVwxyz</p>
                    <p className="text-xs text-amber-700 mt-1">{language === 'ru' ? 'Это и есть ваш API Key — вставьте его в поле "API Key" выше.' : 'This is your API Key — paste it in the "API Key" field above.'}</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">2</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 mb-2">{language === 'ru' ? 'Добавьте бота в канал/группу' : 'Add bot to channel/group'}</h4>
                  <p className="text-sm text-slate-600 mb-3">{language === 'ru' ? 'Бот должен быть администратором канала или группы, куда вы хотите публиковать.' : 'The bot must be an admin of the channel or group you want to publish to.'}</p>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">📢</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{language === 'ru' ? 'Для канала:' : 'For a channel:'}</p>
                        <p className="text-xs text-slate-600">{language === 'ru' ? 'Откройте канал → Настройки → Администраторы → Добавить администратора → найдите вашего бота' : 'Open channel → Settings → Administrators → Add administrator → find your bot'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">👥</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{language === 'ru' ? 'Для группы:' : 'For a group:'}</p>
                        <p className="text-xs text-slate-600">{language === 'ru' ? 'Откройте группу → Настройки → Администраторы → Добавить → найдите вашего бота' : 'Open group → Settings → Administrators → Add → find your bot'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">3</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 mb-2">{language === 'ru' ? 'Получите Chat ID' : 'Get Chat ID'}</h4>
                  <p className="text-sm text-slate-600 mb-3">{language === 'ru' ? 'Chat ID — это числовой идентификатор канала или группы.' : 'Chat ID is a numeric identifier for the channel or group.'}</p>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{language === 'ru' ? 'Способ 1: Через @userinfobot' : 'Method 1: Via @userinfobot'}</p>
                      <p className="text-xs text-slate-600">{language === 'ru' ? 'Перешлите любое сообщение из канала боту @userinfobot — он покажет Chat ID.' : 'Forward any message from the channel to @userinfobot — it will show the Chat ID.'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{language === 'ru' ? 'Способ 2: Через @getmyid_bot' : 'Method 2: Via @getmyid_bot'}</p>
                      <p className="text-xs text-slate-600">{language === 'ru' ? 'Напишите /start в канале после добавления бота — получите ID.' : 'Send /start in the channel after adding the bot — get the ID.'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{language === 'ru' ? 'Способ 3: username канала' : 'Method 3: Channel username'}</p>
                      <p className="text-xs text-slate-600">{language === 'ru' ? 'Если у канала есть username, просто введите его: @mychannel' : 'If the channel has a username, just enter it: @mychannel'}</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>{language === 'ru' ? 'Готово!' : 'Done!'}</strong> {language === 'ru' ? 'Вставьте Chat ID в поле "Chat ID / Канал" выше и нажмите Сохранить.' : 'Paste the Chat ID in the "Chat ID / Channel" field above and click Save.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">{language === 'ru' ? 'Полезные ссылки:' : 'Useful links:'}</p>
                <div className="space-y-2">
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                    <ExternalLink size={14} /> @BotFather — {language === 'ru' ? 'создание ботов' : 'bot creation'}
                  </a>
                  <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                    <ExternalLink size={14} /> @userinfobot — {language === 'ru' ? 'получение Chat ID' : 'get Chat ID'}
                  </a>
                  <a href="https://core.telegram.org/bots/api" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                    <ExternalLink size={14} /> Telegram Bot API — {language === 'ru' ? 'документация' : 'documentation'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
