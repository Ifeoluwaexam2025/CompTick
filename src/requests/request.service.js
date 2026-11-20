const repository = require('./request.repository');
const withTransaction = require('../config/with-transaction');
const { canTransition } = require('./request.rules');
const HttpError = require('../utils/http-error');
const isUuid = require('../utils/is-uuid');

function requireActor(user) {
    if (!isUuid(user?.id) || !['USER', 'ADMIN'].includes(user.role)) {
        throw new HttpError(403, 'Forbidden');
    }
}

async function updateRequest(id, data, user) {
    requireActor(user);
    const request = await repository.updateOwnedRequest(id, data, user.id);
    if (!request) throw new HttpError(404, 'Request not found');
    return request;
}

async function changeStatus(id, { status, note = '' }, user) {
    requireActor(user);
    if (user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    return withTransaction(async client => {
        const request = await repository.findStatusForUpdate(client, id);
        if (!request) throw new HttpError(404, 'Request not found');
        if (!canTransition(request.status, status)) {
            throw new HttpError(409, 'Invalid status transition');
        }
        const updated = await repository.updateStatus(client, id, status);
        await repository.insertAudit(client, id, user.id, request.status, status, note);
        return updated;
    });
}

async function listRequests(user, pagination) {
    requireActor(user);
    return repository.listRequests(pagination, user.role === 'USER' ? user.id : undefined);
}

module.exports = { createRequest: repository.createRequest, updateRequest, changeStatus, listRequests };
