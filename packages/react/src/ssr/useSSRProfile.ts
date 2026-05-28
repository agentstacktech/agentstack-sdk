/**
 * useSSRProfile - SSR-safe profile hook
 * Provides profile data that works on both server and client
 */

import { useState, useEffect, useCallback } from 'react';
import { useSSR } from './SSRProvider';
import { ProfileData, SocialLinks } from '@agentstack/sdk';

export interface SSRProfileState {
  profileData: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
}

export interface SSRProfileActions {
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  setUsername: (username: string) => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  setBio: (bio: string) => Promise<void>;
  setSocialLink: (platform: string, url: string) => Promise<void>;
  setAvatar: (avatarData: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSSRProfile(): SSRProfileState & SSRProfileActions {
  const { sdk, isServer, isHydrated } = useSSR();
  const [state, setState] = useState<SSRProfileState>({
    profileData: null,
    isLoading: !isServer, // Don't show loading on server
    error: null,
    isHydrated,
  });

  // Load profile data on client hydration
  useEffect(() => {
    if (!isServer && isHydrated && sdk) {
      const loadProfileData = async () => {
        try {
          setState(prev => ({ ...prev, isLoading: true, error: null }));
          const profileData = await sdk.auth.getProfileData();
          setState(prev => ({
            ...prev,
            profileData,
            isLoading: false,
            isHydrated: true,
          }));
        } catch (error: any) {
          setState(prev => ({
            ...prev,
            profileData: null,
            isLoading: false,
            error: error.message || 'Failed to load profile data',
            isHydrated: true,
          }));
        }
      };

      loadProfileData();
    }
  }, [isServer, isHydrated, sdk]);

  // Update hydration state
  useEffect(() => {
    setState(prev => ({ ...prev, isHydrated }));
  }, [isHydrated]);

  const updateProfile = useCallback(async (data: Partial<ProfileData>) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const updatedProfile = await sdk.auth.updateProfileData(data);
      
      setState(prev => ({
        ...prev,
        profileData: updatedProfile,
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

  const setUsername = useCallback(async (username: string) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setUsername(username);
      
      const updatedProfile = await sdk.auth.getProfileData();
      setState(prev => ({
        ...prev,
        profileData: updatedProfile,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set username',
      }));
      throw error;
    }
  }, [sdk]);

  const setDisplayName = useCallback(async (displayName: string) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setDisplayName(displayName);
      
      const updatedProfile = await sdk.auth.getProfileData();
      setState(prev => ({
        ...prev,
        profileData: updatedProfile,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set display name',
      }));
      throw error;
    }
  }, [sdk]);

  const setBio = useCallback(async (bio: string) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setBio(bio);
      
      const updatedProfile = await sdk.auth.getProfileData();
      setState(prev => ({
        ...prev,
        profileData: updatedProfile,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set bio',
      }));
      throw error;
    }
  }, [sdk]);

  const setSocialLink = useCallback(async (platform: string, url: string) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setSocialLink(platform, url);
      
      const updatedProfile = await sdk.auth.getProfileData();
      setState(prev => ({
        ...prev,
        profileData: updatedProfile,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set social link',
      }));
      throw error;
    }
  }, [sdk]);

  const setAvatar = useCallback(async (avatarData: string) => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setAvatar(avatarData);
      
      const updatedProfile = await sdk.auth.getProfileData();
      setState(prev => ({
        ...prev,
        profileData: updatedProfile,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to set avatar',
      }));
      throw error;
    }
  }, [sdk]);

  const refresh = useCallback(async () => {
    if (!sdk) throw new Error('SDK not available');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const profileData = await sdk.auth.getProfileData();
      
      setState(prev => ({
        ...prev,
        profileData,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to refresh profile data',
      }));
      throw error;
    }
  }, [sdk]);

  return {
    ...state,
    updateProfile,
    setUsername,
    setDisplayName,
    setBio,
    setSocialLink,
    setAvatar,
    refresh,
  };
}
