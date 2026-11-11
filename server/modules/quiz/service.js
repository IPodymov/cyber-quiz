const {HttpError} = require('../../errors');
const {shuffle, shuffleAvoiding} = require('./shuffle');

function createQuizService({repos, config}) {
    function toPublicQuestion(question, optionOrder) {
        const byId = new Map(question.options.map((o) => [o.id, o]));
        return {
            id: question.id,
            category: question.category,
            difficulty: question.difficulty,
            question: question.question,
            options: optionOrder.map((id) => ({id, text: byId.get(id).text})),
        };
    }

    async function loadOwnedAttempt(attemptId, ownerId) {
        const attempt = await repos.attempts.findById(attemptId);
        if (!attempt || attempt.ownerId !== ownerId) throw new HttpError(404, 'Попытка не найдена');
        if (Date.now() - Date.parse(attempt.createdAt) > config.quiz.attemptTtlMs) {
            throw new HttpError(410, 'Время попытки истекло, начните новый квиз');
        }
        return attempt;
    }

    async function getMeta() {
        const [categories, counts] = await Promise.all([repos.questions.listCategories(), repos.questions.countByCategory()]);
        return {
            categories: categories.map((c) => ({...c, questionCount: counts[c.id] || 0})),
            totalQuestions: Object.values(counts).reduce((a, b) => a + b, 0),
            defaultCount: config.quiz.defaultCount,
            maxCount: config.quiz.maxCount,
        };
    }

    async function start({ownerId, userId, category, difficulty, count}) {
        const pool = await repos.questions.list({category: category || undefined, difficulty: difficulty || undefined});
        if (pool.length === 0) throw new HttpError(400, 'Нет вопросов по выбранным фильтрам');

        const size = Math.min(Math.max(Number(count) || config.quiz.defaultCount, 1), config.quiz.maxCount, pool.length);
        const previous = await repos.attempts.findLatestByOwner(ownerId);
        const prevQuestionOrder = previous?.items.map((i) => i.questionId);
        const prevOptionOrder = new Map(previous?.items.map((i) => [i.questionId, i.optionOrder]) || []);

        // Случайная выборка из пула, затем порядок, отличный от прошлой попытки этого же пользователя
        const picked = shuffle(pool).slice(0, size);
        const ordered = shuffleAvoiding(picked.map((q) => q.id), [prevQuestionOrder]);
        const byId = new Map(picked.map((q) => [q.id, q]));

        const items = ordered.map((questionId) => {
            const original = byId.get(questionId).options.map((o) => o.id);
            // Варианты ответа: не в порядке банка (иначе правильный ответ «запоминается» по позиции) и не как в прошлый раз
            return {questionId, optionOrder: shuffleAvoiding(original, [original, prevOptionOrder.get(questionId)])};
        });

        const attempt = await repos.attempts.create({
            ownerId,
            userId: userId || null,
            filters: {category: category || null, difficulty: difficulty || null},
            items,
            answers: {},
            finishedAt: null,
            score: null,
        });

        return {
            attemptId: attempt.id,
            total: items.length,
            questions: items.map((i) => toPublicQuestion(byId.get(i.questionId), i.optionOrder)),
        };
    }

    async function answer({attemptId, ownerId, questionId, optionId}) {
        const attempt = await loadOwnedAttempt(attemptId, ownerId);
        const item = attempt.items.find((i) => i.questionId === questionId);
        if (!item) throw new HttpError(400, 'Вопрос не из этой попытки');
        if (!item.optionOrder.includes(optionId)) throw new HttpError(400, 'Неизвестный вариант ответа');

        const question = await repos.questions.findById(questionId);
        const correct = question.correctOptionId === optionId;

        await repos.attempts.update(attemptId, (a) => {
            if (a.finishedAt) throw new HttpError(409, 'Квиз уже завершён');
            if (a.answers[questionId]) throw new HttpError(409, 'Ответ на этот вопрос уже дан');
            a.answers[questionId] = {optionId, correct, answeredAt: new Date().toISOString()};
        });

        return {correct, correctOptionId: question.correctOptionId, explanation: question.explanation};
    }

    async function finish({attemptId, ownerId}) {
        await loadOwnedAttempt(attemptId, ownerId);
        const attempt = await repos.attempts.update(attemptId, (a) => {
            if (a.finishedAt) return;
            a.score = Object.values(a.answers).filter((x) => x.correct).length;
            a.finishedAt = new Date().toISOString();
        });
        return summarize(attempt);
    }

    async function summarize(attempt) {
        const categories = new Map((await repos.questions.listCategories()).map((c) => [c.id, c]));
        const byCategory = {};
        for (const item of attempt.items) {
            const q = await repos.questions.findById(item.questionId);
            const entry = (byCategory[q.category] ||= {
                id: q.category,
                title: categories.get(q.category)?.title || q.category,
                total: 0,
                correct: 0
            });
            entry.total += 1;
            if (attempt.answers[item.questionId]?.correct) entry.correct += 1;
        }
        const total = attempt.items.length;
        return {
            attemptId: attempt.id,
            score: attempt.score,
            total,
            answered: Object.keys(attempt.answers).length,
            percent: total ? Math.round((attempt.score / total) * 100) : 0,
            byCategory: Object.values(byCategory),
            finishedAt: attempt.finishedAt,
        };
    }

    async function history(userId) {
        const attempts = await repos.attempts.listByUser(userId);
        return Promise.all(attempts.map(summarize));
    }

    return {getMeta, start, answer, finish, history};
}

module.exports = {createQuizService};
