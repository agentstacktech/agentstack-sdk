/**
 * useProjects - React hook for project operations
 * Provides project state and methods using AgentStack SDK
 */

import { useState, useCallback } from 'react';
import { useSDK } from '../context/SDKContext';
import { Project, CreateProjectData, UpdateProjectData, ProjectUser, AddUserToProjectData } from '@agentstack/sdk';

export interface ProjectsState {
  isLoading: boolean;
  error: string | null;
}

export interface ProjectsActions {
  getProjects: (params?: any) => Promise<{
    projects: Project[];
    pagination: { page: number; limit: number; total: number };
  }>;
  getProject: (projectId: number) => Promise<Project>;
  createProject: (projectData: CreateProjectData) => Promise<Project>;
  updateProject: (projectId: number, projectData: UpdateProjectData) => Promise<Project>;
  deleteProject: (projectId: number) => Promise<{ message: string }>;
  getProjectUsers: (projectId: number, params?: any) => Promise<{
    users: ProjectUser[];
    pagination: Record<string, unknown>;
  }>;
  addUserToProject: (
    projectId: number,
    userData: AddUserToProjectData
  ) => Promise<{ success: boolean; user: ProjectUser }>;
  removeUserFromProject: (projectId: number, userId: number) => Promise<{ message: string }>;
  updateUserRole: (projectId: number, userId: number, updates: any) => Promise<ProjectUser>;
  getProjectStats: (projectId: number) => Promise<any>;
  getProjectApiKeys: (projectId: number) => Promise<any>;
  createProjectApiKey: (projectId: number, data: any) => Promise<any>;
  deleteProjectApiKey: (projectId: number, keyId: string) => Promise<{ message: string }>;
  getProjectSettings: (projectId: number) => Promise<any>;
  updateProjectSettings: (projectId: number, settings: any) => Promise<any>;
  getProjectActivity: (projectId: number, params?: any) => Promise<any>;
  exportProjectData: (projectId: number, data: any) => Promise<any>;
  getExportStatus: (exportId: string) => Promise<any>;
  bulkUpdateProjects: (projectIds: number[], updates: any) => Promise<any>;
  getSystemInfo: () => Promise<any>;
  healthCheck: () => Promise<any>;
  detailedHealthCheck: () => Promise<any>;
}

export function useProjects(): ProjectsState & ProjectsActions {
  const { sdk } = useSDK();
  /** AgentAPI surface varies by backend version; avoid blocking the React package on every method. */
  const api = sdk.api as any;
  const [state, setState] = useState<ProjectsState>({
    isLoading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const getProjects = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProjects(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get projects');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getProject = useCallback(async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProject(projectId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get project');
      throw error;
    }
  }, [api, setLoading, setError]);

  const createProject = useCallback(async (projectData: CreateProjectData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.createProject(projectData);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to create project');
      throw error;
    }
  }, [api, setLoading, setError]);

  const updateProject = useCallback(async (projectId: number, projectData: UpdateProjectData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.updateProject(projectId, projectData);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to update project');
      throw error;
    }
  }, [api, setLoading, setError]);

  const deleteProject = useCallback(async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.deleteProject(projectId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to delete project');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getProjectUsers = useCallback(async (projectId: number, params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProjectUsers(projectId, params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get project users');
      throw error;
    }
  }, [api, setLoading, setError]);

  const addUserToProject = useCallback(async (projectId: number, userData: AddUserToProjectData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.addUserToProject(projectId, userData);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to add user to project');
      throw error;
    }
  }, [api, setLoading, setError]);

  const removeUserFromProject = useCallback(async (projectId: number, userId: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.removeUserFromProject(projectId, userId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to remove user from project');
      throw error;
    }
  }, [api, setLoading, setError]);

  const updateUserRole = useCallback(async (projectId: number, userId: number, updates: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.updateUserRole(projectId, userId, updates);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to update user role');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getProjectStats = useCallback(async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProjectStats(projectId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get project stats');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getProjectApiKeys = useCallback(async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProjectApiKeys(projectId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get project API keys');
      throw error;
    }
  }, [api, setLoading, setError]);

  const createProjectApiKey = useCallback(async (projectId: number, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.createProjectApiKey(projectId, data);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to create project API key');
      throw error;
    }
  }, [api, setLoading, setError]);

  const deleteProjectApiKey = useCallback(async (projectId: number, keyId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.deleteProjectApiKey(projectId, keyId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to delete project API key');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getProjectSettings = useCallback(async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProjectSettings(projectId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get project settings');
      throw error;
    }
  }, [api, setLoading, setError]);

  const updateProjectSettings = useCallback(async (projectId: number, settings: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.updateProjectSettings(projectId, settings);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to update project settings');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getProjectActivity = useCallback(async (projectId: number, params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getProjectActivity(projectId, params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get project activity');
      throw error;
    }
  }, [api, setLoading, setError]);

  const exportProjectData = useCallback(async (projectId: number, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.exportProjectData(projectId, data);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to export project data');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getExportStatus = useCallback(async (exportId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getExportStatus(exportId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get export status');
      throw error;
    }
  }, [api, setLoading, setError]);

  const bulkUpdateProjects = useCallback(async (projectIds: number[], updates: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.bulkUpdateProjects(projectIds, updates);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to bulk update projects');
      throw error;
    }
  }, [api, setLoading, setError]);

  const getSystemInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getSystemInfo();
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get system info');
      throw error;
    }
  }, [api, setLoading, setError]);

  const healthCheck = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.healthCheck();
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to perform health check');
      throw error;
    }
  }, [api, setLoading, setError]);

  const detailedHealthCheck = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.detailedHealthCheck();
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to perform detailed health check');
      throw error;
    }
  }, [api, setLoading, setError]);

  return {
    ...state,
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectUsers,
    addUserToProject,
    removeUserFromProject,
    updateUserRole,
    getProjectStats,
    getProjectApiKeys,
    createProjectApiKey,
    deleteProjectApiKey,
    getProjectSettings,
    updateProjectSettings,
    getProjectActivity,
    exportProjectData,
    getExportStatus,
    bulkUpdateProjects,
    getSystemInfo,
    healthCheck,
    detailedHealthCheck,
  };
}
