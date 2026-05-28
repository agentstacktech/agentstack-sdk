/**
 * WalletRules - правила для wallet системы (JSONB в projects.settings)
 * 
 * AI AGENT QUICK START:
 * 
 * Gaming: 100 wallets, negative balance allowed
 * E-commerce: 5 wallets, strict validation
 * AgentPay: 1 wallet, KYC rules
 * 
 * Example:
 *   settings: {
 *     wallet_rules: {
 *       limits: { max_wallets_per_user: 100 },
 *       features: { allow_negative_balance: true }
 *     }
 *   }
 */

export interface WalletRules {
  /** Version для backwards compatibility */
  version?: string;
  
  /** Limits для wallets и currencies */
  limits: {
    /** Max wallets per user (-1 = unlimited, default: 10) */
    max_wallets_per_user: number;
    
    /** Max currencies per wallet (-1 = unlimited, default: 50) */
    max_currencies_per_wallet: number;
    
    /** Max transaction history (default: 1000) */
    max_transaction_history: number;
    
    /** Max balance per currency (-1 = unlimited) */
    max_balance_per_currency?: string;
    
    /** Wallet name length */
    min_wallet_name_length?: number;
    max_wallet_name_length?: number;
  };
  
  /** Validation rules */
  validation: {
    /** Currency code format */
    currency_code: {
      min_length: number;
      max_length: number;
      pattern: string;  // Regex pattern
      blacklist?: string[];
      require_uppercase?: boolean;
    };
    
    /** Amount validation */
    amount: {
      min_value: string;  // Decimal string
      max_value: string;  // -1 = unlimited
      auto_round?: boolean;
    };
  };
  
  /** Feature flags */
  features: {
    /** Allow negative balance (overdraft) - default: false */
    allow_negative_balance: boolean;
    
    /** Auto-activate wallet on first deposit - default: true */
    auto_activate_on_deposit: boolean;
    
    /** Require currency exists before deposit - default: false */
    require_currency_exists?: boolean;
    
    /** Support locked balance - default: true */
    lock_support?: boolean;
    
    /** Auto-create currency on deposit - default: true */
    auto_create_currency?: boolean;
  };
  
  /** Currency configuration */
  currency_config: {
    /** Decimal precision per currency */
    precision: Record<string, number> & {
      /** Default precision для неизвестных валют */
      _default: number;
    };
    
    /** Currency categories */
    categories?: {
      fiat?: string[];
      crypto?: string[];
      virtual?: string[];
    };
  };
  
  /** Transaction rules */
  transaction_rules?: {
    /** Max history to keep */
    history_limit: number;
    
    /** Require description - default: false */
    require_description?: boolean;
    
    /** Archive old transactions - default: false */
    archive_old?: boolean;
  };
  
  /** AgentPay-specific rules (optional) */
  agentpay_rules?: {
    enabled: boolean;
    kyc_levels?: Record<string, any>;
    payment_providers?: string[];
    withdrawal_limits?: Record<string, string>;
  };
}

/**
 * Default WalletRules - sensible defaults
 * 
 * AI GUIDE:
 * Backend применяет эти defaults если wallet_rules не указаны
 */
export const DEFAULT_WALLET_RULES: WalletRules = {
  version: "1.0",
  limits: {
    max_wallets_per_user: 10,
    max_currencies_per_wallet: 50,
    max_transaction_history: 1000,
    max_balance_per_currency: "-1",
    min_wallet_name_length: 1,
    max_wallet_name_length: 100
  },
  validation: {
    currency_code: {
      min_length: 3,
      max_length: 10,
      pattern: "^[A-Z0-9_]+$",
      blacklist: [],
      require_uppercase: true
    },
    amount: {
      min_value: "0.01",
      max_value: "-1",
      auto_round: true
    }
  },
  features: {
    allow_negative_balance: false,
    auto_activate_on_deposit: true,
    require_currency_exists: false,
    lock_support: true,
    auto_create_currency: true
  },
  currency_config: {
    precision: {
      USD: 2, EUR: 2, RUB: 2, GBP: 2, JPY: 0, CNY: 2,
      BTC: 8, ETH: 8, USDT: 6, USDC: 6,
      _default: 8
    },
    categories: {
      fiat: ["USD", "EUR", "RUB", "GBP", "JPY", "CNY"],
      crypto: ["BTC", "ETH", "USDT", "USDC", "BNB"],
      virtual: []
    }
  },
  transaction_rules: {
    history_limit: 1000,
    require_description: false,
    archive_old: false
  }
};




