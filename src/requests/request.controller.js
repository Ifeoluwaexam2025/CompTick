const requestService = require('./request.service');
const { validateRequest, validateStatusChange, validateRequestId, parsePagination } = require('./request.validation');

async function createRequest(req, res, next) {
    try {
        validateRequest(req.body);
        const request = await requestService.createRequest(req.body, req.user.id);
        res.status(201).json(request);
    } catch (err) {
        next(err);
    }
}

async function updateRequest(req, res, next) {
    try {
        validateRequest(req.body);
        validateRequestId(req.params.id);
        const updated = await requestService.updateRequest(req.params.id, req.body, req.user);
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

async function changeStatus(req, res, next) {
    try {
        validateRequestId(req.params.id);
        validateStatusChange(req.body);
        const result = await requestService.changeStatus(req.params.id, req.body, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function listRequests(req, res, next) {
    try {
        const pagination = parsePagination(req.query);
        const result = await requestService.listRequests(req.user, pagination);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function listAudits(req, res, next) {
    try {
        validateRequestId(req.params.id);
        const pagination = parsePagination(req.query);
        const audits = await requestService.listAudits(req.params.id, req.user, pagination);
        res.json(audits);
    } catch (err) {
        next(err);
    }
}

module.exports = { createRequest, updateRequest, changeStatus, listRequests, listAudits };
