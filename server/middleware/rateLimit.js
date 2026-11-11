// Простой in-memory лимитер (fixed window). При горизонтальном масштабировании заменить на Redis.
function rateLimit({windowMs, max}) {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }, windowMs).unref();

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip;
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = {count: 0, resetAt: now + windowMs};
            hits.set(key, entry);
        }
        entry.count += 1;
        if (entry.count > max) {
            res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
            return res.status(429).json({error: 'Слишком много попыток. Попробуйте позже.'});
        }
        next();
    };
}

module.exports = {rateLimit};
