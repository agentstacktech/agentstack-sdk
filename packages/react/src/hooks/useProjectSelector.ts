/**
 * useProjectSelector - Хук для работы с селектором проектов через SDK
 * 
 * Кэширование списка проектов
 * Автоматическая загрузка проектов
 * Фильтрация по режиму
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// SDK может быть из разных источников, используем any для гибкости
// В frontend будет использоваться useSDK из SDKProvider
// В SDK пакете будет использоваться useSDK из SDKContext
type SDKType = any;

export type ProjectSelectorMode = 'all' | 'my' | 'specific' | 'view_user_data';

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  is_owner?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseProjectSelectorOptions {
  initialProjectId?: number | null;
  initialMode?: ProjectSelectorMode;
  sdk?: SDKType; // Опциональный SDK, если не используется контекст
}

export interface UseProjectSelectorResult {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: Error | null;
  setProject: (projectId: number | null) => void;
  setMode: (mode: ProjectSelectorMode) => void;
  mode: ProjectSelectorMode;
  selectedProjectId: number | null;
}

export function useProjectSelector(
  options: UseProjectSelectorOptions = {}
): UseProjectSelectorResult {
  const { initialProjectId = null, initialMode = 'all', sdk: providedSDK } = options;
  
  // Пытаемся использовать SDK из контекста, если не передан явно
  let sdk: SDKType;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useSDK } = require('../context/SDKContext');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sdk = useSDK();
    // Если useSDK возвращает объект с sdk, извлекаем его
    if (sdk && typeof sdk === 'object' && 'sdk' in sdk) {
      sdk = sdk.sdk;
    }
  } catch {
    // Если контекст недоступен, используем переданный SDK
    sdk = providedSDK;
  }
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialProjectId);
  const [mode, setMode] = useState<ProjectSelectorMode>(initialMode);

  // Загрузка проектов через SDK
  const { data: projectsData, isLoading, error } = useQuery({
    queryKey: ['projects', mode],
    queryFn: async () => {
      if (!sdk) {
        throw new Error('SDK not available');
      }

      const response = await sdk.api.getProjects();
      const projects = (response as any).data || (response as any).projects || response || [];
      
      return Array.isArray(projects) ? projects : [];
    },
    enabled: !!sdk,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Фильтрация проектов по режиму
  const filteredProjects = useMemo(() => {
    if (!projectsData || !Array.isArray(projectsData)) {
      return [];
    }

    switch (mode) {
      case 'my':
        return projectsData.filter((p: Project) => p.is_owner || p.owner_id === (sdk as any)?.user?.user_id);
      case 'all':
        return projectsData;
      case 'specific':
        return projectsData;
      case 'view_user_data':
        return projectsData; // Все проекты для просмотра данных пользователя
      default:
        return projectsData;
    }
  }, [projectsData, mode, sdk]);

  // Текущий проект
  const currentProject = useMemo(() => {
    if (!selectedProjectId || !filteredProjects) {
      return null;
    }
    return filteredProjects.find((p: Project) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, filteredProjects]);

  return {
    projects: filteredProjects,
    currentProject,
    isLoading,
    error: error as Error | null,
    setProject: setSelectedProjectId,
    setMode,
    mode,
    selectedProjectId,
  };
}

