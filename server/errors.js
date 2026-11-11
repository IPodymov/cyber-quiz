class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

function notFound(req, res) {
    res.status(404).json({error: 'Not found'});
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({error: err.message, details: err.details});
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({error: 'Некорректный JSON'});
    }
    console.error(err);
    res.status(500).json({error: 'Внутренняя ошибка сервера'});
}

module.exports = {HttpError, notFound, errorHandler};
