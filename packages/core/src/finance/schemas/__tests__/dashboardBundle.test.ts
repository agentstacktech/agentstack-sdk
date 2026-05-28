import { FinanceDashboardBundleSchema } from '../dashboardBundle';

describe('FinanceDashboardBundleSchema', () => {
  it('accepts ledger slices without wallet_id (null omitted)', () => {
    const parsed = FinanceDashboardBundleSchema.parse({
      project_id: 1,
      portfolio: {
        user_id: 1,
        ecosystem_project_id: 1,
        slices: [
          {
            rail: 'payments_usdt',
            symbol: 'USD',
            available_atomic: 100,
            locked_atomic: 0,
            display_decimal: '1.00',
            as_of_iso: '2026-05-24T00:00:00Z',
            wallet_id: 'w1',
            storage: 'money',
          },
          {
            rail: 'native_agnt',
            symbol: 'AGNT',
            available_atomic: 50,
            locked_atomic: 0,
            display_decimal: '0.50',
            as_of_iso: '2026-05-24T00:00:00Z',
            storage: 'ledger',
          },
        ],
      },
      billing_status: {},
      activity_preview: { items: [] },
      rails_summary: { slice_count: 2, has_agnt: true },
      payments_summary: { count: 3, completed: 2, pending_display: '1.00 USD' },
    });
    expect(parsed.portfolio.slices[1].wallet_id).toBeUndefined();
    expect(parsed.payments_summary?.count).toBe(3);
    expect(parsed.portfolio.slices[1].storage).toBe('ledger');
  });

  it('accepts explicit null wallet_id from legacy API', () => {
    const parsed = FinanceDashboardBundleSchema.parse({
      project_id: 1,
      portfolio: {
        user_id: 1,
        ecosystem_project_id: 1,
        slices: [
          {
            rail: 'vault_agusd',
            symbol: 'agUSD',
            available_atomic: 1,
            locked_atomic: 0,
            display_decimal: '0.01',
            as_of_iso: '2026-05-24T00:00:00Z',
            wallet_id: null,
            storage: null,
          },
        ],
      },
      billing_status: {},
      activity_preview: { items: [] },
      rails_summary: { slice_count: 1, has_agnt: false },
    });
    expect(parsed.portfolio.slices[0].wallet_id).toBeNull();
  });
});
