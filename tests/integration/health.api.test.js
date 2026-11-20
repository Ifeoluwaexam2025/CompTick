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

test('allows cross-origin API calls from the configured client origin only', async () => {
    const origin = 'https://client.example.com';
    const previous = process.env.CLIENT_ORIGIN;
    process.env.CLIENT_ORIGIN = origin;
    try {
        await request(app).options('/api/requests').set('Origin', origin)
            .set('Access-Control-Request-Method', 'PATCH').expect(204)
            .expect('Access-Control-Allow-Origin', origin)
            .expect('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        const other = await request(app).get('/api/health').set('Origin', 'https://other.example.com').expect(200);
        expect(other.headers['access-control-allow-origin']).toBeUndefined();
        await request(app).get('/api/health').set('Origin', origin).expect(200)
            .expect('Access-Control-Allow-Origin', origin);
    } finally {
        if (previous === undefined) delete process.env.CLIENT_ORIGIN;
        else process.env.CLIENT_ORIGIN = previous;
    }
});
