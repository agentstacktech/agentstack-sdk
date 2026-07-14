import type { RefundStatusResult } from './RefundClient';

/** True when refund poll can stop (terminal buyer-visible state). */
export function isRefundPollTerminal(result: RefundStatusResult): boolean {
  const status = String(result.status ?? '');
  if (status === 'refunded') return true;
  if (result.compensation_completed === true) return true;
  if (result.compensation?.completed === true) return true;
  if (status === 'refund_requested' && result.compensation_skipped === true) {
    return true;
  }
  return false;
}
