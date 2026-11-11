# Контракт API для бэкенда

Фронтенд (`public/`) обращается к API по адресу из `public/js/config.js` (`API_BASE_URL`, по умолчанию `/api`).
Ниже — то, что фронтенд ожидает от бэкенда (Go). Если в вашем API другие пути или поля, достаточно поправить
вызовы `api(...)` в `public/js/*.js` — вся работа с сетью идёт через функцию `api()` в `public/js/app.js`.

## Общие правила
- JSON в запросах и ответах, `Content-Type: application/json`.
- Ошибка: HTTP-статус ≥ 400 и тело `{ "error": "Текст для пользователя", "details": { "<поле>": "текст" } }`.
  `details` необязательно; если есть, фронтенд подсвечивает поля формы с этими именами.
- Сессия — `httpOnly` cookie (рекомендуется `Secure`, `SameSite=Lax`). Фронтенд шлёт запросы с `credentials: 'include'`.
- Если API на другом домене: CORS с конкретным `Access-Control-Allow-Origin` (не `*`) и `Access-Control-Allow-Credentials: true`;
  cookie тогда нужен `SameSite=None; Secure`.
- `204 No Content` допустим для ответов без тела.

## Авторизация
| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| POST | `/auth/register` | `{name, email, password}` | `201 {user}` + cookie сессии. `400` с `details` по полям, `409` если e-mail занят |
| POST | `/auth/login` | `{email, password}` | `200 {user}` + cookie. `401` при неверных данных |
| POST | `/auth/logout` | — | `204`, cookie удалена |
| GET | `/auth/me` | — | `200 {user}` или `401` для гостя |

`user = { id, email, name, role, createdAt }` — без хэша пароля.
Валидация, которую показывает форма: имя 2–50 символов, корректный e-mail, пароль 8–128 символов.

## Квиз
| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| GET | `/quiz/meta` | — | `{categories: [{id, title, color, questionCount}], totalQuestions, defaultCount, maxCount}` |
| POST | `/quiz/attempts` | `{category?, difficulty?, count?}` | `201 {attemptId, total, questions: [{id, category, difficulty, question, options: [{id, text}]}]}` |
| POST | `/quiz/attempts/{id}/answers` | `{questionId, optionId}` | `{correct, correctOptionId, explanation}`. `409` при повторном ответе |
| POST | `/quiz/attempts/{id}/finish` | — | `{attemptId, score, total, answered, percent, byCategory: [{id, title, total, correct}], finishedAt}` |
| GET | `/quiz/history` | — | `{attempts: [<как ответ finish>]}`; `401` для гостя |

Квиз доступен гостям: попытку привязывайте к пользователю или к анонимной cookie гостя;
чужая попытка → `404`.

### Требования к рандомизации (выполняются на сервере)
1. Выборка `count` вопросов из пула по фильтрам — случайная.
2. Порядок вопросов и порядок вариантов внутри каждого вопроса — случайные (Фишер–Йетс на криптостойком ГСЧ, в Go — `crypto/rand`).
3. Порядок вопросов не должен совпадать с прошлой попыткой того же пользователя/гостя; порядок вариантов — ни с порядком в банке, ни с прошлой попыткой.
   Достаточно перетасовать заново, если результат совпал с запрещённым (для 1 варианта это невозможно — пропустить).
4. `correctOptionId` и `explanation` не отдаются при старте попытки — только в ответе на `/answers`.
5. Попытка хранит показанный порядок (`items: [{questionId, optionOrder}]`) — это нужно и для п. 3, и для проверки, что вопрос/вариант относится к попытке.

## Блог
| Метод | Путь | Ответ |
|---|---|---|
| GET | `/blog/posts` | `{posts: [{id, slug, title, excerpt, category, author, publishedAt, readingMinutes}]}` — без `body`, новые сначала |
| GET | `/blog/posts/{slug}` | `{post}` с `body: string[]` (абзацы); `404` если нет |

## Курсы (будущее)
| Метод | Путь | Ответ |
|---|---|---|
| GET | `/courses` | `{courses: [{id, slug, title, description, level, status, moduleCount}]}` |
| GET | `/courses/{slug}` | `{course}` со вложенными `modules[].lessons[]` (см. `data/courses.json`) |

## Данные
- Банк вопросов, блог, курсы: `data/*.json`.
- Схема PostgreSQL (включая `users`, `quiz_attempts`, курсы): `docs/db/postgres-schema.sql`; сид — `npm run export:sql`.
- MongoDB: `npm run export:mongo` → файлы для `mongoimport`.
