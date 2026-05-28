import { pageUrlMatchesServiceWorkerScope } from '../../src/pwa/serviceWorkerBestRegistration';

describe('pageUrlMatchesServiceWorkerScope', () => {
  it('returns true when href or scope missing', () => {
    expect(pageUrlMatchesServiceWorkerScope('', 'https://x.com/app/')).toBe(true);
    expect(pageUrlMatchesServiceWorkerScope('https://x.com/app/chat', '')).toBe(true);
  });

  it('matches when page path is under scope path (same origin)', () => {
    expect(
      pageUrlMatchesServiceWorkerScope('https://ex.com/app/messenger', 'https://ex.com/app/')
    ).toBe(true);
    expect(
      pageUrlMatchesServiceWorkerScope('https://ex.com/other', 'https://ex.com/app/')
    ).toBe(false);
  });
});
