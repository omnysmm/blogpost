import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import {
  Send, Bot, User, Sparkles, Mail, Calendar, Clock, Bell,
  Check, Settings, FileText, BarChart3, AlertCircle, HelpCircle,
  Zap, MessageSquare, ChevronRight, Plus, Trash2, ToggleLeft, ToggleRight,
  Lightbulb, TrendingUp, Shield, Paperclip
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

type SupportTab = 'chat' | 'tickets' | 'reports';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastReply?: string;
}

interface ReportConfig {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  email: string;
  enabled: boolean;
  includeTickets: boolean;
  includeAnalytics: boolean;
  includeContent: boolean;
  includeBilling: boolean;
  lastSent?: string;
  nextSend?: string;
}

export default function SupportPage() {
  const { language, currentUser } = useStore();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<SupportTab>('chat');

  // ===== CHAT STATE =====
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: language === 'ru'
        ? 'Здравствуйте! 👋 Я AI-ассистент технической поддержки BlogPost. Чем могу помочь?\n\n🤖 Я работаю на базе современных нейросетей и готов ответить на любые вопросы 24/7.\n\n💡 Быстрые темы:\n• Генерация контента\n• Публикация в соцсети\n• Подписки и оплата\n• Реклама на платформе\n• Технические проблемы\n• Отчёты и аналитика'
        : 'Hello! 👋 I\'m the BlogPost AI support assistant. How can I help?\n\n🤖 I work on modern neural networks and ready to answer any questions 24/7.\n\n💡 Quick topics:\n• Content generation\n• Social media publishing\n• Subscriptions and payment\n• Advertising on the platform\n• Technical issues\n• Reports and analytics',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<string[]>([]);

  // ===== TICKETS STATE =====
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: '1', subject: language === 'ru' ? 'Не работает публикация в VK' : 'VK publishing not working', status: 'in-progress', priority: 'high', createdAt: '2024-03-15', lastReply: '2024-03-16' },
    { id: '2', subject: language === 'ru' ? 'Вопрос по тарифу Pro' : 'Question about Pro plan', status: 'resolved', priority: 'medium', createdAt: '2024-03-10', lastReply: '2024-03-11' },
    { id: '3', subject: language === 'ru' ? 'Как настроить расписание' : 'How to set up schedule', status: 'closed', priority: 'low', createdAt: '2024-03-05' },
  ]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'medium' as 'low' | 'medium' | 'high' });

  // ===== REPORTS STATE =====
  const [reports, setReports] = useState<ReportConfig[]>([
    {
      id: '1',
      type: 'daily',
      email: currentUser?.email || 'user@example.com',
      enabled: true,
      includeTickets: true,
      includeAnalytics: true,
      includeContent: false,
      includeBilling: false,
      lastSent: '2024-03-17 09:00',
      nextSend: '2024-03-18 09:00',
    },
    {
      id: '2',
      type: 'monthly',
      email: currentUser?.email || 'user@example.com',
      enabled: true,
      includeTickets: true,
      includeAnalytics: true,
      includeContent: true,
      includeBilling: true,
      lastSent: '2024-02-28 10:00',
      nextSend: '2024-03-31 10:00',
    },
  ]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReport, setNewReport] = useState<Omit<ReportConfig, 'id'>>({
    type: 'daily',
    email: currentUser?.email || '',
    enabled: true,
    includeTickets: true,
    includeAnalytics: true,
    includeContent: true,
    includeBilling: false,
  });

  // ===== AI RESPONSES =====
  const aiResponses: Record<string, string> = {
    'генерация': language === 'ru' ? '🎨 Для генерации контента перейдите в раздел "Генерация контента".\n\n📝 Шаги:\n1. Выберите тип (пост, статья, видео, музыка)\n2. Введите тему\n3. Выберите AI-модель (или автоматический режим)\n4. Нажмите "Сгенерировать"\n\n✨ Доступные бесплатные модели: YandexGPT, GigaChat, Kandinsky, Silero TTS, RuTTS-GAN и другие.\n\n💡 Совет: включите SEO и GEO для лучшей видимости в соцсетях!' : '🎨 To generate content, go to the "Content Generator" section.\n\n📝 Steps:\n1. Choose type (post, article, video, music)\n2. Enter topic\n3. Select AI model (or auto mode)\n4. Click "Generate"\n\n✨ Free models: YandexGPT, GigaChat, Kandinsky, Silero TTS, RuTTS-GAN and more.\n\n💡 Tip: enable SEO and GEO for better visibility!',
    'публикация': language === 'ru' ? '📤 Публикация в соцсети:\n\n1. Перейдите в "Публикация в соцсети"\n2. Выберите готовый контент\n3. Отметьте нужные сети (VK, Telegram, YouTube, Instagram, TikTok, OK, Rutube)\n4. Нажмите "Опубликовать сейчас" или настройте расписание\n\n⏰ Расписание: можно настроить автоматическую публикацию по дням и времени в разделе "Настройки → Расписание".\n\n🔗 Для автопубликации подключите соцсети через API в настройках.' : '📤 Social publishing:\n\n1. Go to "Social Publishing"\n2. Select ready content\n3. Mark networks (VK, Telegram, YouTube, Instagram, TikTok, OK, Rutube)\n4. Click "Publish now" or set schedule\n\n⏰ Schedule: set up auto-publishing by days and time in "Settings → Schedule".\n\n🔗 For auto-publishing connect social networks via API in settings.',
    'подписк': language === 'ru' ? '💳 Тарифы BlogPost:\n\n⭐ Бесплатный — 48 часов полного доступа\n⚡ Базовый — 990 ₽/мес (50 постов, 3 соцсети)\n👑 Профессиональный — 2990 ₽/мес (безлимит, все соцсети, видео)\n🏆 Премиум — 7990 ₽/мес (всё + API, менеджер, музыка)\n\n💰 Оплата через Яндекс.Оплата: карты, ЮMoney, СБП.\n\n🎁 Первые 48 часов после регистрации — бесплатно!' : '💳 BlogPost plans:\n\n⭐ Free — 48 hours full access\n⚡ Basic — 990 RUB/mo (50 posts, 3 networks)\n👑 Pro — 2990 RUB/mo (unlimited, all networks, video)\n🏆 Premium — 7990 RUB/mo (all + API, manager, music)\n\n💰 Payment via Yandex.Pay: cards, YooMoney, SBP.\n\n🎁 First 48 hours after registration — free!',
    'реклам': language === 'ru' ? '📢 Рекламный кабинет:\n\n🌐 На площадке: Hero (50 000₽/день), Sidebar (5 000₽), Inline (3 000₽), Footer (10 000₽)\n🎬 В видео: Pre-roll, Mid-roll, Post-roll, Overlay\n\n💸 Модели оплаты: CPM (за показы), CPC (за клики), CPD (за день), CPH (за час)\n\n🔧 Создать кампанию можно в "Рекламный кабинет" → "Создать".\n\n✅ Автомодерация рекламы — соответствие законодательству РФ.' : '📢 Ad Cabinet:\n\n🌐 On site: Hero (50,000₽/day), Sidebar (5,000₽), Inline (3,000₽), Footer (10,000₽)\n🎬 In video: Pre-roll, Mid-roll, Post-roll, Overlay\n\n💸 Payment models: CPM, CPC, CPD, CPH\n\n🔧 Create campaign in "Ad Cabinet" → "Create".\n\n✅ Auto moderation — compliance with Russian law.',
    'отчёт': language === 'ru' ? '📊 Настройка отчётов:\n\nПерейдите в "Поддержка" → вкладка "Отчёты".\n\n📧 Доступные типы:\n• Ежедневные — каждый день в 9:00\n• Еженедельные — по понедельникам\n• Ежемесячные — 1-го числа месяца\n\n📋 Что включить:\n✓ Обращения в поддержку\n✓ Аналитика публикаций\n✓ Статистика контента\n✓ Биллинг и платежи\n\n💡 Совет: ежедневные отчёты помогут оперативно отслеживать активность, а ежемесячные — анализировать тренды.' : '📊 Reports setup:\n\nGo to "Support" → "Reports" tab.\n\n📧 Available types:\n• Daily — every day at 9:00\n• Weekly — on Mondays\n• Monthly — on the 1st\n\n📋 What to include:\n✓ Support tickets\n✓ Publishing analytics\n✓ Content statistics\n✓ Billing and payments\n\n💡 Tip: daily reports help track activity, monthly — analyze trends.',
    'ошибк': language === 'ru' ? '🔧 Решение технических проблем:\n\n1️⃣ Обновите страницу (F5 или Ctrl+R)\n2️⃣ Очистите кеш браузера\n3️⃣ Попробуйте другой браузер (Chrome, Firefox, Safari)\n4️⃣ Проверьте интернет-соединение\n5️⃣ Отключите расширения браузера (AdBlock и т.д.)\n\n❓ Если проблема сохраняется:\n• Создайте тикет в разделе "Обращения"\n• Приложите скриншот ошибки\n• Укажите браузер и его версию\n\n📞 Или напишите мне — я постараюсь помочь!' : '🔧 Troubleshooting:\n\n1️⃣ Refresh the page (F5 or Ctrl+R)\n2️⃣ Clear browser cache\n3️⃣ Try another browser\n4️⃣ Check internet connection\n5️⃣ Disable browser extensions\n\n❓ If problem persists:\n• Create a ticket in "Tickets" section\n• Attach error screenshot\n• Specify browser and version\n\n📞 Or write to me — I\'ll try to help!',
    'api': language === 'ru' ? '🔌 Подключение через API:\n\n1. Откройте "Настройки" → "Соцсети"\n2. Выберите нужную сеть\n3. Нажмите "API"\n4. Введите API-ключ\n\n📝 Где получить ключи:\n• VK — vk.com/dev (создайте приложение)\n• Telegram — @BotFather (создайте бота)\n• YouTube — Google Cloud Console\n• Instagram — Facebook Developers\n• TikTok — TikTok for Developers\n• OK — api.ok.ru\n• Rutube — rutube.ru/auth (OAuth-токен)\n\n💡 После подключения включите "Автоматическая публикация" для работы расписания.' : '🔌 API connection:\n\n1. Open "Settings" → "Social Networks"\n2. Select network\n3. Click "API"\n4. Enter API key\n\n📝 Where to get keys:\n• VK — vk.com/dev\n• Telegram — @BotFather\n• YouTube — Google Cloud Console\n• Instagram — Facebook Developers\n• TikTok — TikTok for Developers\n• OK — api.ok.ru\n• Rutube — rutube.ru/auth (OAuth token)\n\n💡 After connection enable "Auto publishing" for schedule to work.',
  };

  const quickTopics = language === 'ru'
    ? ['Генерация контента', 'Публикация', 'Тарифы', 'Реклама', 'Отчёты', 'Ошибки', 'API']
    : ['Content generation', 'Publishing', 'Plans', 'Advertising', 'Reports', 'Errors', 'API'];

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: chatAttachments.length > 0 ? chatAttachments : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatAttachments([]);
    setIsTyping(true);

    setTimeout(() => {
      let response = language === 'ru'
        ? '✅ Спасибо за ваш вопрос! Я обработал информацию.\n\n🤖 Я AI-ассистент, работающий на современных нейросетях. Если мой ответ не помог, вы можете:\n\n📋 Создать тикет — раздел "Обращения"\n📧 Настроить отчёты — раздел "Отчёты"\n👨‍💻 Связаться с оператором — напишите "оператор"\n\n💡 Чем ещё могу помочь?'
        : '✅ Thanks for your question! I\'ve processed the information.\n\n🤖 I\'m an AI assistant working on modern neural networks. If my answer didn\'t help, you can:\n\n📋 Create a ticket — "Tickets" section\n📧 Set up reports — "Reports" section\n👨‍💻 Contact operator — type "operator"\n\n💡 How else can I help?';

      const lowerInput = input.toLowerCase();
      for (const [key, value] of Object.entries(aiResponses)) {
        if (lowerInput.includes(key)) {
          response = value;
          break;
        }
      }

      if (lowerInput.includes('оператор') || lowerInput.includes('operator')) {
        response = language === 'ru'
          ? '👨‍💻 Передаю ваш запрос оператору.\n\n⏰ Среднее время ответа: 15 минут в рабочее время (Пн-Пт 9:00-20:00 МСК).\n\n📧 Также вы можете написать на support@blogpost.ru\n📞 Или создать тикет для отслеживания статуса.\n\n🤖 А пока я могу помочь с базовыми вопросами!'
          : '👨‍💻 Forwarding your request to operator.\n\n⏰ Average response time: 15 minutes during business hours.\n\n📧 You can also write to support@blogpost.ru\n📞 Or create a ticket to track status.\n\n🤖 Meanwhile I can help with basic questions!';
      }

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickTopic = (topic: string) => {
    setInput(topic);
    setTimeout(() => {
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: topic, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);
      setTimeout(() => {
        let response = '';
        const lowerTopic = topic.toLowerCase();
        for (const [key, value] of Object.entries(aiResponses)) {
          if (lowerTopic.includes(key)) { response = value; break; }
        }
        if (!response) response = language === 'ru' ? 'Обрабатываю ваш запрос...' : 'Processing your request...';
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: response, timestamp: new Date() }]);
        setIsTyping(false);
      }, 1200);
    }, 100);
  };

  const handleCreateTicket = () => {
    if (!newTicket.subject || !newTicket.message) return;
    const ticket: Ticket = {
      id: Date.now().toString(),
      subject: newTicket.subject,
      status: 'open',
      priority: newTicket.priority,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTickets(prev => [ticket, ...prev]);
    setShowNewTicket(false);
    setNewTicket({ subject: '', message: '', priority: 'medium' });
    // Auto AI response
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'system',
      content: language === 'ru' ? `📋 Создан тикет #${ticket.id}: "${newTicket.subject}". AI-ассистент уже анализирует ваш вопрос.` : `📋 Ticket #${ticket.id} created: "${newTicket.subject}". AI assistant is already analyzing your question.`,
      timestamp: new Date(),
    }]);
  };

  const handleCreateReport = () => {
    if (!newReport.email) return;
    const report: ReportConfig = { id: Date.now().toString(), ...newReport };
    setReports(prev => [...prev, report]);
    setShowReportModal(false);
    setNewReport({ type: 'daily', email: currentUser?.email || '', enabled: true, includeTickets: true, includeAnalytics: true, includeContent: true, includeBilling: false });
  };

  const toggleReport = (id: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const tabs = [
    { id: 'chat' as SupportTab, icon: MessageSquare, label: language === 'ru' ? 'AI-чат' : 'AI Chat', badge: null },
    { id: 'tickets' as SupportTab, icon: FileText, label: language === 'ru' ? 'Обращения' : 'Tickets', badge: tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length },
    { id: 'reports' as SupportTab, icon: Mail, label: language === 'ru' ? 'Отчёты' : 'Reports', badge: reports.filter(r => r.enabled).length },
  ];

  const reportTypeLabels: Record<string, string> = {
    daily: language === 'ru' ? 'Ежедневный' : 'Daily',
    weekly: language === 'ru' ? 'Еженедельный' : 'Weekly',
    monthly: language === 'ru' ? 'Ежемесячный' : 'Monthly',
  };

  const reportTypeIcons: Record<string, any> = {
    daily: Clock,
    weekly: Calendar,
    monthly: BarChart3,
  };

  const reportTypeColors: Record<string, string> = {
    daily: 'from-blue-500 to-cyan-500',
    weekly: 'from-purple-500 to-pink-500',
    monthly: 'from-amber-500 to-orange-500',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
          <Sparkles size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.support}</h1>
          <p className="text-slate-600">{language === 'ru' ? 'AI-поддержка 24/7 • Обращения • Отчёты' : 'AI support 24/7 • Tickets • Reports'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 border border-slate-100 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.badge !== null && tab.badge > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============ CHAT TAB ============ */}
      {activeTab === 'chat' && (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Quick Topics Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                {language === 'ru' ? 'Быстрые темы' : 'Quick topics'}
              </h3>
              <div className="space-y-1.5">
                {quickTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickTopic(topic)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition flex items-center gap-2"
                  >
                    <ChevronRight size={12} className="text-slate-400" />
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={18} className="text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-sm">{language === 'ru' ? 'AI-технологии' : 'AI Technologies'}</h3>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {language === 'ru'
                  ? 'Ассистент работает на базе YandexGPT, GigaChat и других нейросетей. Понимает контекст, обучается на ваших обращениях.'
                  : 'Assistant works on YandexGPT, GigaChat and other neural networks. Understands context, learns from your requests.'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-2 text-sm">{language === 'ru' ? 'Статистика' : 'Statistics'}</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'ru' ? 'Время ответа' : 'Response time'}</span>
                  <span className="font-medium text-slate-900">~2 сек</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'ru' ? 'Решено вопросов' : 'Resolved'}</span>
                  <span className="font-medium text-green-600">94%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'ru' ? 'Доступность' : 'Availability'}</span>
                  <span className="font-medium text-slate-900">24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Main */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative">
                  <Bot size={20} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-emerald-500"></span>
                </div>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2">
                    {language === 'ru' ? 'AI Поддержка BlogPost' : 'BlogPost AI Support'}
                    <Sparkles size={14} />
                  </p>
                  <p className="text-xs text-emerald-100">{language === 'ru' ? 'Онлайн • Отвечает мгновенно' : 'Online • Instant replies'}</p>
                </div>
                <button onClick={() => setActiveTab('reports')} className="px-3 py-1.5 bg-white/20 rounded-lg text-xs font-medium hover:bg-white/30 transition flex items-center gap-1">
                  <Mail size={12} /> {language === 'ru' ? 'Отчёты' : 'Reports'}
                </button>
              </div>

              {/* Messages */}
              <div className="h-[450px] overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'ai' ? 'bg-gradient-to-br from-emerald-100 to-teal-100' :
                      msg.role === 'system' ? 'bg-amber-100' :
                      'bg-gradient-to-br from-blue-100 to-purple-100'
                    }`}>
                      {msg.role === 'ai' ? <Bot size={16} className="text-emerald-600" /> :
                       msg.role === 'system' ? <Bell size={16} className="text-amber-600" /> :
                       <User size={16} className="text-blue-600" />}
                    </div>
                    <div className={`max-w-[80%] ${
                      msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' :
                      msg.role === 'system' ? 'bg-amber-50 border border-amber-200 text-amber-900' :
                      'bg-white border border-slate-200 text-slate-700'
                    } rounded-2xl px-4 py-3 shadow-sm`}>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</pre>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {msg.attachments.map((a, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-white/20 rounded flex items-center gap-1">
                              <Paperclip size={10} /> {a}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-blue-100' : msg.role === 'system' ? 'text-amber-600' : 'text-slate-400'}`}>
                        {msg.timestamp.toLocaleTimeString()}
                        {msg.role === 'ai' && <span className="ml-2">• AI</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                      <Bot size={16} className="text-emerald-600" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-100 bg-white">
                {chatAttachments.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {chatAttachments.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-slate-100 rounded flex items-center gap-1">
                        <Paperclip size={10} /> {a}
                        <button onClick={() => setChatAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                          <span className="text-slate-400 hover:text-red-500">×</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="p-3 hover:bg-slate-100 rounded-xl text-slate-500 transition" title={language === 'ru' ? 'Прикрепить файл' : 'Attach file'}>
                    <Paperclip size={18} />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={language === 'ru' ? 'Введите ваш вопрос...' : 'Type your question...'}
                    className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                  />
                  <button onClick={handleSend} disabled={!input.trim()} className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ TICKETS TAB ============ */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900">{language === 'ru' ? 'Мои обращения' : 'My Tickets'}</h3>
              <p className="text-sm text-slate-500">{language === 'ru' ? 'AI обрабатывает обращения автоматически, сложные вопросы передаются операторам' : 'AI processes tickets automatically, complex issues are forwarded to operators'}</p>
            </div>
            <button onClick={() => setShowNewTicket(true)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition flex items-center gap-2">
              <Plus size={16} /> {language === 'ru' ? 'Новое обращение' : 'New ticket'}
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">{language === 'ru' ? 'Нет обращений' : 'No tickets'}</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    ticket.priority === 'high' ? 'bg-red-50' :
                    ticket.priority === 'medium' ? 'bg-amber-50' : 'bg-slate-50'
                  }`}>
                    <AlertCircle size={18} className={
                      ticket.priority === 'high' ? 'text-red-600' :
                      ticket.priority === 'medium' ? 'text-amber-600' : 'text-slate-500'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900 truncate">{ticket.subject}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ticket.status === 'open' ? 'bg-blue-50 text-blue-700' :
                        ticket.status === 'in-progress' ? 'bg-amber-50 text-amber-700' :
                        ticket.status === 'resolved' ? 'bg-green-50 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {ticket.status === 'open' ? (language === 'ru' ? 'Открыт' : 'Open') :
                         ticket.status === 'in-progress' ? (language === 'ru' ? 'В работе' : 'In progress') :
                         ticket.status === 'resolved' ? (language === 'ru' ? 'Решён' : 'Resolved') :
                         (language === 'ru' ? 'Закрыт' : 'Closed')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>#{ticket.id}</span>
                      <span>•</span>
                      <span>{language === 'ru' ? 'Создан' : 'Created'}: {ticket.createdAt}</span>
                      {ticket.lastReply && (
                        <>
                          <span>•</span>
                          <span>{language === 'ru' ? 'Ответ' : 'Reply'}: {ticket.lastReply}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* New Ticket Modal */}
          {showNewTicket && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewTicket(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Новое обращение' : 'New ticket'}</h3>
                  <button onClick={() => setShowNewTicket(false)} className="p-2 hover:bg-slate-100 rounded-lg">×</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Тема' : 'Subject'}</label>
                    <input type="text" value={newTicket.subject} onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Приоритет' : 'Priority'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map(p => (
                        <button key={p} onClick={() => setNewTicket({ ...newTicket, priority: p })} className={`p-2 rounded-lg border text-sm ${newTicket.priority === p ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}>
                          {p === 'low' ? (language === 'ru' ? 'Низкий' : 'Low') : p === 'medium' ? (language === 'ru' ? 'Средний' : 'Medium') : (language === 'ru' ? 'Высокий' : 'High')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Описание' : 'Description'}</label>
                    <textarea value={newTicket.message} onChange={e => setNewTicket({ ...newTicket, message: e.target.value })} rows={4} className="w-full p-3 border border-slate-200 rounded-lg" />
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-2">
                    <Bot size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-800">{language === 'ru' ? 'AI-ассистент проанализирует ваше обращение и предложит решение в течение нескольких секунд.' : 'AI assistant will analyze your ticket and suggest a solution within seconds.'}</p>
                  </div>
                  <button onClick={handleCreateTicket} disabled={!newTicket.subject || !newTicket.message} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition disabled:opacity-50">
                    {language === 'ru' ? 'Создать обращение' : 'Create ticket'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ REPORTS TAB ============ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900">{language === 'ru' ? 'Настройка отчётов на почту' : 'Email reports setup'}</h3>
              <p className="text-sm text-slate-500">{language === 'ru' ? 'Получайте ежедневные и ежемесячные отчёты по обращениям и активности' : 'Get daily and monthly reports on tickets and activity'}</p>
            </div>
            <button onClick={() => setShowReportModal(true)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition flex items-center gap-2">
              <Plus size={16} /> {language === 'ru' ? 'Новый отчёт' : 'New report'}
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                <Mail size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900">{language === 'ru' ? 'AI-отчёты' : 'AI Reports'}</h4>
                <p className="text-sm text-emerald-800 mt-1">
                  {language === 'ru'
                    ? 'Отчёты формируются автоматически на основе ваших данных. AI анализирует обращения, выявляет тренды и даёт рекомендации по улучшению.'
                    : 'Reports are generated automatically based on your data. AI analyzes tickets, identifies trends and gives improvement recommendations.'}
                </p>
              </div>
            </div>
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <Mail size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">{language === 'ru' ? 'Нет настроенных отчётов' : 'No configured reports'}</p>
              <button onClick={() => setShowReportModal(true)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition">
                {language === 'ru' ? 'Создать первый отчёт' : 'Create first report'}
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {reports.map(report => {
                const Icon = reportTypeIcons[report.type];
                const color = reportTypeColors[report.type];
                return (
                  <div key={report.id} className={`bg-white rounded-xl border ${report.enabled ? 'border-slate-100' : 'border-slate-100 opacity-60'} overflow-hidden`}>
                    <div className={`h-1.5 bg-gradient-to-r ${color}`}></div>
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center shrink-0`}>
                          <Icon size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{reportTypeLabels[report.type]}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${report.enabled ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {report.enabled ? (language === 'ru' ? 'Активен' : 'Active') : (language === 'ru' ? 'Выключен' : 'Off')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Mail size={10} /> {report.email}
                          </p>
                        </div>
                        <button onClick={() => toggleReport(report.id)} className="p-1">
                          {report.enabled ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-400" />}
                        </button>
                      </div>

                      <div className="space-y-1.5 mb-3">
                        <p className="text-xs text-slate-500">{language === 'ru' ? 'Включает:' : 'Includes:'}</p>
                        <div className="flex flex-wrap gap-1">
                          {report.includeTickets && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{language === 'ru' ? 'Обращения' : 'Tickets'}</span>}
                          {report.includeAnalytics && <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">{language === 'ru' ? 'Аналитика' : 'Analytics'}</span>}
                          {report.includeContent && <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">{language === 'ru' ? 'Контент' : 'Content'}</span>}
                          {report.includeBilling && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{language === 'ru' ? 'Биллинг' : 'Billing'}</span>}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div>
                          {report.lastSent && <p>{language === 'ru' ? 'Отправлен' : 'Sent'}: {report.lastSent}</p>}
                          {report.nextSend && <p>{language === 'ru' ? 'Следующий' : 'Next'}: {report.nextSend}</p>}
                        </div>
                        <button onClick={() => deleteReport(report.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-slate-900">{language === 'ru' ? 'Новый отчёт' : 'New report'}</h3>
                  <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">×</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Периодичность' : 'Frequency'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['daily', 'weekly', 'monthly'] as const).map(type => {
                        const Icon = reportTypeIcons[type];
                        return (
                          <button
                            key={type}
                            onClick={() => setNewReport({ ...newReport, type })}
                            className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition ${newReport.type === type ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}
                          >
                            <Icon size={18} />
                            {reportTypeLabels[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{language === 'ru' ? 'Email для отчётов' : 'Email for reports'}</label>
                    <input type="email" value={newReport.email} onChange={e => setNewReport({ ...newReport, email: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg" placeholder="your@email.com" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'ru' ? 'Включить в отчёт' : 'Include in report'}</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                        <input type="checkbox" checked={newReport.includeTickets} onChange={e => setNewReport({ ...newReport, includeTickets: e.target.checked })} className="w-4 h-4 text-emerald-500 rounded" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Обращения в поддержку' : 'Support tickets'}</p>
                          <p className="text-xs text-slate-500">{language === 'ru' ? 'Статус, количество, темы обращений' : 'Status, count, ticket topics'}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                        <input type="checkbox" checked={newReport.includeAnalytics} onChange={e => setNewReport({ ...newReport, includeAnalytics: e.target.checked })} className="w-4 h-4 text-emerald-500 rounded" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Аналитика публикаций' : 'Publishing analytics'}</p>
                          <p className="text-xs text-slate-500">{language === 'ru' ? 'Просмотры, лайки, репосты по соцсетям' : 'Views, likes, shares by network'}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                        <input type="checkbox" checked={newReport.includeContent} onChange={e => setNewReport({ ...newReport, includeContent: e.target.checked })} className="w-4 h-4 text-emerald-500 rounded" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Статистика контента' : 'Content statistics'}</p>
                          <p className="text-xs text-slate-500">{language === 'ru' ? 'Созданные посты, статьи, видео' : 'Created posts, articles, videos'}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg">
                        <input type="checkbox" checked={newReport.includeBilling} onChange={e => setNewReport({ ...newReport, includeBilling: e.target.checked })} className="w-4 h-4 text-emerald-500 rounded" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{language === 'ru' ? 'Биллинг и платежи' : 'Billing and payments'}</p>
                          <p className="text-xs text-slate-500">{language === 'ru' ? 'Траты, подписки, рекламные расходы' : 'Spending, subscriptions, ad expenses'}</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
                    <Sparkles size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800">
                      {language === 'ru'
                        ? 'AI проанализирует данные и добавит рекомендации по улучшению показателей в каждый отчёт.'
                        : 'AI will analyze data and add improvement recommendations to each report.'}
                    </p>
                  </div>

                  <button onClick={handleCreateReport} disabled={!newReport.email} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition disabled:opacity-50">
                    {language === 'ru' ? 'Создать отчёт' : 'Create report'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
