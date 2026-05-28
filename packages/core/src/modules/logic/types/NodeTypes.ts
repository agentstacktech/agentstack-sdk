/**
 * Node Types - Типы и интерфейсы для работы с нодами в визуальном редакторе правил
 * Philosophy: v0.2.55: Extended Genetic Coding System
 */

/**
 * Типы нод в визуальном редакторе
 * JSON-First: только типы, которые есть в JSON структуре
 */
export type NodeType = 
  | 'processor'           // Процессор (выполняет действие)
  | 'if'                 // Условный блок (if-then-else)
  | 'switch'             // Переключатель (switch-case)
  | 'parallel'           // Параллельное выполнение
  | 'command-handler'    // Обработчик команд (триггер)
  | 'command-call'       // Вызов команды
  | 'event-receiver'     // Приемник событий (триггер)
  | 'event-emitter'      // Отправитель событий

/**
 * Визуальное условие для условий и ветвлений
 */
export interface VisualCondition {
  type: 'simple' | 'compound' | 'group'
  operator?: 'and' | 'or' | 'not'
  conditions?: VisualCondition[]
  field?: string
  comparison?: 
    | 'equal' | 'not_equal' 
    | 'greater_than' | 'less_than' 
    | 'greater_equal' | 'less_equal' 
    | 'contains' | 'not_contains' 
    | 'in' | 'not_in' 
    | 'starts_with' | 'ends_with' 
    | 'regex' 
    | 'is_empty' | 'is_not_empty'
  value?: any
  operand1?: string
  operand2?: string
}

/**
 * Данные ноды (FlowNode data)
 */
export interface NodeData {
  label: string
  nodeType: NodeType
  enabled?: boolean
  
  // Processor-specific
  processor?: string
  action?: string
  parameters?: Record<string, any>
  processorInputs?: Array<{
    id: string
    label: string
    type?: string
    required?: boolean
    description?: string
  }>
  processorOutputs?: Array<{
    id: string
    label: string
    type?: string
    description?: string
  }>
  
  // Condition-specific
  condition?: VisualCondition
  
  // Event-specific
  eventType?: string
  eventFilter?: Record<string, any>
  eventData?: Record<string, any>
  
  // Command-specific
  command?: string
  trigger?: string
  commandData?: {
    trigger: string
    do?: Array<{
      processor: string
      action: string
      parameters: Record<string, any>
    }>
    when?: VisualCondition
  }
  
  // Switch-specific
  value?: string
  cases?: Record<string, any>
  default?: boolean
  
  // Metadata
  [key: string]: any
}

/**
 * FlowNode (React Flow) - визуальное представление ноды
 */
export interface FlowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
  selected?: boolean
  dragging?: boolean
}

/**
 * FlowEdge (React Flow) - связь между нодами
 */
export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string  // 'ifTrue', 'ifFalse', 'next', 'case-*', 'default', 'parallel-*'
  targetHandle?: string
  label?: string
  type?: string
  animated?: boolean
  style?: Record<string, any>
  markerEnd?: {
    type: string
    color?: string
  }
}

/**
 * JSON Block (Backend) - структура блока в JSON правиле
 */
export interface JsonBlock {
  type: 'processor' | 'if' | 'switch' | 'parallel' | 'command_call'
  processor?: string
  action?: string
  parameters?: Record<string, any> // Опционально: не включается если все параметры дефолтные
  condition?: any  // JSON condition (не VisualCondition)
  ifTrue?: JsonBlock
  ifFalse?: JsonBlock
  cases?: Record<string, JsonBlock>
  default?: JsonBlock
  parallel?: JsonBlock[]
  next?: JsonBlock
  command?: string
  // Metadata для визуального редактора
  _id?: string
  _x?: number
  _y?: number
  _label?: string
  _enabled?: boolean
}

/**
 * JSON Trigger - триггер в JSON правиле
 */
export interface JsonTrigger {
  type: 'command' | 'event'
  command?: string
  eventType?: string
  eventFilter?: Record<string, any>
  when?: any  // JSON condition
  next?: JsonBlock
  // Metadata
  _id?: string
  _x?: number
  _y?: number
  _label?: string
  _enabled?: boolean
}

/**
 * Результат валидации
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Результат конвертации
 */
export interface ConversionResult<T> {
  success: boolean
  data?: T
  errors?: string[]
  warnings?: string[]
}

