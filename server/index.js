const config = require('./config');
const {createRepositories} = require('./db');
const {createApp} = require('./app');

const repos = createRepositories(config.db);
const app = createApp({config, repos});

if (!process.env.JWT_SECRET) console.warn('⚠ JWT_SECRET не задан — используется dev-секрет');

// Незавершённые попытки старше TTL удаляем раз в час
setInterval(() => {
    repos.attempts.deleteOlderThan(new Date(Date.now() - config.quiz.attemptTtlMs).toISOString()).catch(console.error);
}, 60 * 60 * 1000).unref();

app.listen(config.port, () => {
    console.log(`CyberQuiz запущен: http://localhost:${config.port}`);
});
