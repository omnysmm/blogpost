import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Home, LayoutDashboard, Wand2, BarChart3, Share2, CreditCard, Megaphone, HeadphonesIcon, Shield, User, Menu, X, Globe, DollarSign } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { language, currency, currentUser, currentPage, setCurrentPage, setLanguage, setCurrency, logout, toggleSidebar, isSidebarOpen } = useStore();
  const t = translations[language];
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showCurrMenu, setShowCurrMenu] = useState(false);

  const navItems = [
    { id: 'home', icon: Home, label: t.home },
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'content-generator', icon: Wand2, label: t.contentGenerator },
    { id: 'analytics', icon: BarChart3, label: t.analytics },
    { id: 'social-publish', icon: Share2, label: t.socialPublish },
    { id: 'subscriptions', icon: CreditCard, label: t.subscriptions },
    { id: 'advertising', icon: Megaphone, label: t.advertising },
    { id: 'support', icon: HeadphonesIcon, label: t.support },
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({ id: 'admin', icon: Shield, label: t.admin });
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">BlogPro</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.slice(0, 6).map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setShowLangMenu(!showLangMenu); setShowCurrMenu(false); }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-sm">
                <Globe size={16} />
                <span>{language === 'ru' ? 'RU' : 'EN'}</span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border p-1 min-w-[100px]">
                  <button onClick={() => { setLanguage('ru'); setShowLangMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-sm">Русский</button>
                  <button onClick={() => { setLanguage('en'); setShowLangMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-sm">English</button>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setShowCurrMenu(!showCurrMenu); setShowLangMenu(false); }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-sm">
                <DollarSign size={16} />
                <span>{currency}</span>
              </button>
              {showCurrMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border p-1 min-w-[100px]">
                  <button onClick={() => { setCurrency('RUB'); setShowCurrMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-sm">₽ Рубли</button>
                  <button onClick={() => { setCurrency('USD'); setShowCurrMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-sm">$ Доллары</button>
                  <button onClick={() => { setCurrency('CNY'); setShowCurrMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 text-sm">¥ Юани</button>
                </div>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage('profile')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{currentUser.name[0]}</span>
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{currentUser.name}</span>
                </button>
                <button onClick={logout} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">{t.logout}</button>
              </div>
            ) : (
              <button onClick={() => setCurrentPage('auth')} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                {t.login}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={toggleSidebar} />
          <div className="absolute left-0 top-16 bottom-0 w-64 bg-white shadow-xl p-4 overflow-y-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); toggleSidebar(); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  currentPage === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
