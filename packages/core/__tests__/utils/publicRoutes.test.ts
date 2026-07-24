/**
 * SDK public route classifier — parity with SPA (G1).
 */
import {
  isAuthenticatedShellRoute,
  isGuestCommerceRoute,
  isHostedGuestRoute,
  isMarketingPublicRoute,
  isSdkPublicRoute,
} from '../../src/utils/publicRoutes';

describe('SDK publicRoutes', () => {
  it('does not treat /user/shop/checkout as SDK public', () => {
    expect(isSdkPublicRoute('/user/shop/checkout/x')).toBe(false);
    expect(isAuthenticatedShellRoute('/user/shop/checkout/x')).toBe(true);
    expect(isGuestCommerceRoute('/user/shop/checkout/x')).toBe(true);
  });

  it('keeps marketing + hosted public', () => {
    expect(isMarketingPublicRoute('/login')).toBe(true);
    expect(isSdkPublicRoute('/login')).toBe(true);
    expect(isHostedGuestRoute('/s/1438/x')).toBe(true);
    expect(isSdkPublicRoute('/s/1438/x')).toBe(true);
  });

  it('does not prefix-trap /dev shell', () => {
    expect(isSdkPublicRoute('/dev')).toBe(false);
    expect(isSdkPublicRoute('/dev/docs/build')).toBe(false);
  });
});
