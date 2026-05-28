/**
 * Condition Converter - Конвертация между VisualCondition и JSON форматами
 * Philosophy: v0.2.55: Extended Genetic Coding System
 */

import { logger } from '../../../utils/logger'
import type { VisualCondition } from '../types/NodeTypes'

/**
 * Конвертер условий между визуальным и JSON форматами
 */
export class ConditionConverter {
  /**
   * Конвертирует VisualCondition в JSON формат для backend
   */
  static convertToJson(condition: VisualCondition): any {
    if (!condition || typeof condition !== 'object') {
      logger.warn('[ConditionConverter] Invalid condition', { condition })
      return {
        operation: 'equal',
        operand1: '',
        operand2: ''
      }
    }

    // Compound condition (множественные подусловия)
    if (condition.type === 'compound' && condition.conditions && condition.conditions.length > 0) {
      return {
        expression: {
          operation: condition.operator || 'and',
          conditions: condition.conditions.map(c => this.convertToJson(c))
        }
      }
    }

    // Simple condition с оператором сравнения
    if (condition.comparison) {
      const result: any = {
        operation: condition.comparison,
        operand1: condition.operand1 || ''
      }

      // Добавляем operand2 только если это не оператор существования
      const existenceOperators = ['is_empty', 'is_not_empty']
      if (!existenceOperators.includes(condition.comparison) && condition.operand2 !== undefined) {
        result.operand2 = condition.operand2 || ''
      }

      return result
    }

    // Fallback для пустого условия
    return {
      operation: 'equal',
      operand1: condition.operand1 || '',
      operand2: condition.operand2 || ''
    }
  }

  /**
   * Конвертирует JSON условие из backend в VisualCondition
   */
  static convertFromJson(json: any): VisualCondition {
    if (!json || typeof json !== 'object') {
      return {
        type: 'simple',
        comparison: 'equal',
        operand1: '',
        operand2: ''
      }
    }

    // Если обернуто в "expression" (compound condition из backend)
    if (json.expression && json.expression.operation && json.expression.conditions) {
      return {
        type: 'compound',
        operator: json.expression.operation === 'and' || json.expression.operation === 'or' 
          ? json.expression.operation 
          : 'and',
        conditions: json.expression.conditions.map((c: any) => this.convertFromJson(c))
      }
    }

    // Если compound condition (имеет массив "conditions" напрямую - legacy формат)
    if (json.conditions && Array.isArray(json.conditions) && json.conditions.length > 0) {
      return {
        type: 'compound',
        operator: json.operation === 'and' || json.operation === 'or' ? json.operation : 'and',
        conditions: json.conditions.map((c: any) => this.convertFromJson(c))
      }
    }

    // Simple condition
    if (json.operation) {
      return {
        type: 'simple',
        comparison: json.operation as any,
        operand1: json.operand1 || '',
        operand2: json.operand2 || ''
      }
    }

    // Fallback
    return {
      type: 'simple',
      comparison: 'equal',
      operand1: json.operand1 || '',
      operand2: json.operand2 || ''
    }
  }
}

