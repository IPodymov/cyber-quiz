const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const {HttpError} = require('../errors');

const GUEST_COOKIE = 'cq_guest';

// Читает JWT из httpOnly-cookie и кладёт { id, email, name, role } в req.user (или null)
function authenticate(config) {
    return (req, res, next) => {
        req.user = null;
        const token = req.cookies?.[config.auth.cookieName];
        if (token) {
            try {
                const payload = jwt.verify(token, config.auth.jwtSecret);
                req.user = {id: payload.sub, email: payload.email, name: payload.name, role: payload.role};
            } catch {
                res.clearCookie(config.auth.cookieName);
            }
        }
        next();
    };
}

function requireAuth(req, res, next) {
    if (!req.user) return next(new HttpError(401, 'Требуется вход'));
    next();
}

// Идентификатор владельца попытки квиза: пользователь или анонимный гость
function ownerId(config) {
    return (req, res, next) => {
        if (req.user) {
            req.ownerId = `user:${req.user.id}`;
            return next();
        }
        let guestId = req.cookies?.[GUEST_COOKIE];
        if (!guestId || !/^[0-9a-f-]{36}$/.test(guestId)) {
            guestId = crypto.randomUUID();
            res.cookie(GUEST_COOKIE, guestId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: config.isProd,
                maxAge: 1000 * 60 * 60 * 24 * 30,
            });
        }
        req.ownerId = `guest:${guestId}`;
        next();
    };
}

module.exports = {authenticate, requireAuth, ownerId};
