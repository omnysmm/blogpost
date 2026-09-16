import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { User, Mail, CreditCard, Clock, Shield, Settings, Megaphone } from 'lucide-react';

export default function ProfilePage() {
  const { language, currentUser, setCurrentPage } = useStore();
  const t = translations[language];

  if (!currentUser) return null;

  const subscriptionNames: Record<string, string> = {
    free: language === 'ru' ? 'Бесплатный' : 'Free',
    basic: t.basicPlan,
    pro: t.proPlan,
    premium: t.premiumPlan,
  };

  const isFreeTrial = currentUser.subscription === 'free';
  const trialEnd = currentUser.freeTrialEnd ? new Date(currentUser.freeTrialEnd) : null;
  const hoursLeft = trialEnd ? Math.max(0, Math.floor((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60))) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t.profile}</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">{currentUser.name[0]}</span>
          </div>
          <h2 className="font-bold text-xl text-slate-900">{currentUser.name}</h2>
          <p className="text-sm text-slate-500">{currentUser.email}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentUser.role === 'admin' ? 'bg-red-50 text-red-700' :
              currentUser.role === 'advertiser' ? 'bg-amber-50 text-amber-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {currentUser.role === 'admin' ? (language === 'ru' ? 'Администратор' : 'Administrator') :
               currentUser.role === 'advertiser' ? (language === 'ru' ? 'Рекламщик' : 'Advertiser') :
               (language === 'ru' ? 'Пользователь' : 'User')}
            </span>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-blue-500" />
            <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Подписка' : 'Subscription'}</h3>
          </div>
          <p className="text-lg font-bold text-slate-900">{subscriptionNames[currentUser.subscription]}</p>
          {isFreeTrial && trialEnd && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <Clock size={14} />
                <span className="text-sm">{language === 'ru' ? `Осталось ${hoursLeft}ч` : `${hoursLeft}h left`}</span>
              </div>
            </div>
          )}
          <button onClick={() => setCurrentPage('subscriptions')} className="mt-4 w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
            {language === 'ru' ? 'Управление подпиской' : 'Manage subscription'}
          </button>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-purple-500" />
            <h3 className="font-bold text-slate-900">{language === 'ru' ? 'Аккаунт' : 'Account'}</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <User size={14} />
              <span>ID: {currentUser.id}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Mail size={14} />
              <span>{currentUser.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={14} />
              <span>{language === 'ru' ? 'Регистрация' : 'Registered'}: {new Date(currentUser.registeredAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <button onClick={() => setCurrentPage('settings')} className="bg-white rounded-xl p-5 border border-slate-100 hover:border-blue-200 hover:shadow-md transition text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Settings size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{t.settings}</p>
              <p className="text-xs text-slate-500">{language === 'ru' ? 'Соцсети, расписание, оплата, тарифы' : 'Socials, schedule, payment, plans'}</p>
            </div>
          </div>
        </button>
        <button onClick={() => setCurrentPage('advertiser-cabinet')} className="bg-white rounded-xl p-5 border border-slate-100 hover:border-blue-200 hover:shadow-md transition text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Megaphone size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{language === 'ru' ? 'Рекламный кабинет' : 'Ad Cabinet'}</p>
              <p className="text-xs text-slate-500">{language === 'ru' ? 'Кампании, таргетинг, аналитика, креативы' : 'Campaigns, targeting, analytics, creatives'}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Settings */}
      <div className="mt-6 bg-white rounded-xl p-6 border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4">{language === 'ru' ? 'Настройки профиля' : 'Profile settings'}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.name}</label>
            <input type="text" defaultValue={currentUser.name} className="w-full p-3 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
            <input type="email" defaultValue={currentUser.email} className="w-full p-3 border border-slate-200 rounded-lg" />
          </div>
        </div>
        <button className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition">
          {t.save}
        </button>
      </div>
    </div>
  );
}
