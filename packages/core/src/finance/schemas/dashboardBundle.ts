import { z } from 'zod';

export const FinanceRailSchema = z.enum([
  'payments_usdt',
  'vault_agusd',
  'native_agnt',
  'project_custom',
  'project_treasury_fiat',
]);

export const RailBalanceSliceSchema = z.object({
  rail: FinanceRailSchema,
  symbol: z.string(),
  available_atomic: z.number(),
  locked_atomic: z.number(),
  display_decimal: z.string(),
  as_of_iso: z.string(),
  project_id: z.number().optional(),
  /** Ledger-native rails (AGNT/agUSD) omit wallet; API may send null. */
  wallet_id: z.string().nullish(),
  storage: z.string().nullish(),
  explorer_url: z.string().nullable().optional(),
  reconciliation_ok: z.boolean().nullable().optional(),
});

export const FinancePortfolioSnapshotSchema = z.object({
  user_id: z.number(),
  ecosystem_project_id: z.number(),
  slices: z.array(RailBalanceSliceSchema),
  total_usd_estimate: z.string().nullable().optional(),
});

export const ActivityRowSchema = z.object({
  id: z.string(),
  kind: z.string(),
  amount_display: z.string(),
  rail: z.string().nullable().optional(),
  project_id: z.number().nullable().optional(),
  created_at: z.string(),
  trace_id: z.string().nullable().optional(),
  counterparty_label: z.string().nullable().optional(),
  source_tag: z.string().nullable().optional(),
  icon_kind: z.string().nullable().optional(),
  deep_link: z.string().nullable().optional(),
});

export const FinanceDashboardBundleSchema = z.object({
  project_id: z.number(),
  portfolio: FinancePortfolioSnapshotSchema,
  billing_status: z.record(z.unknown()),
  activity_preview: z.object({
    items: z.array(ActivityRowSchema),
    next_cursor: z.string().nullable().optional(),
    total_hint: z.number().optional(),
  }),
  rails_summary: z.object({
    slice_count: z.number(),
    has_agnt: z.boolean(),
  }),
  funding_summary: z
    .object({
      vault_available: z.boolean().optional(),
      has_pending_offer: z.boolean().optional(),
    })
    .optional(),
  payments_summary: z
    .object({
      count: z.number(),
      completed: z.number(),
      pending_display: z.string().nullable().optional(),
    })
    .optional(),
});

export type FinanceDashboardBundle = z.infer<typeof FinanceDashboardBundleSchema>;
export type FinanceActivityRow = z.infer<typeof ActivityRowSchema>;
