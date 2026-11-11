const express = require('express');
const {HttpError} = require('../../errors');

// Заготовка модуля курсов. Подключается в app.js только при FEATURE_COURSES=true.
// Уроки типа "quiz" переиспользуют модуль квиза: фронтенд стартует попытку с фильтрами из lesson.quiz.
function coursesRoutes({repos}) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        const courses = await repos.courses.list();
        res.json({courses: courses.map(({modules, ...c}) => ({...c, moduleCount: modules.length}))});
    });

    router.get('/:slug', async (req, res) => {
        const course = await repos.courses.findBySlug(req.params.slug);
        if (!course) throw new HttpError(404, 'Курс не найден');
        res.json({course});
    });

    return router;
}

module.exports = {coursesRoutes};
