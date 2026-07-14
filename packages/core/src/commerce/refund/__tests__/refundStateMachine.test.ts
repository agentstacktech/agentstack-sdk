import { isRefundPollTerminal } from '../refundStateMachine';

describe('isRefundPollTerminal', () => {
  it('returns true when status is refunded', () => {
    expect(isRefundPollTerminal({ order_id: 'o1', status: 'refunded' })).toBe(true);
  });

  it('returns true when wallet compensation completed', () => {
    expect(
      isRefundPollTerminal({
        order_id: 'o1',
        status: 'refund_requested',
        compensation_completed: true,
      }),
    ).toBe(true);
  });

  it('returns true when fiat manual pending (compensation skipped)', () => {
    expect(
      isRefundPollTerminal({
        order_id: 'o1',
        status: 'refund_requested',
        compensation_skipped: true,
        reason: 'rail_not_wallet_internal',
      }),
    ).toBe(true);
  });

  it('returns false while wallet refund still processing', () => {
    expect(
      isRefundPollTerminal({
        order_id: 'o1',
        status: 'refund_requested',
      }),
    ).toBe(false);
  });
});
