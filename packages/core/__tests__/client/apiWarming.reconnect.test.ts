/**
 * Backend reconnect detection — deploy recycle must not logout (G-A24).
 */
import {
  isBackendReconnectingError,
  isAuthTransientRetryError,
} from '../../src/client/apiWarming';
import { UnauthorizedError } from '../../src/types/shared/HTTPTypes';

describe('isBackendReconnectingError', () => {
  it('treats warming and session_resolve_busy as reconnecting', () => {
    expect(isBackendReconnectingError({ status: 503, apiCode: 'api_warming_up' })).toBe(true);
    expect(isBackendReconnectingError({ status: 503, apiCode: 'session_resolve_busy' })).toBe(true);
    expect(isAuthTransientRetryError({ status: 503, apiCode: 'dna_timeout' })).toBe(true);
  });

  it('treats transient session miss as reconnecting', () => {
    expect(
      isBackendReconnectingError(
        new UnauthorizedError('miss', {
          status: 401,
          code: 'session_not_found',
          sessionMissReason: 'absent',
        }),
      ),
    ).toBe(true);
  });

  it('does not treat terminal 401 as reconnecting', () => {
    expect(
      isBackendReconnectingError(
        new UnauthorizedError('expired', { status: 401, code: 'session_expired' }),
      ),
    ).toBe(false);
  });
});
