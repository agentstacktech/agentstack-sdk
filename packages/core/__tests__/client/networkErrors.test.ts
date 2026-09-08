import { describe, expect, it } from 'vitest';

import {
  isMissingAuthHeadersDetail,
  isTransientBrowserNetworkError,
} from '../../src/client/networkErrors';

describe('networkErrors', () => {
  it('treats Firefox brotli decode TypeError as transient', () => {
    expect(isTransientBrowserNetworkError(new TypeError('Decoding failed.'))).toBe(true);
  });

  it('treats Failed to fetch as transient', () => {
    expect(isTransientBrowserNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('ignores AbortError', () => {
    expect(isTransientBrowserNetworkError(new DOMException('Aborted', 'AbortError'))).toBe(false);
  });

  it('detects body already consumed TypeError', () => {
    expect(
      isTransientBrowserNetworkError(
        new TypeError('Response.text: Body has already been consumed.'),
      ),
    ).toBe(true);
  });

  it('isMissingAuthHeadersDetail matches string detail', () => {
    expect(isMissingAuthHeadersDetail('Missing required authentication headers')).toBe(true);
  });

  it('isMissingAuthHeadersDetail matches object detail', () => {
    expect(
      isMissingAuthHeadersDetail({ detail: 'Missing required authentication headers' }),
    ).toBe(true);
  });

  it('isMissingAuthHeadersDetail rejects unrelated errors', () => {
    expect(isMissingAuthHeadersDetail({ detail: 'Invalid token' })).toBe(false);
    expect(isMissingAuthHeadersDetail(null)).toBe(false);
  });

  it('isMissingAuthHeadersDetail matches nested FastAPI validation array', () => {
    expect(
      isMissingAuthHeadersDetail({
        detail: [{ msg: 'Missing required authentication headers' }],
      }),
    ).toBe(false);
    expect(
      isMissingAuthHeadersDetail({
        message: 'Missing required authentication headers',
      }),
    ).toBe(true);
  });
});
