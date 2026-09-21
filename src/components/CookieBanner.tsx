import { useState, useEffect } from 'react';

export default function CookieBanner({ language }: { language: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('blogpost_cookies_accepted');
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('blogpost_cookies_accepted', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-2xl p-4 md:p-5 animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <p className="text-sm text-slate-600 flex-1">
          {language === 'ru'
            ? 'Мы используем файлы cookie для улучшения работы сайта, персонализации контента и анализа трафика. Продолжая использовать сайт, вы даёте согласие на обработку cookie в соответствии с Политикой конфиденциальности и требованиями Федерального закона №152-ФЗ «О персональных данных».'
            : 'We use cookies to improve site performance, personalize content and analyze traffic. By continuing to use the site, you consent to the processing of cookies in accordance with the Privacy Policy.'}
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={accept}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            {language === 'ru' ? 'Принять' : 'Accept'}
          </button>
          <button
            onClick={accept}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all"
          >
            {language === 'ru' ? 'Отклонить' : 'Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}