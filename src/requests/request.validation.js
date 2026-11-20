const HttpError = require('../utils/http-error');
const isUuid = require('../utils/is-uuid');

function validateText(value, field, maxLength, allowBlank = false) {
    if (typeof value !== 'string' || (!allowBlank && !value.trim()) ||
        value.length > maxLength || value.includes('\0')) {
        throw new HttpError(400, `Invalid ${field} (maximum ${maxLength} characters)`);
    }
}

function validateRequest(data) {
    validateText(data?.title, 'title', 255);
    validateText(data.description, 'description', 10000);
    validateText(data.category, 'category', 50);
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(data.priority)) {
        throw new HttpError(400, 'Invalid priority');
    }
}

function validateStatusChange(data) {
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(data?.status)) {
        throw new HttpError(400, 'Invalid status');
    }
    if (data.note !== undefined) validateText(data.note, 'note', 2000, true);
}

function validateRequestId(id) {
    if (!isUuid(id)) throw new HttpError(400, 'Invalid request ID');
}

function parsePagination({ page = '1', limit = '10' }) {
    if (![page, limit].every(value => typeof value === 'string' && /^[0-9]+$/.test(value))) {
        throw new HttpError(400, 'Page and limit must be positive integers');
    }
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const offset = (pageNumber - 1) * pageSize;
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageSize < 1 || pageSize > 100 || !Number.isSafeInteger(offset)) {
        throw new HttpError(400, 'Page must be positive and limit must be between 1 and 100');
    }
    return { offset, limit: pageSize };
}

module.exports = { validateRequest, validateStatusChange, validateRequestId, parsePagination };
