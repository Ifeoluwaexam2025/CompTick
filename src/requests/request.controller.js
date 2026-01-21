const requestService = require('./request.service');
const { validateRequest, validateStatusChange } = require('./request.validation');
const { authorize } = require('../middleware/role.middleware');

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
        const updated = await requestService.updateRequest(req.params.id, req.body, req.user);
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

async function changeStatus(req, res, next) {
    try {
        authorize('ADMIN')(req, res, async () => {
            validateStatusChange(req.body.status);
            const result = await requestService.changeStatus(
                req.params.id,
                req.body.status,
                req.user.id,
                req.body.note
            );
            res.json(result);
        });
    } catch (err) {
        next(err);
    }
}

async function listRequests(req, res, next) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const result = await requestService.listRequests(req.user, page, limit);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = { createRequest, updateRequest, changeStatus, listRequests };
