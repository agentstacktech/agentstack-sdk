/**
 * Advanced usage example for AgentStack SDK
 * Demonstrates interceptors, error handling, and event listening
 */

import { AgentStackSDK, AgentStackError } from '@agentstack/sdk';

async function advancedExample() {
  // Initialize SDK with advanced configuration
  const sdk = new AgentStackSDK({
    baseUrl: 'https://api.agentstack.com',
    apiKey: 'your-api-key',
    projectId: 123,
    timeout: 30000,
    retryAttempts: 3,
    enableCaching: true,
    enableMetrics: true,
    
    // Request interceptor
    requestInterceptor: async (config) => {
      console.log('Making request:', config.method, config.url);
      
      // Add custom header
      config.headers['X-Custom-Header'] = 'custom-value';
      
      return config;
    },
    
    // Response interceptor
    responseInterceptor: async (response) => {
      console.log('Received response:', response.status, response.duration + 'ms');
      return response;
    },
    
    // Error interceptor
    errorInterceptor: async (error) => {
      console.error('Request failed:', error.message, error.code);
      return error;
    }
  });

  // Event listeners
  sdk.on('request:success', (data) => {
    console.log('Request successful:', data.config.url);
  });

  sdk.on('request:error', (data) => {
    console.error('Request failed:', data.error.message);
  });

  sdk.on('auth:login', (data) => {
    console.log('User logged in:', data.user.email);
  });

  sdk.on('auth:logout', () => {
    console.log('User logged out');
  });

  // Error handling with retry
  async function robustRequest() {
    try {
      const response = await sdk.http.get('/api/some-endpoint', {
        retry: {
          maxAttempts: 5,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true
        }
      });
      
      return response.data;
    } catch (error) {
      if (error instanceof AgentStackError) {
        switch (error.code) {
          case 'RATE_LIMIT':
            console.log('Rate limited, retrying after:', error.retryAfter);
            await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
            return robustRequest();
            
          case 'UNAUTHORIZED':
            console.log('Authentication failed, please login again');
            throw error;
            
          case 'DEMO_READ_ONLY':
            console.log('Demo mode - read only operation');
            throw error;
            
          default:
            console.error('Unexpected error:', error.message);
            throw error;
        }
      }
      throw error;
    }
  }

  // Caching example
  async function cachedRequest() {
    // First request - will be cached
    const response1 = await sdk.http.get('/api/cacheable-data');
    console.log('First request (from server):', response1.duration + 'ms');
    
    // Second request - will use cache
    const response2 = await sdk.http.get('/api/cacheable-data');
    console.log('Second request (from cache):', response2.duration + 'ms');
    
    // Clear cache
    sdk.http.clearCache();
    
    // Third request - will be from server again
    const response3 = await sdk.http.get('/api/cacheable-data');
    console.log('Third request (cache cleared):', response3.duration + 'ms');
  }

  // Idempotency example
  async function idempotentRequest() {
    const idempotencyKey = `create-payment-${Date.now()}`;
    
    try {
      // First request
      const response1 = await sdk.http.post('/api/payments', {
        amount: 100,
        currency: 'USD'
      }, {
        idempotencyKey
      });
      
      console.log('First payment request:', response1.data.id);
      
      // Second request with same idempotency key - should return same result
      const response2 = await sdk.http.post('/api/payments', {
        amount: 100,
        currency: 'USD'
      }, {
        idempotencyKey
      });
      
      console.log('Second payment request (idempotent):', response2.data.id);
      console.log('Same result:', response1.data.id === response2.data.id);
      
    } catch (error) {
      console.error('Payment failed:', error.message);
    }
  }

  // Demo mode example
  async function demoModeExample() {
    const demoSdk = new AgentStackSDK({
      baseUrl: 'https://api.agentstack.com',
      apiKey: 'demo-api-key',
      projectId: 123,
      demoMode: 'ro' // Read-only demo mode
    });

    try {
      // This will work in demo mode
      const projects = await demoSdk.http.get('/api/projects');
      console.log('Demo projects:', projects.data);
      
      // This will fail in read-only demo mode
      await demoSdk.http.post('/api/projects', { name: 'New Project' });
    } catch (error) {
      if (error.code === 'DEMO_READ_ONLY') {
        console.log('Demo mode: Write operations not allowed');
      }
    }
  }

  // Run examples
  try {
    await robustRequest();
    await cachedRequest();
    await idempotentRequest();
    await demoModeExample();
  } catch (error) {
    console.error('Example failed:', error.message);
  } finally {
    // Cleanup
    sdk.destroy();
  }
}

// Run advanced example
advancedExample().catch(console.error);
