/**
 * useUserDataInProjects - Хук для загрузки данных пользователя в разных проектах
 * 
 * Поддерживает различные типы данных (активы, финансы, статистика)
 * Кэширование данных по проектам
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
// SDK может быть из разных источников
type SDKType = any;

export type UserDataType = 'assets' | 'finances' | 'stats';

export interface UseUserDataInProjectsOptions {
  userId: number;
  projectId?: number | null;
  dataType: UserDataType;
  enabled?: boolean;
  sdk?: SDKType; // Опциональный SDK, если не используется контекст
}

export interface UseUserDataInProjectsResult<T = any> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useUserDataInProjects<T = any>(
  options: UseUserDataInProjectsOptions
): UseUserDataInProjectsResult<T> {
  const { userId, projectId, dataType, enabled = true, sdk: providedSDK } = options;
  
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

  const queryKey = ['user-data', userId, projectId, dataType];

  const query: UseQueryResult<T, Error> = useQuery({
    queryKey,
    queryFn: async () => {
      if (!sdk) {
        throw new Error('SDK not available');
      }

      switch (dataType) {
        case 'assets':
          if (projectId) {
            // Загрузка активов пользователя в конкретном проекте
            const response = await sdk.assets.listAssets(projectId);
            // Фильтруем по owner_id (если API поддерживает)
            // Или используем отдельный endpoint для пользовательских активов
            return (response.assets || []).filter((asset: any) => 
              asset.owner_id === userId || asset.user_id === userId
            ) as T;
          } else {
            // Загрузка всех активов пользователя
            const response = await sdk.globalAssets.listGlobalAssets();
            return (response.assets || []).filter((asset: any) => 
              asset.owner_id === userId || asset.user_id === userId
            ) as T;
          }

        case 'finances':
          // TODO: Реализовать загрузку финансовых данных
          // const finances = await sdk.billing.getUserFinances(userId, projectId);
          return [] as T;

        case 'stats':
          // TODO: Реализовать загрузку статистики
          // const stats = await sdk.analytics.getUserStats(userId, projectId);
          return {} as T;

        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }
    },
    enabled: enabled && !!userId && !!sdk,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}

