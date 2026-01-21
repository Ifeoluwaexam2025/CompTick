const request = require('supertest');
const app = require('../src/app');

describe('Auth API', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'testuser@example.com',
                password: 'Test1234!',
                role: 'USER'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', 'testuser@example.com');
        expect(res.body).toHaveProperty('role', 'USER');
    });

    it('should login with correct credentials', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'loginuser@example.com',
                password: 'Test1234!',
                role: 'USER'
            });
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'loginuser@example.com',
                password: 'Test1234!'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should not login with wrong password', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'wrongpass@example.com',
                password: 'Test1234!',
                role: 'USER'
            });
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'wrongpass@example.com',
                password: 'WrongPassword'
            });
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('message');
    });
});
