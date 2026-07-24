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
      getAuthToken: jest.fn().mockReturnValue(null),
      getApiKey: jest.fn().mockReturnValue(null),
      setAuthToken: jest.fn(),
      setApiKey: jest.fn(),
      updateConfig: jest.fn(),
      evictCacheByUrl: jest.fn().mockResolvedValue(undefined),
      markRecentLoginSuccess: jest.fn(),
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
        access_token: 'aaa.bbb.ccc',
        refresh_token: 'api.key.token',
        token_type: 'Bearer',
        expires_in: 86400,
        user_id: '1',
        project_id: '1',
        permissions: [],
      };

      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            user_token: 'aaa.bbb.ccc',
            api_key: 'api.key.token',
            user_id: 1,
            project_id: 1,
            permissions: [],
          },
        },
      });

      const result = await auth.login(loginData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          email: loginData.email,
          password: loginData.password,
          project_id: loginData.project_id,
          mint_id: expect.any(String),
        }),
        expect.objectContaining({
          skipAuthStateCheck: true,
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
            'X-Mint-Id': expect.any(String),
          }),
        })
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle login error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong_password',
        project_id: 1,
      };

      const { UnauthorizedError } = await import('../../src/types/shared/HTTPTypes');
      mockHttpClient.post.mockRejectedValueOnce(new UnauthorizedError('Invalid credentials'));

      await expect(auth.login(loginData)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw on 502 gateway errors instead of returning null', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password',
        project_id: 1438,
      };

      const axiosLike = {
        response: { status: 502, data: { detail: 'Bad Gateway' } },
        message: 'Request failed with status code 502',
      };
      mockHttpClient.post.mockRejectedValueOnce(axiosLike);

      // Must reject (never return null) when the API is unavailable.
      await expect(auth.login(loginData)).rejects.toThrow();
    });

    it('should logout successfully', async () => {
      const expectedResponse = { message: 'Logged out successfully' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.logout();

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/logout', undefined, {
        skipAuthStateCheck: true,
      });
      expect(result).toBeUndefined();
    });

    it('should get current user', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: { success: true, data: testUser },
      });

      const result = await auth.getCurrentUser();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/auth/me',
        undefined,
        expect.objectContaining({ skipBatching: true, skipCache: true }),
      );
      expect(result.user_id).toBe(1);
      expect(result.email).toBe('test@example.com');
    });

    it('should get session bootstrap payload with settings_summary', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: testUser,
          settings_summary: { theme: 'dark', language: 'ru', timezone: 'UTC' },
          accessible_project_ids: [1, 2],
        },
      });

      const result = await auth.getSessionBootstrapPayload();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/auth/me/bootstrap',
        undefined,
        expect.objectContaining({ skipBatching: true, skipCache: true }),
      );
      expect(result.user.user_id).toBe(1);
      expect(result.settings_summary?.language).toBe('ru');
      expect(result.accessible_project_ids).toEqual([1, 2]);
      expect(auth.getLastSessionBootstrap()?.user.user_id).toBe(1);
    });

    it('reuses cached session bootstrap without a second HTTP call', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: testUser,
          settings_summary: { theme: 'dark', language: 'ru', timezone: 'UTC' },
        },
      });

      await auth.getSessionBootstrapPayload();
      mockHttpClient.get.mockClear();

      const cached = await auth.getSessionBootstrapPayload();
      expect(mockHttpClient.get).not.toHaveBeenCalled();
      expect(cached.user.user_id).toBe(1);

      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: testUser,
          settings_summary: { theme: 'light', language: 'en', timezone: 'UTC' },
        },
      });
      await auth.getSessionBootstrapPayload({ force: true });
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('force discards stale in-flight bootstrap (never awaits old payload)', async () => {
      let resolveStale!: (v: unknown) => void;
      const stalePromise = new Promise((resolve) => {
        resolveStale = resolve;
      });
      mockHttpClient.get.mockImplementationOnce(() => stalePromise);
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: { ...testUser, user_id: 99, email: 'fresh@example.com' },
          settings_summary: { theme: 'light', language: 'en', timezone: 'UTC' },
        },
      });

      const staleFlight = auth.getSessionBootstrapPayload();
      const forceFlight = auth.getSessionBootstrapPayload({ force: true });

      resolveStale({
        data: {
          success: true,
          data: { ...testUser, user_id: 1, email: 'stale@example.com' },
          settings_summary: { theme: 'dark', language: 'ru', timezone: 'UTC' },
        },
      });

      const forceResult = await forceFlight;
      expect(forceResult.user.email).toBe('fresh@example.com');
      expect(forceResult.user.user_id).toBe(99);
      // Stale flight should reject after abort (or be discarded); force must not return stale.
      await expect(staleFlight).rejects.toThrow(/aborted|stale/i);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/auth/me/bootstrap',
        undefined,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('invalidateSessionBootstrap clears cache', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: testUser,
          settings_summary: { theme: 'dark', language: 'ru', timezone: 'UTC' },
        },
      });
      await auth.getSessionBootstrapPayload();
      auth.invalidateSessionBootstrap('manual');
      expect(auth.getLastSessionBootstrap()).toBeNull();
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: testUser,
          settings_summary: { theme: 'light', language: 'en', timezone: 'UTC' },
        },
      });
      await auth.getSessionBootstrapPayload();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('throws UnauthorizedError on empty bootstrap body (no generic Error)', async () => {
      const { UnauthorizedError } = require('../../src/types/shared/HTTPTypes');
      mockHttpClient.get.mockResolvedValueOnce({
        data: null,
        status: 401,
        traceId: 'trace-1',
      });
      await expect(auth.getSessionBootstrapPayload({ force: true })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
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

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/refresh', refreshData, {
        skipAuthStateCheck: true,
      });
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

      mockHttpClient.put.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setUsername(username);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/profile/username', { username });
      expect(result).toEqual(expectedResponse);
    });

    it('should set display name', async () => {
      const displayName = 'New Display Name';
      const expectedResponse = { ...testProfileData, display_name: displayName };

      mockHttpClient.put.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setDisplayName(displayName);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/profile/display-name', {
        display_name: displayName,
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should set bio', async () => {
      const bio = 'New bio text';
      const expectedResponse = { ...testProfileData, bio };

      mockHttpClient.put.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.setBio(bio);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/profile/bio', { bio });
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
      expect(result).toBeUndefined();
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
      expect(result).toBeUndefined();
    });
  });

  describe('Settings Management', () => {
    it('should get settings', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: testSettings,
      });

      const result = await auth.getSettings();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/settings', undefined, undefined);
      expect(result).toEqual(testSettings);
    });

    it('should update settings', async () => {
      const updateData = { theme: 'light' };
      const expectedResponse = { ...testSettings, ...updateData };

      mockHttpClient.put.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.updateSettings(updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/auth/settings', updateData, undefined);
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
      expect(result).toBeUndefined();
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
      expect(result).toBeUndefined();
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
      expect(result).toBeUndefined();
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
      expect(result).toBeUndefined();
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

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
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

      expect(mockHttpClient.post).toHaveBeenCalledWith('/profile/toggle-2fa', { enabled });
      expect(result).toEqual(expectedResponse);
    });

    it('should get 2FA status', async () => {
      const expectedResponse = { enabled: true, qr_code: 'qr_code_data' };

      mockHttpClient.get.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.get2FAStatus();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/2fa-status');
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

      expect(mockHttpClient.get).toHaveBeenCalledWith('/sessions');
      expect(result).toEqual(expectedResponse);
    });

    it('should revoke session', async () => {
      const sessionId = 'session_1';
      const expectedResponse = { message: 'Session revoked successfully' };

      mockHttpClient.delete.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.revokeSession(sessionId);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(`/sessions/${sessionId}`, {
        body: undefined,
      });
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
      const oauthData = {
        provider,
        access_token: 'token',
        project_id: 1,
      };
      const expectedResponse = { redirect_url: 'https://oauth.google.com/...' };

      mockHttpClient.post.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.connectOAuthProvider(oauthData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/oauth/connect', oauthData);
      expect(result).toEqual(expectedResponse);
    });

    it('should disconnect OAuth provider', async () => {
      const provider = 'google';
      const expectedResponse = { message: 'Provider disconnected successfully' };

      mockHttpClient.delete.mockResolvedValueOnce({
        data: expectedResponse,
      });

      const result = await auth.disconnectOAuthProvider(provider);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(`/auth/oauth/providers/${provider}`);
      expect(result).toEqual(expectedResponse);
    });
  });
});



