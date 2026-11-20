require('../setup');

jest.mock('../../src/config/database', () => ({ query: jest.fn() }));

const db = require('../../src/config/database');
const { registerUser, loginUser } = require('../../src/modules/auth/auth.service');
const { comparePassword } = require('../../src/utils/password');

beforeEach(() => jest.clearAllMocks());

test('rejects an administrator role before touching the database', async () => {
    await expect(registerUser({
        email: 'example@example.com', password: 'example-password', role: 'ADMIN'
    })).rejects.toMatchObject({ status: 400 });
    expect(db.query).not.toHaveBeenCalled();
});

test('hashes the password before insertion', async () => {
    const user = { id: 'example-id', email: 'example@example.com', role: 'USER' };
    const password = 'example-password';
    db.query.mockResolvedValue({ rowCount: 1, rows: [user] });

    await expect(registerUser({ email: user.email, password })).resolves.toEqual(user);
    const [, [email, hash]] = db.query.mock.calls[0];
    expect(email).toBe(user.email);
    expect(hash).not.toBe(password);
    await expect(comparePassword(password, hash)).resolves.toBe(true);
});

test('rejects credentials for a missing account', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(loginUser('missing@example.com', 'example-password')).rejects.toMatchObject({ status: 401 });
});
