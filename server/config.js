const path = require('node:path');

const isProd = process.env.NODE_ENV === 'production';
const rootDir = path.resolve(__dirname, '..');

if (isProd && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
}

module.exports = {
    isProd,
    port: Number(process.env.PORT) || 3000,
    rootDir,
    publicDir: path.join(rootDir, 'public'),
    db: {
        // json | postgres | mongo — добавьте драйвер в server/db/<driver> и переключите переменную
        driver: process.env.DB_DRIVER || 'json',
        contentDir: process.env.DATA_DIR || path.join(rootDir, 'data'),
        runtimeDir: process.env.RUNTIME_DIR || path.join(rootDir, 'data', 'runtime'),
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
        tokenTtlSeconds: 60 * 60 * 24 * 7,
        cookieName: 'cq_session',
    },
    quiz: {
        defaultCount: 10,
        maxCount: 30,
        attemptTtlMs: 1000 * 60 * 60 * 24,
    },
    // Флаги функций: курсы появятся в навигации, как только FEATURE_COURSES=true
    features: {
        courses: process.env.FEATURE_COURSES === 'true',
    },
};
