/**
 * Basic usage example for AgentStack SDK
 */

import { AgentStackSDK } from '@agentstack/sdk';

async function basicExample() {
  // Initialize SDK
  const sdk = new AgentStackSDK({
    baseUrl: 'https://api.agentstack.com',
    apiKey: 'your-api-key',
    projectId: 123,
    timeout: 30000,
    retryAttempts: 3,
    enableCaching: true,
    enableMetrics: true
  });

  // Health check
  const isHealthy = await sdk.healthCheck();
  console.log('SDK Health:', isHealthy);

  // Authentication
  try {
    const loginResponse = await sdk.auth.login({
      email: 'user@example.com',
      password: 'password123',
      projectId: 123
    });
    
    console.log('Login successful:', loginResponse.user.email);
  } catch (error) {
    console.error('Login failed:', error.message);
  }

  // Get current user
  try {
    const user = await sdk.auth.getCurrentUser();
    console.log('Current user:', user.username);
  } catch (error) {
    console.error('Failed to get user:', error.message);
  }

  // Direct HTTP access
  try {
    const response = await sdk.http.get('/api/projects');
    console.log('Projects:', response.data);
  } catch (error) {
    console.error('Failed to fetch projects:', error.message);
  }

  // Get metrics
  const metrics = sdk.http.getMetrics();
  console.log('SDK Metrics:', metrics);

  // Cleanup
  sdk.destroy();
}

// Run example
basicExample().catch(console.error);
