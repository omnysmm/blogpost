import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function SupportPage() {
  const { language } = useStore();
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: language === 'ru'
        ? 'Здравствуйте! 👋 Я AI-ассистент технической поддержки BlogPro. Чем могу помочь? Вы можете спросить о:\n\n• Генерации контента\n• Публикации в соцсети\n• Подписках и оплате\n• Рекламе на платформе\n• Технических проблемах'
        : 'Hello! 👋 I\'m the BlogPro AI support assistant. How can I help? You can ask about:\n\n• Content generation\n• Social media publishing\n• Subscriptions and payment\n• Advertising on the platform\n• Technical issues',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const aiResponses: Record<string, string> = {
    'генерация': language === 'ru' ? 'Для генерации контента перейдите в раздел "Генерация контента". Выберите тип (пост, статья, видео, музыка), введите тему и нажмите "Сгенерировать". Доступны модели YandexGPT, GigaChat, Kandinsky и другие — все бесплатные!' : 'To generate content, go to the "Content Generator" section. Choose a type, enter a topic, and click "Generate". Available models: YandexGPT, GigaChat, Kandinsky and more — all free!',
    'публикация': language === 'ru' ? 'Для публикации в соцсети перейдите в "Публикация в соцсети". Выберите готовый контент, отметьте нужные сети и нажмите "Опубликовать". Также доступна функция расписания для автоматической публикации в заданное время.' : 'To publish to social networks, go to "Social Publishing". Select ready content, mark networks, and click "Publish". Scheduling is also available for automatic publishing.',
    'подписка': language === 'ru' ? 'У нас 4 тарифа: Бесплатный (48 часов), Базовый (990₽/мес), Профессиональный (2990₽/мес) и Премиум (7990₽/мес). Оплата через Яндекс.Оплата. Первые 48 часов — полный функционал бесплатно!' : 'We have 4 plans: Free (48 hours), Basic (990₽/mo), Pro (2990₽/mo) and Premium (7990₽/mo). Payment via Yandex.Pay. First 48 hours — full features free!',
    'реклама': language === 'ru' ? 'Рекламные блоки: Главный баннер (50 000₽/день), Боковой (5 000₽/день), Встроенный (3 000₽/день), Нижний (10 000₽/день). Оплата за показы, клики или фиксированная. Создайте рекламный кабинет для настройки.' : 'Ad blocks: Hero banner (50,000₽/day), Sidebar (5,000₽/day), Inline (3,000₽/day), Footer (10,000₽/day). Payment per view, click or fixed. Create an advertiser account to set up.',
    'озвучка': language === 'ru' ? 'Озвучка доступна через модели Silero TTS и RuTTS-GAN. При генерации контента включите опцию "Озвучка" — аудио будет создано автоматически на русском языке.' : 'Voiceover is available via Silero TTS and RuTTS-GAN models. Enable "Audio Generation" when generating content — audio will be created automatically in Russian.',
    'видео': language === 'ru' ? 'Видеогенерация использует модель AutoML Video. Вы можете создать видеоряд к вашему контенту или загрузить свои нарезки для автоматического монтажа в заданной последовательности.' : 'Video generation uses AutoML Video model. You can create video content for your posts or upload clips for automatic editing in sequence.',
    'ошибка': language === 'ru' ? 'Если вы столкнулись с ошибкой, попробуйте:\n1. Обновить страницу (F5)\n2. Очистить кеш браузера\n3. Попробовать другой браузер\n\nЕсли проблема сохраняется, опишите её подробнее.' : 'If you encounter an error, try:\n1. Refresh the page (F5)\n2. Clear browser cache\n3. Try another browser\n\nIf the problem persists, describe it in more detail.',
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let response = language === 'ru'
        ? 'Спасибо за ваш вопрос! Я обработал вашу заявку. Если вам нужна дополнительная помощь, не стесняйтесь спрашивать. Я могу помочь с генерацией контента, публикацией, подписками, рекламой и техническими вопросами.'
        : 'Thanks for your question! I\'ve processed your request. If you need more help, feel free to ask. I can help with content generation, publishing, subscriptions, advertising, and technical issues.';

      const lowerInput = input.toLowerCase();
      for (const [key, value] of Object.entries(aiResponses)) {
        if (lowerInput.includes(key)) {
          response = value;
          break;
        }
      }

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.support}</h1>
        <p className="text-slate-600">{language === 'ru' ? 'AI-ассистент работает 24/7' : 'AI assistant works 24/7'}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <p className="font-medium">{language === 'ru' ? 'AI Поддержка BlogPro' : 'BlogPro AI Support'}</p>
            <p className="text-xs text-blue-100 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              {language === 'ru' ? 'Онлайн' : 'Online'}
            </p>
          </div>
          <Sparkles size={18} className="ml-auto" />
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'ai' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                {msg.role === 'ai' ? <Bot size={16} className="text-blue-600" /> : <User size={16} className="text-purple-600" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                msg.role === 'ai' ? 'bg-slate-50 text-slate-700' : 'bg-blue-500 text-white'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                <p className={`text-xs mt-1 ${msg.role === 'ai' ? 'text-slate-400' : 'text-blue-200'}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-blue-600" />
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={language === 'ru' ? 'Введите ваш вопрос...' : 'Type your question...'}
              className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button onClick={handleSend} className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
