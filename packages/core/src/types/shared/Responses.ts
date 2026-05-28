/**
 * API Response Wrappers
 * 
 * AI AGENT GUIDE:
 * Стандартные обёртки для API responses
 * 
 * Success response:
 *   { success: true, data: {...}, message: "Created" }
 * 
 * Error response:
 *   { success: false, error: "Error message" }
 */

/**
 * SuccessResponse - успешный ответ API
 * 
 * AI GUIDE:
 * Generic T = тип данных в response
 * 
 * Example:
 *   const response: SuccessResponse<Project> = { success: true, data: project }
 */
export interface SuccessResponse<T = any> {
  /** Always true for success */
  success: true;
  
  /** Response data */
  data?: T;
  
  /** Optional success message */
  message?: string;
}

/**
 * ErrorResponse - ответ с ошибкой
 */
export interface ErrorResponse {
  /** Always false for error */
  success: false;
  
  /** Error message (human-readable) */
  error: string;
  
  /** Error code (for programmatic handling) */
  code?: string;
  
  /** Additional error details */
  details?: Record<string, any>;
}

/**
 * ApiResponse - union type для любого API response
 * 
 * AI GUIDE:
 * Используй когда нужно обработать и success и error
 * 
 * Example:
 *   const response: ApiResponse<Project> = await sdk.projects.create(...)
 *   if (response.success) {
 *     console.log(response.data)  // Project
 *   } else {
 *     console.error(response.error)  // Error message
 *   }
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * ListResponse - для списков (с или без пагинации)
 */
export interface ListResponse<T> {
  /** Array of items */
  items: T[];
  
  /** Total count (optional) */
  total?: number;
}

/**
 * MessageResponse - простой ответ с сообщением
 * 
 * AI GUIDE:
 * Для операций которые не возвращают данные
 * 
 * Examples: delete, activate, deactivate
 */
export interface MessageResponse {
  /** Success status */
  success: boolean;
  
  /** Human-readable message */
  message: string;
}




