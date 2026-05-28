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
        data: testPayment,
      });

      const result = await payments.createPayment(paymentData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/payments/create', paymentData);
      expect(result).toEqual(testPayment);
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

    it('should update payment', async () => {
      const paymentId = 'payment_123';
      const updateData = { description: 'Updated description' };
      const expectedResponse = { ...testPayment, ...updateData };

      mockHttpClient.put.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.updatePayment(paymentId, updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(`/payments/${paymentId}`, updateData);
      expect(result).toEqual(expectedResponse);
    });

    it('should cancel payment', async () => {
      const paymentId = 'payment_123';
      const expectedResponse = { message: 'Payment cancelled successfully' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.cancelPayment(paymentId);

      expect(mockHttpClient.post).toHaveBeenCalledWith(`/payments/${paymentId}/cancel`);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Payment Methods', () => {
    it('should get payment methods', async () => {
      const expectedResponse = {
        payment_methods: [
          {
            id: 'pm_123',
            type: 'card',
            last_four: '4242',
            brand: 'visa',
            expiry_month: 12,
            expiry_year: 2025,
            is_default: true,
          },
        ],
      };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.getPaymentMethods();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/payments/methods');
      expect(result).toEqual(expectedResponse);
    });

    it('should add payment method', async () => {
      const methodData = {
        type: 'card',
        token: 'tok_123',
      };

      const expectedResponse = {
        id: 'pm_123',
        type: 'card',
        last_four: '4242',
        brand: 'visa',
        expiry_month: 12,
        expiry_year: 2025,
        is_default: false,
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.addPaymentMethod(methodData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/payments/methods', methodData);
      expect(result).toEqual(expectedResponse);
    });

    it('should remove payment method', async () => {
      const methodId = 'pm_123';
      const expectedResponse = { message: 'Payment method removed successfully' };

      mockHttpClient.delete.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.removePaymentMethod(methodId);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(`/payments/methods/${methodId}`);
      expect(result).toEqual(expectedResponse);
    });

    it('should set default payment method', async () => {
      const methodId = 'pm_123';
      const expectedResponse = { message: 'Default payment method updated' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.setDefaultPaymentMethod(methodId);

      expect(mockHttpClient.post).toHaveBeenCalledWith(`/payments/methods/${methodId}/default`);
      expect(result).toEqual(expectedResponse);
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

      const result = await payments.createRefund(paymentId, refundData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(`/payments/${paymentId}/refund`, refundData);
      expect(result).toEqual(expectedResponse);
    });

    it('should get refunds', async () => {
      const paymentId = 'payment_123';
      const expectedResponse = {
        refunds: [
          {
            id: 'refund_123',
            payment_id: paymentId,
            amount: 500,
            reason: 'Customer request',
            status: 'completed',
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await payments.getRefunds(paymentId);

      expect(mockHttpClient.get).toHaveBeenCalledWith(`/payments/${paymentId}/refunds`);
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



