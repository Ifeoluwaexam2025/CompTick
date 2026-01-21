const request = require('supertest');
const app = require('../../src/app');

describe('Auth API', () => {
  const testUser = {
    email: 'jestuser@example.com',
    password: 'Test1234!',
    role: 'USER'
  };

  it('POST /api/auth/register should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', testUser.email);
    expect(res.body).toHaveProperty('role', testUser.role);
  });

  it('POST /api/auth/login should return a JWT token', async () => {
    // Ensure user exists
    await request(app).post('/api/auth/register').send({
      email: 'jestlogin@example.com',
      password: 'Test1234!',
      role: 'USER'
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jestlogin@example.com',
        password: 'Test1234!'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/login should fail with wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'jestfail@example.com',
      password: 'Test1234!',
      role: 'USER'
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jestfail@example.com',
        password: 'WrongPassword'
      });
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message');
  });
});
