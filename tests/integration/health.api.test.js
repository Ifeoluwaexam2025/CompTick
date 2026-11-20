require('../setup');
const request = require('supertest');
const app = require('../../src/app');

describe('Health API', () => {
  it('GET /api/health should return status ok and a timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});

test('unknown routes use the JSON error format', async () => {
    await request(app).get('/api/missing').expect(404, { message: 'Route not found' });
});
