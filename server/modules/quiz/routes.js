const express = require('express');
const {createQuizService} = require('./service');
const {ownerId, requireAuth} = require('../../middleware/auth');

function quizRoutes({repos, config}) {
    const router = express.Router();
    const service = createQuizService({repos, config});

    router.get('/meta', async (req, res) => {
        res.json(await service.getMeta());
    });

    router.post('/attempts', ownerId(config), async (req, res) => {
        const {category, difficulty, count} = req.body || {};
        res.status(201).json(await service.start({
            ownerId: req.ownerId,
            userId: req.user?.id,
            category,
            difficulty,
            count
        }));
    });

    router.post('/attempts/:id/answers', ownerId(config), async (req, res) => {
        const {questionId, optionId} = req.body || {};
        res.json(await service.answer({attemptId: req.params.id, ownerId: req.ownerId, questionId, optionId}));
    });

    router.post('/attempts/:id/finish', ownerId(config), async (req, res) => {
        res.json(await service.finish({attemptId: req.params.id, ownerId: req.ownerId}));
    });

    router.get('/history', requireAuth, async (req, res) => {
        res.json({attempts: await service.history(req.user.id)});
    });

    return router;
}

module.exports = {quizRoutes};
