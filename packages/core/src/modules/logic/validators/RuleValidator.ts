/**
 * Rule Validator - Валидация JSON правил
 * JSON-First Architecture: валидация JSON структуры
 * Philosophy: v0.2.55: Extended Genetic Coding System
 */

import { logger } from '../../../utils/logger'
import type { ValidationResult } from '../types/NodeTypes'

/**
 * Валидатор JSON правил
 */
export class RuleValidator {
  /**
   * Валидирует JSON правило
   */
  static validateJsonRule(jsonRule: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!jsonRule || typeof jsonRule !== 'object') {
      errors.push('Invalid JSON rule: must be an object')
      return { valid: false, errors, warnings }
    }

    const json_rules = jsonRule.json_rules || {}

    // Валидация triggers
    if (!json_rules.triggers || !Array.isArray(json_rules.triggers)) {
      errors.push('Missing or invalid triggers array')
    } else {
      if (json_rules.triggers.length === 0) {
        warnings.push('Rule has no triggers')
      }

      json_rules.triggers.forEach((trigger: any, index: number) => {
        if (!trigger.type) {
          errors.push(`Trigger ${index}: Missing type`)
        } else if (trigger.type === 'command') {
          if (!trigger.command) {
            errors.push(`Trigger ${index}: Command trigger missing command`)
          }
        } else if (trigger.type === 'event') {
          if (!trigger.eventType) {
            warnings.push(`Trigger ${index}: Event trigger missing eventType`)
          }
        } else {
          errors.push(`Trigger ${index}: Unknown trigger type "${trigger.type}"`)
        }

        // Валидация next блоков
        if (trigger.next) {
          const nextErrors = this.validateBlock(trigger.next, `trigger ${index}.next`)
          errors.push(...nextErrors)
        }
      })
    }

    // Валидация when (опционально)
    if (json_rules.when) {
      const whenErrors = this.validateCondition(json_rules.when)
      errors.push(...whenErrors)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Валидирует JSON блок
   */
  private static validateBlock(block: any, path: string): string[] {
    const errors: string[] = []

    if (!block || typeof block !== 'object') {
      errors.push(`${path}: Invalid block (must be an object)`)
      return errors
    }

    if (!block.type) {
      errors.push(`${path}: Missing type`)
      return errors
    }

    switch (block.type) {
      case 'processor':
        if (!block.processor) {
          errors.push(`${path}: Processor block missing processor`)
        }
        if (!block.action) {
          errors.push(`${path}: Processor block missing action`)
        }
        break
      case 'if':
        if (!block.condition) {
          errors.push(`${path}: If block missing condition`)
        }
        if (block.ifTrue) {
          errors.push(...this.validateBlock(block.ifTrue, `${path}.ifTrue`))
        }
        if (block.ifFalse) {
          errors.push(...this.validateBlock(block.ifFalse, `${path}.ifFalse`))
        }
        break
      case 'switch':
        if (!block.cases || typeof block.cases !== 'object') {
          errors.push(`${path}: Switch block missing cases`)
        } else {
          Object.entries(block.cases).forEach(([key, caseBlock]: [string, any]) => {
            errors.push(...this.validateBlock(caseBlock, `${path}.cases[${key}]`))
          })
        }
        if (block.default) {
          errors.push(...this.validateBlock(block.default, `${path}.default`))
        }
        break
      case 'parallel':
        if (!Array.isArray(block.parallel)) {
          errors.push(`${path}: Parallel block missing parallel array`)
        } else {
          block.parallel.forEach((parallelBlock: any, index: number) => {
            errors.push(...this.validateBlock(parallelBlock, `${path}.parallel[${index}]`))
          })
        }
        break
      case 'command_call':
        if (!block.command) {
          errors.push(`${path}: Command call block missing command`)
        }
        break
      default:
        errors.push(`${path}: Unknown block type "${block.type}"`)
    }

    // Валидация next
    if (block.next) {
      errors.push(...this.validateBlock(block.next, `${path}.next`))
    }

    return errors
  }

  /**
   * Валидирует условие
   */
  private static validateCondition(condition: any): string[] {
    const errors: string[] = []

    if (!condition || typeof condition !== 'object') {
      errors.push('Invalid condition: must be an object')
      return errors
    }

    if (condition.expression) {
      // Compound condition
      if (!condition.expression.operation) {
        errors.push('Compound condition missing operation')
      }
      if (!Array.isArray(condition.expression.conditions)) {
        errors.push('Compound condition missing conditions array')
      } else {
        condition.expression.conditions.forEach((c: any, index: number) => {
          errors.push(...this.validateCondition(c).map(e => `condition[${index}]: ${e}`))
        })
      }
    } else if (condition.operation) {
      // Simple condition
      if (!condition.operand1) {
        errors.push('Simple condition missing operand1')
      }
    } else {
      errors.push('Condition missing operation or expression')
    }

    return errors
  }
}

