const express = require('express');
const cookieParser = require('cookie-parser');
const {authenticate} = require('./middleware/auth');
const {notFound, errorHandler} = require('./errors');
const {authRoutes} = require('./modules/auth/routes');
const {quizRoutes} = require('./modules/quiz/routes');
const {blogRoutes} = require('./modules/blog/routes');
const {coursesRoutes} = require('./modules/courses/routes');

// Каждый модуль = { path, nav?, routes, enabled }. Новый раздел (курсы, рейтинг, админка)
// добавляется одной записью — без правок в остальных модулях.
function buildModules(config) {
    return [
        {path: '/api/auth', routes: authRoutes, enabled: true},
        {path: '/api/quiz', routes: quizRoutes, enabled: true, nav: {href: '/quiz', label: 'Квиз', order: 20}},
        {path: '/api/blog', routes: blogRoutes, enabled: true, nav: {href: '/blog', label: 'Блог', order: 30}},
        {
            path: '/api/courses',
            routes: coursesRoutes,
            enabled: config.features.courses,
            nav: {href: '/courses', label: 'Курсы', order: 25}
        },
    ].filter((m) => m.enabled);
}

function createApp({config, repos}) {
    const app = express();
    const modules = buildModules(config);

    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'X-Frame-Options': 'DENY',
            'Content-Security-Policy':
                "default-src 'self'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'",
        });
        next();
    });
    app.use(express.json({limit: '20kb'}));
    app.use(cookieParser());
    app.use(authenticate(config));

    // Навигация собирается на сервере — фронтенд просто рисует то, что пришло
    const nav = [{href: '/', label: 'Главная', order: 10}, ...modules.filter((m) => m.nav).map((m) => m.nav)]
        .sort((a, b) => a.order - b.order)
        .map(({href, label}) => ({href, label}));

    app.get('/api/config', (req, res) => {
        res.json({nav, features: config.features, user: req.user});
    });
    app.get('/api/health', (req, res) => res.json({ok: true}));

    for (const m of modules) app.use(m.path, m.routes({repos, config}));
    app.use('/api', notFound);

    // Чистые URL для статических страниц: /quiz -> public/quiz.html
    const pages = {
        '/': 'index',
        '/quiz': 'quiz',
        '/blog': 'blog',
        '/login': 'login',
        '/register': 'register',
        '/profile': 'profile'
    };
    if (config.features.courses) pages['/courses'] = 'courses';
    for (const [route, file] of Object.entries(pages)) {
        app.get(route, (req, res) => res.sendFile(`${file}.html`, {root: config.publicDir}));
    }
    app.get('/blog/:slug', (req, res) => res.sendFile('post.html', {root: config.publicDir}));
    app.use(express.static(config.publicDir, {extensions: false, index: false}));

    app.use((req, res) => res.status(404).sendFile('404.html', {root: config.publicDir}));
    app.use(errorHandler);
    return app;
}

module.exports = {createApp};
