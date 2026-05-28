/**
 * Schema Helpers - Утилиты для работы с JSON Schema процессоров
 * Поддержка enum полей, извлечение значений, определение типов полей
 * 
 * Philosophy: v0.2.36: Obvious Processing Syntax + v0.4.9: AI Gene Interface
 */

/**
 * Типы полей в формах на основе JSON Schema
 */
export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox'

/**
 * Интерфейс для свойства JSON Schema
 */
export interface SchemaProperty {
  type?: string
  enum?: any[]
  oneOf?: Array<{ const?: any }>
  description?: string
  default?: any
  title?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  properties?: Record<string, SchemaProperty>
  [key: string]: any
}

/**
 * Определяет тип поля на основе JSON Schema свойства
 * 
 * @param property - Свойство из JSON Schema
 * @returns Тип поля для формы
 * 
 * @example
 * ```typescript
 * const property = { type: 'string', enum: ['option1', 'option2'] }
 * const fieldType = getFieldType(property) // 'select'
 * ```
 */
export function getFieldType(property: SchemaProperty): FieldType {
  // КРИТИЧЕСКИ ВАЖНО: Проверяем enum в разных форматах JSON Schema
  if (property.enum && Array.isArray(property.enum) && property.enum.length > 0) {
    return 'select'
  }
  
  // Также проверяем oneOf с const (альтернативный формат enum)
  if (property.oneOf && Array.isArray(property.oneOf) && property.oneOf.length > 0) {
    const hasConstValues = property.oneOf.some((item: any) => item.const !== undefined)
    if (hasConstValues) {
      return 'select'
    }
  }
  
  if (property.type === 'boolean') {
    return 'checkbox'
  }
  
  if (property.type === 'number' || property.type === 'integer') {
    return 'number'
  }
  
  if (property.type === 'object' || property.type === 'array') {
    return 'textarea'
  }
  
  return 'text'
}

/**
 * Извлекает enum значения из JSON Schema свойства
 * Поддерживает разные форматы: enum, oneOf с const
 * 
 * @param property - Свойство из JSON Schema
 * @returns Массив возможных значений
 * 
 * @example
 * ```typescript
 * const property = { enum: ['add', 'subtract', 'multiply'] }
 * const values = getEnumValues(property) // ['add', 'subtract', 'multiply']
 * 
 * const property2 = { oneOf: [{ const: 'option1' }, { const: 'option2' }] }
 * const values2 = getEnumValues(property2) // ['option1', 'option2']
 * ```
 */
export function getEnumValues(property: SchemaProperty): any[] {
  // Прямой enum массив
  if (property.enum && Array.isArray(property.enum)) {
    return property.enum
  }
  
  // Поддержка oneOf с const
  if (property.oneOf && Array.isArray(property.oneOf)) {
    return property.oneOf
      .map((item: any) => item.const)
      .filter((value: any) => value !== undefined)
  }
  
  return []
}

/**
 * Проверяет, является ли поле enum полем (выпадающим списком)
 * 
 * @param property - Свойство из JSON Schema
 * @returns true если поле должно быть выпадающим списком
 */
export function isEnumField(property: SchemaProperty): boolean {
  const fieldType = getFieldType(property)
  const enumValues = getEnumValues(property)
  return fieldType === 'select' && enumValues.length > 0
}

/**
 * Извлекает properties из input_schema процессора
 * Поддерживает разные структуры схем
 * 
 * @param inputSchema - input_schema процессора
 * @returns Объект properties или null
 */
export function extractSchemaProperties(inputSchema: any): Record<string, SchemaProperty> | null {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return null
  }
  
  // Прямой доступ к properties
  if (inputSchema.properties && typeof inputSchema.properties === 'object') {
    return inputSchema.properties
  }
  
  // Если input_schema это уже properties
  if (!inputSchema.type && Object.keys(inputSchema).length > 0) {
    const nonServiceKeys = Object.keys(inputSchema).filter(
      k => !k.startsWith('_') && k !== 'type' && k !== 'required'
    )
    if (nonServiceKeys.length > 0) {
      return inputSchema as Record<string, SchemaProperty>
    }
  }
  
  // Вложенная структура schema.properties
  if (inputSchema.schema?.properties) {
    return inputSchema.schema.properties
  }
  
  // Вложенная структура input_schema.properties
  if ((inputSchema as any).input_schema?.properties) {
    return (inputSchema as any).input_schema.properties
  }
  
  // metadata.input_schema.properties
  if ((inputSchema as any).metadata?.input_schema?.properties) {
    return (inputSchema as any).metadata.input_schema.properties
  }
  
  return null
}

/**
 * Обогащает properties enum значениями из fallback схем
 * Используется когда бэкенд не предоставил enum, но мы знаем возможные значения
 * 
 * @param properties - Properties из схемы
 * @param processorName - Имя процессора
 * @param fallbackSchemas - Fallback схемы для известных процессоров
 * @returns Обогащенные properties
 */
export function enrichPropertiesWithFallback(
  properties: Record<string, SchemaProperty> | null,
  processorName: string,
  fallbackSchemas?: Record<string, Record<string, SchemaProperty>>
): Record<string, SchemaProperty> | null {
  if (!properties || !processorName) {
    return properties
  }
  
  // Если properties есть, но operation без enum, добавляем enum из fallback
  // Это нужно для field_operations_processor, который может не иметь enum в бэкенде
  if (processorName === 'field_operations_processor' && properties.operation && !properties.operation.enum) {
    const fallbackOperation = fallbackSchemas?.[processorName]?.operation
    if (fallbackOperation?.enum) {
      return {
        ...properties,
        operation: {
          ...properties.operation,
          enum: fallbackOperation.enum
        }
      }
    }
  }
  
  return properties
}

/**
 * Список унарных операций для field_operations_processor
 * Унарные операции работают с одним значением и не требуют operand
 */
export function getUnaryOperations(): string[] {
  return [
    // Математические функции
    'not', 'abs', 'round', 'floor', 'ceil', 'sqrt', 'log', 'log10', 'exp',
    // Тригонометрические функции
    'sin', 'cos', 'tan',
    // Строковые операции
    'length', 'upper', 'lower', 'strip',
    // Преобразования типов
    'to_string', 'to_int', 'to_float', 'to_bool', 'to_list', 'to_dict'
  ]
}

/**
 * Список бинарных операций для field_operations_processor
 * Бинарные операции работают с двумя значениями и требуют operand
 */
export function getBinaryOperations(): string[] {
  return [
    // Арифметические операции
    'add', 'subtract', 'multiply', 'divide', 'modulo', 'power',
    // Операции сравнения
    'equal', 'not_equal', 'greater', 'greater_equal', 'less', 'less_equal',
    // Логические операции
    'and', 'or',
    // Строковые операции
    'concat', 'replace', 'split', 'join',
    // Математические функции
    'min', 'max', 'sum'
  ]
}

/**
 * Проверяет, является ли операция унарной (не требует operand)
 * @param operation - Название операции
 * @returns true если операция унарная
 */
export function isUnaryOperation(operation: string): boolean {
  return getUnaryOperations().includes(operation)
}

/**
 * Проверяет, является ли операция бинарной (требует operand)
 * @param operation - Название операции
 * @returns true если операция бинарная
 */
export function isBinaryOperation(operation: string): boolean {
  return getBinaryOperations().includes(operation)
}

/**
 * Определяет тип операции
 * @param operation - Название операции
 * @returns 'unary' | 'binary' | 'unknown'
 */
export function getOperationType(operation: string): 'unary' | 'binary' | 'unknown' {
  if (isUnaryOperation(operation)) {
    return 'unary'
  }
  if (isBinaryOperation(operation)) {
    return 'binary'
  }
  return 'unknown'
}

/**
 * Fallback схемы для известных процессоров
 * Используются когда бэкенд не предоставил полную схему
 */
export const PROCESSOR_FALLBACK_SCHEMAS: Record<string, Record<string, SchemaProperty>> = {
  'field_operations_processor': {
    operation: {
      type: 'string',
      description: 'Operation to perform',
      enum: [
        // Arithmetic operations
        'add', 'subtract', 'multiply', 'divide', 'modulo', 'power',
        // Comparison operations
        'equal', 'not_equal', 'greater', 'greater_equal', 'less', 'less_equal',
        // Logical operations
        'and', 'or', 'not',
        // Mathematical functions
        'abs', 'round', 'floor', 'ceil', 'sqrt', 'log', 'log10', 'exp',
        'sin', 'cos', 'tan', 'min', 'max', 'sum',
        // String operations
        'concat', 'length', 'upper', 'lower', 'strip', 'replace', 'split', 'join',
        // Type conversions
        'to_string', 'to_int', 'to_float', 'to_bool', 'to_list', 'to_dict'
      ]
    },
    field_path: {
      type: 'string',
      description: 'Dot notation path to field (e.g., \'user.profile.age\')'
    },
    value: {
      description: 'Value for operation'
    },
    operand: {
      description: 'Second operand for binary operations'
    },
    data: {
      type: 'object',
      description: 'Data object to operate on'
    },
    batch_operations: {
      type: 'array',
      description: 'Array of operations to perform in batch'
    }
  },
  'logical_operators_processor': {
    operation: {
      type: 'string',
      description: 'Logical operation to perform',
      enum: ['and', 'or', 'not', 'xor', 'nand', 'nor']
    },
    operand1: {
      description: 'First operand'
    },
    operand2: {
      description: 'Second operand (for binary operations)'
    },
    operands: {
      type: 'array',
      description: 'Array of operands for multi-operand operations'
    },
    expression: {
      type: 'object',
      description: 'Complex logical expression'
    },
    conditions: {
      type: 'array',
      description: 'Array of conditions for evaluation'
    }
  },
  'scheduler_processor': {
    action: {
      type: 'string',
      enum: ['schedule', 'cancel', 'list', 'status'],
      description: 'Action to perform'
    },
    task_id: {
      type: 'string',
      description: 'Unique task identifier'
    },
    execute_at: {
      type: 'number',
      description: 'Unix timestamp when task should execute'
    },
    protein: {
      type: 'object',
      description: 'Task data/protein'
    },
    operation: {
      type: 'object',
      description: 'Operation to execute'
    },
    priority: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      default: 5,
      description: 'Task priority (1-10)'
    },
    max_retries: {
      type: 'number',
      default: 3,
      description: 'Maximum retry attempts'
    },
    timeout: {
      type: 'number',
      default: 300,
      description: 'Task timeout in seconds'
    }
  },
  'webhook_processor': {
    url: {
      type: 'string',
      description: 'Webhook URL'
    },
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      default: 'POST',
      description: 'HTTP method'
    },
    headers: {
      type: 'object',
      description: 'HTTP headers'
    },
    body: {
      type: 'object',
      description: 'Request body'
    },
    timeout: {
      type: 'number',
      default: 30,
      description: 'Request timeout in seconds'
    }
  },
  'wallet_processor': {
    action: {
      type: 'string',
      enum: ['add_balance', 'subtract_balance', 'transfer', 'get_balance', 'get_history'],
      description: 'Action to perform'
    },
    wallet_id: {
      type: 'string',
      description: 'Wallet ID'
    },
    currency: {
      type: 'string',
      description: 'Currency code'
    },
    amount: {
      type: 'number',
      description: 'Amount to add/subtract/transfer'
    },
    from_wallet_id: {
      type: 'string',
      description: 'Source wallet ID (for transfer)'
    },
    to_wallet_id: {
      type: 'string',
      description: 'Target wallet ID (for transfer)'
    }
  },
  'user_projects_processor': {
    command: {
      type: 'string',
      enum: ['generate_projects_batch', 'generate_users_for_projects', 'generate_full_ecosystem', 'get_project_statistics', 'cleanup_test_data'],
      description: 'Command to execute'
    },
    data: {
      type: 'object',
      description: 'Command data parameters'
    },
    batch_size: {
      type: 'integer',
      default: 1000,
      description: 'Batch size for generation'
    },
    project_type: {
      type: 'string',
      enum: ['game', 'service', 'platform', 'ai_agent', 'ecommerce', 'social_network'],
      description: 'Project type for generation'
    },
    total_projects: {
      type: 'integer',
      default: 100000,
      description: 'Total number of projects'
    },
    total_users: {
      type: 'integer',
      default: 5000000,
      description: 'Total number of users'
    }
  }
}

/**
 * Получает properties из input_schema процессора с поддержкой fallback
 * 
 * @param processor - Процессор с input_schema
 * @param useFallback - Использовать fallback схемы если схема пустая
 * @returns Properties из схемы или fallback
 */
export function getProcessorProperties(
  processor: { name: string; input_schema?: any } | null,
  useFallback: boolean = true
): Record<string, SchemaProperty> | null {
  if (!processor) {
    return null
  }
  
  // Извлекаем properties из input_schema
  let properties = extractSchemaProperties(processor.input_schema)
  
  // Обогащаем enum значениями из fallback если нужно
  if (properties) {
    properties = enrichPropertiesWithFallback(
      properties,
      processor.name,
      PROCESSOR_FALLBACK_SCHEMAS
    ) || properties
  }
  
  // Используем fallback если properties пустые
  if ((!properties || Object.keys(properties).length === 0) && useFallback) {
    const fallbackSchema = PROCESSOR_FALLBACK_SCHEMAS[processor.name]
    if (fallbackSchema) {
      return fallbackSchema
    }
  }
  
  return properties || null
}

