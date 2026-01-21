const { canTransition } = require('../../src/requests/request.rules');

describe('Request Status Rules', () => {
  it('allows valid transitions', () => {
    expect(canTransition('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
  });
  it('blocks invalid transitions', () => {
    expect(canTransition('OPEN', 'RESOLVED')).toBe(false);
    expect(canTransition('RESOLVED', 'OPEN')).toBe(false);
  });
});
