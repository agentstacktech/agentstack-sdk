import { describe, expect, it } from '@jest/globals';

import vectors from '../../src/client/__fixtures__/scopeBindingVectors.json';
import { resolveRequestProjectContext } from '../../src/client/resolveRequestProjectContext';

type Vector = {
  id: string;
  input: Record<string, unknown>;
  expect: { mode: string; projectId: number; hasBearer: boolean };
};

describe('scopeBindingVectors parity (SDK)', () => {
  it.each(vectors as Vector[])('$id', ({ input, expect: exp }) => {
    const r = resolveRequestProjectContext(input as Parameters<typeof resolveRequestProjectContext>[0]);
    expect(r.mode).toBe(exp.mode);
    expect(r.projectId).toBe(exp.projectId);
    expect(Boolean(r.bearer)).toBe(exp.hasBearer);
  });
});
