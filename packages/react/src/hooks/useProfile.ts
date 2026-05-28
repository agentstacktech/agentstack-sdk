/**
 * useProfile - React hook for profile data operations
 * Provides profile data state and methods using AgentStack SDK
 */

import { useState, useEffect, useCallback } from 'react';
import { useSDK } from '../context/SDKContext';
import { ProfileData, SocialLinks } from '@agentstack/sdk';

export interface ProfileState {
  profileData: ProfileData | null;
  isLoading: boolean;
  error: string | null;
}

export interface ProfileActions {
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  setUsername: (username: string) => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  setBio: (bio: string) => Promise<void>;
  setSocialLink: (platform: string, url: string) => Promise<void>;
  setAvatar: (avatarData: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProfile(): ProfileState & ProfileActions {
  const { sdk } = useSDK();
  const [state, setState] = useState<ProfileState>({
    profileData: null,
    isLoading: true,
    error: null,
  });

  // Load profile data on mount
  useEffect(() => {
    const loadProfileData = async () => {
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
          profileData: null,
          isLoading: false,
          error: error.message || 'Failed to load profile data',
        }));
      }
    };

    loadProfileData();
  }, [sdk.auth]);

  const updateProfile = useCallback(async (data: Partial<ProfileData>) => {
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
  }, [sdk.auth]);

  const setUsername = useCallback(async (username: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setUsername(username);
      
      // Refresh profile data to get updated username
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
  }, [sdk.auth]);

  const setDisplayName = useCallback(async (displayName: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setDisplayName(displayName);
      
      // Refresh profile data to get updated display name
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
  }, [sdk.auth]);

  const setBio = useCallback(async (bio: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setBio(bio);
      
      // Refresh profile data to get updated bio
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
  }, [sdk.auth]);

  const setSocialLink = useCallback(async (platform: string, url: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setSocialLink(platform, url);
      
      // Refresh profile data to get updated social links
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
  }, [sdk.auth]);

  const setAvatar = useCallback(async (avatarData: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sdk.auth.setAvatar(avatarData);
      
      // Refresh profile data to get updated avatar
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
  }, [sdk.auth]);

  const refresh = useCallback(async () => {
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
  }, [sdk.auth]);

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
