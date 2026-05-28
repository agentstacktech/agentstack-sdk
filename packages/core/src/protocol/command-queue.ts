/**
 * Serializes async mutations so rapid calls run one-after-another (e.g. one browser tab).
 * Safe for Node: no DOM; no-op overhead if unused.
 */
export class SerialMutationQueue {
  private tail: Promise<unknown> = Promise.resolve();

  /**
   * Run `fn` after all previously enqueued work completes.
   */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(() => fn());
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}
