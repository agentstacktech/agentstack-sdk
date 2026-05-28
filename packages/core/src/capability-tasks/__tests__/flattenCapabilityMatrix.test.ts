import { describe, expect, it } from 'vitest';

import { buildCapabilityMatrix, flattenCapabilityMatrix } from '../../platform-surface';

describe('flattenCapabilityMatrix', () => {
  it('maps platform and domain entries by id', () => {
    const matrix = buildCapabilityMatrix('0.4.13', 'gen1', { storage: true });
    const flat = flattenCapabilityMatrix(matrix);
    expect(flat.http).toBe(true);
    expect(flat.storage).toBe(true);
    expect(matrix.tasks.length).toBeGreaterThan(0);
  });
});
