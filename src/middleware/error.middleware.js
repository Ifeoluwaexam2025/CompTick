const HttpError = require('../utils/http-error');

function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });

    const clientErrors = {
        'entity.parse.failed': [400, 'Malformed JSON'],
        'entity.too.large': [413, 'Request body too large'],
        'encoding.unsupported': [415, 'Unsupported content encoding'],
        'charset.unsupported': [415, 'Unsupported character encoding'],
        'request.aborted': [400, 'Request aborted'],
        'request.size.invalid': [400, 'Invalid request size']
    };
    if (Object.hasOwn(clientErrors, err.type)) {
        const [status, message] = clientErrors[err.type];
        return res.status(status).json({ message });
    }
    if (err instanceof URIError && err.status === 400) {
        return res.status(400).json({ message: 'Invalid URL encoding' });
    }

    console.error('Unhandled API error', { method: req.method, code: err.code, stack: err.stack });
    return res.status(500).json({ message: 'Internal server error' });
}

module.exports = errorHandler;
