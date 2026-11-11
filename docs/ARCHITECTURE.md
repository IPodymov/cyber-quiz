# Архитектура и масштабирование

## Структура
```
data/                     JSON-банк (открытый формат, источник для импорта в БД)
  questions.json          категории + вопросы
  blog.json, courses.json
  runtime/                пользователи и попытки (в .gitignore)
server/
  config.js               env-переменные, флаги функций
  app.js                  реестр модулей, навигация, статика
  db/index.js             выбор драйвера по DB_DRIVER
  db/json/                реализация репозиториев на файлах
  modules/<name>/         routes.js + service.js — независимые модули
public/                   статический фронтенд (HTML + ES-модули, без сборки)
scripts/                  экспорт в PostgreSQL / MongoDB
docs/db/postgres-schema.sql
```

## Слои
`routes` (HTTP) → `service` (бизнес-логика) → `repos` (доступ к данным).
Сервисы знают только интерфейс репозиториев (`repos.questions.list()`, `repos.users.create()` и т.д.), поэтому смена хранилища не трогает логику.

## Переход на PostgreSQL / MongoDB
1. Импорт контента: `npm run export:sql > dist/seed.sql` → `psql -f dist/seed.sql` (проверено на PostgreSQL 16), или `npm run export:mongo` → `mongoimport`.
2. Создать `server/db/postgres/index.js` с теми же методами, что в `server/db/json/index.js` (например, на `pg`).
3. Зарегистрировать драйвер в `server/db/index.js` и запустить с `DB_DRIVER=postgres`.

Формат JSON спроектирован под оба варианта: плоские записи со строковыми `id`, ссылки по `category`, варианты ответа вложены (Mongo: один документ; Postgres: таблица `question_options`).

## Рандомизация квиза
- Фишер–Йетс на `crypto.randomInt` — все перестановки равновероятны.
- Выборка вопросов из пула → случайный порядок вопросов → случайный порядок вариантов для каждого вопроса.
- Порядок гарантированно отличается от предыдущей попытки того же пользователя/гостя, а варианты — от порядка в банке.
- Правильные ответы не уходят на клиент: проверка на сервере по `attemptId`, повторный ответ запрещён.

## Авторизация
- bcrypt (cost 12), JWT в `httpOnly` + `SameSite=Lax` cookie (`Secure` в production).
- Rate limit на `/login` и `/register`, одинаковое время ответа для существующего/несуществующего e-mail.
- Гости идентифицируются анонимной cookie — квиз доступен без регистрации.

## Добавление страницы курсов
Уже подготовлено:
- `data/courses.json`: курс → модули → уроки (`article` ссылается на пост блога, `quiz` — на фильтры квиза).
- Модуль `server/modules/courses`, страница `public/courses.html`, таблицы `courses / course_modules / lessons / enrollments / lesson_progress` в SQL-схеме.
- Включение: `FEATURE_COURSES=true` — пункт «Курсы» появится в навигации автоматически (навигация собирается из реестра модулей в `app.js`).

Дальше: страница курса и урока, запись на курс, прогресс (`lesson_progress.attempt_id` связывает урок-квиз с попыткой), роли `admin`/`author` для редактирования контента.

## Масштабирование под нагрузку
| Сейчас | При росте |
|---|---|
| JSON-файлы | PostgreSQL / MongoDB (драйвер репозиториев) |
| In-memory rate limit | Redis |
| Один процесс Node | Несколько инстансов за балансировщиком — сервер stateless (JWT, состояние попыток в БД) |
| Статика из Express | CDN |
| Многостраничный ванильный фронт | При усложнении UI — Next.js/React, API остаётся тем же |
