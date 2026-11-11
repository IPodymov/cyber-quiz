const express = require('express');
const {createAuthService} = require('./service');
const {requireAuth} = require('../../middleware/auth');
const {rateLimit} = require('../../middleware/rateLimit');

function authRoutes({repos, config}) {
    const router = express.Router();
    const service = createAuthService({repos, config});
    const limiter = rateLimit({windowMs: 15 * 60 * 1000, max: 20});

    const cookieOptions = {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        maxAge: config.auth.tokenTtlSeconds * 1000,
    };

    router.post('/register', limiter, async (req, res) => {
        const {user, token} = await service.register(req.body || {});
        res.cookie(config.auth.cookieName, token, cookieOptions).status(201).json({user});
    });

    router.post('/login', limiter, async (req, res) => {
        const {user, token} = await service.login(req.body || {});
        res.cookie(config.auth.cookieName, token, cookieOptions).json({user});
    });

    router.post('/logout', (req, res) => {
        res.clearCookie(config.auth.cookieName).status(204).end();
    });

    router.get('/me', requireAuth, async (req, res) => {
        res.json({user: await service.me(req.user.id)});
    });

    return router;
}

module.exports = {authRoutes};
