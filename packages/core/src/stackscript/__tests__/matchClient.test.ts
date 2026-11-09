import { describe, expect, it } from 'vitest';

import { buildMatchTurnIdempotencyKey } from '../matchClient';

describe('buildMatchTurnIdempotencyKey', () => {
  it('formats stable turn key', () => {
    expect(buildMatchTurnIdempotencyKey('r1', 3, 'u7', 'applyTurn')).toBe(
      'r1:3:u7:applyTurn',
    );
  });
});
