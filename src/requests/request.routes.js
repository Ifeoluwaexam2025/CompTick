const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    createRequest,
    updateRequest,
    changeStatus,
    listRequests
} = require('./request.controller');

router.use(authenticate);

router.post('/', createRequest);
router.put('/:id', updateRequest);
router.patch('/:id/status', authorize('ADMIN'), changeStatus);
router.get('/', listRequests);

module.exports = router;
