# CyberQuiz

Интерактивный квиз по кибербезопасности: главная с обоснованием ценности, случайный квиз с мгновенным разбором, блог, регистрация и вход.

## Запуск
```bash
npm install
npm run dev          # http://localhost:3000, перезапуск при изменениях
npm test             # тесты API, рандомизации и банка вопросов
```

Переменные окружения:
| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | 3000 | Порт сервера |
| `JWT_SECRET` | dev-секрет | **Обязательно в production** |
| `DB_DRIVER` | `json` | Драйвер хранилища |
| `FEATURE_COURSES` | `false` | Включить раздел «Курсы» |

## Банк заданий
`data/questions.json` — открытый JSON. Формат вопроса:
```json
{
  "id": "q-001", "category": "phishing", "difficulty": "easy",
  "question": "…", "options": [{ "id": "a", "text": "…" }],
  "correctOptionId": "b", "explanation": "…", "tags": ["email"]
}
```
Экспорт: `npm run export:sql` (PostgreSQL) и `npm run export:mongo` (MongoDB).

## API
| Метод | Путь | |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Авторизация |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/quiz/meta` | Категории и количество вопросов |
| POST | `/api/quiz/attempts` | Новый случайный квиз `{category?, difficulty?, count?}` |
| POST | `/api/quiz/attempts/:id/answers` | Ответ `{questionId, optionId}` → разбор |
| POST | `/api/quiz/attempts/:id/finish` | Итог по темам |
| GET | `/api/quiz/history` | История (нужен вход) |
| GET | `/api/blog/posts`, `/api/blog/posts/:slug` | Блог |

Документация: [UX-исследование](docs/UX-RESEARCH.md) · [Архитектура и масштабирование](docs/ARCHITECTURE.md)
