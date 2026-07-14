import { applyCsrfHeader, readCsrfTokenFromCookie, shouldIncludeCredentials } from '../../src/security/csrf';

describe('csrf helpers', () => {
  const originalDocument = global.document;
  const originalWindow = global.window;

  afterEach(() => {
    Object.defineProperty(global, 'document', { value: originalDocument, configurable: true });
    Object.defineProperty(global, 'window', { value: originalWindow, configurable: true });
  });

  it('reads csrf_token from document.cookie', () => {
    Object.defineProperty(global, 'document', {
      value: { cookie: 'other=1; csrf_token=tok%2Fabc; x=2' },
      configurable: true,
    });
    expect(readCsrfTokenFromCookie()).toBe('tok/abc');
  });

  it('applyCsrfHeader sets X-CSRF-Token', () => {
    Object.defineProperty(global, 'document', {
      value: { cookie: 'csrf_token=abc123' },
      configurable: true,
    });
    const headers: Record<string, string> = {};
    applyCsrfHeader(headers);
    expect(headers['X-CSRF-Token']).toBe('abc123');
  });

  it('shouldIncludeCredentials for cookie-only POST', () => {
    Object.defineProperty(global, 'window', { value: {}, configurable: true });
    expect(shouldIncludeCredentials('POST', {})).toBe(true);
    expect(shouldIncludeCredentials('POST', { Authorization: 'Bearer jwt' })).toBe(false);
    expect(shouldIncludeCredentials('GET', {})).toBe(false);
  });
});
