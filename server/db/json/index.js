const path = require('node:path');
const crypto = require('node:crypto');
const {JsonStore} = require('./store');

// Реализация репозиториев поверх JSON-файлов.
// Postgres/Mongo-драйвер должен вернуть объект с теми же методами — сервисы от этого не зависят.
function createJsonRepositories({contentDir, runtimeDir}) {
    const content = (name, initial) => new JsonStore(path.join(contentDir, `${name}.json`), initial);
    const runtime = (name, initial) => new JsonStore(path.join(runtimeDir, `${name}.json`), initial);

    const questionsStore = content('questions', {categories: [], questions: []});
    const blogStore = content('blog', {posts: []});
    const coursesStore = content('courses', {courses: []});
    const usersStore = runtime('users', {users: []});
    const attemptsStore = runtime('attempts', {attempts: []});

    const questions = {
        async listCategories() {
            return (await questionsStore.load()).categories;
        },
        async list({category, difficulty} = {}) {
            const {questions: all} = await questionsStore.load();
            return all.filter(
                (q) => (!category || q.category === category) && (!difficulty || q.difficulty === difficulty),
            );
        },
        async findById(id) {
            return (await questionsStore.load()).questions.find((q) => q.id === id) || null;
        },
        async countByCategory() {
            const counts = {};
            for (const q of (await questionsStore.load()).questions) counts[q.category] = (counts[q.category] || 0) + 1;
            return counts;
        },
    };

    const blog = {
        async list() {
            const {posts} = await blogStore.load();
            return [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
        },
        async findBySlug(slug) {
            return (await blogStore.load()).posts.find((p) => p.slug === slug) || null;
        },
    };

    const courses = {
        async list() {
            return (await coursesStore.load()).courses;
        },
        async findBySlug(slug) {
            return (await coursesStore.load()).courses.find((c) => c.slug === slug) || null;
        },
    };

    const users = {
        async findByEmail(email) {
            return (await usersStore.load()).users.find((u) => u.email === email) || null;
        },
        async findById(id) {
            return (await usersStore.load()).users.find((u) => u.id === id) || null;
        },
        async create({email, name, passwordHash}) {
            return usersStore.update((data) => {
                if (data.users.some((u) => u.email === email)) {
                    const err = new Error('Email already registered');
                    err.code = 'DUPLICATE';
                    throw err;
                }
                const user = {
                    id: crypto.randomUUID(),
                    email,
                    name,
                    passwordHash,
                    role: 'user',
                    createdAt: new Date().toISOString()
                };
                data.users.push(user);
                return user;
            });
        },
    };

    const attempts = {
        async create(attempt) {
            return attemptsStore.update((data) => {
                const record = {id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...attempt};
                data.attempts.push(record);
                return record;
            });
        },
        async findById(id) {
            return (await attemptsStore.load()).attempts.find((a) => a.id === id) || null;
        },
        async findLatestByOwner(ownerId) {
            const list = (await attemptsStore.load()).attempts.filter((a) => a.ownerId === ownerId);
            return list[list.length - 1] || null;
        },
        async listByUser(userId, limit = 20) {
            return (await attemptsStore.load()).attempts
                .filter((a) => a.userId === userId && a.finishedAt)
                .slice(-limit)
                .reverse();
        },
        // Атомарно применяет изменение к попытке; mutator может бросить ошибку — тогда запись не меняется
        async update(id, mutator) {
            return attemptsStore.update((data) => {
                const attempt = data.attempts.find((a) => a.id === id);
                if (!attempt) return null;
                mutator(attempt);
                return attempt;
            });
        },
        async deleteOlderThan(isoDate) {
            return attemptsStore.update((data) => {
                const before = data.attempts.length;
                data.attempts = data.attempts.filter((a) => a.finishedAt || a.createdAt >= isoDate);
                return before - data.attempts.length;
            });
        },
    };

    return {questions, blog, courses, users, attempts};
}

module.exports = {createJsonRepositories};
