import { Session } from './Session';

/**
 * SessionsResponse - ответ с пагинированными сессиями
 */
export interface SessionsResponse {
  sessions: Session[];
  page: number;
  per_page: number;
  total: number;
  user_permissions?: number;  // Debug info
}




