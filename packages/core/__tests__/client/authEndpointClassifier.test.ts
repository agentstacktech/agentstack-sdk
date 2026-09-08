import {
  extractAuthResponseCode,
  isExpectedAuthMintPollResponse,
  isAuthMintCredentialPath,
} from '../../src/client/authEndpointClassifier';

describe('authEndpointClassifier mint poll', () => {
  it('extractAuthResponseCode reads root and detail.code', () => {
    expect(extractAuthResponseCode({ code: 'switch_in_progress' })).toBe(
      'switch_in_progress',
    );
    expect(
      extractAuthResponseCode({
        detail: { code: 'auth_mint_in_progress', message: 'retry' },
      }),
    ).toBe('auth_mint_in_progress');
  });

  it('isExpectedAuthMintPollResponse matches switch 409 poll', () => {
    expect(
      isExpectedAuthMintPollResponse('/api/auth/switch-project', 409, {
        code: 'switch_in_progress',
      }),
    ).toBe(true);
  });

  it('isExpectedAuthMintPollResponse matches login mint 503 poll', () => {
    expect(
      isExpectedAuthMintPollResponse('/api/auth/login', 503, {
        code: 'auth_mint_in_progress',
      }),
    ).toBe(true);
  });

  it('isExpectedAuthMintPollResponse rejects unrelated 409', () => {
    expect(
      isExpectedAuthMintPollResponse('/api/projects/2/overview', 409, {
        code: 'switch_in_progress',
      }),
    ).toBe(false);
  });
});

describe('isAuthMintCredentialPath', () => {
  it('matches login, register, refresh, switch-project', () => {
    expect(isAuthMintCredentialPath('/api/auth/login')).toBe(true);
    expect(isAuthMintCredentialPath('/auth/register')).toBe(true);
    expect(isAuthMintCredentialPath('/api/auth/refresh')).toBe(true);
    expect(isAuthMintCredentialPath('/api/auth/switch-project')).toBe(true);
  });

  it('does not match session reads or batch', () => {
    expect(isAuthMintCredentialPath('/api/auth/me')).toBe(false);
    expect(isAuthMintCredentialPath('/api/batch')).toBe(false);
    expect(isAuthMintCredentialPath('/shell/dev-home-snapshot')).toBe(false);
  });
});
