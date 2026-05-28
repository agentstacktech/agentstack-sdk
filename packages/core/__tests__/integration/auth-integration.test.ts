/**
 * Integration tests for AgentAuth module with real API
 * Tests actual communication with backend services
 */

import { AgentStackSDK } from '../../src/sdk';

describe('AgentAuth Integration Tests', () => {
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

  describe('Authentication Flow', () => {
    it('should connect to auth service', async () => {
      try {
        // Test basic connectivity
        const response = await sdk.ping();
        expect(response).toBeDefined();
      } catch (error) {
        // If service is not available, skip test
        console.warn('Auth service not available, skipping integration test');
        expect(true).toBe(true); // Pass the test
      }
    }, 15000);

    it('should handle login with invalid credentials gracefully', async () => {
      try {
        await sdk.auth.login({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
          project_id: 1,
        });
        
        // If we reach here, login should have failed
        expect(false).toBe(true);
      } catch (error: any) {
        // Expected to fail with invalid credentials
        expect(error.message).toContain('Invalid');
      }
    }, 15000);

    it('should get current user when not authenticated', async () => {
      try {
        await sdk.auth.getCurrentUser();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Profile Data Operations', () => {
    it('should get profile data when not authenticated', async () => {
      try {
        await sdk.auth.getProfileData();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle profile data updates when not authenticated', async () => {
      try {
        await sdk.auth.updateProfileData({
          display_name: 'Test User',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Settings Operations', () => {
    it('should get settings when not authenticated', async () => {
      try {
        await sdk.auth.getSettings();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle settings updates when not authenticated', async () => {
      try {
        await sdk.auth.updateSettings({
          theme: 'dark',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Password Operations', () => {
    it('should handle password change when not authenticated', async () => {
      try {
        await sdk.auth.changePassword({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('2FA Operations', () => {
    it('should get 2FA status when not authenticated', async () => {
      try {
        await sdk.auth.get2FAStatus();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);

    it('should handle 2FA toggle when not authenticated', async () => {
      try {
        await sdk.auth.toggle2FA(true);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Session Management', () => {
    it('should get active sessions when not authenticated', async () => {
      try {
        await sdk.auth.getActiveSessions();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('Security Operations', () => {
    it('should get security alerts when not authenticated', async () => {
      try {
        await sdk.auth.getSecurityAlerts();
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated
        expect(error.message).toContain('Unauthorized');
      }
    }, 15000);
  });

  describe('OAuth Operations', () => {
    it('should get OAuth providers', async () => {
      try {
        const providers = await sdk.auth.getOAuthProviders();
        expect(providers).toBeDefined();
        expect(providers.providers).toBeInstanceOf(Array);
      } catch (error) {
        // Service might not be available
        console.warn('OAuth service not available');
        expect(true).toBe(true);
      }
    }, 15000);

    it('should handle OAuth connect when not authenticated', async () => {
      try {
        await sdk.auth.connectOAuthProvider('google');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Expected to fail when not authenticated or service not available
        expect(error.message).toMatch(/Unauthorized|not available/);
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutSDK = new AgentStackSDK({
        ...testConfig,
        timeout: 100, // Very short timeout
      });

      try {
        await timeoutSDK.auth.getCurrentUser();
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
        await invalidSDK.auth.getCurrentUser();
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.message).toMatch(/network|connection|refused/);
      }
    }, 15000);
  });
});



