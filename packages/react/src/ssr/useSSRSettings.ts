/**
 * useSSRSettings - SSR-safe settings hook
 * Provides settings data that works on both server and client
 */

import { useState, useEffect, useCallback } from 'react';
import { useSSR } from './SSRProvider';
import { UserSettings, NotificationSettings, PrivacySettings, DashboardSettings } from '@agentstack/sdk';

export interface SSRSettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
}

export interface SSRSettingsActions {
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setNotification: (type: string, enabled: boolean) => Promise<void>;
  setPrivacy: (setting: string, value: boolean) => Promise<void>;
  setDashboardLayout: (layout: 'compact' | 'comfortable') => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSSRSettings(): SSRSettingsState & SSRSettingsActions {
  const { sdk, isServer, isHydrated } = useSSR();
  const [state, setState] = useState<SSRSettingsState>({
    settings: null,
    isLoading: !isServer, // Don't show loading on server
    error: null,
    isHydrated,
  });

  // Load settings on client hydration
  useEffect(() => {
    if (!isServer && isHydrated && sdk) {
      const loadSettings = async () => {
        try {
          setState(prev => ({ ...prev, isLoading: true, error: null }));
          const settings = await sdk.auth.getSettings();
          setState(prev => ({
            ...prev,
            settings,
            isLoading: false,
            isHydrated: true,
          }));
        } catch (error: any) {
          setState(prev => ({
            ...prev,
            settings: null,
            isLoading: false,
            error: error.message || 'Failed to load settings',
            isHydrated: true,
          }));
        }
      };

      loadSettings();
    }
  }, [isServer, isHydrated, sdk]);

  // Update hydration state
  useEffect(() => {
    setState(prev => ({ ...prev, isHydrated }));
  }, [isHydrated]);

  const updateSettings = useCallback(async (data: Partial<UserSettings>) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const updatedSettings = await sdk.auth.updateSettings(data);
      
      setState(prev => ({
        ...prev,
        settings: updatedSettings,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to update settings',
      }));
      throw error;
    }
  }, [sdk]);

  const setTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setTheme(theme);
      
      const updatedSettings = await sdk.auth.getSettings();
      setState(prev => ({
        ...prev,
        settings: updatedSettings,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set theme',
      }));
      throw error;
    }
  }, [sdk]);

  const setNotification = useCallback(async (type: string, enabled: boolean) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setNotification(type, enabled);
      
      const updatedSettings = await sdk.auth.getSettings();
      setState(prev => ({
        ...prev,
        settings: updatedSettings,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set notification',
      }));
      throw error;
    }
  }, [sdk]);

  const setPrivacy = useCallback(async (setting: string, value: boolean) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setPrivacy(setting, value);
      
      const updatedSettings = await sdk.auth.getSettings();
      setState(prev => ({
        ...prev,
        settings: updatedSettings,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set privacy setting',
      }));
      throw error;
    }
  }, [sdk]);

  const setDashboardLayout = useCallback(async (layout: 'compact' | 'comfortable') => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setDashboardLayout(layout);
      
      const updatedSettings = await sdk.auth.getSettings();
      setState(prev => ({
        ...prev,
        settings: updatedSettings,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set dashboard layout',
      }));
      throw error;
    }
  }, [sdk]);

  const refresh = useCallback(async () => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const settings = await sdk.auth.getSettings();
      
      setState(prev => ({
        ...prev,
        settings,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to refresh settings',
      }));
      throw error;
    }
  }, [sdk]);

  return {
    ...state,
    updateSettings,
    setTheme,
    setNotification,
    setPrivacy,
    setDashboardLayout,
    refresh,
  };
}
