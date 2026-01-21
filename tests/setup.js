const db = require('../src/config/database');

beforeAll(async () => {
  // Optionally truncate tables for a clean test environment
  await db.query('DELETE FROM request_audits');
  await db.query('DELETE FROM service_requests');
  await db.query('DELETE FROM users');
});

afterAll(async () => {
  await db.end();
});
