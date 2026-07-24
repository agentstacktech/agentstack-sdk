import { RequestBatcher } from '../../src/utils/request-batcher';

describe('RequestBatcher abort', () => {
  it('rejects queued GET when signal aborts before flush', async () => {
    const batcher = new RequestBatcher('http://localhost', () => ({}), {
      batchTimeout: 5000,
      maxBatchWaitMs: 5000,
    });
    const controller = new AbortController();
    const promise = batcher.add({
      id: 'req-1',
      method: 'GET',
      url: '/projects',
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    batcher.clear();
  });

  it('rejects immediately when signal already aborted', async () => {
    const batcher = new RequestBatcher('http://localhost', () => ({}));
    const controller = new AbortController();
    controller.abort();
    await expect(
      batcher.add({
        id: 'req-2',
        method: 'GET',
        url: '/dna/data',
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
