export type RailAvailability = 'available' | 'unavailable' | 'insufficient_balance';

export type RailContext = {
  allowedRails?: string[];
  spendableUsdtMinor?: number;
  cartTotalMinor?: number;
  isAuthenticated?: boolean;
};

export interface CheckoutRailAdapter {
  readonly id: string;
  readonly label: string;
  canUse(ctx: RailContext): RailAvailability;
}

const rails = new Map<string, CheckoutRailAdapter>();

export function registerRail(adapter: CheckoutRailAdapter): void {
  rails.set(adapter.id, adapter);
}

export function getRail(id: string): CheckoutRailAdapter | undefined {
  return rails.get(id);
}

export function listRails(ctx: RailContext = {}): Array<{
  id: string;
  label: string;
  availability: RailAvailability;
}> {
  const allowed = ctx.allowedRails;
  return [...rails.values()]
    .filter((r) => !allowed?.length || allowed.includes(r.id))
    .map((r) => ({
      id: r.id,
      label: r.label,
      availability: r.canUse(ctx),
    }));
}

function walletInternalAdapter(): CheckoutRailAdapter {
  return {
    id: 'wallet_internal',
    label: 'Wallet (USDT)',
    canUse(ctx) {
      if (ctx.isAuthenticated === false) return 'unavailable';
      const balance = ctx.spendableUsdtMinor;
      const total = ctx.cartTotalMinor;
      if (balance != null && total != null && balance < total) {
        return 'insufficient_balance';
      }
      return 'available';
    },
  };
}

function paymentsFiatAdapter(): CheckoutRailAdapter {
  return {
    id: 'payments_fiat',
    label: 'Card / Fiat',
    canUse(ctx) {
      if (ctx.isAuthenticated === false) return 'unavailable';
      return 'available';
    },
  };
}

/** Register built-in checkout rails (OCP — AGNT and others register via registerRail). */
export function registerDefaultRails(): void {
  registerRail(walletInternalAdapter());
  registerRail(paymentsFiatAdapter());
}

registerDefaultRails();
