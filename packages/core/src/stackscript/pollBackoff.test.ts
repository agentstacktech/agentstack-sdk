import { describe, expect, it } from 'vitest';
import { pollBackoffMs } from './pollBackoff';

describe('pollBackoffMs', () => {
  it('caps exponential growth', () => {
    expect(pollBackoffMs(0)).toBe(200);
    expect(pollBackoffMs(1)).toBe(400);
    expect(pollBackoffMs(10)).toBe(2000);
  });
});
