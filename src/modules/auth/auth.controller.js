const authService = require('./auth.service');
const { validateLogin } = require('./auth.validation');

async function register(req, res, next) {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json({ id: user.id, email: user.email, role: user.role });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        validateLogin(req.body);
        const token = await authService.loginUser(req.body.email, req.body.password);
        res.json({ token });
    } catch (err) {
        next(err);
    }
}

function currentUser(req, res) {
    res.set('Cache-Control', 'no-store');
    res.json({ id: req.user.id, role: req.user.role });
}

module.exports = { register, login, currentUser };
