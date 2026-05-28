/**
 * Test setup for AgentStack SDK Core
 * Provides mock implementations and test utilities
 *
 * Note: avoid static `import '../src/sdk'` here — that pulls `import.meta` surfaces
 * (e.g. lightbox) into ts-jest's CJS transform. Use dynamic import inside helpers.
 */

import type { SDKConfig } from '../src/types';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Test configuration
export const testConfig: SDKConfig = {
  apiBase: 'http://localhost:8000',
  apiKey: 'test-api-key',
  projectId: 1,
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Mock response helper
export function createMockResponse(data: any, status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  };
}

// Mock error response helper
export function createMockErrorResponse(message: string, status: number = 400) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  };
}

// Test user data
export const testUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  display_name: 'Test User',
  role: 'user',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// Test profile data
export const testProfileData = {
  display_name: 'Test User',
  username: 'testuser',
  bio: 'Test bio',
  avatar: 'data:image/jpeg;base64,test',
  location: 'Test City',
  website: 'https://test.com',
  social_links: {
    github: 'https://github.com/testuser',
    twitter: 'https://twitter.com/testuser',
  },
};

// Test settings data
export const testSettings = {
  theme: 'dark' as const,
  language: 'en',
  timezone: 'UTC',
  notifications: {
    email: true,
    push: false,
    sms: false,
  },
  privacy: {
    profile_public: true,
    show_email: false,
    show_activity: true,
  },
  dashboard: {
    layout: 'compact' as const,
    default_view: 'grid' as const,
    items_per_page: 20,
  },
};

// Test project data
export const testProject = {
  id: 1,
  name: 'Test Project',
  description: 'Test project description',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// Test payment data
export const testPayment = {
  id: 'payment_123',
  amount: 1000,
  currency: 'USD',
  status: 'completed' as const,
  description: 'Test payment',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// Test analytics data
export const testAnalytics = {
  total_events: 1000,
  unique_users: 100,
  total_revenue: 5000,
  conversion_rate: 0.05,
  period: '30d',
};

// Helper to create SDK instance for testing
export async function createTestSDK(config: Partial<SDKConfig> = {}) {
  const { AgentStackSDK } = await import('../src/sdk');
  return new AgentStackSDK({ ...testConfig, ...config });
}

// Helper to mock successful API response
export function mockSuccessfulResponse(data: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(data));
}

// Helper to mock error API response
export function mockErrorResponse(message: string, status: number = 400) {
  (global.fetch as jest.Mock).mockResolvedValueOnce(createMockErrorResponse(message, status));
}

// Helper to mock network error
export function mockNetworkError() {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
}

// Clean up after each test
export function cleanupMocks() {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockClear();
}



