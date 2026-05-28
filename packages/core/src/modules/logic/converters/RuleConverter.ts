/**
 * Rule Converter - Конвертация между JSON Rule и визуальными нодами
 * JSON-First Architecture: JSON - источник истины, визуальный редактор - представление
 * Philosophy: v0.2.55: Extended Genetic Coding System
 */

import { logger } from '../../../utils/logger'
import type { Logic } from '../../AgentLogic'
import type { JsonTrigger, JsonBlock } from '../types/NodeTypes'
import { NodeConverter } from './NodeConverter'
import { ConditionConverter } from './ConditionConverter'

/**
 * Конвертер правил между JSON и визуальным представлением
 */
export class RuleConverter {
  private static readonly DEFAULT_NODE_X = 100
  private static readonly DEFAULT_NODE_Y = 200
  private static readonly NODE_SPACING_X = 300
  private static readonly NODE_SPACING_Y = 150

  /**
   * Конвертирует JSON правило в визуальные ноды
   * JSON-First: JSON - источник истины
   */
  static convertJsonRuleToNodes(rule: Logic): {
    success: boolean;
    data?: { nodes: any[]; edges: any[] };
    errors?: string[];
    warnings?: string[];
  } {
    try {
      const nodes: any[] = []
      const edges: any[] = []
      let currentX = this.DEFAULT_NODE_X
      let currentY = this.DEFAULT_NODE_Y

      const jsonRules = (rule as any).json_rules || {}
      const triggers = jsonRules.triggers || []
      const when = jsonRules.when

      // Добавляем when условие как отдельную ноду (если есть)
      // JSON-First: when опциональный, создается только если есть в JSON
      let whenNodeId: string | null = null
      if (when) {
        whenNodeId = (when as any)._id || `when-${Date.now()}`
        const whenPosition = {
          x: (when as any)._x ? (when as any)._x + 400 : currentX,
          y: (when as any)._y ? (when as any)._y + 300 : currentY
        }
        nodes.push({
          id: whenNodeId,
          type: 'if',
          position: whenPosition,
          data: {
            label: (when as any)._label || 'When',
            nodeType: 'if',
            condition: ConditionConverter.convertFromJson(when),
            enabled: (when as any)._enabled !== false
          }
        })
        currentX += this.NODE_SPACING_X
      }

      // Конвертируем каждый trigger
      triggers.forEach((trigger: JsonTrigger, index: number) => {
        const triggerNode = this.convertTriggerToNode(trigger, currentX, currentY)
        if (triggerNode) {
          nodes.push(triggerNode.node)
          
          // Создаем edge от when к первому trigger (если when есть)
          if (whenNodeId && index === 0) {
            edges.push({
              id: `edge-${whenNodeId}-${triggerNode.node.id}`,
              source: whenNodeId,
              target: triggerNode.node.id
            })
          }

          // Конвертируем next блоки
          if (trigger.next) {
            const nextPosition = {
              x: triggerNode.node.position.x + this.NODE_SPACING_X,
              y: triggerNode.node.position.y
            }
            const nextResult = NodeConverter.convertJsonToNodes(
              trigger.next,
              nextPosition
            )
            if (nextResult.success && nextResult.data) {
              nodes.push(...nextResult.data.nodes)
              edges.push(...nextResult.data.edges)
              
              // Создаем edge от trigger к первому next ноду
              const firstNextNode = nextResult.data.nodes[0]
              if (firstNextNode) {
                edges.push({
                  id: `edge-${triggerNode.node.id}-${firstNextNode.id}`,
                  source: triggerNode.node.id,
                  target: firstNextNode.id,
                  sourceHandle: 'output'
                })
              }
            }
          }

          // Увеличиваем Y для следующего trigger
          currentY += this.NODE_SPACING_Y
        }
      })

      return {
        success: true,
        data: { nodes, edges }
      }
    } catch (error) {
      logger.error('[RuleConverter] Error converting JSON rule to nodes', { error })
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Конвертирует визуальные ноды в JSON правило
   * JSON-First: визуальный редактор → JSON структура
   */
  static convertNodesToJsonRule(
    nodes: any[],
    edges: any[],
    ruleMetadata: {
      name: string;
      description?: string;
      enabled?: boolean;
      priority?: number;
    }
  ): {
    success: boolean;
    data?: {
      name: string;
      description?: string;
      json_rules: any;
      enabled?: boolean;
      priority?: number;
    };
    errors?: string[];
    warnings?: string[];
  } {
    try {
      const triggers: JsonTrigger[] = []
      let when: any = undefined

      // Находим when ноду
      const whenNode = nodes.find(n => n.type === 'if' && n.data.label === 'When')
      if (whenNode && whenNode.data.condition) {
        when = ConditionConverter.convertToJson(whenNode.data.condition)
        // Сохраняем метаданные
        if (whenNode.data._id) (when as any)._id = whenNode.data._id
        if (whenNode.position) {
          (when as any)._x = whenNode.position.x
          (when as any)._y = whenNode.position.y
        }
        if (whenNode.data.label) (when as any)._label = whenNode.data.label
        if (whenNode.data.enabled !== undefined) (when as any)._enabled = whenNode.data.enabled
      }

      // Находим все trigger ноды (command-handler и event-receiver)
      // Исключаем ноды, которые связаны с when (они не являются триггерами)
      const triggerNodes = nodes.filter(n => {
        if (n.type !== 'command-handler' && n.type !== 'event-receiver') return false
        // Исключаем ноды, которые являются целевыми для when
        if (whenNode && edges.some(e => e.source === whenNode.id && e.target === n.id)) {
          return false // Это не триггер, а следующий блок после when
        }
        return true
      })

      triggerNodes.forEach(triggerNode => {
        const trigger = this.convertNodeToTrigger(triggerNode, nodes, edges)
        if (trigger) {
          triggers.push(trigger)
        }
      })
      
      // Если нет триггеров, но есть when, создаем пустой массив триггеров
      // (when сам по себе не является триггером, это глобальное условие)

      const json_rules: any = {
        when,
        triggers
      }

      // Добавляем editor_metadata с метаданными нод
      const editor_metadata: any = {
        triggers: [...triggers]
      }
      json_rules.editor_metadata = editor_metadata

      return {
        success: true,
        data: {
          name: ruleMetadata.name,
          description: ruleMetadata.description,
          json_rules,
          enabled: ruleMetadata.enabled,
          priority: ruleMetadata.priority
        }
      }
    } catch (error) {
      logger.error('[RuleConverter] Error converting nodes to JSON rule', { error })
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Приватные методы

  private static convertTriggerToNode(
    trigger: JsonTrigger,
    x: number,
    y: number
  ): { node: any } | null {
    if (trigger.type === 'command') {
      return {
        node: {
          id: trigger._id || `command-${Date.now()}`,
          type: 'command-handler',
          position: { 
            x: trigger._x ? trigger._x + 400 : x, 
            y: trigger._y ? trigger._y + 300 : y 
          },
          data: {
            label: trigger._label || trigger.command || 'Command Handler',
            nodeType: 'command-handler',
            trigger: trigger.command,
            enabled: trigger._enabled !== false
          }
        }
      }
    } else if (trigger.type === 'event') {
      return {
        node: {
          id: trigger._id || `event-${Date.now()}`,
          type: 'event-receiver',
          position: { 
            x: trigger._x ? trigger._x + 400 : x, 
            y: trigger._y ? trigger._y + 300 : y 
          },
          data: {
            label: trigger._label || trigger.eventType || 'Event Receiver',
            nodeType: 'event-receiver',
            eventType: trigger.eventType || '',
            eventFilter: trigger.eventFilter || {},
            enabled: trigger._enabled !== false
          }
        }
      }
    }
    return null
  }

  private static convertNodeToTrigger(
    node: any,
    nodes: any[],
    edges: any[]
  ): JsonTrigger | null {
    if (node.type === 'command-handler') {
      const trigger: JsonTrigger = {
        type: 'command',
        command: node.data.trigger || node.data.command || ''
      }

      // КРИТИЧЕСКИ ВАЖНО: Находим next блок, учитывая sourceHandle
      // Для branching блоков (if, switch, parallel) нужно найти edge с sourceHandle === 'next'
      // Для обычных блоков можно использовать любой edge (обычно это 'protein' или 'output')
      const nextEdge = edges.find(e => {
        if (e.source !== node.id) return false
        // Для command-handler и event-receiver обычно используется первый edge
        // Но если есть edge с sourceHandle === 'next' или 'output', используем его
        if (e.sourceHandle === 'next' || e.sourceHandle === 'output') return true
        // Если нет явного next/output, используем первый edge (для обратной совместимости)
        return true
      })
      if (nextEdge) {
        const nextResult = NodeConverter.convertNodesToJson(
          nodes,
          edges,
          nextEdge.target
        )
        if (nextResult.success && nextResult.data) {
          trigger.next = nextResult.data
          logger.debug('[RuleConverter] Trigger next block converted', {
            triggerType: trigger.type,
            triggerCommand: trigger.command,
            nextBlockType: trigger.next?.type,
            hasNext: !!trigger.next?.next
          })
        } else {
          logger.warn('[RuleConverter] Failed to convert trigger next block', {
            triggerType: trigger.type,
            triggerCommand: trigger.command,
            nextEdgeTarget: nextEdge.target,
            errors: nextResult.errors
          })
        }
      }

      // Метаданные
      trigger._id = node.id
      trigger._x = node.position.x - 400
      trigger._y = node.position.y - 300
      if (node.data.label) trigger._label = node.data.label
      if (node.data.enabled !== undefined) trigger._enabled = node.data.enabled

      return trigger
    } else if (node.type === 'event-receiver') {
      const trigger: JsonTrigger = {
        type: 'event',
        eventType: node.data.eventType || '',
        eventFilter: node.data.eventFilter || {}
      }

      // КРИТИЧЕСКИ ВАЖНО: Находим next блок, учитывая sourceHandle
      // Для branching блоков (if, switch, parallel) нужно найти edge с sourceHandle === 'next'
      // Для обычных блоков можно использовать любой edge (обычно это 'protein' или 'output')
      const nextEdge = edges.find(e => {
        if (e.source !== node.id) return false
        // Для command-handler и event-receiver обычно используется первый edge
        // Но если есть edge с sourceHandle === 'next' или 'output', используем его
        if (e.sourceHandle === 'next' || e.sourceHandle === 'output') return true
        // Если нет явного next/output, используем первый edge (для обратной совместимости)
        return true
      })
      if (nextEdge) {
        const nextResult = NodeConverter.convertNodesToJson(
          nodes,
          edges,
          nextEdge.target
        )
        if (nextResult.success && nextResult.data) {
          trigger.next = nextResult.data
          logger.debug('[RuleConverter] Trigger next block converted', {
            triggerType: trigger.type,
            triggerCommand: trigger.command,
            nextBlockType: trigger.next?.type,
            hasNext: !!trigger.next?.next
          })
        } else {
          logger.warn('[RuleConverter] Failed to convert trigger next block', {
            triggerType: trigger.type,
            triggerCommand: trigger.command,
            nextEdgeTarget: nextEdge.target,
            errors: nextResult.errors
          })
        }
      }

      // Метаданные
      trigger._id = node.id
      trigger._x = node.position.x - 400
      trigger._y = node.position.y - 300
      if (node.data.label) trigger._label = node.data.label
      if (node.data.enabled !== undefined) trigger._enabled = node.data.enabled

      return trigger
    }
    return null
  }
}

