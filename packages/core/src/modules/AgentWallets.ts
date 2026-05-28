/**
 * AgentWallets - Управление кошельками
 * Модуль для работы с кошельками и балансами
 */

import { HTTPClient } from '../client/http-client';

// ✅ Import shared types (AI-First!)
import type {
  Wallet,
  CurrencyBalance,
  WalletMetadata,
  WalletType,
  CreateWalletData,
  DepositData,
  WithdrawData,
  CustomCurrency
} from '../types';

// ✅ Keep module-specific types
export interface WalletConfig {
  default_wallet?: string;
  default_currency: string;
  custom_currencies?: CustomCurrency[];
}

// ❌ REMOVED duplicate interfaces (now in ../types):
// - Wallet (old single-currency)
// - MultiCurrencyWallet (merged into Wallet)
// - CurrencyBalance
// - CustomCurrency

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'commission';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  reference_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface WalletTransfer {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface WalletDeposit {
  wallet_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface WalletWithdrawal {
  wallet_id: string;
  amount: number;
  currency: string;
  destination: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class AgentWallets {
  constructor(private client: HTTPClient) {}

  /**
   * Get specific wallet details by ID
   */
  async getWallet(walletId: string): Promise<Wallet> {
    const response = await this.client.get(`/wallets/${walletId}`);
    return response.data;
  }

  /**
   * Обновление кошелька
   */
  async updateWallet(walletId: string, updates: {
    name?: string;
    is_active?: boolean;
  }, projectId?: number): Promise<Wallet> {
    // ✅ Philosophy compliant: /api prefix ONLY in config.apiBase
    // Use project wallet endpoint if projectId is provided
    const endpoint = projectId
      ? `/projects/${projectId}/wallets/${walletId}`
      : `/wallets/${walletId}`;
    const response = await this.client.put(endpoint, updates);
    // Handle both direct wallet response and wrapped response
    return response.data?.wallet || response.data;
  }

  /**
   * Удаление кошелька
   */
  async deleteWallet(walletId: string): Promise<{
    message: string;
  }> {
    // ✅ Philosophy compliant: /api prefix ONLY in config.apiBase
    // Wallets service mounted at /api/wallets, routes start with /{id}
    // Result: config.apiBase (/api) + /wallets/{id} = /api/wallets/{id}
    const response = await this.client.delete(`/wallets/${walletId}`);
    return response.data;
  }

  /**
   * Получение баланса кошелька
   */
  async getWalletBalance(walletId: string): Promise<{
    wallet_id: string;
    balance: number;
    available_balance: number;
    frozen_balance: number;
    pending_balance: number;
    currency: string;
    last_updated: string;
  }> {
    const response = await this.client.get(`/wallets/${walletId}/balance`);
    return response.data;
  }

  /**
   * Пополнение кошелька
   */
  async depositToWallet(data: WalletDeposit): Promise<{
    transaction_id: string;
    wallet_id: string;
    amount: number;
    currency: string;
    status: string;
    message: string;
  }> {
    const response = await this.client.post('/wallets/deposit', data);
    return response.data;
  }

  /**
   * Вывод средств с кошелька
   */
  async withdrawFromWallet(data: WalletWithdrawal): Promise<{
    transaction_id: string;
    wallet_id: string;
    amount: number;
    currency: string;
    status: string;
    message: string;
  }> {
    const response = await this.client.post('/wallets/withdraw', data);
    return response.data;
  }

  /**
   * Перевод между кошельками
   */
  async transferBetweenWallets(data: WalletTransfer): Promise<{
    transaction_id: string;
    from_wallet_id: string;
    to_wallet_id: string;
    amount: number;
    currency: string;
    status: string;
    message: string;
  }> {
    const response = await this.client.post('/wallets/transfer', data);
    return response.data;
  }

  /**
   * Получение истории транзакций кошелька
   */
  async getWalletTransactions(walletId: string, params?: {
    transaction_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    transactions: WalletTransaction[];
    total: number;
    total_amount: number;
  }> {
    const response = await this.client.get(`/wallets/${walletId}/transactions`, params);
    return response.data;
  }

  /**
   * Получение всех транзакций проекта
   */
  async getProjectTransactions(projectId: number, params?: {
    wallet_id?: string;
    transaction_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    transactions: WalletTransaction[];
    total: number;
    total_amount: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const response = await this.client.get(`/wallets/projects/${projectId}/wallets/transactions`, params);
    return response.data;
  }

  /**
   * Получение конкретной транзакции
   */
  async getTransaction(transactionId: string): Promise<WalletTransaction> {
    const response = await this.client.get(`/wallets/transactions/${transactionId}`);
    return response.data;
  }

  /**
   * Отмена транзакции
   */
  async cancelTransaction(transactionId: string, reason?: string): Promise<{
    transaction_id: string;
    status: string;
    message: string;
  }> {
    const response = await this.client.post(`/wallets/transactions/${transactionId}/cancel`, {
      reason
    });
    return response.data;
  }

  /**
   * Заморозка средств на кошельке
   */
  async freezeWalletBalance(walletId: string, data: {
    amount: number;
    reason: string;
    metadata?: Record<string, any>;
  }): Promise<{
    wallet_id: string;
    frozen_amount: number;
    available_balance: number;
    frozen_balance: number;
    message: string;
  }> {
    const response = await this.client.post(`/wallets/${walletId}/freeze`, data);
    return response.data;
  }

  /**
   * Разморозка средств на кошельке
   */
  async unfreezeWalletBalance(walletId: string, data: {
    amount: number;
    reason: string;
  }): Promise<{
    wallet_id: string;
    unfrozen_amount: number;
    available_balance: number;
    frozen_balance: number;
    message: string;
  }> {
    const response = await this.client.post(`/wallets/${walletId}/unfreeze`, data);
    return response.data;
  }

  /**
   * Получение статистики кошельков
   */
  async getWalletStats(projectId: number, params?: {
    start_date?: string;
    end_date?: string;
    currency?: string;
  }): Promise<{
    total_wallets: number;
    active_wallets: number;
    total_balance: number;
    total_available: number;
    total_frozen: number;
    total_transactions: number;
    total_deposits: number;
    total_withdrawals: number;
    total_transfers: number;
    by_currency: Record<string, {
      balance: number;
      available: number;
      frozen: number;
      transactions: number;
    }>;
    by_type: Record<string, {
      count: number;
      balance: number;
    }>;
  }> {
    const response = await this.client.get(`/wallets/projects/${projectId}/wallets/stats`, params);
    return response.data;
  }

  /**
   * Получение доступных валют
   */
  async getSupportedCurrencies(): Promise<{
    currencies: Array<{
      code: string;
      name: string;
      symbol: string;
      decimals: number;
      is_active: boolean;
    }>;
  }> {
    const response = await this.client.get('/wallets/currencies/');
    return response.data;
  }

  /**
   * Получение курсов валют
   */
  async getExchangeRates(params?: {
    from_currency?: string;
    to_currency?: string;
  }): Promise<{
    rates: Record<string, number>;
    base_currency: string;
    last_updated: string;
  }> {
    const response = await this.client.get('/wallets/exchange-rates', params);
    return response.data;
  }

  /**
   * @deprecated Use `sdk.finance.swap(projectId).quote()` + `execute()` instead.
   */
  async convertCurrency(data: {
    project_id: number;
    from_currency: string;
    to_currency: string;
    amount: number;
  }): Promise<Record<string, unknown>> {
    const q = await this.client.post<{
      quote_id: string;
      quote_hash: string;
      exchange: Record<string, unknown>;
    }>(`/api/finance/${data.project_id}/swap/quote`, {
      from_currency: data.from_currency,
      to_currency: data.to_currency,
      amount: data.amount,
    });
    const executed = await this.client.post<Record<string, unknown>>(
      `/api/finance/${data.project_id}/swap/execute`,
      {
        quote_id: q.data.quote_id,
        quote_hash: q.data.quote_hash,
      },
    );
    return executed.data;
  }

  /**
   * Получение лимитов кошелька
   */
  async getWalletLimits(walletId: string): Promise<{
    wallet_id: string;
    daily_deposit_limit: number;
    daily_withdrawal_limit: number;
    monthly_deposit_limit: number;
    monthly_withdrawal_limit: number;
    max_balance: number;
    currency: string;
  }> {
    const response = await this.client.get(`/wallets/${walletId}/limits`);
    return response.data;
  }

  /**
   * Обновление лимитов кошелька
   */
  async updateWalletLimits(walletId: string, limits: {
    daily_deposit_limit?: number;
    daily_withdrawal_limit?: number;
    monthly_deposit_limit?: number;
    monthly_withdrawal_limit?: number;
    max_balance?: number;
  }): Promise<{
    wallet_id: string;
    limits: any;
    message: string;
  }> {
    const response = await this.client.put(`/wallets/${walletId}/limits`, limits);
    return response.data;
  }

  // ========================================================================
  // Multi-Currency JSONB Wallets (Permission-Based API)
  // Philosophy: Simple names + Auto-context from token
  // ========================================================================

  /**
   * Get wallets for current user (or specific user if admin)
   * @param options.userId - View another user's wallets (requires admin permission)
   * @param options.walletId - Get specific wallet details
   */
  async getWallets(options?: {
    userId?: number;
    walletId?: string;
  }): Promise<{
    wallets: { [walletId: string]: Wallet };
    config?: WalletConfig;
    wallet?: Wallet;
    user_id: number;
  }> {
    const params: any = {};
    if (options?.userId) params.user_id = options.userId;
    if (options?.walletId) params.wallet_id = options.walletId;
    
    const response = await this.client.get('/wallets/', params);
    return response.data;
  }

  /**
   * Create new wallet (user_id and project_id auto-detected from token)
   */
  async createWallet(data: {
    name: string;
    type?: 'user' | 'agentpay' | 'game' | 'savings' | 'business';
    initial_currency?: string;
  }): Promise<{ success: boolean; wallet: Wallet }> {
    const response = await this.client.post('/wallets/', data);
    return response.data;
  }

  /**
   * Deposit funds to wallet in any currency
   */
  async deposit(
    walletId: string,
    currency: string,
    amount: string,
    description?: string
  ): Promise<{
    success: boolean;
    new_balance: string;
    currency: string;
    transaction: WalletTransaction;
  }> {
    const response = await this.client.post(`/wallets/${walletId}/deposit`, {
      currency,
      amount,
      description
    });
    return response.data;
  }

  /**
   * Withdraw funds from wallet in any currency
   */
  async withdraw(
    walletId: string,
    currency: string,
    amount: string,
    description?: string
  ): Promise<{
    success: boolean;
    new_balance: string;
    currency: string;
    transaction: WalletTransaction;
  }> {
    const response = await this.client.post(`/wallets/${walletId}/withdraw`, {
      currency,
      amount,
      description
    });
    return response.data;
  }

  /**
   * Get transaction history with optional filters
   */
  async getTransactions(options?: {
    walletId?: string;
    currency?: string;
    userId?: number;
    limit?: number;
  }): Promise<{
    transactions: WalletTransaction[];
    total: number;
    user_id: number;
  }> {
    const params: any = {};
    if (options?.walletId) params.wallet_id = options.walletId;
    if (options?.currency) params.currency = options.currency;
    if (options?.userId) params.user_id = options.userId;
    if (options?.limit) params.limit = options.limit;
    
    const response = await this.client.get('/transactions', params);
    return response.data;
  }

  /**
   * Get all available currencies (standard fiat/crypto + custom project currencies)
   */
  async getCurrencies(): Promise<{
    standard: string[];
    crypto: string[];
    custom: CustomCurrency[];
  }> {
    const response = await this.client.get('/currencies');
    return response.data;
  }

  /**
   * Create custom project currency (admin only)
   * Examples: GAME_GOLD, LOYALTY_POINTS, GEMS
   */
  async createCurrency(currency: CustomCurrency): Promise<{
    success: boolean;
    currency: CustomCurrency;
    project_id: number;
  }> {
    const response = await this.client.post('/currencies', currency);
    return response.data;
  }
}



