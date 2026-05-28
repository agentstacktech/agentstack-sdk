/**
 * Unified Error Handling System for AgentStack SDK
 * Provides consistent error handling across all API operations
 */

export interface BaseError {
  code: string;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface NetworkError extends BaseError {
  code: 'NETWORK_ERROR';
  status?: number;
  url?: string;
}

export interface ValidationError extends BaseError {
  code: 'VALIDATION_ERROR';
  field?: string;
  value?: any;
}

export interface NotFoundError extends BaseError {
  code: 'NOT_FOUND';
  resource: string;
  id?: string;
}

export interface PermissionError extends BaseError {
  code: 'PERMISSION_DENIED';
  action: string;
  resource: string;
}

export interface ServerError extends BaseError {
  code: 'SERVER_ERROR';
  status: number;
  details?: string;
}

export interface HandledError {
  userMessage: string;
  technicalMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  recoveryOptions: RecoveryOption[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface RecoveryOption {
  action: string;
  label: string;
  handler: () => Promise<void>;
}

export interface ErrorHandler {
  handle(error: Error): Promise<HandledError>;
  canHandle(error: Error): boolean;
  getRecoveryOptions(error: Error): RecoveryOption[];
}

export class SDKErrorHandler {
  private handlers: ErrorHandler[] = [
    new NetworkErrorHandler(),
    new ValidationErrorHandler(),
    new NotFoundErrorHandler(),
    new PermissionErrorHandler(),
    new ServerErrorHandler(),
    new FallbackErrorHandler()
  ];

  async handleError(error: Error, context?: any): Promise<HandledError> {
    // Find appropriate handler
    const handler = this.handlers.find(h => h.canHandle(error));
    
    if (handler) {
      return await handler.handle(error);
    }
    
    // Fallback to generic handler
    return await this.fallbackHandler.handle(error);
  }

  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const handledError = await this.handleError(error as Error, context);
      
      // Log error
      this.logError(handledError);
      
      // Show user notification
      this.showUserNotification(handledError);
      
      // Return null for recoverable errors, throw for critical
      if (handledError.severity === 'critical') {
        throw error;
      }
      
      return null;
    }
  }

  private logError(handledError: HandledError): void {
    const message = `[${handledError.logLevel.toUpperCase()}] ${handledError.technicalMessage}`;
    
    switch (handledError.logLevel) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        console.error(message);
        break;
    }
  }

  private showUserNotification(handledError: HandledError): void {
    // This would integrate with your notification system
    // For now, we'll use console for demonstration
    console.log(`User notification: ${handledError.userMessage}`);
    
    if (handledError.recoveryOptions.length > 0) {
      console.log('Recovery options:', handledError.recoveryOptions.map(opt => opt.label));
    }
  }

  private fallbackHandler = new FallbackErrorHandler();
}

// Specific Error Handlers
export class NetworkErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return error instanceof NetworkError || 
           error.message.includes('Network error') ||
           error.message.includes('fetch failed') ||
           error.message.includes('Failed to fetch');
  }

  getRecoveryOptions(error: Error): RecoveryOption[] {
    return [
      {
        action: 'retry',
        label: 'Повторить',
        handler: () => this.retryOperation()
      },
      {
        action: 'offline',
        label: 'Работать офлайн',
        handler: () => this.enableOfflineMode()
      }
    ];
  }

  async handle(error: Error): Promise<HandledError> {
    return {
      userMessage: 'Проблема с подключением. Проверьте интернет-соединение.',
      technicalMessage: `Network error: ${error.message}`,
      severity: 'medium',
      recoverable: true,
      recoveryOptions: [
        {
          action: 'retry',
          label: 'Повторить',
          handler: () => this.retryOperation()
        },
        {
          action: 'offline_mode',
          label: 'Работать офлайн',
          handler: () => this.enableOfflineMode()
        }
      ],
      logLevel: 'warn'
    };
  }

  private async retryOperation(): Promise<void> {
    // Implementation for retry logic
    console.log('Retrying operation...');
  }

  private async enableOfflineMode(): Promise<void> {
    // Implementation for offline mode
    console.log('Enabling offline mode...');
  }
}

export class ValidationErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return error instanceof ValidationError;
  }

  getRecoveryOptions(error: Error): RecoveryOption[] {
    return [
      {
        action: 'fix_data',
        label: 'Исправить данные',
        handler: () => this.focusField((error as ValidationError).field)
      }
    ];
  }

  async handle(error: ValidationError): Promise<HandledError> {
    return {
      userMessage: `Некорректные данные: ${this.getFieldLabel(error.field)}`,
      technicalMessage: `Validation error: ${error.message}`,
      severity: 'low',
      recoverable: true,
      recoveryOptions: [
        {
          action: 'fix_data',
          label: 'Исправить данные',
          handler: () => this.focusField(error.field)
        }
      ],
      logLevel: 'info'
    };
  }

  private getFieldLabel(field?: string): string {
    if (!field) return 'неизвестное поле';
    
    const fieldLabels: Record<string, string> = {
      'username': 'имя пользователя',
      'email': 'email',
      'password': 'пароль',
      'display_name': 'отображаемое имя',
      'bio': 'биография'
    };
    
    return fieldLabels[field] || field;
  }

  private async focusField(field?: string): Promise<void> {
    if (field) {
      const element = document.querySelector(`[name="${field}"]`);
      if (element) {
        (element as HTMLElement).focus();
      }
    }
  }
}

export class NotFoundErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return error instanceof NotFoundError;
  }

  getRecoveryOptions(error: Error): RecoveryOption[] {
    return [
      {
        action: 'refresh',
        label: 'Обновить',
        handler: () => this.refreshData()
      },
      {
        action: 'navigate',
        label: 'Перейти к списку',
        handler: () => this.navigateToList()
      }
    ];
  }

  async handle(error: NotFoundError): Promise<HandledError> {
    return {
      userMessage: `${this.getResourceLabel(error.resource)} не найден`,
      technicalMessage: `Not found: ${error.resource}${error.id ? ` (${error.id})` : ''}`,
      severity: 'medium',
      recoverable: true,
      recoveryOptions: [
        {
          action: 'refresh',
          label: 'Обновить',
          handler: () => this.refreshData()
        },
        {
          action: 'navigate_home',
          label: 'На главную',
          handler: () => this.navigateHome()
        }
      ],
      logLevel: 'warn'
    };
  }

  private getResourceLabel(resource: string): string {
    const resourceLabels: Record<string, string> = {
      'user': 'Пользователь',
      'project': 'Проект',
      'session': 'Сессия',
      'api_key': 'API ключ',
      'profile': 'Профиль',
      'settings': 'Настройки'
    };
    
    return resourceLabels[resource] || resource;
  }

  private async refreshData(): Promise<void> {
    window.location.reload();
  }

  private async navigateHome(): Promise<void> {
    window.location.href = '/';
  }

  private async navigateToList(): Promise<void> {
    // Navigate to list view
    window.location.href = '/list';
  }
}

export class PermissionErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return error instanceof PermissionError;
  }

  getRecoveryOptions(error: Error): RecoveryOption[] {
    return [
      {
        action: 'contact_admin',
        label: 'Обратиться к администратору',
        handler: () => this.contactAdmin()
      }
    ];
  }

  async handle(error: PermissionError): Promise<HandledError> {
    // ✅ CRITICAL: Ошибки аутентификации должны быть критическими, чтобы они пробрасывались
    // Это особенно важно для операций логина, где нужно показать правильное сообщение об ошибке
    const isAuthError = error.action === 'authenticate';
    
    return {
      userMessage: isAuthError 
        ? 'Invalid email or password. Please check your credentials and try again.'
        : 'Недостаточно прав для выполнения этого действия',
      technicalMessage: `Permission denied: ${error.action} on ${error.resource}`,
      severity: isAuthError ? 'critical' : 'high',
      recoverable: false,
      recoveryOptions: isAuthError ? [] : [
        {
          action: 'contact_admin',
          label: 'Обратиться к администратору',
          handler: () => this.contactAdmin()
        }
      ],
      logLevel: 'error'
    };
  }

  private async contactAdmin(): Promise<void> {
    // Implementation for contacting admin
    console.log('Contacting administrator...');
  }
}

export class ServerErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return error instanceof ServerError;
  }

  getRecoveryOptions(error: Error): RecoveryOption[] {
    return [
      {
        action: 'retry',
        label: 'Повторить',
        handler: () => this.retryOperation()
      },
      {
        action: 'report',
        label: 'Сообщить о проблеме',
        handler: () => this.reportIssue()
      }
    ];
  }

  async handle(error: ServerError): Promise<HandledError> {
    return {
      userMessage: 'Временная проблема с сервером. Попробуйте позже.',
      technicalMessage: `Server error ${error.status}: ${error.details || error.message}`,
      severity: 'high',
      recoverable: true,
      recoveryOptions: [
        {
          action: 'retry',
          label: 'Повторить',
          handler: () => this.retryOperation()
        },
        {
          action: 'report_issue',
          label: 'Сообщить о проблеме',
          handler: () => this.reportIssue()
        }
      ],
      logLevel: 'error'
    };
  }

  private async retryOperation(): Promise<void> {
    console.log('Retrying operation...');
  }

  private async reportIssue(): Promise<void> {
    console.log('Reporting issue...');
  }
}

export class FallbackErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return true; // Fallback handler
  }

  getRecoveryOptions(error: Error): RecoveryOption[] {
    return [
      {
        action: 'retry',
        label: 'Повторить',
        handler: () => this.retryOperation()
      },
      {
        action: 'report',
        label: 'Сообщить о проблеме',
        handler: () => this.reportIssue()
      }
    ];
  }

  async handle(error: Error): Promise<HandledError> {
    return {
      userMessage: 'Произошла неожиданная ошибка',
      technicalMessage: `Unexpected error: ${error.message}`,
      severity: 'medium',
      recoverable: true,
      recoveryOptions: [
        {
          action: 'retry',
          label: 'Повторить',
          handler: () => this.retryOperation()
        },
        {
          action: 'refresh',
          label: 'Обновить страницу',
          handler: () => this.refreshPage()
        }
      ],
      logLevel: 'error'
    };
  }

  private async retryOperation(): Promise<void> {
    console.log('Retrying operation...');
  }

  private async refreshPage(): Promise<void> {
    window.location.reload();
  }

  private async reportIssue(): Promise<void> {
    console.log('Reporting issue...');
  }
}

// Error classes
export class NetworkError extends Error implements NetworkError {
  code = 'NETWORK_ERROR' as const;
  timestamp = new Date();
  status?: number;
  url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.url = url;
  }
}

export class ValidationError extends Error implements ValidationError {
  code = 'VALIDATION_ERROR' as const;
  timestamp = new Date();
  field?: string;
  value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class NotFoundError extends Error implements NotFoundError {
  code = 'NOT_FOUND' as const;
  timestamp = new Date();
  resource: string;
  id?: string;

  constructor(resource: string, id?: string) {
    super(`${resource} not found${id ? ` (${id})` : ''}`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

export class PermissionError extends Error implements PermissionError {
  code = 'PERMISSION_DENIED' as const;
  timestamp = new Date();
  action: string;
  resource: string;

  constructor(action: string, resource: string) {
    super(`Permission denied: ${action} on ${resource}`);
    this.name = 'PermissionError';
    this.action = action;
    this.resource = resource;
  }
}

export class ServerError extends Error implements ServerError {
  code = 'SERVER_ERROR' as const;
  timestamp = new Date();
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'ServerError';
    this.status = status;
    this.details = details;
  }
}



