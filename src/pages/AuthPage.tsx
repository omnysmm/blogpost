import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import {
  SOCIAL_LOGIN_PROVIDERS,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signInWithSocial,
  completeSocialLogin,
  parseSocialCallback,
  type AuthResult,
} from '../services/auth';
import { isSupabaseConfigured } from '../lib/supabase';

export default function AuthPage() {
  const { language, setCurrentUser, setCurrentPage, loadUserData } = useStore();
  const t = translations[language];
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Complete social login when Edge Function redirects back with token+email
  useEffect(() => {
    const cb = parseSocialCallback();
    if (!cb) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const result = await completeSocialLogin(cb.email, cb.token);
      if (cancelled) return;
      if (result.ok && result.user) {
        setCurrentUser(result.user);
        await loadUserData();
        setCurrentPage('dashboard');
      } else {
        setError(
          language === 'ru'
            ? 'Не удалось войти через соцсеть. Попробуйте ещё раз.'
            : 'Social login failed. Please try again.'
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyResult = async (result: AuthResult, successPage = 'dashboard') => {
    if (result.ok && result.user) {
      setCurrentUser(result.user);
      await loadUserData();
      setCurrentPage(successPage);
      return;
    }
    if (result.needsEmailConfirm) {
      setInfo(
        language === 'ru'
          ? 'Подтвердите email — мы отправили письмо со ссылкой.'
          : 'Confirm your email — we sent a confirmation link.'
      );
      setError('');
      return;
    }
    if (result.error === 'supabase_not_configured') {
      setError(
        language === 'ru'
          ? 'Сервер авторизации не настроен (Supabase). Обратитесь к администратору.'
          : 'Auth server is not configured (Supabase). Contact the administrator.'
      );
      return;
    }
    if (result.error === 'invalid_credentials' || result.error?.includes('Invalid login')) {
      setError(language === 'ru' ? 'Неверный email или пароль' : 'Invalid email or password');
      return;
    }
    if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
      setError(language === 'ru' ? 'Пользователь с таким email уже существует' : 'User with this email already exists');
      return;
    }
    setError(
      language === 'ru' ? 'Ошибка. Проверьте данные и попробуйте снова.' : 'Error. Check your data and try again.'
    );
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    setError('');
    setInfo('');
    const result = await resetPassword(resetEmail);
    if (result.ok) {
      setResetSent(true);
    } else {
      setError(language === 'ru' ? 'Ошибка отправки. Проверьте email.' : 'Send error. Check email.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (isLogin) {
        const result = await signInWithEmail(email, password);
        await applyResult(result);
      } else {
        if (!name || !email || !password) {
          setError(language === 'ru' ? 'Заполните все поля' : 'Fill in all fields');
          return;
        }
        if (password.length < 6) {
          setError(language === 'ru' ? 'Пароль минимум 6 символов' : 'Password must be at least 6 characters');
          return;
        }
        if (!consent) {
          setError(
            language === 'ru'
              ? 'Необходимо дать согласие на обработку персональных данных'
              : 'You must consent to personal data processing'
          );
          return;
        }
        const result = await signUpWithEmail(name, email, password);
        await applyResult(result);
      }
    } finally {
      setLoading(false);
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
              {isLogin
                ? language === 'ru'
                  ? 'Вход в BlogPost'
                  : 'Login to BlogPost'
                : language === 'ru'
                  ? 'Регистрация в BlogPost'
                  : 'Register in BlogPost'}
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
          {info && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              {info}
            </div>
          )}

          {/* ── Social login: VK / Yandex / OK only (no Google) ── */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">
                {language === 'ru' ? 'Вход без пароля' : 'Passwordless login'}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SOCIAL_LOGIN_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading || !isSupabaseConfigured}
                  onClick={() => signInWithSocial(p.id)}
                  title={language === 'ru' ? `Войти через ${p.nameRu}` : `Sign in with ${p.name}`}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50"
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: p.color, color: p.textColor }}
                  >
                    {p.id === 'vk' ? 'VK' : p.id === 'yandex' ? 'Я' : 'OK'}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {language === 'ru' ? p.nameRu : p.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">
                {language === 'ru' ? 'или по email' : 'or with email'}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.name}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.email}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.password}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            {!isLogin && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  {language === 'ru' ? (
                    <>
                      Регистрируясь, я даю согласие на обработку персональных данных в соответствии с{' '}
                      <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                        Политикой конфиденциальности
                      </a>{' '}
                      и принимаю{' '}
                      <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                        Пользовательское соглашение
                      </a>
                    </>
                  ) : (
                    <>
                      By registering, I consent to personal data processing in accordance with the{' '}
                      <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                        Privacy Policy
                      </a>{' '}
                      and accept the{' '}
                      <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                        Terms of Use
                      </a>
                    </>
                  )}
                </span>
              </label>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isLogin ? t.login : t.register}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {isLogin && !showReset && (
              <button
                onClick={() => {
                  setShowReset(true);
                  setError('');
                  setInfo('');
                }}
                className="block w-full text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                {language === 'ru' ? 'Забыли пароль?' : 'Forgot password?'}
              </button>
            )}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setInfo('');
                setShowReset(false);
              }}
              className="text-blue-600 text-sm hover:underline"
            >
              {isLogin ? t.noAccount + ' ' + t.register : t.hasAccount + ' ' + t.login}
            </button>
          </div>

          {showReset && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => {
                    setShowReset(false);
                    setResetSent(false);
                    setError('');
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-medium text-slate-900 text-sm">
                  {language === 'ru' ? 'Восстановление пароля' : 'Password recovery'}
                </h3>
              </div>
              {resetSent ? (
                <p className="text-sm text-green-600">
                  {language === 'ru' ? 'Письмо отправлено! Проверьте почту.' : 'Email sent! Check your inbox.'}
                </p>
              ) : (
                <>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={language === 'ru' ? 'Введите email' : 'Enter email'}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm mb-2"
                  />
                  <button
                    onClick={handleResetPassword}
                    className="w-full py-2.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition"
                  >
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
