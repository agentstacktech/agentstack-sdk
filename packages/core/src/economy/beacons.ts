/** Client economy observability beacons (`economy.*`). */
export const economyBeacons = {
  quoteExpired: 'economy.quote.expired_client',
  paidRunStarted: 'economy.paid_run.started',
  paidRunCompleted: 'economy.paid_run.completed',
  receiptVerifyFailed: 'economy.receipt.verify_failed',
} as const;
