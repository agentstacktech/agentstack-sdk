import { describe, expect, it } from '@jest/globals';
import {
  classifyAuthFailure,
  isNonRetryableAuthOrShed,
  isTransientSessionBootstrapError,
  isTransientSessionMissReason,
  shouldPurgeClientSessionOnMiss,
  isTypedDna503Code,
} from '../../src/utils/classifyAuthFailure';
import { UnauthorizedError } from '../../src/types/shared/HTTPTypes';

describe('classifyAuthFailure', () => {
  it('classifies typed 503 DNA codes', () => {
    for (const code of [
      'dna_timeout',
      'auth_me_db_timeout',
      'project_key_unavailable',
      'auth_mint_in_progress',
      'dna_overloaded',
      'auth_mint_timeout',
    ]) {
      expect(classifyAuthFailure({ status: 503, apiCode: code })).toEqual({
        kind: 'typed_503',
        code,
      });
    }
  });

  it('classifies timeout transport', () => {
    expect(classifyAuthFailure({ name: 'TimeoutError', message: 'aborted' })).toEqual({
      kind: 'timeout',
    });
    expect(classifyAuthFailure({ code: 'ECONNABORTED', message: 'timeout' })).toEqual({
      kind: 'timeout',
    });
  });

  it('classifies offline / network', () => {
    expect(classifyAuthFailure({ name: 'NetworkError', message: 'fetch failed' })).toEqual({
      kind: 'offline',
    });
    expect(classifyAuthFailure({ code: 'ERR_NETWORK' })).toEqual({ kind: 'offline' });
    expect(classifyAuthFailure({ message: 'Network error' })).toEqual({ kind: 'offline' });
  });

  it('does not treat circuit-open as offline (G-A159)', () => {
    expect(
      classifyAuthFailure({
        message: 'Circuit breaker open! Retry in 5s. (5 consecutive failures)',
      }),
    ).toEqual({ kind: 'unknown', code: 'circuit_open' });
  });

  it('classifies unauthorized', () => {
    expect(classifyAuthFailure({ status: 401, name: 'UnauthorizedError' })).toEqual({
      kind: 'unauthorized',
    });
  });

  it('isTypedDna503Code guards admission codes', () => {
    expect(isTypedDna503Code('dna_overloaded')).toBe(true);
    expect(isTypedDna503Code('batch_sub_timeout')).toBe(false);
  });

  it('isNonRetryableAuthOrShed covers typed DNA shed codes', () => {
    for (const code of ['dna_overloaded', 'dna_timeout', 'auth_me_db_timeout']) {
      expect(isNonRetryableAuthOrShed({ status: 503, apiCode: code })).toBe(true);
    }
    expect(isNonRetryableAuthOrShed({ status: 500, message: 'boom' })).toBe(false);
  });

  it('isNonRetryableAuthOrShed treats 403 and server_busy as final', () => {
    expect(isNonRetryableAuthOrShed({ status: 403, apiCode: 'forbidden' })).toBe(true);
    expect(isNonRetryableAuthOrShed({ status: 503, apiCode: 'server_busy' })).toBe(true);
  });

  it('isTransientSessionMissReason covers post-restart races (G-A24)', () => {
    expect(isTransientSessionMissReason('absent')).toBe(true);
    expect(isTransientSessionMissReason('session_resolve_busy')).toBe(true);
    expect(isTransientSessionMissReason('dna_timeout')).toBe(true);
    expect(isTransientSessionMissReason('terminated')).toBe(false);
  });

  it('shouldPurgeClientSessionOnMiss respects grace and transient reasons', () => {
    expect(shouldPurgeClientSessionOnMiss({ reason: 'absent' })).toBe(false);
    expect(
      shouldPurgeClientSessionOnMiss({ reason: 'terminated', inPostLoginGrace: true }),
    ).toBe(false);
    expect(shouldPurgeClientSessionOnMiss({ reason: 'terminated' })).toBe(true);
  });

  it('isTransientSessionBootstrapError covers UnauthorizedError with absent reason', () => {
    const err = new UnauthorizedError('miss', {
      code: 'session_not_found',
      sessionMissReason: 'absent',
    });
    expect(isTransientSessionBootstrapError(err)).toBe(true);
  });

  it('isNonRetryableAuthOrShed allows RQ retry on transient session_not_found', () => {
    const err = new UnauthorizedError('miss', {
      status: 401,
      code: 'session_not_found',
      sessionMissReason: 'absent',
    });
    expect(isNonRetryableAuthOrShed(err)).toBe(false);
  });
});
