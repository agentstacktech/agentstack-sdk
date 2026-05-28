/**
 * useAuth - React hook for authentication operations
 * Provides authentication state and methods using AgentStack SDK
 */

import { useState, useEffect, useCallback } from 'react';
import { useSDK } from '../context/SDKContext';
import { UserProfile, AuthTokens, LoginCredentials } from '@agentstack/sdk';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  toggle2FA: (enabled: boolean) => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const { sdk } = useSDK();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Load current user on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const user = await sdk.auth.getCurrentUser();
        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
        }));
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.message || 'Failed to load user',
        }));
      }
    };

    loadCurrentUser();
  }, [sdk.auth]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const tokens = await sdk.auth.login(credentials);
      
      // Store tokens if needed (SDK handles this internally)
      const user = await sdk.auth.getCurrentUser();
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      throw error;
    }
  }, [sdk.auth]);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.logout();
      
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Logout failed',
      }));
      throw error;
    }
  }, [sdk.auth]);

  const refresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const user = await sdk.auth.getCurrentUser();
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Failed to refresh user',
      }));
      throw error;
    }
  }, [sdk.auth]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const updatedUser = await sdk.auth.updateProfile(data);
      
      setState(prev => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to update profile',
      }));
      throw error;
    }
  }, [sdk.auth]);

  const changePassword = useCallback(async (data: { currentPassword: string; newPassword: string }) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.changePassword(data);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to change password',
      }));
      throw error;
    }
  }, [sdk.auth]);

  const toggle2FA = useCallback(async (enabled: boolean) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.toggle2FA(enabled);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to toggle 2FA',
      }));
      throw error;
    }
  }, [sdk.auth]);

  return {
    ...state,
    login,
    logout,
    refresh,
    updateProfile,
    changePassword,
    toggle2FA,
  };
}
