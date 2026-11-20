const router = require('express').Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { register, login, currentUser } = require('./auth.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, currentUser);

module.exports = router;
