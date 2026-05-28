/**
 * SSRProfileComponent - SSR-safe profile component
 * Demonstrates how to use SSR hooks for server-side rendering
 */

import React, { useState } from 'react';
import { useSSRAuth, useSSRProfile, useSSRSettings } from './index';

export function SSRProfileComponent() {
  const { user, isAuthenticated, isLoading: authLoading, login, logout, isHydrated } = useSSRAuth();
  const { profileData, isLoading: profileLoading, updateProfile, setUsername, setDisplayName } = useSSRProfile();
  const { settings, isLoading: settingsLoading, setTheme, setNotification } = useSSRSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    displayName: '',
    bio: '',
  });

  // Initialize edit form when profile data loads
  React.useEffect(() => {
    if (profileData) {
      setEditForm({
        username: profileData.username || '',
        displayName: profileData.display_name || '',
        bio: profileData.bio || '',
      });
    }
  }, [profileData]);

  const handleLogin = async () => {
    try {
      await login({
        email: 'user@example.com',
        password: 'password',
        project_id: 1,
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        username: editForm.username,
        display_name: editForm.displayName,
        bio: editForm.bio,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    try {
      await setTheme(theme);
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  };

  const handleNotificationToggle = async (type: string, enabled: boolean) => {
    try {
      await setNotification(type, enabled);
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  // Show loading state only on client side after hydration
  if (!isHydrated || authLoading || profileLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">
          {!isHydrated ? 'Hydrating...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Login Required</h2>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Profile (SSR Safe)</h1>
        <div className="flex space-x-2">
          <span className="text-sm text-gray-500">
            {isHydrated ? 'Hydrated' : 'Server-side'}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-sm text-gray-900">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Profile Data */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Profile Data</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <p className="mt-1 text-sm text-gray-900">{profileData?.username || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <p className="mt-1 text-sm text-gray-900">{profileData?.display_name || 'Not set'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <p className="mt-1 text-sm text-gray-900">{profileData?.bio || 'Not set'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        
        {/* Theme Settings */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
          <div className="flex space-x-2">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`py-2 px-4 rounded ${
                  settings?.theme === theme
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notifications</label>
          <div className="space-y-2">
            {settings?.notifications && Object.entries(settings.notifications).map(([type, enabled]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{type}</span>
                <button
                  onClick={() => handleNotificationToggle(type, !enabled)}
                  className={`py-1 px-3 rounded text-sm ${
                    enabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
