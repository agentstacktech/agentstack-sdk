/**
 * Pagination Types - для списков с пагинацией
 * 
 * AI AGENT QUICK START:
 * 
 * // Request with pagination:
 * const projects = await sdk.projects.list({
 *   page: 1,
 *   per_page: 20
 * })
 * 
 * // Response structure:
 * {
 *   items: [...],      // Данные
 *   page: 1,           // Текущая страница
 *   per_page: 20,      // Элементов на странице
 *   total: 100,        // Всего элементов
 *   total_pages: 5     // Всего страниц
 * }
 */

/**
 * PaginationParams - параметры для запросов с пагинацией
 * 
 * AI GUIDE:
 * @field page - Номер страницы (starts from 1)
 * @field per_page - Элементов на странице (default: 20, max: 100)
 */
export interface PaginationParams {
  /** Page number (starts from 1) */
  page?: number;
  
  /** Items per page (default: 20, max: 100) */
  per_page?: number;
}

/**
 * PaginationResponse - обёртка для ответов с пагинацией
 * 
 * AI GUIDE:
 * Generic тип T = тип элементов в списке
 * 
 * Example:
 *   const response: PaginationResponse<Project> = await sdk.projects.list()
 */
export interface PaginationResponse<T> {
  /** Array of items */
  items: T[];
  
  /** Current page number */
  page: number;
  
  /** Items per page */
  per_page: number;
  
  /** Total number of items across all pages */
  total: number;
  
  /** Total number of pages */
  total_pages: number;
}

/**
 * CursorPaginationParams - для cursor-based pagination
 * 
 * AI GUIDE:
 * Используй для real-time data или больших списков
 * 
 * Преимущества:
 * - ✅ Consistency (новые элементы не сдвигают страницы)
 * - ✅ Performance (no OFFSET queries)
 */
export interface CursorPaginationParams {
  /** Cursor from previous response */
  cursor?: string;
  
  /** Items per page */
  limit?: number;
}

/**
 * CursorPaginationResponse - cursor-based response
 */
export interface CursorPaginationResponse<T> {
  /** Array of items */
  items: T[];
  
  /** Next cursor (null if last page) */
  next_cursor: string | null;
  
  /** Has more items */
  has_more: boolean;
}




