/**
 * Integration tests for AgentAnalytics module with real API
 * Tests actual communication with analytics services
 */

import { AgentStackSDK } from '../../src/sdk';

describe('AgentAnalytics Integration Tests', () => {
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

  describe('Event Tracking', () => {
    it('should track events when not authenticated', async () => {
      try {
        await sdk.analytics.trackEvent({
          event_type: 'test_event',
          properties: {
            test_property: 'test_value',
          },
          project_id: 1,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle bulk event tracking when not authenticated', async () => {
      try {
        await sdk.analytics.trackBulkEvents([
          {
            event_type: 'test_event_1',
            properties: { test: 'value1' },
            project_id: 1,
          },
          {
            event_type: 'test_event_2',
            properties: { test: 'value2' },
            project_id: 1,
          },
        ]);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Dashboard Metrics', () => {
    it('should get dashboard metrics when not authenticated', async () => {
      try {
        await sdk.analytics.getDashboardMetrics(1, {
          period: '30d',
          metrics: ['total_events', 'unique_users'],
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should get usage stats when not authenticated', async () => {
      try {
        await sdk.analytics.getUsageStats(1, {
          start_date: '2025-01-01',
          end_date: '2025-01-31',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Custom Reports', () => {
    it('should create custom report when not authenticated', async () => {
      try {
        await sdk.analytics.createCustomReport(1, {
          name: 'Test Report',
          description: 'Test report description',
          query: {
            event_types: ['test_event'],
            date_range: {
              start: '2025-01-01',
              end: '2025-01-31',
            },
          },
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should get custom reports when not authenticated', async () => {
      try {
        await sdk.analytics.getCustomReports(1);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should get custom report when not authenticated', async () => {
      try {
        await sdk.analytics.getCustomReport(1, 'report_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should update custom report when not authenticated', async () => {
      try {
        await sdk.analytics.updateCustomReport(1, 'report_123', {
          name: 'Updated Report',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should delete custom report when not authenticated', async () => {
      try {
        await sdk.analytics.deleteCustomReport(1, 'report_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Metrics Management', () => {
    it('should create metric when not authenticated', async () => {
      try {
        await sdk.analytics.createMetric(1, {
          name: 'test_metric',
          description: 'Test metric',
          type: 'counter',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should get metrics when not authenticated', async () => {
      try {
        await sdk.analytics.getMetrics(1);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should get metric when not authenticated', async () => {
      try {
        await sdk.analytics.getMetric(1, 'metric_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should update metric when not authenticated', async () => {
      try {
        await sdk.analytics.updateMetric(1, 'metric_123', {
          description: 'Updated metric',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should delete metric when not authenticated', async () => {
      try {
        await sdk.analytics.deleteMetric(1, 'metric_123');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid event data gracefully', async () => {
      try {
        await sdk.analytics.trackEvent({
          event_type: '', // Invalid empty event type
          properties: null, // Invalid properties
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
        await timeoutSDK.analytics.getDashboardMetrics(1, {
          period: '30d',
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
        await invalidSDK.analytics.getDashboardMetrics(1, {
          period: '30d',
        });
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.message).toMatch(/network|connection|refused/);
      }
    }, 15000);
  });
});



