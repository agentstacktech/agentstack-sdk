/**
 * Unit tests for AgentPayments module
 */

import { AgentPayments } from '../../src/modules/AgentPayments';
import { HTTPClient } from '../../src/client/http-client';
import {
  testPayment,
  cleanupMocks,
} from '../setup';

describe('AgentPayments', () => {
  let payments: AgentPayments;
  let mockHttpClient: jest.Mocked<HTTPClient>;

  beforeEach(() => {
    cleanupMocks();
    
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    payments = new AgentPayments(mockHttpClient);
  });

  describe('Payment Operations', () => {
    it('should create payment', async () => {
      const paymentData = {
        amount: 1000,
        currency: 'USD',
        description: 'Test payment',
        project_id: 1,
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: { payment: { payment_id: 'pay-1', ...testPayment, id: undefined } },
      });

      const result = await payments.createPayment(paymentData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/payments',
        expect.objectContaining({
          amount: 1000,
          currency: 'USD',
          description: 'Test payment',
          idempotency_key: expect.any(String),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
        }),
      );
      expect(result.id).toBe('pay-1');
    });

    it('should map PSP resume fields from create response', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          payment: {
            payment_id: 'pay-ru',
            amount: 100,
            currency: 'RUB',
            status: 'pending',
            payment_url: 'https://bank.example/pay',
            psp_selected: 'tochka',
            psp_fallback_reason: 'stripe_not_configured',
          },
        },
      });

      const result = await payments.createPayment({
        amount: 100,
        currency: 'RUB',
        description: 'RU',
      });

      expect(result.payment_url).toBe('https://bank.example/pay');
      expect(result.psp_selected).toBe('tochka');
      expect(result.psp_fallback_reason).toBe('stripe_not_configured');
    });

    it('should get payment', async () => {
      const paymentId = 'payment_123';

      mockHttpClient.get.mockResolvedValueOnce({
        data: testPayment,
      });

      const result = await payments.getPayment(paymentId);

      expect(mockHttpClient.get).toHaveBeenCalledWith(`/payments/${paymentId}`);
      expect(result).toEqual(testPayment);
    });

    it('should get payments', async () => {
      const params = {
        project_id: 1,
        status: 'completed',
        limit: 10,
        offset: 0,
      };

      const expectedResponse = {
        payments: [testPayment],
        total: 1,
        has_more: false,
      };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.getPayments(params);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/payments/transactions', {
        project_id: 1,
        status: 'completed',
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should cancel payment', async () => {
      const paymentId = 'payment_123';
      const expectedResponse = {
        success: true,
        message: 'Payment refunded successfully',
        payment_id: paymentId,
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.cancelPayment(paymentId);

      expect(mockHttpClient.post).toHaveBeenCalledWith(`/payments/${paymentId}/refund`, {
        reason: 'Cancelled by user',
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Payment Methods', () => {
    it('should get payment methods', async () => {
      const expectedResponse = { config: { methods: ['card'], currency: 'USD' } };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.getPaymentMethods();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/payments/config');
      expect(result.methods).toEqual([
        {
          id: 'card',
          name: 'card',
          type: 'card',
          is_active: true,
          configuration: {},
          supported_currencies: ['USD'],
          fees: { fixed: 0, percentage: 0 },
        },
      ]);
    });
  });

  describe('Refunds', () => {
    it('should create refund', async () => {
      const paymentId = 'payment_123';
      const refundData = {
        amount: 500,
        reason: 'Customer request',
      };

      const expectedResponse = {
        id: 'refund_123',
        payment_id: paymentId,
        amount: 500,
        reason: 'Customer request',
        status: 'pending',
        created_at: '2025-01-01T00:00:00Z',
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.refundPayment(paymentId, refundData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(`/payments/${paymentId}/refund`, refundData);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Wallets', () => {
    it('should get wallets', async () => {
      const projectId = 1;
      const expectedResponse = {
        wallets: [
          {
            id: 'wallet_123',
            name: 'Main Wallet',
            type: 'main',
            currency: 'USD',
            balance: 10000,
            available_balance: 9500,
            frozen_balance: 500,
            is_active: true,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        ],
      };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.getWallets(projectId);

      expect(mockHttpClient.get).toHaveBeenCalledWith(`/wallets/projects/${projectId}/wallets`);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(payments.getPayment('payment_123')).rejects.toThrow('Network error');
    });

    it('should handle API errors', async () => {
      mockHttpClient.post.mockRejectedValueOnce(new Error('Payment creation failed'));

      await expect(payments.createPayment({
        amount: 1000,
        currency: 'USD',
        description: 'Test payment',
        project_id: 1,
      })).rejects.toThrow('Payment creation failed');
    });
  });
});



