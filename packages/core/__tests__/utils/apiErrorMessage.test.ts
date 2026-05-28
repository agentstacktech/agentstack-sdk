import { getApiErrorMessage, httpErrorStatus } from '../../src/utils/apiErrorMessage';

describe('getApiErrorMessage', () => {
  it('returns string errors as-is', () => {
    expect(getApiErrorMessage('oops')).toBe('oops');
  });

  it('reads axios-like response.data.detail string', () => {
    expect(
      getApiErrorMessage({
        response: { data: { detail: 'Not found' } },
      })
    ).toBe('Not found');
  });

  it('extracts status from response', () => {
    expect(httpErrorStatus({ response: { status: 422 } })).toBe(422);
  });
});
