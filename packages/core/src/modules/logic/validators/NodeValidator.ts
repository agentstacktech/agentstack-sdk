/**
 * Node Validator - Валидация нод и правил
 * Philosophy: v0.2.55: Extended Genetic Coding System
 */

import { logger } from '../../../utils/logger'
import type { FlowNode, FlowEdge, ValidationResult, NodeType } from '../types/NodeTypes'

/**
 * Валидатор нод и правил
 */
export class NodeValidator {
  /**
   * Валидирует ноду
   */
  static validateNode(node: FlowNode): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!node || !node.id) {
      errors.push('Node must have an id')
      return { valid: false, errors, warnings }
    }

    if (!node.type) {
      errors.push(`Node ${node.id}: Missing type`)
    }

    if (!node.data) {
      errors.push(`Node ${node.id}: Missing data`)
      return { valid: false, errors, warnings }
    }

    // Валидация по типу ноды
    // JSON-First: только типы, которые есть в JSON структуре
    switch (node.type) {
      case 'processor':
        this.validateProcessorNode(node, errors, warnings)
        break
      case 'if':
        this.validateIfNode(node, errors, warnings)
        break
      case 'switch':
        this.validateSwitchNode(node, errors, warnings)
        break
      case 'parallel':
        this.validateParallelNode(node, errors, warnings)
        break
      case 'command-handler':
        this.validateCommandHandlerNode(node, errors, warnings)
        break
      case 'command-call':
        this.validateCommandCallNode(node, errors, warnings)
        break
      case 'event-receiver':
        this.validateEventReceiverNode(node, errors, warnings)
        break
      case 'event-emitter':
        this.validateEventEmitterNode(node, errors, warnings)
        break
      default:
        warnings.push(`Node ${node.id}: Unknown node type "${node.type}"`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Валидирует правило (набор нод и edges)
   */
  static validateRule(nodes: FlowNode[], edges: FlowEdge[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!nodes || nodes.length === 0) {
      errors.push('Rule must have at least one node')
    }

    // Валидируем каждую ноду
    nodes.forEach(node => {
      const result = this.validateNode(node)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    })

    // Проверяем наличие триггеров
    const hasTrigger = nodes.some(n => 
      n.type === 'event-receiver' || 
      n.type === 'command-handler'
    )
    
    if (!hasTrigger) {
      warnings.push('Rule has no trigger (event-receiver or command-handler)')
    }

    // Проверяем связи
    const nodeIds = new Set(nodes.map(n => n.id))
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`)
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`)
      }
    })

    // Проверяем на циклические зависимости и самозамыкание
    const visited = new Set<string>()
    const checkCycle = (nodeId: string, path: string[] = []): boolean => {
      if (path.includes(nodeId)) {
        errors.push(`Circular dependency detected: ${path.join(' -> ')} -> ${nodeId}`)
        return true
      }
      if (visited.has(nodeId)) {
        return false
      }
      visited.add(nodeId)
      const newPath = [...path, nodeId]
      const outgoingEdges = edges.filter(e => e.source === nodeId)
      
      // Проверяем самозамыкание (edge указывает на сам узел)
      // КРИТИЧЕСКИ ВАЖНО: Для процессоров и других блоков проверяем все типы edges
      outgoingEdges.forEach(edge => {
        if (edge.target === nodeId) {
          const node = nodes.find(n => n.id === nodeId)
          if (!node) return
          const nodeType = node.type || 'unknown'
          const handleType = edge.sourceHandle || 'default'
          const edgeId = edge.id || `${nodeId}-${edge.target}`
          errors.push(`Self-referencing edge detected: Node ${nodeId} (${nodeType}) has ${handleType} edge pointing to itself (edge: ${edgeId})`)
          
          // Дополнительная проверка для процессоров
          if (nodeType === 'processor') {
            errors.push(`Processor ${nodeId} (${node.data?.processor || 'unknown'}) has self-looping edge - this will cause infinite execution`)
          }
        }
      })
      
      return outgoingEdges.some(e => checkCycle(e.target, newPath))
    }

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        checkCycle(node.id)
      }
    })
    
    // Проверяем валидность handles для блоков ветвления
    // Next edges для branching блоков теперь разрешены для общего продолжения после всех веток
    // Проверяем только самозамыкание
    nodes.forEach(node => {
      if (['if', 'switch', 'parallel'].includes(node.type)) {
        const nodeEdges = edges.filter(e => e.source === node.id)
        const selfReferencingNextEdges = nodeEdges.filter(e => 
          (e.sourceHandle === 'next' || e.sourceHandle === 'output') && e.target === node.id
        )
        
        if (selfReferencingNextEdges.length > 0) {
          errors.push(`Branching block ${node.id} (${node.type}) has next/output edge pointing to itself`)
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Приватные методы валидации по типам

  private static validateProcessorNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    if (!node.data.processor) {
      errors.push(`Processor node ${node.id}: Missing processor name`)
    }
    if (!node.data.action) {
      warnings.push(`Processor node ${node.id}: Missing action (will use 'execute' as default)`)
    }
    if (!node.data.parameters) {
      warnings.push(`Processor node ${node.id}: Missing parameters`)
    }
  }

  private static validateIfNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    if (!node.data.condition) {
      errors.push(`If node ${node.id}: Missing condition`)
    }
  }

  private static validateSwitchNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    if (!node.data.value && !node.data.cases) {
      warnings.push(`Switch node ${node.id}: Missing value or cases`)
    }
  }

  private static validateParallelNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    // Parallel node validation
    // Можно добавить проверку на количество веток
  }

  private static validateCommandHandlerNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    // JSON-First: trigger может быть в node.data.trigger или node.data.commandData.trigger
    const trigger = node.data.trigger || node.data.commandData?.trigger || node.data.command
    if (!trigger) {
      errors.push(`Command handler node ${node.id}: Missing trigger or command`)
    }
  }

  private static validateCommandCallNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    if (!node.data.command) {
      errors.push(`Command call node ${node.id}: Missing command`)
    }
  }

  private static validateEventReceiverNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    if (!node.data.eventType) {
      warnings.push(`Event receiver node ${node.id}: Missing eventType (will receive all events)`)
    }
  }

  private static validateEventEmitterNode(
    node: FlowNode,
    errors: string[],
    warnings: string[]
  ): void {
    if (!node.data.eventType) {
      errors.push(`Event emitter node ${node.id}: Missing eventType`)
    }
  }
}

