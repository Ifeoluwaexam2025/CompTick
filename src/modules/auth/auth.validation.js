function validateRegister(data) {
    if (!data.email || !data.password) throw new Error('Email and password required');
    if (!['USER', 'ADMIN'].includes(data.role || 'USER')) throw new Error('Invalid role');
}

function validateLogin(data) {
    if (!data.email || !data.password) throw new Error('Email and password required');
}

module.exports = { validateRegister, validateLogin };
