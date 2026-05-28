/**
 * Unit tests for AgentAuth module
 */

import { AgentAuth } from '../../src/modules/AgentAuth';
import { HTTPClient } from '../../src/client/http-client';
import {
  testConfig,
  testUser,
  testProfileData,
  testSettings,
  createMockResponse,
  createMockErrorResponse,
  mockSuccessfulResponse,
  mockErrorResponse,
  mockNetworkError,
  cleanupMocks,
} from '../setup';

describe('AgentAuth', () => {
  let auth: AgentAuth;
  let mockHttpClient: jest.Mocked<HTTPClient>;

  beforeEach(() => {
    cleanupMocks();
    
    // Create mock HTTP client
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    auth = new AgentAuth(mockHttpClient);
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password',
        project_id: 1,
      };

      const expectedResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.login(loginData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/login', loginData);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle login error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong_password',
        project_id: 1,
      };

      mockHttpClient.post.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(auth.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should logout successfully', async () => {
      const expectedResponse = { message: 'Logged out successfully' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.logout();

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(result).toEqual(expectedResponse);
    });

    it('should get current user', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: testUser,
      });

      const result = await auth.getCurrentUser();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(testUser);
    });

    it('should refresh token', async () => {
      const refreshData = { refresh_token: 'refresh_token_123' };
      const expectedResponse = {
        access_token: 'new_access_token_123',
        refresh_token: 'new_refresh_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.refreshToken(refreshData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/refresh', refreshData);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Profile Management', () => {
    it('should get profile data', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: testProfileData,
      });

      const result = await auth.getProfileData();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/profile-data');
      expect(result).toEqual(testProfileData);
    });

    it('should update profile data', async () => {
      const updateData = { display_name: 'Updated Name' };
      const expectedResponse = { ...testProfileData, ...updateData };

      mockHttpClient.put.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.updateProfileData(updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/auth/profile-data', updateData);
      expect(result).toEqual(expectedResponse);
    });

    it('should set username', async () => {
      const username = 'newusername';
      const expectedResponse = { ...testProfileData, username };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setUsername(username);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/profile-data/set', {
        path: 'username',
        value: username,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set display name', async () => {
      const displayName = 'New Display Name';
      const expectedResponse = { ...testProfileData, display_name: displayName };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setDisplayName(displayName);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/profile-data/set', {
        path: 'display_name',
        value: displayName,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set bio', async () => {
      const bio = 'New bio text';
      const expectedResponse = { ...testProfileData, bio };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setBio(bio);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/profile-data/set', {
        path: 'bio',
        value: bio,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set social link', async () => {
      const platform = 'github';
      const url = 'https://github.com/newuser';
      const expectedResponse = {
        ...testProfileData,
        social_links: { ...testProfileData.social_links, [platform]: url },
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setSocialLink(platform, url);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/profile-data/set', {
        path: `social_links.${platform}`,
        value: url,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set avatar', async () => {
      const avatarData = 'data:image/jpeg;base64,newavatar';
      const expectedResponse = { ...testProfileData, avatar: avatarData };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setAvatar(avatarData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/profile-data/set', {
        path: 'avatar',
        value: avatarData,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Settings Management', () => {
    it('should get settings', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: testSettings,
      });

      const result = await auth.getSettings();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/settings');
      expect(result).toEqual(testSettings);
    });

    it('should update settings', async () => {
      const updateData = { theme: 'light' };
      const expectedResponse = { ...testSettings, ...updateData };

      mockHttpClient.put.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.updateSettings(updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/auth/settings', updateData);
      expect(result).toEqual(expectedResponse);
    });

    it('should set theme', async () => {
      const theme = 'light';
      const expectedResponse = { ...testSettings, theme };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setTheme(theme);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/settings/set', {
        path: 'theme',
        value: theme,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set notification', async () => {
      const type = 'email';
      const enabled = false;
      const expectedResponse = {
        ...testSettings,
        notifications: { ...testSettings.notifications, [type]: enabled },
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setNotification(type, enabled);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/settings/set', {
        path: `notifications.${type}`,
        value: enabled,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set privacy setting', async () => {
      const setting = 'profile_public';
      const value = false;
      const expectedResponse = {
        ...testSettings,
        privacy: { ...testSettings.privacy, [setting]: value },
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setPrivacy(setting, value);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/settings/set', {
        path: `privacy.${setting}`,
        value,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set dashboard layout', async () => {
      const layout = 'comfortable';
      const expectedResponse = {
        ...testSettings,
        dashboard: { ...testSettings.dashboard, layout },
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setDashboardLayout(layout);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/settings/set', {
        path: 'dashboard.layout',
        value: layout,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Password Management', () => {
    it('should change password', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };
      const expectedResponse = { message: 'Password changed successfully' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.changePassword(passwordData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/change-password', passwordData);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('2FA Management', () => {
    it('should toggle 2FA', async () => {
      const enabled = true;
      const expectedResponse = { message: '2FA enabled successfully' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.toggle2FA(enabled);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/2fa/toggle', { enabled });
      expect(result).toEqual(expectedResponse);
    });

    it('should get 2FA status', async () => {
      const expectedResponse = { enabled: true, qr_code: 'qr_code_data' };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.get2FAStatus();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/2fa/status');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Session Management', () => {
    it('should get active sessions', async () => {
      const expectedResponse = {
        sessions: [
          {
            id: 'session_1',
            user_agent: 'Mozilla/5.0...',
            ip_address: '192.168.1.1',
            created_at: '2025-01-01T00:00:00Z',
            last_activity: '2025-01-01T12:00:00Z',
            is_current: true,
          },
        ],
        total: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.getActiveSessions();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/sessions');
      expect(result).toEqual(expectedResponse);
    });

    it('should revoke session', async () => {
      const sessionId = 'session_1';
      const expectedResponse = { message: 'Session revoked successfully' };

      mockHttpClient.delete.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.revokeSession(sessionId);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(`/auth/sessions/${sessionId}`);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Security Alerts', () => {
    it('should get security alerts', async () => {
      const expectedResponse = {
        alerts: [
          {
            id: 'alert_1',
            type: 'login_attempt',
            message: 'New login from unknown device',
            severity: 'medium',
            created_at: '2025-01-01T00:00:00Z',
            is_read: false,
          },
        ],
        total: 1,
      };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.getSecurityAlerts();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/security-alerts');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('OAuth Management', () => {
    it('should get OAuth providers', async () => {
      const expectedResponse = {
        providers: [
          { name: 'google', display_name: 'Google', is_connected: true },
          { name: 'github', display_name: 'GitHub', is_connected: false },
        ],
      };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.getOAuthProviders();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/oauth/providers');
      expect(result).toEqual(expectedResponse);
    });

    it('should connect OAuth provider', async () => {
      const provider = 'google';
      const expectedResponse = { redirect_url: 'https://oauth.google.com/...' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.connectOAuthProvider(provider);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/oauth/connect', { provider });
      expect(result).toEqual(expectedResponse);
    });

    it('should disconnect OAuth provider', async () => {
      const provider = 'google';
      const expectedResponse = { message: 'Provider disconnected successfully' };

      mockHttpClient.delete.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.disconnectOAuthProvider(provider);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(`/auth/oauth/disconnect/${provider}`);
      expect(result).toEqual(expectedResponse);
    });
  });
});



