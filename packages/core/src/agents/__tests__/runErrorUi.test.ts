import { describe, expect, it } from 'vitest';

import { fleetRunRerunButtonLabel, FLEET_RUN_RETRY_LABEL, FLEET_RUN_RERUN_LABEL } from '../runErrorUi';

describe('fleetRunRerunButtonLabel', () => {
  it('uses retry label for terminal failed retryable runs', () => {
    expect(
      fleetRunRerunButtonLabel({ status: 'failed', retryable: true }),
    ).toBe(FLEET_RUN_RETRY_LABEL);
  });

  it('uses rerun label otherwise', () => {
    expect(fleetRunRerunButtonLabel({ status: 'running', retryable: true })).toBe(
      FLEET_RUN_RERUN_LABEL,
    );
  });
});
