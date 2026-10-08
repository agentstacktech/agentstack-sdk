/**
 * Fleet run failure CTA labels — parity with MCP `run_detail.error_detail`.
 */

export const FLEET_RUN_RETRY_LABEL = 'Retry run';
export const FLEET_RUN_RERUN_LABEL = 'Rerun';

export type FleetRunErrorCtaInput = {
  status?: string | null;
  retryable?: boolean | null;
};

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

export function fleetRunRerunButtonLabel(input: FleetRunErrorCtaInput): string {
  const terminal = TERMINAL.has(String(input.status ?? '').toLowerCase());
  if (terminal && input.retryable === true) {
    return FLEET_RUN_RETRY_LABEL;
  }
  return FLEET_RUN_RERUN_LABEL;
}
