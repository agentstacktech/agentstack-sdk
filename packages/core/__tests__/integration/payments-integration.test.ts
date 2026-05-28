/**
 * Integration tests for AgentPayments module with real API
 * Tests actual communication with payment services
 */

import { AgentStackSDK } from '../../src/sdk';

describe('AgentPayments Integration Tests', () => {
  let sdk: AgentStackSDK;
  
  // Real test configuration - adjust for your environment
  const testConfig = {
    apiBase: 'http://localhost:8000', // Adjust to your backend URL
    apiKey: 'test-api-key',
    projectId: 1,
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
  };

  beforeAll(() => {
    sdk = new AgentStackSDK(testConfig);
  });

  describe('Payment Operations', () => {
    it('should handle payment creation when not authenticated', async () => {
      try {
        await sdk.payments.createPayment({
          amount: 1000,
          currency: 'USD',
          description: 'Test payment',
          project_id: 1,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should get payments when not authenticated', async () => {
      try {
        await sdk.payments.getPayments({
          project_id: 1,
          limit: 10,
          offset: 0,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle payment retrieval when not authenticated', async () => {
      try {
        await sdk.payments.getPayment('payment_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle payment update when not authenticated', async () => {
      try {
        await sdk.payments.updatePayment('payment_123', {
          description: 'Updated payment',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle payment cancellation when not authenticated', async () => {
      try {
        await sdk.payments.cancelPayment('payment_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Payment Methods', () => {
    it('should get payment methods when not authenticated', async () => {
      try {
        await sdk.payments.getPaymentMethods();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle adding payment method when not authenticated', async () => {
      try {
        await sdk.payments.addPaymentMethod({
          type: 'card',
          token: 'tok_123',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle removing payment method when not authenticated', async () => {
      try {
        await sdk.payments.removePaymentMethod('pm_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle setting default payment method when not authenticated', async () => {
      try {
        await sdk.payments.setDefaultPaymentMethod('pm_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Refunds', () => {
    it('should create refund when not authenticated', async () => {
      try {
        await sdk.payments.createRefund('payment_123', {
          amount: 500,
          reason: 'Customer request',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should get refunds when not authenticated', async () => {
      try {
        await sdk.payments.getRefunds('payment_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Wallets', () => {
    it('should get wallets when not authenticated', async () => {
      try {
        await sdk.payments.getWallets(1);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid payment data gracefully', async () => {
      try {
        await sdk.payments.createPayment({
          amount: -100, // Invalid amount
          currency: 'INVALID', // Invalid currency
          description: 'Test payment',
          project_id: 1,
        });
        expect(false).toBe(true);
      } catch (error: any) {
        // Should fail with validation error
        expect(error.message).toMatch(/Invalid|validation|bad request/i);
      }
    }, 15000);

    it('should handle network timeouts gracefully', async () => {
      const timeoutSDK = new AgentStackSDK({
        ...testConfig,
        timeout: 100, // Very short timeout
      });

      try {
        await timeoutSDK.payments.getPayments({
          project_id: 1,
          limit: 10,
          offset: 0,
        });
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.message).toMatch(/timeout|network|connection/);
      }
    }, 15000);

    it('should handle invalid API base URL', async () => {
      const invalidSDK = new AgentStackSDK({
        ...testConfig,
        apiBase: 'http://invalid-url-that-does-not-exist:9999',
      });

      try {
        await invalidSDK.payments.getPayments({
          project_id: 1,
          limit: 10,
          offset: 0,
        });
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.message).toMatch(/network|connection|refused/);
      }
    }, 15000);
  });
});



