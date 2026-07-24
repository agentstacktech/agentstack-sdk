/**
 * Session OS V3.3 — browser access_token helpers (Jest).
 */
import {
  pickFresherAccessToken,
  readBrowserAccessToken,
  writeBrowserAccessToken,
  clearBrowserAccessToken,
  clearBrowserAccessTokenIfJtiPrefix,
} from '../browserAccessToken';

function jwt(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  return `hdr.${b64}.sig`;
}

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

describe('browserAccessToken', () => {
  beforeEach(() => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    (globalThis as any).window = {
      sessionStorage: session,
      localStorage: local,
    };
    (globalThis as any).sessionStorage = session;
    (globalThis as any).localStorage = local;
    (globalThis as any).btoa = (s: string) =>
      Buffer.from(s, 'utf8').toString('base64');
    (globalThis as any).atob = (s: string) =>
      Buffer.from(s, 'base64').toString('utf8');
  });

  it('pickFresherAccessToken prefers higher iat', () => {
    const older = jwt({ iat: 1 });
    const newer = jwt({ iat: 99 });
    expect(pickFresherAccessToken(older, newer)).toBe(newer);
  });

  it('write mirrors session + local; read picks fresher', () => {
    writeBrowserAccessToken(jwt({ iat: 10, jti: 'aa' }));
    expect(sessionStorage.getItem('access_token')).toBeTruthy();
    expect(localStorage.getItem('access_token')).toBeTruthy();
    localStorage.setItem('access_token', jwt({ iat: 50, jti: 'bb' }));
    const fresher = readBrowserAccessToken();
    expect(fresher).toBe(jwt({ iat: 50, jti: 'bb' }));
  });

  it('clearBrowserAccessToken clears both', () => {
    writeBrowserAccessToken('tok');
    clearBrowserAccessToken();
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('clearBrowserAccessTokenIfJtiPrefix', () => {
    const tok = jwt({ jti: 'abcd1234eeee' });
    writeBrowserAccessToken(tok);
    expect(clearBrowserAccessTokenIfJtiPrefix('abcd1234')).toBe(true);
    expect(readBrowserAccessToken()).toBe('');
  });
});
