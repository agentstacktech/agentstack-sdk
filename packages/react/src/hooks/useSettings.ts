/**
 * useSettings - React hook for user settings operations
 * Provides settings state and methods using AgentStack SDK
 */

import { useState, useEffect, useCallback } from 'react';
import { useSDK } from '../context/SDKContext';
import { UserSettings, NotificationSettings, PrivacySettings, DashboardSettings } from '@agentstack/sdk';

export interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
}

export interface SettingsActions {
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setNotification: (type: string, enabled: boolean) => Promise<void>;
  setPrivacy: (setting: string, value: boolean) => Promise<void>;
  setDashboardLayout: (layout: 'compact' | 'comfortable') => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSettings(): SettingsState & SettingsActions {
  const { sdk } = useSDK();
  const [state, setState] = useState<SettingsState>({
    settings: null,
    isLoading: true,
    error: null,
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
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
          settings: null,
          isLoading: false,
          error: error.message || 'Failed to load settings',
        }));
      }
    };

    loadSettings();
  }, [sdk.auth]);

  const updateSettings = useCallback(async (data: Partial<UserSettings>) => {
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
  }, [sdk.auth]);

  const setTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setTheme(theme);
      
      // Refresh settings to get updated theme
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
  }, [sdk.auth]);

  const setNotification = useCallback(async (type: string, enabled: boolean) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setNotification(type, enabled);
      
      // Refresh settings to get updated notifications
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
  }, [sdk.auth]);

  const setPrivacy = useCallback(async (setting: string, value: boolean) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setPrivacy(setting, value);
      
      // Refresh settings to get updated privacy settings
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
  }, [sdk.auth]);

  const setDashboardLayout = useCallback(async (layout: 'compact' | 'comfortable') => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setDashboardLayout(layout);
      
      // Refresh settings to get updated dashboard layout
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
  }, [sdk.auth]);

  const refresh = useCallback(async () => {
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
  }, [sdk.auth]);

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
