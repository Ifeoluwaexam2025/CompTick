const { findActiveActor } = require('../modules/auth/auth.repository');
const { verifyToken } = require('../utils/jwt');
const HttpError = require('../utils/http-error');
const isUuid = require('../utils/is-uuid');

async function authenticate(req, res, next) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    const invalidToken = new HttpError(401, 'Valid bearer token required');
    if (!match) return next(invalidToken);

    let claims;
    try {
        claims = verifyToken(match[1]);
    } catch {
        return next(invalidToken);
    }
    if (!isUuid(claims?.id) || !Number.isInteger(claims.exp)) return next(invalidToken);

    try {
        const user = await findActiveActor(claims.id);
        if (!user || !['USER', 'ADMIN'].includes(user.role)) return next(invalidToken);
        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = { authenticate };
