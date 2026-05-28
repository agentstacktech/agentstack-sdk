import { AssetInExchange } from './Asset';
import { CommissionBreakdown } from './Listing';

/**
 * Exchange History - история обменов
 * 
 * AI AGENT QUICK START:
 * 
 * Get history:
 *   const history = await sdk.marketplace.getHistory({ project_id: 999 })
 * 
 * STORAGE: 
 * - Full: execution_ecosystem_logs (service_name='exchange')
 * - UI: data_projects_project.data.money.exchange_history[]
 * - UI: data_projects_user.data.money.exchange_history[]
 */

/**
 * Exchange History Type
 */
export type ExchangeHistoryType = 'outgoing' | 'incoming';

/**
 * Exchange History Status
 */
export type ExchangeHistoryStatus = 'completed' | 'cancelled' | 'failed';

/**
 * Commissions Paid
 */
export interface CommissionsPaid {
  /**
   * Ecosystem commission
   */
  ecosystem?: string;

  /**
   * Project commission
   */
  project?: string;
}

/**
 * Exchange History Entry (for UI)
 * Stored in data_projects_project.data.money.exchange_history[] or data_projects_user.data.money.exchange_history[]
 */
export interface ExchangeHistoryEntry {
  /**
   * Deal ID (listing UUID)
   */
  deal_id: string;

  /**
   * Exchange type
   */
  type: ExchangeHistoryType;

  /**
   * Partner ID
   */
  partner_id: number;

  /**
   * Partner project ID
   */
  partner_project_id: number;

  /**
   * Assets sent
   */
  assets_sent: AssetInExchange[];

  /**
   * Assets received
   */
  assets_received: AssetInExchange[];

  /**
   * Commissions paid
   */
  commissions_paid: CommissionsPaid;

  /**
   * Timestamp
   */
  timestamp: string;

  /**
   * Status
   */
  status: ExchangeHistoryStatus;
}

/**
 * Full Exchange History Entry (from execution_ecosystem_logs)
 */
export interface FullExchangeHistoryEntry {
  /**
   * Log UUID
   */
  uuid: string;

  /**
   * Project ID
   */
  project_id: number;

  /**
   * User ID
   */
  user_id: number;

  /**
   * Service name (always 'exchange')
   */
  service_name: string;

  /**
   * Operation (deal_completed, deal_cancelled, etc.)
   */
  operation: string;

  /**
   * Deal ID (listing UUID)
   */
  deal_id: string;

  /**
   * Listing type
   */
  listing_type: string;

  /**
   * Seller ID
   */
  seller_id: number;

  /**
   * Buyer ID
   */
  buyer_id: number;

  /**
   * Assets exchanged
   */
  assets_exchanged: {
    seller_sent: AssetInExchange[];
    buyer_sent: AssetInExchange[];
  };

  /**
   * Commissions
   */
  commissions: {
    ecosystem?: CommissionBreakdown;
    seller_project?: CommissionBreakdown;
    buyer_project?: CommissionBreakdown;
  };

  /**
   * Timestamp
   */
  timestamp: string;

  /**
   * Success
   */
  success: boolean;

  /**
   * Created at
   */
  created_at: string;
}

