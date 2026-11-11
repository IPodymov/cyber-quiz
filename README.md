# CyberQuiz

Фронтенд интерактивного квиза по кибербезопасности: главная с обоснованием ценности, случайный квиз с мгновенным разбором,
блог, регистрация и вход. Бэкенд — отдельный API на Go, контракт описан в [docs/API.md](docs/API.md).

## Запуск фронтенда
```bash
npm run preview      # статический сервер на http://localhost:5173
```
Адрес API задаётся в `public/js/config.js` (`API_BASE_URL`, по умолчанию `/api` на том же домене).
Без запущенного API страницы откроются, но квиз, блог и вход работать не будут.

## Банк заданий
`data/questions.json` — открытый JSON:
```json
{
  "id": "q-001", "category": "phishing", "difficulty": "easy",
  "question": "…", "options": [{ "id": "a", "text": "…" }],
  "correctOptionId": "b", "explanation": "…", "tags": ["email"]
}
```
- `npm test` — проверка целостности банка (уникальные id, существующие категории, правильный ответ среди вариантов).
- `npm run export:sql` — схема + сид для PostgreSQL, `npm run export:mongo` — файлы для `mongoimport`.

## Документация
- [Контракт API](docs/API.md)
- [Архитектура и масштабирование](docs/ARCHITECTURE.md)
- [UX-исследование](docs/UX-RESEARCH.md)
