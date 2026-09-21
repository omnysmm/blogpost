# ПЛАН РЕАЛИЗАЦИИ ПРОЕКТА BlogPost
## AI-платформа для блогеров, бизнеса и создателей контента

**Дата:** 21 сентября 2026 г.
**Владелец:** ИП Герасимов Александр Владимирович
**Репозиторий:** https://github.com/omnysmm/blogpost

---

## 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

### 1.1 Стек технологий
| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend | React + TypeScript | 18.2 |
| Сборка | Vite | 6.3.5 |
| Стили | Tailwind CSS | 4.1.7 |
| State | Zustand | 5.0.15 |
| Графики | Recharts | 2.15.4 |
| DnD | @dnd-kit | 6.1 |
| Анимации | Framer Motion | 11.16 |
| Иконки | Lucide React | 0.294 |
| Supabase | @supabase/supabase-js | 2.98 (не используется) |
| Маршруты | react-router-dom | 6.30 (не используется) |

### 1.2 Архитектура
```
src/
├── App.tsx                    # Маршрутизация (switch/case, не react-router)
├── main.tsx                   # Точка входа
├── index.css                  # Глобальные стили + анимации
├── components/
│   ├── Header.tsx             # Навигация (скрыта до входа)
│   └── CookieBanner.tsx       # Баннер cookie (ФЗ-152)
├── pages/
│   ├── HomePage.tsx           # Продающая главная (полная)
│   ├── AuthPage.tsx           # Вход/регистрация + согласие ПД
│   ├── DashboardPage.tsx      # Панель управления
│   ├── ContentGeneratorPage.tsx # AI-генерация контента
│   ├── AnalyticsPage.tsx      # Аналитика
│   ├── SubscriptionsPage.tsx  # Тарифы + конструктор
│   ├── AdvertisingPage.tsx    # Рекламные форматы
│   ├── AdvertiserPage.tsx     # Рекламный кабинет
│   ├── AdvertiserCabinetPage.tsx # Расширенный рекламный кабинет
│   ├── SupportPage.tsx        # AI-поддержка (чат + тикеты + отчёты)
│   ├── AdminPage.tsx          # Админ-панель
│   ├── ProfilePage.tsx        # Профиль пользователя
│   ├── SettingsPage.tsx       # Настройки (соцсети, расписание, оплата, тарифы)
│   └── LegalPage.tsx          # Юридические документы (5 шт.)
├── store/
│   └── useStore.ts            # Zustand store (весь state)
└── i18n/
    └── translations.ts        # RU/EN переводы
```

### 1.3 Реализованные фичи

| Фича | Статус | Описание |
|------|--------|----------|
| Главная страница | ✅ Готова | Продающая с маркетинговыми блоками, тарифами, CTA |
| Авторизация | ✅ Работает | Вход/регистрация через localStorage, чекбокс согласия ПД |
| Навигация | ✅ Работает | Скрыта до входа, мобильный sidebar |
| Cookie-баннер | ✅ Работает | Сохранение в localStorage |
| Юридические документы | ✅ Готовы | 5 документов, hash-роутинг, новая вкладка |
| SEO | ✅ Готово | Meta, OG, Twitter, JSON-LD, sitemap, robots.txt |
| Тарифы на главной | ✅ Готовы | 4 тарифа + конструктор + сноски |
| Подписки (страница) | ✅ Готова | Тарифы + конструктор блоков + модалка оплаты |
| Админ-панель | ⚠️ Заглушка | Таблицы с моковыми данными |
| Генерация контента | ⚠️ Заглушка | UI без реального AI-бэкенда |
| Аналитика | ⚠️ Заглушка | Recharts с моковыми данными |
| Публикация в соцсети | ⚠️ Заглушка | UI без реальных API-интеграций |
| Поддержка (AI-чат) | ⚠️ Заглушка | Шаблонные ответы, не реальный AI |
| Рекламный кабинет | ⚠️ Заглушка | UI с моковыми кампаниями |
| Настройки | ⚠️ Заглушка | UI без сохранения |
| Профиль | ⚠️ Заглушка | UI без загрузки аватара |
| Supabase | ❌ Не подключён | Зависимость установлена, но не используется |
| React Router | ❌ Не используется | Зависимость установлена, маршруты через switch/case |

---

## 2. ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Фаза 1: Бэкенд и данные (Недели 1-3)
> Критично — без этого продукт не работает

### Фаза 2: AI-интеграции (Недели 4-6)
> Основная ценность продукта

### Фаза 3: Соцсети и публикация (Недели 7-9)
> Вторая ключевая ценность

### Фаза 4: Монетизация (Недели 10-12)
> Приём платежей, подписки, реклама

### Фаза 5: Аналитика и оптимизация (Недели 13-16)
> Рост и масштабирование

---

## 3. ФАЗА 1: БЭКЕНД И ДАННЫЕ (Недели 1-3)

### 3.1 Подключение Supabase

**Задачи:**
- [ ] Создать проект Supabase (supabase.com)
- [ ] Настроить `.env.local` с `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
- [ ] Создать `src/lib/supabase.ts` с инициализацией клиента
- [ ] Настроить Row Level Security (RLS) политики

**Схема БД:**
```sql
-- Пользователи (расширение auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'advertiser', 'admin')),
  subscription TEXT DEFAULT 'free' CHECK (subscription IN ('free', 'basic', 'pro', 'premium')),
  avatar_url TEXT,
  language TEXT DEFAULT 'ru',
  currency TEXT DEFAULT 'RUB',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  free_trial_end TIMESTAMPTZ
);

-- Посты/контент
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  topic TEXT,
  type TEXT CHECK (type IN ('post', 'article', 'video', 'music')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'published', 'moderating')),
  ai_model TEXT,
  social_networks TEXT[],
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  has_audio BOOLEAN DEFAULT FALSE,
  has_video BOOLEAN DEFAULT BOOLEAN DEFAULT FALSE,
  has_image BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Соцсети пользователя
CREATE TABLE social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  account_name TEXT,
  access_token TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Рекламные кампании
CREATE TABLE ad_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  format TEXT,
  placement TEXT,
  payment_model TEXT,
  budget_total DECIMAL,
  budget_daily DECIMAL,
  budget_spent DECIMAL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Платежи
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'RUB',
  description TEXT,
  status TEXT DEFAULT 'pending',
  yookassa_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Тикеты поддержки
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Тикет-сообщения
CREATE TABLE ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'user' | 'ai' | 'operator'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Аналитика
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  network TEXT,
  date DATE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Авторизация через Supabase Auth

**Задачи:**
- [ ] Заменить localStorage-авторизацию на `supabase.auth.signUp/signIn/signOut`
- [ ] Добавить OAuth (Google, VK) через Supabase
- [ ] Добавить сброс пароля
- [ ] Верификация email
- [ ] Обновить `useStore.ts` — синхронизация с Supabase session

### 3.3 Миграция состояния на Supabase

**Задачи:**
- [ ] Заменить все `localStorage` вызовы на Supabase queries
- [ ] CRUD для постов (`posts` table)
- [ ] CRUD для кампаний (`ad_campaigns` table)
- [ ] CRUD для тикетов (`tickets` + `ticket_messages`)
- [ ] Realtime подписки для чата поддержки

---

## 4. ФАЗА 2: AI-ИНТЕГРАЦИИ (Недели 4-6)

### 4.1 Выбор AI-провайдеров

| Модель | Назначение | API | Стоимость |
|--------|-----------|-----|----------|
| YandexGPT | Тексты, статьи | Yandex Cloud API | ~0.2 ₽/1K токенов |
| GigaChat | Диалоги, сценарии | Sber API | Бесплатный tier |
| Kandinsky | Изображения | FusionBrain API | Бесплатно |
| Silero TTS | Озвучка | Silero API | Бесплатно |
| Whisper | Транскрибация | OpenAI API | ~$0.006/мин |

### 4.2 Создание AI-сервиса

**Файл:** `src/services/ai.ts`
```typescript
// Единый интерфейс для всех AI-моделей
interface AIService {
  generateText(prompt: string, model: 'yandexgpt' | 'gigachat'): Promise<string>;
  generateImage(prompt: string): Promise<string>; // base64
  generateAudio(text: string): Promise<string>; // base64
  generateVideo(prompt: string): Promise<string>; // URL
  generateMusic(prompt: string): Promise<string>; // URL
  autoSelectModel(task: string): string;
}
```

**Задачи:**
- [ ] Создать `src/services/ai.ts` — единый AI-сервис
- [ ] Создать Supabase Edge Functions для AI-вызовов (защита API-ключей)
- [ ] Реализовать генерацию текста (YandexGPT + GigaChat)
- [ ] Реализовать генерацию изображений (Kandinsky)
- [ ] Реализовать озвучку (Silero TTS)
- [ ] Добавить автоматический выбор модели
- [ ] Добавить стриминг ответов (для UX)

### 4.3 Обновление ContentGeneratorPage

**Задачи:**
- [ ] Подключить реальный AI-сервис
- [ ] Добавить прогресс-бар генерации
- [ ] Превью сгенерированного контента
- [ ] Редактирование перед публикацией
- [ ] Сохранение черновиков в Supabase
- [ ] Лимиты генерации по тарифам

---

## 5. ФАЗА 3: СОЦСЕТИ И ПУБЛИКАЦИЯ (Недели 7-9)

### 5.1 Интеграция с соцсетями

| Сеть | API | Метод | Сложность |
|------|-----|-------|----------|
| VK | vk.com/dev | OAuth + API | Средняя |
| Telegram | Bot API | Bot token | Низкая |
| YouTube | Data API v3 | OAuth | Высокая |
| Instagram | Graph API | OAuth (Facebook) | Высокая |
| TikTok | Marketing API | OAuth | Высокая |
| OK | REST API | OAuth | Средняя |
| Rutube | Upload API | API Key | Средняя |

### 5.2 Реализация

**Задачи:**
- [ ] OAuth-подключение для каждой соцсети
- [ ] Хранение токенов в `social_accounts` (зашифрованные)
- [ ] Публикация постов через API каждой соцсети
- [ ] Загрузка медиа (фото, видео, аудио)
- [ ] Планировщик публикаций (cron через Supabase Edge Functions)
- [ ] Статус публикации (успех/ошибка)
- [ ] Автоматическая адаптация контента под каждую сеть

### 5.3 Обновление SettingsPage

**Задачи:**
- [ ] Страница «Соцсети» — реальное подключение
- [ ] Статус подключения (подключено/нет)
- [ ] Отключение соцсетей
- [ ] Тестовая публикация

---

## 6. ФАЗА 4: МОНЕТИЗАЦИЯ (Недели 10-12)

### 6.1 ЮKassa (Яндекс.Оплата)

**Задачи:**
- [ ] Зарегистрировать магазин в ЮKassa
- [ ] Создать Supabase Edge Function для создания платежа
- [ ] Обработка webhook'ов (payment.succeeded, payment.canceled)
- [ ] Обновление подписки пользователя
- [ ] Возврат средств

### 6.2 Подписки

**Задачи:**
- [ ] Хранение подписок в таблице `profiles`
- [ ] Автоматическое отключение при истечении
- [ ] Напоминания за 3 дня до окончания
- [ ] Апгрейд/даунгрейд тарифа
- [ ] Промокоды

### 6.3 Рекламная платформа

**Задачи:**
- [ ] CRUD рекламных кампаний в Supabase
- [ ] Показ рекламы на сайте (hero, sidebar, inline, footer)
- [ ] Трекинг показов и кликов
- [ ] Автомодерация рекламы
- [ ] Биллинг рекламодателей

---

## 7. ФАЗА 5: АНАЛИТИКА И ОПТИМИЗАЦИЯ (Недели 13-16)

### 7.1 Сбор аналитики

**Задачи:**
- [ ] Трекинг просмотров постов
- [ ] Трекинг лайков и репостов
- [ ] Агрегация по соцсетям
- [ ] Ежедневные снимки в таблицу `analytics`
- [ ] Экспорт в CSV/PDF

### 7.2 Дашборд аналитики

**Задачи:**
- [ ] Заменить моковые данные на реальные из Supabase
- [ ] Графики динамики (Recharts)
- [ ] Фильтры по дате, соцсети, типу контента
- [ ] Сравнение периодов
- [ ] AI-рекомендации по оптимизации

### 7.3 Админ-панель

**Задачи:**
- [ ] Реальные данные пользователей из Supabase
- [ ] Модерация контента
- [ ] Бан/разбан пользователей
- [ ] Настройки сайта
- [ ] Статистика платформы

---

## 8. ИНФРАСТРУКТУРА

### 8.1 Деплой

| Сервис | Назначение |
|--------|----------|
| Vercel / Netlify | Фронтенд (CDN) |
| Supabase | Бэкенд, БД, Auth, Storage, Edge Functions |
| Yandex Cloud | AI API (YandexGPT) |
| Sber API | GigaChat |
| FusionBrain | Kandinsky |
| Cloudflare | DNS, DDoS защита |

### 8.2 Мониторинг

- [ ] Sentry — отслеживание ошибок
- [ ] Supabase Dashboard — метрики БД
- [ ] Vercel Analytics — Web Vitals
- [ ] UptimeRobot — мониторинг доступности

### 8.3 CI/CD

- [ ] GitHub Actions — автодеплой при push в main
- [ ] Превью-деплои для PR
- [ ] Автоматические тесты

---

## 9. ТЕСТИРОВАНИЕ

### 9.1 Юнит-тесты
- [ ] Vitest — тесты для store, AI-сервиса, утилит
- [ ] React Testing Library — тесты компонентов

### 9.2 E2E тесты
- [ ] Playwright — тесты критических путей:
  - Регистрация → вход → генерация → публикация
  - Оплата подписки
  - Создание рекламной кампании

---

## 10. СРОКИ И РЕСУРСЫ

### 10.1 Дорожная карта

```
Неделя 1-3:   ████████ Бэкенд (Supabase + Auth + БД)
Неделя 4-6:   ████████ AI-интеграции
Неделя 7-9:   ████████ Соцсети
Неделя 10-12: ████████ Монетизация
Неделя 13-16: ████████ Аналитика + оптимизация
```

### 10.2 Команда (минимальная)

| Роль | Кол-во | Задачи |
|------|--------|--------|
| Fullstack разработчик | 1 | Фронтенд + бэкенд |
| AI-инженер | 0.5 | Интеграция нейросетей |
| Дизайнер | 0.5 | UI/UX улучшения |
| QA | 0.5 | Тестирование |

### 10.3 Бюджет

| Статья | Стоимость/мес |
|--------|-------------|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| Yandex Cloud AI | ~5 000 ₽ |
| Домен blogpost.ru | ~1 500 ₽/год |
| SSL сертификат | Бесплатно (Let's Encrypt) |
| **Итого** | **~10 000 ₽/мес** |

---

## 11. РИСКИ

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Блокировка API соцсетей | Средняя | Резервные методы (Web scraping, посредники) |
| Рост цен AI API | Высокая | Мульти-провайдер, кеширование, собственные модели |
| Низкая конверсия | Средняя | A/B тесты, онбординг, freemium |
| Конкуренты (Jasper, Copy.ai) | Высокая | Фокус на RU-рынок, локальные соцсети |
| Утечка данных | Низкая | RLS, шифрование, аудит |

---

## 12. KPI

| Метрика | Цель (6 мес.) | Цель (12 мес.) |
|---------|--------------|----------------|
| Пользователи | 5 000 | 50 000 |
| Платящие | 500 | 5 000 |
| MRR | 500 000 ₽ | 5 000 000 ₽ |
| Churn | < 5% | < 3% |
| ARPU | 2 000 ₽ | 3 000 ₽ |
| DAU/MAU | 30% | 40% |

---

*Документ будет обновляться по мере реализации проекта.*
