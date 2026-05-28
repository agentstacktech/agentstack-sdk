/**
 * useSSRAuth - SSR-safe authentication hook
 * Provides authentication state that works on both server and client
 */

import { useState, useEffect, useCallback } from 'react';
import { useSSR } from './SSRProvider';
import { UserProfile, AuthTokens, LoginCredentials } from '@agentstack/sdk';

export interface SSRAuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
}

export interface SSRAuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  toggle2FA: (enabled: boolean) => Promise<void>;
}

export function useSSRAuth(): SSRAuthState & SSRAuthActions {
  const { sdk, isServer, isHydrated } = useSSR();
  const [state, setState] = useState<SSRAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: !isServer, // Don't show loading on server
    error: null,
    isHydrated,
  });

  // Load current user on client hydration
  useEffect(() => {
    if (!isServer && isHydrated && sdk) {
      const loadCurrentUser = async () => {
        try {
          setState(prev => ({ ...prev, isLoading: true, error: null }));
          const user = await sdk.auth.getCurrentUser();
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
            isHydrated: true,
          }));
        } catch (error: any) {
          setState(prev => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Failed to load user',
            isHydrated: true,
          }));
        }
      };

      loadCurrentUser();
    }
  }, [isServer, isHydrated, sdk]);

  // Update hydration state
  useEffect(() => {
    setState(prev => ({ ...prev, isHydrated }));
  }, [isHydrated]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const tokens = await sdk.auth.login(credentials);
      
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
  }, [sdk]);

  const logout = useCallback(async () => {
    if (!sdk) throw new Error('SDK not available');
    
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
  }, [sdk]);

  const refresh = useCallback(async () => {
    if (!sdk) throw new Error('SDK not available');
    
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
  }, [sdk]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!sdk) throw new Error('SDK not available');
    
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
  }, [sdk]);

  const changePassword = useCallback(async (data: { currentPassword: string; newPassword: string }) => {
    if (!sdk) throw new Error('SDK not available');
    
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
  }, [sdk]);

  const toggle2FA = useCallback(async (enabled: boolean) => {
    if (!sdk) throw new Error('SDK not available');
    
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
  }, [sdk]);

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
