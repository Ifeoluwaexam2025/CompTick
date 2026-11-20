const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

module.exports = { generateToken, verifyToken };
