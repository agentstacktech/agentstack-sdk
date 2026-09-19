import { RequestBatcher } from '../../src/utils/request-batcher';

describe('RequestBatcher transport retry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('retries batch POST on 503 then succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Retry-After': '1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          results: [{ id: 'a', status: 200, data: { ok: true } }],
          total: 1,
          successful: 1,
          failed: 0,
        }),
      });

    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const batcher = new RequestBatcher(
      'http://localhost:8000/api',
      () => ({ Authorization: 'Bearer test' }),
      { batchTimeout: 10, maxBatchWaitMs: 20 },
    );

    const promise = batcher.add({
      id: 'a',
      method: 'GET',
      url: '/projects',
    });

    await jest.advanceTimersByTimeAsync(50);
    await jest.advanceTimersByTimeAsync(1100);

    const data = await promise;
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('defers flush when shouldDeferFlush is true', async () => {
    const fetchMock = jest.fn();
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const batcher = new RequestBatcher(
      'http://localhost:8000/api',
      () => ({ Authorization: 'Bearer test' }),
      {
        batchTimeout: 10,
        maxBatchWaitMs: 20,
        shouldDeferFlush: () => true,
      },
    );

    void batcher.add({
      id: 'c',
      method: 'GET',
      url: '/projects',
    });

    await jest.advanceTimersByTimeAsync(50);
    await jest.advanceTimersByTimeAsync(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips flush when bearer is missing', async () => {
    const fetchMock = jest.fn();
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    const batcher = new RequestBatcher(
      'http://localhost:8000/api',
      () => ({}),
      { batchTimeout: 10, maxBatchWaitMs: 20 },
    );

    const promise = batcher.add({
      id: 'b',
      method: 'GET',
      url: '/projects',
    });
    const assertion = expect(promise).rejects.toThrow(/missing bearer/i);

    await jest.advanceTimersByTimeAsync(50);
    await assertion;
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
