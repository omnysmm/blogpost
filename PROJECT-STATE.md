# Состояние проекта BlogPost
_Сохранено: 2026-11-11. Для возврата к работе — начать с раздела «Очередь задач»._

## Статус: все 11 задач этапа 1–7 + аналог Supabase выполнены

Рабочая копия: `C:\Users\Семья\blogpost` (ветка `automated-platform-for-bloggers-91452`, синхронизирована с origin).

## Что сделано (коммиты)

| Коммит | Содержание |
|---|---|
| `8eb12b0` | T1–T7: миграция localStorage→Supabase (дуал-райт убран), автоотключение подписок (cron + edge + GH Actions + client enforcement), полный flow смены тарифа (upgrade/downgrade/cancel с `pending_subscription`), фильтры аналитики + сравнение периодов, реальные AI-рекомендации (rule-based + AI-разбор), RTL-тесты (13), E2E Playwright критические пути (12) |
| `627f136` | `VITE_SUPABASE_URL=same-origin` — рантайм-резолвинг URL бэкенда, сборка домено-независимая |

**Проверки на момент сохранения:** 59/59 unit tests, 23/23 E2E (12 critical-paths + 11 smoke), `tsc` чистый, `vite build` OK.

## Аналог Supabase — supabase-lite

Репозиторий: **github.com/omnysmm/supabase-lite** (ветка `main`, синхронизирована).

PHP 8 + SQLite, замена managed Supabase. Совместим с `@supabase/supabase-js` (41/41 интеграционных тестов на реальном клиенте):
- **Auth (GoTrue):** signup / token (password+refresh) / logout / user / recover / verify (magiclink OTP) / authorize — HS256 JWT, bcrypt
- **REST (PostgREST):** GET/POST/PATCH/DELETE, фильтры eq/neq/gt/gte/lt/lte/like/in/is, order/limit/offset, upsert `on_conflict`, `count=exact` (HEAD+Content-Range), `single()`
- **RLS-изоляция** по user_id (profiles — по id), admin bypass
- **RPC:** `use_promo_code`, `expire_subscriptions`
- **Edge functions:** ai-generate-text/image/audio, ai-seo-optimize, social-auth/oauth (VK/Yandex/OK), social-publish, telegram-publish, schedule-publish, create-payment (YooKassa), refund-payment, yookassa-webhook, subscription-expiry
- **/api/* прокси:** generate, image, generate-health, telegram, vk, youtube, tiktok, instagram, ok, rutube
- **Realtime НЕ реализован** (чат поддержки работает через localStorage-фоллбэк)

## Деплой (хостинг 31.42.188.5, FTP user `zegewiag`)

Папка **`/public_html_old/blogpost/`** (отдельная, не внутри рабочих сайтов — по прямому указанию пользователя).
Содержимое: `index.php` (роутер бэкенда + раздача SPA), `src/` (6 PHP-модулей), `schema.sql`, `.htaccess` (закрывает `data/` и `src/` от HTTP), `data/` (SQLite создастся при первом запросе), SPA blogpost (same-origin сборка), `probe.php` (диагностика PHP+SQLite).

**⚠️ HTTP-доступа пока нет** — нужен домен. Когда пользователь зарегистрирует домен, направить его docroot на `/public_html_old/blogpost`. Затем открыть `http://<домен>/probe.php` — убедиться, что PHP + SQLite работают. Пересборка SPA не нужна (same-origin).

FTP-скрипт для повторного деплоя: `C:\supabase-lite\deploy\upload-ftp.ps1`.
Локальная проверка задеплоенной раскладки: `php -S 127.0.0.1:8081 -t C:\supabase-lite\deploy\site` + `node tests/test-api.mjs http://127.0.0.1:8081`.

## Очередь задач (к следующему визиту)

1. **Домен** — пользователь регистрирует сам, затем привязать docroot → `/public_html_old/blogpost`, проверить `probe.php`.
2. **Монетизация** (следующий этап по договорённости; план в `MONETIZATION-PLAN.md`).
3. **Регистрация магазина ЮKassa** (бизнес-шаг) + указать webhook URL `https://<домен>/functions/v1/yookassa-webhook`.
4. **Мониторинг:** Supabase-метрики (в дашборде supabase-lite — не критично), Vercel Analytics, UptimeRobot (внешний сервис).
5. **Realtime-чат поддержки** — сейчас localStorage-фолллэк; можно добавить polling или WebSocket-заглушку.
6. **Применить SQL-миграции на живую БД** (если появится настоящий Supabase): `migrate-local-to-supabase.sql`, `migrate-subscription-expiry.sql`, `migrate-plan-change.sql` — для supabase-lite схема применяется автоматически из `schema.sql`.
7. Реальные креды OAuth (VK/Yandex/OK) и YooKassa — вписать в env хостинга, когда появятся.

## Технические заметки

- **PowerShell ломает UTF-8:** `Get-Content`/`Set-Content` читают UTF-8 как CP1251 → двойное перекодирование. Для файлов с кириллицей использовать read/edit/write-инструменты. Если файл повреждён — реверс: `[Text.Encoding]::GetEncoding(1251).GetBytes($txt)` → `UTF8.GetString`.
- PowerShell не принимает `&` как в bash — использовать `Start-Process -WindowStyle Hidden`.
- `npm.cmd` / `npx.cmd` вместо `npm`/`npx` (политика исполнения).
- Supabase-проект `udfqkkeupibrhighbizj` **мёртв** (DNS NXDOMAIN) — старые миграции туда не применить, все данные теперь в supabase-lite (SQLite).
- Ветка blogpost: `automated-platform-for-bloggers-91452` (НЕ `main` — `origin/main` не существует).
