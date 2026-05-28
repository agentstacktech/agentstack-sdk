/**
 * Unit tests for useAuth React hook
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { SDKProvider } from '../../src/context/SDKContext';
import { AgentStackSDK } from '@agentstack/sdk';
import { testConfig, testUser, cleanupMocks } from '../../../core/__tests__/setup';

// Mock the SDK
jest.mock('@agentstack/sdk', () => ({
  AgentStackSDK: jest.fn().mockImplementation(() => ({
    auth: {
      login: jest.fn(),
      logout: jest.fn(),
      getCurrentUser: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      toggle2FA: jest.fn(),
    },
  })),
}));

describe('useAuth', () => {
  let queryClient: QueryClient;
  let mockSDK: jest.Mocked<AgentStackSDK>;

  beforeEach(() => {
    cleanupMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockSDK = new AgentStackSDK(testConfig) as jest.Mocked<AgentStackSDK>;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SDKProvider config={testConfig} sdk={mockSDK}>
        {children}
      </SDKProvider>
    </QueryClientProvider>
  );

  describe('Authentication State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load current user on mount', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(testUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockSDK.auth.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should handle getCurrentUser error', async () => {
      const errorMessage = 'Unauthorized';
      mockSDK.auth.getCurrentUser.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password',
        project_id: 1,
      };

      const tokens = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockSDK.auth.login.mockResolvedValueOnce(tokens);
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(loginData);
      });

      expect(mockSDK.auth.login).toHaveBeenCalledWith(loginData);
      expect(mockSDK.auth.getCurrentUser).toHaveBeenCalledTimes(2); // Once on mount, once after login
      expect(result.current.user).toEqual(testUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle login error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong_password',
        project_id: 1,
      };

      const errorMessage = 'Invalid credentials';
      mockSDK.auth.login.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login(loginData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      // First login
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Then logout
      mockSDK.auth.logout.mockResolvedValueOnce({ message: 'Logged out successfully' });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSDK.auth.logout).toHaveBeenCalledTimes(1);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle logout error', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const errorMessage = 'Logout failed';
      mockSDK.auth.logout.mockRejectedValueOnce(new Error(errorMessage));

      await act(async () => {
        try {
          await result.current.logout();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Profile Updates', () => {
    it('should update profile successfully', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const updateData = { display_name: 'Updated Name' };
      const updatedUser = { ...testUser, ...updateData };
      mockSDK.auth.updateProfile.mockResolvedValueOnce(updatedUser);

      await act(async () => {
        await result.current.updateProfile(updateData);
      });

      expect(mockSDK.auth.updateProfile).toHaveBeenCalledWith(updateData);
      expect(result.current.user).toEqual(updatedUser);
    });

    it('should handle profile update error', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const updateData = { display_name: 'Updated Name' };
      const errorMessage = 'Update failed';
      mockSDK.auth.updateProfile.mockRejectedValueOnce(new Error(errorMessage));

      await act(async () => {
        try {
          await result.current.updateProfile(updateData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Password Change', () => {
    it('should change password successfully', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };

      mockSDK.auth.changePassword.mockResolvedValueOnce({ message: 'Password changed successfully' });

      await act(async () => {
        await result.current.changePassword(passwordData);
      });

      expect(mockSDK.auth.changePassword).toHaveBeenCalledWith(passwordData);
      expect(result.current.error).toBeNull();
    });

    it('should handle password change error', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
      };

      const errorMessage = 'Current password is incorrect';
      mockSDK.auth.changePassword.mockRejectedValueOnce(new Error(errorMessage));

      await act(async () => {
        try {
          await result.current.changePassword(passwordData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('2FA Management', () => {
    it('should toggle 2FA successfully', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      mockSDK.auth.toggle2FA.mockResolvedValueOnce({ message: '2FA enabled successfully' });

      await act(async () => {
        await result.current.toggle2FA(true);
      });

      expect(mockSDK.auth.toggle2FA).toHaveBeenCalledWith(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle 2FA toggle error', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const errorMessage = '2FA setup failed';
      mockSDK.auth.toggle2FA.mockRejectedValueOnce(new Error(errorMessage));

      await act(async () => {
        try {
          await result.current.toggle2FA(true);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Refresh', () => {
    it('should refresh user data successfully', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const updatedUser = { ...testUser, display_name: 'Refreshed Name' };
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(updatedUser);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSDK.auth.getCurrentUser).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
      expect(result.current.user).toEqual(updatedUser);
    });

    it('should handle refresh error', async () => {
      mockSDK.auth.getCurrentUser.mockResolvedValueOnce(testUser);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const errorMessage = 'Refresh failed';
      mockSDK.auth.getCurrentUser.mockRejectedValueOnce(new Error(errorMessage));

      await act(async () => {
        try {
          await result.current.refresh();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });
});
