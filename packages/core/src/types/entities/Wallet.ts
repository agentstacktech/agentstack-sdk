import { BaseEntity, NamedEntity, ActivatableEntity } from '../base';

/**
 * Wallet - multi-currency хранилище
 * 
 * AI AGENT QUICK START:
 * 
 * Create:
 *   const wallet = await sdk.wallets.create({
 *     name: "Player Wallet", type: "game", initial_currency: "GAME_GOLD"
 *   })
 * 
 * Deposit:
 *   await sdk.wallets.deposit(wallet.id, "GAME_GOLD", "1000")
 *   await sdk.wallets.deposit(wallet.id, "USD", "100.50")
 * 
 * Balances:
 *   wallet.balances.GAME_GOLD.amount  // "1000"
 *   wallet.balances.USD.amount        // "100.50"
 * 
 * STORAGE: project_users.profile_data->wallets (JSONB)
 * 
 * TYPES: user, game, agentpay, savings, business
 */
export interface Wallet extends 
  Omit<BaseEntity, 'id'>,  // Exclude id from BaseEntity
  NamedEntity,             // name, description  
  ActivatableEntity {      // is_active
  
  /** 
   * Wallet ID (string для JSONB storage)
   * Format: "wallet_" + 12 hex chars
   * Example: "wallet_abc123def456"
   */
  id: string;  // String ID (different from BaseEntity.id number)
  
  /** 
   * Wallet type
   * 
   * Types:
   * - 'user' - Personal user wallet (default)
   * - 'game' - Gaming virtual currencies
   * - 'agentpay' - Real money (AgentPay integration)
   * - 'savings' - Savings/reserve wallet
   * - 'business' - Business/corporate wallet
   */
  type: WalletType;
  
  /** 
   * Multi-currency balances
   * 
   * Key = currency code (USD, EUR, GAME_GOLD, etc.)
   * Value = CurrencyBalance (amount, locked, available)
   * 
   * Example:
   * {
   *   "USD": { amount: "100.50", available: "100.50", locked: "0" },
   *   "GAME_GOLD": { amount: "10000", available: "10000", locked: "0" }
   * }
   * 
   * AI GUIDE:
   * - Unlimited currencies per wallet!
   * - Add new currency = just deposit in that currency
   * - All amounts are decimal strings (precision!)
   */
  balances: Record<string, CurrencyBalance>;
  
  /** 
   * Wallet metadata (extensible)
   * 
   * Содержит:
   * - AgentPay data (if type='agentpay')
   * - Limits (daily/monthly withdraw limits)
   * - Custom data
   */
  metadata?: WalletMetadata;
}

/**
 * WalletType - типы кошельков
 * 
 * AI GUIDE:
 * String literal type - AI видит все варианты сразу!
 */
export type WalletType = 'user' | 'game' | 'agentpay' | 'savings' | 'business';

/**
 * CurrencyBalance - баланс одной валюты
 * 
 * WHY DECIMAL STRINGS:
 * Amounts are strings, not numbers! Prevents floating point errors.
 * 0.1 + 0.2 = 0.30000000000000004 (JavaScript problem)
 * "0.1" + "0.2" = "0.3" (Correct with Decimal library)
 * 
 * FIELDS:
 * @property amount - Total balance (includes locked)
 * @property locked - Amount locked (pending)
 * @property available - Spendable (amount - locked)
 * @property last_updated - ISO 8601 timestamp
 */
export interface CurrencyBalance {
  /** 
   * Total balance (includes locked)
   * Decimal string for precision
   * Example: "100.50", "10000", "-500" (if negative allowed)
   */
  amount: string;
  
  /** 
   * Locked amount (pending/frozen)
   * Cannot be spent until unlocked
   * Example: "10.00"
   */
  locked: string;
  
  /** 
   * Available amount (spendable)
   * Calculated: amount - locked
   * Example: If amount="100", locked="10" → available="90"
   */
  available: string;
  
  /** 
   * Last update timestamp
   * ISO 8601 format
   */
  last_updated: string;
}

/**
 * WalletMetadata - дополнительные данные кошелька
 * 
 * AI GUIDE:
 * Extensible storage для wallet-specific data
 */
export interface WalletMetadata {
  /** 
   * AgentPay integration (if type='agentpay')
   * 
   * Real money wallets require compliance:
   * - KYC verification
   * - Payment provider integration
   * - Regulatory compliance level
   */
  agentpay?: {
    kyc_verified: boolean;
    payment_provider: string;  // 'stripe', 'paypal', etc.
    compliance_level?: string;  // 'basic', 'verified', 'premium'
  };
  
  /** 
   * Withdrawal limits (optional)
   * 
   * Security: Prevent large unauthorized withdrawals
   */
  limits?: {
    daily_withdraw?: string;   // Decimal string
    monthly_withdraw?: string;
    require_2fa_above?: string;  // Amount threshold
  };
  
  /** Extensible для custom metadata */
  [key: string]: any;
}

/**
 * CreateWalletData - данные для создания кошелька
 * 
 * AI GUIDE:
 * Required: name, type, initial_currency
 * 
 * Example:
 *   await sdk.wallets.create({
 *     name: "Main",
 *     type: "user",
 *     initial_currency: "USD"
 *   })
 */
export interface CreateWalletData {
  /** Wallet name (1-100 chars) */
  name: string;
  
  /** Wallet type */
  type: WalletType;
  
  /** Initial currency (creates with "0" balance) */
  initial_currency: string;
  
  /** Optional description */
  description?: string;
}

/**
 * DepositData - данные для пополнения
 * 
 * AI GUIDE:
 * 
 * Example:
 *   await sdk.wallets.deposit(walletId, "USD", "100.50", "Payment received")
 */
export interface DepositData {
  /** Currency code (USD, GAME_GOLD, etc.) */
  currency: string;
  
  /** Amount as decimal string */
  amount: string;
  
  /** Optional description/note */
  description?: string;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * WithdrawData - данные для вывода
 * 
 * AI GUIDE:
 * 
 * Example:
 *   await sdk.wallets.withdraw(walletId, "USD", "25.99", "Purchase #123")
 */
export interface WithdrawData {
  /** Currency code */
  currency: string;
  
  /** Amount as decimal string */
  amount: string;
  
  /** Optional description/note */
  description?: string;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * CustomCurrency - кастомная валюта для проекта
 * 
 * AI GUIDE:
 * Create game tokens, loyalty points, etc.
 * 
 * Example:
 *   await sdk.wallets.createCurrency({
 *     code: "GAME_GOLD",
 *     name: "Game Gold",
 *     type: "virtual",
 *     decimals: 0,  // Integer only
 *     icon: "💰"
 *   })
 */
export interface CustomCurrency {
  /** Currency code (3-10 chars, uppercase, A-Z0-9_) */
  code: string;
  
  /** Display name */
  name: string;
  
  /** Currency type */
  type: 'fiat' | 'crypto' | 'virtual';
  
  /** Decimal places (0-8) */
  decimals: number;
  
  /** Optional icon/emoji */
  icon?: string;
  
  /** Optional description */
  description?: string;
}




