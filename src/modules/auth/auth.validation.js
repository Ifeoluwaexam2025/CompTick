const HttpError = require('../../utils/http-error');

function validateLogin(data) {
    if (typeof data?.email !== 'string' || data.email.length > 255 ||
        !/^[^\s@\x00]+@[^\s@\x00]+\.[^\s@\x00]+$/.test(data.email)) {
        throw new HttpError(400, 'A valid email is required');
    }
    if (typeof data.password !== 'string' || !data.password.trim() ||
        Buffer.byteLength(data.password) > 72 || data.password.includes('\0')) {
        throw new HttpError(400, 'A nonblank password of at most 72 bytes with no NUL characters is required');
    }
}

function validateRegister(data) {
    validateLogin(data);
    if (data.password.length < 8) {
        throw new HttpError(400, 'Password must have at least 8 characters');
    }
    if (data.role !== undefined && data.role !== 'USER') {
        throw new HttpError(400, 'Public registration only supports the USER role');
    }
}

module.exports = { validateRegister, validateLogin };
