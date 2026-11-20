const { insertUser, findLoginAccount } = require('./auth.repository');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateToken } = require('../../utils/jwt');
const { validateRegister } = require('./auth.validation');
const HttpError = require('../../utils/http-error');

async function registerUser(data) {
    validateRegister(data);
    const hashed = await hashPassword(data.password);
    const user = await insertUser(data.email, hashed);
    if (!user) throw new HttpError(409, 'Account already exists');
    return user;
}

async function loginUser(email, password) {
    const user = await findLoginAccount(email);
    if (!user || !(await comparePassword(password, user.password_hash))) {
        throw new HttpError(401, 'Invalid credentials');
    }
    return generateToken({ id: user.id, role: user.role });
}

module.exports = { registerUser, loginUser };
