import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const { language, login, register, setCurrentPage } = useStore();
  const t = translations[language];
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      const success = login(email, password);
      if (success) {
        setCurrentPage('dashboard');
      } else {
        setError(language === 'ru' ? 'Неверный email или пароль' : 'Invalid email or password');
      }
    } else {
      if (!name || !email || !password) {
        setError(language === 'ru' ? 'Заполните все поля' : 'Fill in all fields');
        return;
      }
      const success = register(name, email, password);
      if (success) {
        setCurrentPage('dashboard');
      } else {
        setError(language === 'ru' ? 'Пользователь с таким email уже существует' : 'User with this email already exists');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">B</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isLogin ? (language === 'ru' ? 'Вход в BlogPro' : 'Login to BlogPro') : (language === 'ru' ? 'Регистрация в BlogPro' : 'Register in BlogPro')}
            </h1>
            {!isLogin && (
              <p className="text-sm text-green-600 mt-2 font-medium">
                🎉 {language === 'ru' ? '48 часов бесплатного полноценного функционала!' : '48 hours of full free access!'}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.name}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.email}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.password}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              {isLogin ? t.login : t.register}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-blue-600 text-sm hover:underline">
              {isLogin ? t.noAccount + ' ' + t.register : t.hasAccount + ' ' + t.login}
            </button>
          </div>

          <div className="mt-6 p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500">
              {language === 'ru' ? 'Админ: логин admin, пароль admin' : 'Admin: login admin, password admin'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
