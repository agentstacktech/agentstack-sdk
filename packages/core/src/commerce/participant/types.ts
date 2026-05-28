export type HoldingRow = {
  asset_id: string;
  quantity: number;
  available: number;
  locked_quantity: number;
  source?: string;
  updated_at?: string;
};

export type WalletSummary = {
  holdings: HoldingRow[];
  holdings_count: number;
  recent_orders: unknown[];
  project_id?: number | null;
};
