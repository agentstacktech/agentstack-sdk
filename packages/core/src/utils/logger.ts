/**
 * Universal SDK Logger
 * Configurable logging for debugging and monitoring
 * 
 * Automatically disables logging in production (NODE_ENV === 'production')
 * 
 * Usage:
 *   import { logger } from '@agentstack/sdk';
 *   logger.debug('API call', { method: 'GET', url: '/api/users' });
 *   logger.info('User logged in', { userId: 123 });
 *   logger.warn('Rate limit approaching', { remaining: 10 });
 *   logger.error('API error', error);
 * 
 * Simple replacement for console.log:
 *   // Before: console.log('Message', data)
 *   // After:  logger.info('Message', data)
 * 
 *   // Before: console.warn('Warning', data)
 *   // After:  logger.warn('Warning', data)
 * 
 *   // Before: console.error('Error', error)
 *   // After:  logger.error('Error', error)
 */

import { getStorageItem, setStorageItem } from './storage-utils';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  colors?: boolean;
  timestamp?: boolean;
  enableInProduction?: boolean; // Force enable even in production (for debugging)
}

class SDKLogger {
  private config: LoggerConfig = {
    level: LogLevel.INFO,
    prefix: '[AgentStack SDK]',
    colors: true,
    timestamp: true,
    enableInProduction: false
  };

  private isProduction: boolean;

  constructor() {
    // Auto-detect production environment
    this.isProduction = 
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
      (typeof window !== 'undefined' && (window as any).__PRODUCTION__ === true);

    // In production, disable logging by default unless explicitly enabled
    if (this.isProduction && !this.config.enableInProduction) {
      this.config.level = LogLevel.NONE;
    }

    // Auto-detect environment from storage (for browser debugging)
    if (typeof window !== 'undefined') {
      const storedLevel = getStorageItem('agentstack_log_level');
      if (storedLevel) {
        const level = parseInt(storedLevel) as LogLevel;
        // Only override if not in production or explicitly enabled
        if (!this.isProduction || this.config.enableInProduction) {
          this.config.level = level;
        }
      }
    }
  }

  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    
    // In production, respect enableInProduction flag
    if (this.isProduction && !this.config.enableInProduction) {
      this.config.level = LogLevel.NONE;
    }
    
    // Save to storage if in browser
    if (typeof window !== 'undefined' && config.level !== undefined) {
      setStorageItem('agentstack_log_level', config.level.toString());
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const parts: string[] = [];
    
    if (this.config.timestamp) {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
      parts.push(`[${timestamp}]`);
    }
    
    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }
    
    parts.push(`[${level}]`);
    parts.push(message);
    
    return parts.join(' ');
  }

  private getColor(level: string): string {
    if (!this.config.colors) return '';
    
    const colors: Record<string, string> = {
      DEBUG: 'color: #9E9E9E',
      INFO: 'color: #2196F3',
      WARN: 'color: #FF9800',
      ERROR: 'color: #F44336'
    };
    
    return colors[level] || '';
  }

  debug(message: string, data?: any) {
    // Skip in production unless explicitly enabled
    if (this.isProduction && !this.config.enableInProduction) return;
    if (this.config.level > LogLevel.DEBUG) return;
    
    const formatted = this.formatMessage('DEBUG', message, data);
    const color = this.getColor('DEBUG');
    
    if (color && typeof window !== 'undefined') {
      console.log(`%c${formatted}`, color, data || '');
    } else {
      console.log(formatted, data || '');
    }
  }

  info(message: string, data?: any) {
    // Skip in production unless explicitly enabled
    if (this.isProduction && !this.config.enableInProduction) return;
    if (this.config.level > LogLevel.INFO) return;
    
    const formatted = this.formatMessage('INFO', message, data);
    const color = this.getColor('INFO');
    
    if (color && typeof window !== 'undefined') {
      console.log(`%c${formatted}`, color, data || '');
    } else {
      console.log(formatted, data || '');
    }
  }

  warn(message: string, data?: any) {
    // Skip in production unless explicitly enabled
    if (this.isProduction && !this.config.enableInProduction) return;
    if (this.config.level > LogLevel.WARN) return;
    
    const formatted = this.formatMessage('WARN', message, data);
    const color = this.getColor('WARN');
    
    if (color && typeof window !== 'undefined') {
      console.warn(`%c${formatted}`, color, data || '');
    } else {
      console.warn(formatted, data || '');
    }
  }

  error(message: string, error?: any) {
    // Skip in production unless explicitly enabled
    if (this.isProduction && !this.config.enableInProduction) return;
    if (this.config.level > LogLevel.ERROR) return;
    
    const formatted = this.formatMessage('ERROR', message, error);
    const color = this.getColor('ERROR');
    
    if (color && typeof window !== 'undefined') {
      console.error(`%c${formatted}`, color, error || '');
    } else {
      console.error(formatted, error || '');
    }
  }

  /**
   * Simple log method - replacement for console.log
   * Automatically uses INFO level
   */
  log(message: string, ...args: any[]) {
    this.info(message, args.length > 0 ? args : undefined);
  }

  // Helper method to enable/disable logging
  setLevel(level: LogLevel) {
    this.configure({ level });
  }

  // Quick enable/disable
  enable() {
    this.configure({ level: LogLevel.DEBUG, enableInProduction: false });
  }

  disable() {
    this.configure({ level: LogLevel.NONE });
  }

  /**
   * Force enable logging even in production (for debugging)
   * Use with caution - only for development debugging
   */
  enableInProduction() {
    this.configure({ enableInProduction: true, level: LogLevel.DEBUG });
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    if (this.isProduction && !this.config.enableInProduction) return false;
    return this.config.level !== LogLevel.NONE;
  }

  /**
   * Get current environment
   */
  getEnvironment(): 'development' | 'production' {
    return this.isProduction ? 'production' : 'development';
  }
}

// Export singleton instance
export const logger = new SDKLogger();

// Export helper to configure from window (for debugging)
if (typeof window !== 'undefined') {
  (window as any).AgentStackLogger = {
    enable: () => logger.enable(),
    disable: () => logger.disable(),
    enableInProduction: () => logger.enableInProduction(),
    setLevel: (level: LogLevel) => logger.setLevel(level),
    isEnabled: () => logger.isEnabled(),
    getEnvironment: () => logger.getEnvironment(),
    LogLevel
  };
  
  // Only show initialization message in development
  if (!logger.getEnvironment() || logger.getEnvironment() === 'development') {
    console.log('%c[AgentStack SDK] Logger initialized. Use window.AgentStackLogger to configure.', 'color: #4CAF50; font-weight: bold');
  }
}




