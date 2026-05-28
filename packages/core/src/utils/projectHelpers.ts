/**
 * Project Helpers - унифицированные утилиты для работы с проектами
 * 
 * Philosophy: Единый источник истины для проверки активности проекта
 * Используй только is_active, НЕ используй status для проверки активности!
 * 
 * ⚠️ DEPRECATED: Используй activityHelpers.isActive() для универсальной проверки!
 * Эти функции оставлены для backward compatibility
 */

import type { Project } from '../types/entities/Project';
import { isActive } from './activityHelpers';

/**
 * Проверить, активен ли проект
 * 
 * ✅ Philosophy: Используй ТОЛЬКО is_active для проверки активности!
 * ❌ НЕ используй status === 'active' - это устаревший подход
 * 
 * ⚠️ DEPRECATED: Используй activityHelpers.isActive(project) для универсальной проверки!
 * 
 * @param project - Проект или объект с полем is_active
 * @returns true если проект активен, false иначе
 * 
 * @example
 * ```typescript
 * if (isProjectActive(project)) {
 *   // Проект активен, можно выполнять операции
 * }
 * ```
 */
export function isProjectActive(project: Project | { is_active?: boolean }): boolean {
  // ✅ Philosophy: Используем универсальную функцию isActive
  return isActive(project);
}

/**
 * Получить количество активных проектов
 * 
 * ✅ Philosophy: Используй is_active, НЕ status!
 * 
 * @param projects - Массив проектов
 * @returns Количество активных проектов
 * 
 * @example
 * ```typescript
 * const activeCount = getActiveProjectsCount(projects);
 * ```
 */
export function getActiveProjectsCount(projects: (Project | { is_active?: boolean })[]): number {
  return projects.filter(p => isProjectActive(p)).length;
}

/**
 * Фильтровать активные проекты
 * 
 * ✅ Philosophy: Используй is_active, НЕ status!
 * 
 * @param projects - Массив проектов
 * @returns Массив только активных проектов
 * 
 * @example
 * ```typescript
 * const activeProjects = filterActiveProjects(projects);
 * ```
 */
export function filterActiveProjects<T extends { is_active?: boolean }>(projects: T[]): T[] {
  return projects.filter(p => isProjectActive(p));
}

/**
 * Синхронизировать status с is_active
 * 
 * ⚠️ DEPRECATED: Используй только is_active!
 * Эта функция нужна только для backward compatibility
 * 
 * @param project - Проект
 * @returns Проект с синхронизированным status
 */
export function syncProjectStatus(project: Project | { is_active?: boolean; status?: string }): Project & { status: string } {
  const isActive = isProjectActive(project);
  return {
    ...project as Project,
    status: isActive ? 'active' : 'inactive'
  };
}

