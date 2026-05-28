/**
 * Common Filter Types
 * 
 * AI AGENT GUIDE:
 * Используй для фильтрации списков
 * 
 * Example:
 *   const users = await sdk.users.list({
 *     filters: { is_active: true, role: 'admin' }
 *   })
 */

/**
 * DateRangeFilter - фильтр по диапазону дат
 */
export interface DateRangeFilter {
  /** Start date (ISO 8601) */
  from?: string;
  
  /** End date (ISO 8601) */
  to?: string;
}

/**
 * SearchFilter - текстовый поиск
 */
export interface SearchFilter {
  /** Search query */
  q?: string;
  
  /** Fields to search in */
  fields?: string[];
}

/**
 * StatusFilter - фильтр по статусу
 */
export interface StatusFilter {
  /** Status value */
  status?: string | string[];
  
  /** Include inactive */
  include_inactive?: boolean;
}

/**
 * SortOptions - параметры сортировки
 * 
 * AI GUIDE:
 * @field sort_by - Field name для сортировки
 * @field sort_order - 'asc' or 'desc'
 */
export interface SortOptions {
  /** Field to sort by (e.g., 'created_at', 'name') */
  sort_by?: string;
  
  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

/**
 * CommonFilters - набор общих фильтров
 * 
 * AI GUIDE:
 * Используется в большинстве list endpoints
 */
export interface CommonFilters extends SearchFilter, StatusFilter, SortOptions {
  /** Created date range */
  created?: DateRangeFilter;
  
  /** Updated date range */
  updated?: DateRangeFilter;
}




