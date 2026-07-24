/**
 * AgentPayments - Платежная система
 * Модуль для работы с платежами и транзакциями
 */

import { HTTPClient } from '../client/http-client';
import { logger } from '../utils/logger';

export interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  merchant_id?: number;
  customer_email?: string;
  customer_phone?: string;
  metadata?: Record<string, any>;
  /** intent: sale | top_up | subscription | energy_pack */
  intent?: string;
  /** preferred_method: wallet | card | stripe */
  preferred_method?: string;
  destination_wallet?: string;
  /** Recipient project ID (when paying to project wallet, e.g. /projects/5/pay) */
  recipient_project_id?: number;
  /** Origin for webhook / Tochka notification_url derivation */
  base_url?: string;
  success_url?: string;
  fail_url?: string;
  country?: string;
  use_project_keys?: boolean;
  idempotency_key?: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  merchant_id: number;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  /** Stripe client_secret for card payment (when preferred_method=card) */
  client_secret?: string;
  /** Redirect checkout URL (e.g. Tochka) when Elements are not used */
  payment_url?: string;
  external_id?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  configuration: Record<string, any>;
  supported_currencies: string[];
  fees: {
    fixed?: number;
    percentage?: number;
  };
}

export interface Transaction {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentStats {
  total_amount: number;
  total_transactions: number;
  success_rate: number;
  average_amount: number;
  currency_breakdown: Record<string, {
    amount: number;
    transactions: number;
  }>;
  status_breakdown: Record<string, number>;
}

export class AgentPayments {
  private client: HTTPClient;

  constructor(client: HTTPClient) {
    this.client = client;
  }

  /**
   * Создание платежа (POST /payments — единый путь с бэкендом)
   */
  async createPayment(paymentData: PaymentData): Promise<Payment> {
    const idempotencyKey =
      (typeof paymentData.idempotency_key === 'string' && paymentData.idempotency_key.trim()) ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const body = { ...paymentData, idempotency_key: idempotencyKey };
    const response = await this.client.post('/payments', body, {
      timeout: 60_000,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    const data = response.data;
    if (data?.payment) {
      const p = data.payment;
      return {
        id: p.payment_id ?? p.id,
        amount: p.amount,
        currency: p.currency ?? 'USD',
        description: p.description ?? '',
        status: p.status ?? 'pending',
        merchant_id: 0,
        created_at: p.created_at ?? new Date().toISOString(),
        updated_at: p.updated_at ?? '',
        ...(p.metadata && { metadata: p.metadata }),
        ...(p.client_secret && { client_secret: p.client_secret }),
        ...(p.payment_url && { payment_url: p.payment_url }),
        ...(p.external_id && { external_id: p.external_id })
      };
    }
    return data;
  }

  /**
   * Получение деталей платежа (GET /payments/{id})
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const { payment } = await this.getPaymentStatus(paymentId);
    return payment;
  }

  /**
   * Получение статуса платежа (GET /payments/{id} — без суффикса /status)
   */
  async getPaymentStatus(paymentId: string): Promise<{
    payment: Payment;
    transactions: Transaction[];
  }> {
    const response = await this.client.get(`/payments/${paymentId}`);
    const data = response.data;
    if (data?.payment) {
      const p = data.payment;
      const payment: Payment = {
        id: p.payment_id ?? paymentId,
        amount: p.amount ?? 0,
        currency: p.currency ?? 'USD',
        description: p.description ?? '',
        status: p.status ?? 'pending',
        merchant_id: 0,
        created_at: p.created_at ?? '',
        updated_at: p.updated_at ?? '',
        ...(p.metadata && { metadata: p.metadata })
      };
      return { payment, transactions: [] };
    }
    return { payment: data as Payment, transactions: [] };
  }

  /**
   * Получение списка платежей
   */
  async getPayments(params?: {
    merchant_id?: number;
    project_id?: number;
    status?: string;
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    payments: Payment[];
    total: number;
    has_more: boolean;
  }> {
    // ✅ CRITICAL FIX: Фильтруем undefined значения и передаем только валидные параметры
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'all') {
          cleanParams[key] = value;
        }
      });
    }
    
    // ✅ Logger автоматически отключает debug логи в production
    logger.debug('🔍 getPayments calling API:', {
      url: '/payments/transactions',
      cleanParams,
      cleanParamsKeys: Object.keys(cleanParams),
      cleanParamsValues: cleanParams
    });
    
    const response = await this.client.get('/payments/transactions', cleanParams);
    
    // ✅ CRITICAL FIX: Backend возвращает { success: true, transactions: [...], total: ... }
    // но мы ожидаем { payments: [...], total: ..., has_more: ... }
    const data = response.data;
    
    // ✅ Logger автоматически отключает debug логи в production
    logger.debug('🔍 getPayments raw API response:', {
      hasResponse: !!response,
      hasData: !!data,
      responseStatus: response?.status,
      responseStatusText: response?.statusText,
      dataType: typeof data,
      isArray: Array.isArray(data),
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      transactionsCount: data?.transactions?.length || 0,
      paymentsCount: data?.payments?.length || 0,
      total: data?.total || 0,
      success: data?.success,
      fullData: data // Полные данные для отладки
    });
    
    // Если ответ содержит transactions, преобразуем в payments
    if (data && data.transactions && Array.isArray(data.transactions)) {
      const result = {
        payments: data.transactions,
        total: data.total || data.transactions.length,
        has_more: data.has_more !== undefined 
          ? data.has_more 
          : (data.total ? data.transactions.length < data.total : false)
      };
      // ✅ Logger автоматически отключает debug логи в production
      logger.debug('✅ getPayments returning transactions:', {
        paymentsCount: result.payments.length,
        total: result.total,
        has_more: result.has_more
      });
      return result;
    }
    
    // Если ответ уже в формате payments, возвращаем как есть
    if (data && data.payments && Array.isArray(data.payments)) {
      const result = {
        payments: data.payments,
        total: data.total || data.payments.length,
        has_more: data.has_more || false
      };
      // ✅ Logger автоматически отключает debug логи в production
      logger.debug('✅ getPayments returning payments:', {
        paymentsCount: result.payments.length,
        total: result.total,
        has_more: result.has_more
      });
      return result;
    }
    
    // Fallback: если ответ - массив напрямую
    if (Array.isArray(data)) {
      // ✅ Logger автоматически отключает debug логи в production
      logger.debug('✅ getPayments returning array directly:', { count: data.length });
      return {
        payments: data,
        total: data.length,
        has_more: false
      };
    }
    
    // Если ничего не подошло, логируем и возвращаем пустой результат
    logger.warn('⚠️ getPayments: Unexpected response format', { data });
    return {
      payments: [],
      total: 0,
      has_more: false
    };
  }

  /**
   * Получение списка методов оплаты (GET /payments/config)
   */
  async getPaymentMethods(): Promise<{
    methods: PaymentMethod[];
  }> {
    const response = await this.client.get('/payments/config');
    const data = response.data;
    const raw = data?.config?.methods ?? [];
    const arr = Array.isArray(raw) ? raw : [];
    const methods: PaymentMethod[] = arr.map((m: string) => ({
      id: m,
      name: m,
      type: m,
      is_active: true,
      configuration: {},
      supported_currencies: data?.config?.currency ? [data.config.currency] : ['USD'],
      fees: { fixed: 0, percentage: 0 }
    }));
    return { methods };
  }

  /**
   * Получение статуса методов оплаты
   */
  async getPaymentMethodsStatus(merchantId?: number): Promise<{
    methods: Array<{
      id: string;
      name: string;
      status: 'active' | 'inactive' | 'maintenance';
      last_health_check: string;
    }>;
  }> {
    const response = await this.client.get('/payments/config/methods/status', {
      params: merchantId ? { merchant_id: merchantId } : {}
    });
    return response.data;
  }

  /**
   * Конфигурация провайдера платежей
   */
  async configureProvider(data: {
    provider_name: string;
    merchant_id: number;
    api_key: string;
    webhook_secret: string;
    configuration?: Record<string, any>;
  }): Promise<{
    success: boolean;
    message: string;
    provider_id: string;
  }> {
    const response = await this.client.post('/payments/providers/configure', data);
    return response.data;
  }

  /**
   * Получение списка провайдеров
   */
  async getProviders(): Promise<{
    providers: Array<{
      id: string;
      name: string;
      type: string;
      is_configured: boolean;
      is_active: boolean;
      supported_currencies: string[];
      fees: {
        fixed?: number;
        percentage?: number;
      };
    }>;
  }> {
    const response = await this.client.get('/payments/providers');
    return response.data;
  }

  /**
   * Отмена платежа. Backend has no /cancel — delegates to refund.
   * For completed payments: performs full refund. For pending: refund will fail (use as no-op).
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    payment_id: string;
    refund_amount?: number;
  }> {
    const response = await this.client.post(`/payments/${paymentId}/refund`, {
      reason: reason || 'Cancelled by user',
    });
    const data = response.data as { success?: boolean; message?: string; payment_id?: string; refund_amount?: number };
    return {
      success: data?.success ?? false,
      message: data?.message ?? '',
      payment_id: data?.payment_id ?? paymentId,
      refund_amount: data?.refund_amount,
    };
  }

  /**
   * Возврат платежа
   */
  async refundPayment(paymentId: string, data: {
    amount?: number; // Если не указано, возврат полной суммы
    reason: string;
  }): Promise<{
    success: boolean;
    message: string;
    refund_id: string;
    refund_amount: number;
  }> {
    const response = await this.client.post(`/payments/${paymentId}/refund`, data);
    return response.data;
  }

  /**
   * Получение статистики платежей
   */
  async getPaymentStats(params?: {
    merchant_id?: number;
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<PaymentStats> {
    // ✅ Исправление: передаем params напрямую
    const response = await this.client.get('/analytics/payments/stats', params);
    return response.data;
  }

  /**
   * Получение транзакций
   */
  async getTransactions(params?: {
    payment_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    transactions: Transaction[];
    total: number;
    has_more: boolean;
  }> {
    // ✅ Исправление: передаем params напрямую
    const response = await this.client.get('/payments/transactions/list', params);
    return response.data;
  }

  /**
   * Получение всех транзакций
   */
  async getAllTransactions(params?: {
    merchant_id?: number;
    payment_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    // Если params пустой или undefined, не передаем его вообще
    const queryParams = params && Object.keys(params).length > 0 ? params : undefined;
    const response = await this.client.get('/payments/transactions', queryParams);
    return response.data.transactions || response.data || [];
  }

  /**
   * Получение деталей транзакции
   */
  async getTransaction(transactionId: string): Promise<{
    transaction: Transaction;
    payment: Payment;
    provider_details?: any;
  }> {
    const response = await this.client.get(`/payments/transactions/${transactionId}`);
    return response.data;
  }

  /**
   * Создание webhook для уведомлений о платежах
   */
  async createPaymentWebhook(data: {
    url: string;
    events: string[];
    secret: string;
    is_active?: boolean;
  }): Promise<{
    webhook_id: string;
    url: string;
    events: string[];
    secret: string;
    is_active: boolean;
    created_at: string;
  }> {
    const response = await this.client.post('/webhooks', data);
    return response.data;
  }

  /**
   * Получение webhook'ов платежей
   */
  async getPaymentWebhooks(): Promise<{
    webhooks: Array<{
      id: string;
      url: string;
      events: string[];
      is_active: boolean;
      last_triggered?: string;
      created_at: string;
    }>;
  }> {
    const response = await this.client.get('/webhooks', {
      params: { type: 'payment' }
    });
    return response.data;
  }

  /**
   * Обновление webhook'а
   */
  async updatePaymentWebhook(webhookId: string, data: {
    url?: string;
    events?: string[];
    secret?: string;
    is_active?: boolean;
  }): Promise<{
    success: boolean;
    webhook: any;
  }> {
    const response = await this.client.put(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  /**
   * Удаление webhook'а
   */
  async deletePaymentWebhook(webhookId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  /**
   * Получение логов webhook'ов
   */
  async getWebhookLogs(webhookId?: string, params?: {
    limit?: number;
    offset?: number;
    status?: 'success' | 'failed';
  }): Promise<{
    logs: Array<{
      id: string;
      webhook_id: string;
      event_type: string;
      status: 'success' | 'failed';
      response_code?: number;
      response_body?: string;
      error_message?: string;
      triggered_at: string;
      processed_at: string;
    }>;
    total: number;
  }> {
    const response = await this.client.get('/webhooks/logs', {
      params: webhookId ? { webhook_id: webhookId, ...params } : params
    });
    return response.data;
  }

  /**
   * Получение кошельков проекта
   */
  async getWallets(projectId: number): Promise<{
    wallets: Array<{
      id: string;
      name: string;
      type: 'main' | 'reserve' | 'commission';
      currency: string;
      balance: number;
      available_balance: number;
      frozen_balance: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>;
  }> {
    const response = await this.client.get(`/wallets/projects/${projectId}/wallets`);
    return response.data;
  }
}





