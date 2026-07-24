import { describe, expect, it } from 'vitest';
import {
  classifyAuthFailure,
  isNonRetryableAuthOrShed,
  isTypedDna503Code,
} from '../../src/utils/classifyAuthFailure';

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
});
