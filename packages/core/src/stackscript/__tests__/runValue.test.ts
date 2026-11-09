import { describe, expect, it } from 'vitest';
import { getStackscriptRunValue } from '../client';

describe('getStackscriptRunValue', () => {
  it('reads data.value', () => {
    expect(getStackscriptRunValue({ ok: true, data: { value: 5 } })).toBe(5);
  });

  it('prefers top-level value', () => {
    expect(getStackscriptRunValue({ value: 3, data: { value: 5 } })).toBe(3);
  });
});
