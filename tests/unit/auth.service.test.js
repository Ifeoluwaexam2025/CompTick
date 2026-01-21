const authService = require('../../src/modules/auth/auth.service');

describe('Auth Service', () => {
  it('should hash and verify passwords', async () => {
    const password = 'Test1234!';
    const hashed = await authService.registerUser({ email: 'unituser@example.com', password, role: 'USER' });
    expect(hashed).toHaveProperty('id');
    expect(hashed).toHaveProperty('email', 'unituser@example.com');
  });

  it('should throw on invalid login', async () => {
    await expect(authService.loginUser('notfound@example.com', 'badpass')).rejects.toThrow();
  });
});
