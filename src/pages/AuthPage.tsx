import { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function AuthPage() {
  const { language, login, register, setCurrentPage } = useStore();
  const t = translations[language];
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    setError('');
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setError(language === 'ru' ? 'Ошибка отправки. Проверьте email.' : 'Send error. Check email.');
      } else {
        setResetSent(true);
      }
    } else {
      setResetSent(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      try {
        const success = await login(email, password);
        if (success) {
          setCurrentPage('dashboard');
        } else {
          setError(language === 'ru' ? 'Неверный email или пароль' : 'Invalid email or password');
        }
      } catch {
        setError(language === 'ru' ? 'Ошибка входа. Попробуйте позже.' : 'Login error. Try again later.');
      }
    } else {
      if (!name || !email || !password) {
        setError(language === 'ru' ? 'Заполните все поля' : 'Fill in all fields');
        return;
      }
      if (!consent) {
        setError(language === 'ru' ? 'Необходимо дать согласие на обработку персональных данных' : 'You must consent to personal data processing');
        return;
      }
      try {
        const success = await register(name, email, password);
        if (success) {
          setCurrentPage('dashboard');
        } else {
          setError(language === 'ru' ? 'Пользователь с таким email уже существует' : 'User with this email already exists');
        }
      } catch {
        setError(language === 'ru' ? 'Ошибка регистрации. Попробуйте позже.' : 'Registration error. Try again later.');
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
              {isLogin ? (language === 'ru' ? 'Вход в BlogPost' : 'Login to BlogPost') : (language === 'ru' ? 'Регистрация в BlogPost' : 'Register in BlogPost')}
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
            {!isLogin && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  {language === 'ru'
                    ? <>Регистрируясь, я даю согласие на обработку персональных данных в соответствии с <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Политикой конфиденциальности</a> и принимаю <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Пользовательское соглашение</a></>
                    : <>By registering, I consent to personal data processing in accordance with the <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Privacy Policy</a> and accept the <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Terms of Use</a></>}
                </span>
              </label>
            )}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              {isLogin ? t.login : t.register}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {isLogin && !showReset && (
              <button onClick={() => setShowReset(true)} className="block w-full text-sm text-slate-500 hover:text-blue-600 transition-colors">
                {language === 'ru' ? 'Забыли пароль?' : 'Forgot password?'}
              </button>
            )}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); setShowReset(false); }} className="text-blue-600 text-sm hover:underline">
              {isLogin ? t.noAccount + ' ' + t.register : t.hasAccount + ' ' + t.login}
            </button>
          </div>

          {/* Reset Password Form */}
          {showReset && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => { setShowReset(false); setResetSent(false); setError(''); }} className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-medium text-slate-900 text-sm">{language === 'ru' ? 'Восстановление пароля' : 'Password recovery'}</h3>
              </div>
              {resetSent ? (
                <p className="text-sm text-green-600">{language === 'ru' ? 'Письмо отправлено! Проверьте почту.' : 'Email sent! Check your inbox.'}</p>
              ) : (
                <>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder={language === 'ru' ? 'Введите email' : 'Enter email'}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm mb-2"
                  />
                  <button onClick={handleResetPassword} className="w-full py-2.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition">
                    {language === 'ru' ? 'Отправить ссылку' : 'Send reset link'}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}