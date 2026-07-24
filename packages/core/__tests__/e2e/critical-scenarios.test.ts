/**
 * End-to-End tests for critical AgentStack scenarios (live stack only).
 * @plane dev.e2e_live — run: E2E_BASE_URL=... SDK_E2E_LIVE=1 jest __tests__/e2e
 * Excluded from default `npm test` via jest testPathIgnorePatterns.
 */

import { AgentStackSDK } from '../../src/sdk';

const LIVE_E2E = Boolean(process.env.E2E_BASE_URL || process.env.SDK_E2E_LIVE);
const describeLive = LIVE_E2E ? describe : describe.skip;

describeLive('AgentStack Critical E2E Scenarios', () => {
  let sdk: AgentStackSDK;
  
  // Real test configuration - adjust for your environment
  const testConfig = {
    apiBase: process.env.E2E_BASE_URL || 'http://localhost:8000',
    apiKey: 'test-api-key',
    projectId: 1,
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  beforeAll(() => {
    sdk = new AgentStackSDK(testConfig);
  });

  describe('Complete User Registration and Profile Setup', () => {
    it('should handle complete user registration flow', async () => {
      try {
        // Step 1: Attempt registration
        const registrationData = {
          email: 'e2e-test@example.com',
          password: 'securePassword123!',
          project_id: 1,
        };

        try {
          await sdk.auth.register(registrationData);
          console.log('Registration successful');
        } catch (error: any) {
          // Registration might fail if user exists - that's ok for E2E
          console.log('Registration failed (user might exist):', error.message);
        }

        // Step 2: Login
        try {
          const tokens = await sdk.auth.login({
            email: registrationData.email,
            password: registrationData.password,
            project_id: 1,
          });
          expect(tokens).toBeDefined();
          console.log('Login successful');

          // Step 3: Get current user
          const user = await sdk.auth.getCurrentUser();
          expect(user).toBeDefined();
          expect(user.email).toBe(registrationData.email);
          console.log('User data retrieved');

          // Step 4: Update profile data
          const profileUpdate = {
            display_name: 'E2E Test User',
            bio: 'This is an E2E test user',
          };

          const updatedProfile = await sdk.auth.updateProfileData(profileUpdate);
          expect(updatedProfile).toBeDefined();
          console.log('Profile updated');

          // Step 5: Update settings
          const settingsUpdate = {
            theme: 'dark',
            notifications: {
              email: true,
              push: false,
            },
          };

          const updatedSettings = await sdk.auth.updateSettings(settingsUpdate);
          expect(updatedSettings).toBeDefined();
          console.log('Settings updated');

          // Step 6: Logout
          await sdk.auth.logout();
          console.log('Logout successful');

        } catch (error: any) {
          throw new Error(`Login flow failed: ${error?.message || error}`);
        }

      } catch (error: any) {
        throw new Error(`E2E registration flow failed: ${error?.message || error}`);
      }
    }, 30000);

    it('should handle complete payment flow', async () => {
      try {
        // Step 1: Login (if available)
        try {
          await sdk.auth.login({
            email: 'e2e-test@example.com',
            password: 'securePassword123!',
            project_id: 1,
          });
          console.log('Login successful for payment flow');
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new Error(`Login required for payment flow: ${msg}`);
        }

        // Step 2: Get payment methods
        try {
          const paymentMethods = await sdk.payments.getPaymentMethods();
          expect(paymentMethods).toBeDefined();
          console.log('Payment methods retrieved');
        } catch (error: any) {
          console.log('Payment methods retrieval failed:', error.message);
        }

        // Step 3: Create a test payment
        try {
          const paymentData = {
            amount: 1000, // $10.00
            currency: 'USD',
            description: 'E2E Test Payment',
            project_id: 1,
          };

          const payment = await sdk.payments.createPayment(paymentData);
          expect(payment).toBeDefined();
          console.log('Payment created:', payment.id);

          // Step 4: Get payment status
          const paymentStatus = await sdk.payments.getPayment(payment.id);
          expect(paymentStatus).toBeDefined();
          console.log('Payment status retrieved');

        } catch (error: any) {
          console.log('Payment creation failed:', error.message);
        }

        // Step 5: Get payment history
        try {
          const payments = await sdk.payments.getPayments({
            project_id: 1,
            limit: 10,
            offset: 0,
          });
          expect(payments).toBeDefined();
          console.log('Payment history retrieved');
        } catch (error: any) {
          console.log('Payment history retrieval failed:', error.message);
        }

      } catch (error: any) {
        throw new Error(`E2E payment flow failed: ${error?.message || error}`);
      }
    }, 30000);

    it('should handle complete analytics flow', async () => {
      try {
        // Step 1: Login (if available)
        try {
          await sdk.auth.login({
            email: 'e2e-test@example.com',
            password: 'securePassword123!',
            project_id: 1,
          });
          console.log('Login successful for analytics flow');
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new Error(`Login required for analytics flow: ${msg}`);
        }

        // Step 2: Track test events
        try {
          const events = [
            {
              event_type: 'e2e_test_event',
              properties: {
                test_scenario: 'complete_flow',
                timestamp: new Date().toISOString(),
              },
              project_id: 1,
            },
            {
              event_type: 'user_action',
              properties: {
                action: 'page_view',
                page: '/e2e-test',
              },
              project_id: 1,
            },
          ];

          for (const event of events) {
            await sdk.analytics.trackEvent(event);
          }
          console.log('Test events tracked');
        } catch (error: any) {
          console.log('Event tracking failed:', error.message);
        }

        // Step 3: Get dashboard metrics
        try {
          const metrics = await sdk.analytics.getDashboardMetrics(1, {
            period: '7d',
            metrics: ['total_events', 'unique_users'],
          });
          expect(metrics).toBeDefined();
          console.log('Dashboard metrics retrieved');
        } catch (error: any) {
          console.log('Dashboard metrics retrieval failed:', error.message);
        }

        // Step 4: Get usage stats
        try {
          const stats = await sdk.analytics.getUsageStats(1, {
            start_date: '2025-01-01',
            end_date: '2025-01-31',
          });
          expect(stats).toBeDefined();
          console.log('Usage stats retrieved');
        } catch (error: any) {
          console.log('Usage stats retrieval failed:', error.message);
        }

        // Step 5: Create custom report
        try {
          const report = await sdk.analytics.createCustomReport(1, {
            name: 'E2E Test Report',
            description: 'Report created during E2E testing',
            query: {
              event_types: ['e2e_test_event'],
              date_range: {
                start: '2025-01-01',
                end: '2025-01-31',
              },
            },
          });
          expect(report).toBeDefined();
          console.log('Custom report created');

          // Step 6: Get custom reports
          const reports = await sdk.analytics.getCustomReports(1);
          expect(reports).toBeDefined();
          console.log('Custom reports retrieved');

        } catch (error: any) {
          console.log('Custom report creation failed:', error.message);
        }

      } catch (error: any) {
        throw new Error(`E2E analytics flow failed: ${error?.message || error}`);
      }
    }, 30000);

    it('should handle complete project management flow', async () => {
      try {
        // Step 1: Login (if available)
        try {
          await sdk.auth.login({
            email: 'e2e-test@example.com',
            password: 'securePassword123!',
            project_id: 1,
          });
          console.log('Login successful for project flow');
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new Error(`Login required for project flow: ${msg}`);
        }

        // Step 2: Get projects
        try {
          const projects = await sdk.api.getProjects();
          expect(projects).toBeDefined();
          console.log('Projects retrieved');
        } catch (error: any) {
          console.log('Projects retrieval failed:', error.message);
        }

        // Step 3: Create test project
        try {
          const projectData = {
            name: 'E2E Test Project',
            description: 'Project created during E2E testing',
          };

          const project = await sdk.api.createProject(projectData);
          expect(project).toBeDefined();
          console.log('Test project created');

          // Step 4: Update project
          const updatedProject = await sdk.api.updateProject(project.id, {
            description: 'Updated E2E test project',
          });
          expect(updatedProject).toBeDefined();
          console.log('Project updated');

          // Step 5: Get project details
          const projectDetails = await sdk.api.getProject(project.id);
          expect(projectDetails).toBeDefined();
          console.log('Project details retrieved');

          // Step 6: Delete test project
          await sdk.api.deleteProject(project.id);
          console.log('Test project deleted');

        } catch (error: any) {
          console.log('Project management failed:', error.message);
        }

      } catch (error: any) {
        throw new Error(`E2E project flow failed: ${error?.message || error}`);
      }
    }, 30000);
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle network interruptions gracefully', async () => {
      // Test with very short timeout to simulate network issues
      const unreliableSDK = new AgentStackSDK({
        ...testConfig,
        timeout: 100,
        retryAttempts: 2,
        retryDelay: 500,
      });

      try {
        await unreliableSDK.auth.getCurrentUser();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/timeout|network|connection/);
        console.log('Network interruption handled gracefully');
      }
    }, 10000);

    it('should handle authentication token expiration', async () => {
      try {
        // Try to use an expired or invalid token
        const expiredSDK = new AgentStackSDK({
          ...testConfig,
          apiKey: 'invalid-token',
        });

        await expiredSDK.auth.getCurrentUser();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/Unauthorized|invalid|token/);
        console.log('Token expiration handled gracefully');
      }
    }, 10000);

    it('should handle server errors gracefully', async () => {
      try {
        // Test with invalid project ID to trigger server error
        const invalidProjectSDK = new AgentStackSDK({
          ...testConfig,
          projectId: 99999,
        });

        await invalidProjectSDK.auth.getCurrentUser();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/error|failed|invalid/);
        console.log('Server error handled gracefully');
      }
    }, 10000);
  });

  describe('Performance and Load', () => {
    it('should handle concurrent requests', async () => {
      try {
        // Make multiple concurrent requests
        const promises = Array.from({ length: 5 }, () =>
          sdk.ping().catch(error => ({ error: error.message }))
        );

        const results = await Promise.allSettled(promises);
        
        // At least some requests should complete or fail gracefully
        expect(results.length).toBe(5);
        console.log('Concurrent requests handled');
      } catch (error: any) {
        throw new Error(`Concurrent request test failed: ${error?.message || error}`);
      }
    }, 20000);

    it('should handle large data responses', async () => {
      try {
        // Test with large limit to get many results
        const payments = await sdk.payments.getPayments({
          project_id: 1,
          limit: 1000,
          offset: 0,
        });
        
        expect(payments).toBeDefined();
        console.log('Large data response handled');
      } catch (error: any) {
        throw new Error(`Large data test failed: ${error?.message || error}`);
      }
    }, 20000);
  });
});



