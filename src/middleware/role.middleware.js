const HttpError = require('../utils/http-error');

function authorize(role) {
    return (req, res, next) => {
        if (req.user?.role !== role) return next(new HttpError(403, 'Forbidden'));
        return next();
    };
}

module.exports = { authorize };
