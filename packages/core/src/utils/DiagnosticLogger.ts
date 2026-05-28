/**
 * Diagnostic Logger - Revolutionary Diagnostics
 * 
 * Philosophy v0.2.10: Revolutionary Diagnostics
 * Philosophy v0.1.16: Elegant Minimalism
 * Biology: Like diagnostic markers in organism!
 */

export interface DiagnosticLog {
  timestamp: number;
  component: string;
  operation: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details: any;
  url?: string;
  response?: any;
  error?: any;
}

export class DiagnosticLogger {
  private static logs: DiagnosticLog[] = [];
  private static maxLogs = 1000;
  private static enabled = true;

  static log(component: string, operation: string, status: DiagnosticLog['status'], details: any, url?: string, response?: any, error?: any) {
    if (!this.enabled) return;

    const log: DiagnosticLog = {
      timestamp: Date.now(),
      component,
      operation,
      status,
      details,
      url,
      response,
      error
    };

    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for debugging
    const emoji = this.getStatusEmoji(status);
    const time = new Date(log.timestamp).toLocaleTimeString();
    
    console.log(`${emoji} [${time}] ${component}:${operation}`, {
      status,
      details,
      url,
      response: response ? (typeof response === 'object' ? JSON.stringify(response, null, 2) : response) : undefined,
      error: error ? (typeof error === 'object' ? JSON.stringify(error, null, 2) : error) : undefined
    });
  }

  private static getStatusEmoji(status: DiagnosticLog['status']): string {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  }

  static getLogs(component?: string, operation?: string): DiagnosticLog[] {
    return this.logs.filter(log => {
      if (component && log.component !== component) return false;
      if (operation && log.operation !== operation) return false;
      return true;
    });
  }

  static getRecentLogs(count: number = 50): DiagnosticLog[] {
    return this.logs.slice(-count);
  }

  static clearLogs() {
    this.logs = [];
  }

  static enable() {
    this.enabled = true;
  }

  static disable() {
    this.enabled = false;
  }

  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  static analyzeErrors(): { component: string; operation: string; count: number; lastError: any }[] {
    const errors = this.logs.filter(log => log.status === 'error');
    const errorMap = new Map<string, { count: number; lastError: any }>();

    errors.forEach(error => {
      const key = `${error.component}:${error.operation}`;
      const existing = errorMap.get(key);
      if (existing) {
        existing.count++;
        existing.lastError = error.error || error.details;
      } else {
        errorMap.set(key, { count: 1, lastError: error.error || error.details });
      }
    });

    return Array.from(errorMap.entries()).map(([key, data]) => {
      const [component, operation] = key.split(':');
      return { component, operation, ...data };
    });
  }

  static getComponentHealth(component: string): { success: number; errors: number; warnings: number; health: number } {
    const componentLogs = this.logs.filter(log => log.component === component);
    const success = componentLogs.filter(log => log.status === 'success').length;
    const errors = componentLogs.filter(log => log.status === 'error').length;
    const warnings = componentLogs.filter(log => log.status === 'warning').length;
    const total = componentLogs.length;
    
    const health = total > 0 ? (success / total) * 100 : 100;
    
    return { success, errors, warnings, health };
  }
}

// Global diagnostic logger instance
export const diagnosticLogger = DiagnosticLogger;



