// Настройки фронтенда. Бэкенд — внешний API (Go); фронтенд можно разместить на любом статическом хостинге.

// Базовый адрес API. Пустая строка + '/api' = тот же домен (API за тем же reverse proxy).
// Для API на другом домене укажите полный адрес, например 'https://api.cyberquiz.ru/api',
// и включите на сервере CORS с Access-Control-Allow-Credentials: true.
export const API_BASE_URL = '/api';

// Флаги функций: «Курсы» появятся в навигации при courses: true
export const FEATURES = {
  courses: false,
};

export const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/quiz.html', label: 'Квиз' },
  ...(FEATURES.courses ? [{ href: '/courses.html', label: 'Курсы' }] : []),
  { href: '/blog.html', label: 'Блог' },
];
