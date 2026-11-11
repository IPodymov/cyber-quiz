// Общий модуль: запросы к API, шапка/подвал, утилиты.
import {API_BASE_URL, FEATURES, NAV} from './config.js';

export async function api(path, {method = 'GET', body} = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        credentials: 'include',
        headers: body ? {'Content-Type': 'application/json'} : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
        const err = new Error(data?.error || `Ошибка ${res.status}`);
        err.status = res.status;
        err.details = data?.details;
        throw err;
    }
    return data;
}

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[c]);
}

export function formatDate(iso) {
    return new Date(iso).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'});
}

let configPromise;

// Навигация и флаги — из config.js, пользователь — из API (401 или недоступный API = гость)
export function getConfig() {
    configPromise ||= api('/auth/me')
        .then(({user}) => user)
        .catch(() => null)
        .then((user) => ({nav: NAV, features: FEATURES, user}));
    return configPromise;
}

function isActive(href) {
    const path = location.pathname;
    if (href === '/') return path === '/' || path === '/index.html';
    // Статья блога (post.html) подсвечивает пункт «Блог»
    return path === href || (href === '/blog.html' && path === '/post.html');
}

function renderHeader({nav, user}) {
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
    <div class="container header-inner">
      <a class="logo" href="/" aria-label="CyberQuiz — на главную">
        <span class="logo-mark" aria-hidden="true">⌁</span><span>Cyber<span class="gradient-text">Quiz</span></span>
      </a>
      <button class="menu-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Меню">☰</button>
      <nav class="nav" id="main-nav" aria-label="Основная навигация">
        ${nav.map((item) => `<a href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`).join('')}
      </nav>
      <div class="auth-area">
        ${user
        ? `<a class="btn btn-sm" href="/profile.html">👤 ${escapeHtml(user.name)}</a>
             <button class="btn btn-sm" type="button" data-logout>Выйти</button>`
        : `<a class="btn btn-sm" href="/login.html">Войти</a>
             <a class="btn btn-sm btn-primary" href="/register.html">Регистрация</a>`}
      </div>
    </div>`;

    const toggle = header.querySelector('.menu-toggle');
    toggle.addEventListener('click', () => {
        const open = header.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
    });

    header.querySelector('[data-logout]')?.addEventListener('click', async () => {
        await api('/auth/logout', {method: 'POST'});
        location.href = '/';
    });

    return header;
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
    <div class="container">
      <span>© ${new Date().getFullYear()} CyberQuiz — учимся защищаться, играя</span>
      <span><a href="/quiz.html">Пройти квиз</a> · <a href="/blog.html">Блог</a></span>
    </div>`;
    return footer;
}

export async function initLayout() {
    const config = await getConfig();
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main';
    skip.textContent = 'Перейти к содержимому';
    document.body.prepend(skip, renderHeader(config));
    document.body.append(renderFooter());
    return config;
}
