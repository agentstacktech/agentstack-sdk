/**
 * Node Converter - Конвертация между FlowNode и JSON структурами
 * Philosophy: v0.2.55: Extended Genetic Coding System
 */

import { logger } from '../../../utils/logger'
import type { 
  FlowNode, 
  FlowEdge, 
  JsonBlock, 
  JsonTrigger,
  NodeData,
  ConversionResult 
} from '../types/NodeTypes'
import { ConditionConverter } from './ConditionConverter'

/**
 * Конвертер нод между визуальным и JSON форматами
 */
export class NodeConverter {
  private static readonly CANVAS_CENTER_X = 400
  private static readonly CANVAS_CENTER_Y = 300

  /**
   * Конвертирует цепочку нодов в nested структуру JSON блоков
   */
  static convertNodesToJson(
    nodes: FlowNode[],
    edges: FlowEdge[],
    startNodeId: string
  ): ConversionResult<JsonBlock> {
    try {
      // Валидация входных данных
      if (!nodes || !Array.isArray(nodes)) {
        return {
          success: false,
          errors: ['Invalid nodes array']
        }
      }
      if (!edges || !Array.isArray(edges)) {
        return {
          success: false,
          errors: ['Invalid edges array']
        }
      }
      if (!startNodeId || typeof startNodeId !== 'string') {
        return {
          success: false,
          errors: ['Invalid startNodeId']
        }
      }

      // Создаем карту нодов для быстрого доступа
      const nodeMap = new Map<string, FlowNode>()
      nodes.forEach(node => {
        if (node && node.id) {
          nodeMap.set(node.id, node)
        }
      })

      // Создаем карту исходящих edges
      const outgoingEdges = new Map<string, FlowEdge[]>()
      edges.forEach(edge => {
        if (!outgoingEdges.has(edge.source)) {
          outgoingEdges.set(edge.source, [])
        }
        outgoingEdges.get(edge.source)!.push(edge)
      })

      // Рекурсивная конвертация
      const visited = new Set<string>()
      const convertNodeToBlock = (
        nodeId: string, 
        path: string[] = []
      ): JsonBlock | null => {
        const currentPath = [...path, nodeId]
        const pathKey = currentPath.join('->')
        
        if (visited.has(pathKey)) {
          logger.warn('[NodeConverter] Circular reference detected', { 
            nodeId, 
            path: currentPath 
          })
          return null
        }
        visited.add(pathKey)

        const node = nodeMap.get(nodeId)
        if (!node) {
          logger.warn('[NodeConverter] Node not found', { nodeId })
          return null
        }

        let block: JsonBlock | null = null

        // Конвертация по типу ноды
        // JSON-First: только типы, которые есть в JSON структуре
        switch (node.type) {
          case 'processor':
            block = this.convertProcessorNode(node)
            break
          case 'if':
            block = this.convertIfNode(node, nodeMap, outgoingEdges, convertNodeToBlock, currentPath)
            break
          case 'switch':
            block = this.convertSwitchNode(node, nodeMap, outgoingEdges, convertNodeToBlock, currentPath)
            break
          case 'parallel':
            block = this.convertParallelNode(node, nodeMap, outgoingEdges, convertNodeToBlock, currentPath)
            break
          case 'command-call':
            block = this.convertCommandCallNode(node)
            break
          case 'event-emitter':
            block = this.convertEventEmitterNode(node)
            break
          default:
            logger.warn('[NodeConverter] Unknown node type', { 
              nodeId, 
              type: node.type 
            })
            return null
        }

        if (!block) return null

        // Добавляем метаданные
        this.addMetadata(block, node)

        // Добавляем next блок
        // КРИТИЧЕСКИ ВАЖНО: Для блоков ветвлений (if, switch, parallel) next уже обработан
        // в соответствующих методах convertIfNode, convertSwitchNode, convertParallelNode.
        // Здесь обрабатываем next только для обычных блоков (не ветвлений).
        const isBranchingBlock = ['if', 'switch', 'parallel'].includes(node.type)
        if (!isBranchingBlock) {
          const nodeEdges = outgoingEdges.get(nodeId) || []
          const nextEdge = this.findNextEdge(nodeEdges, node.type)
          if (nextEdge) {
            // КРИТИЧЕСКИ ВАЖНО: Проверяем, что next не указывает на сам блок
            if (nextEdge.target === nodeId) {
              logger.warn('[NodeConverter] Next edge points to itself, skipping', {
                nodeId,
                nodeType: node.type
              })
            } else {
              const nextBlock = convertNodeToBlock(nextEdge.target, currentPath)
              if (nextBlock) {
                block.next = nextBlock
              }
            }
          }
        }

        return block
      }

      const result = convertNodeToBlock(startNodeId)
      
      if (!result) {
        return {
          success: false,
          errors: ['Failed to convert nodes to JSON']
        }
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      logger.error('[NodeConverter] Error converting nodes to JSON', { error })
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Конвертирует JSON блок в ноды
   */
  static convertJsonToNodes(
    block: JsonBlock,
    startPosition: { x: number; y: number }
  ): ConversionResult<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
    try {
      const nodes: FlowNode[] = []
      const edges: FlowEdge[] = []
      let currentX = startPosition.x
      let currentY = startPosition.y
      const NODE_SPACING_X = 250

      const convertBlockToNode = (
        block: JsonBlock,
        position: { x: number; y: number },
        parentId?: string
      ): string | null => {
        const nodeId = block._id || `node-${Date.now()}-${Math.random()}`
        
        let node: FlowNode | null = null

        switch (block.type) {
          case 'processor':
            node = this.convertProcessorBlock(block, nodeId, position)
            break
          case 'if':
            node = this.convertIfBlock(block, nodeId, position)
            break
          case 'switch':
            node = this.convertSwitchBlock(block, nodeId, position)
            break
          case 'parallel':
            node = this.convertParallelBlock(block, nodeId, position)
            break
          case 'command_call':
            node = this.convertCommandCallBlock(block, nodeId, position)
            break
          default:
            logger.warn('[NodeConverter] Unknown block type', { type: block.type })
            return null
        }

        if (!node) return null

        nodes.push(node)

        // Создаем edge от родителя
        if (parentId) {
          edges.push({
            id: `edge-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId
          })
        }

        // Рекурсивно обрабатываем ветки
        if (block.ifTrue) {
          const ifTrueId = convertBlockToNode(
            block.ifTrue,
            { x: position.x + NODE_SPACING_X, y: position.y - 100 },
            nodeId
          )
          if (ifTrueId) {
            edges.push({
              id: `edge-${nodeId}-ifTrue-${ifTrueId}`,
              source: nodeId,
              target: ifTrueId,
              sourceHandle: 'ifTrue'
            })
          }
        }

        if (block.ifFalse) {
          const ifFalseId = convertBlockToNode(
            block.ifFalse,
            { x: position.x + NODE_SPACING_X, y: position.y + 100 },
            nodeId
          )
          if (ifFalseId) {
            edges.push({
              id: `edge-${nodeId}-ifFalse-${ifFalseId}`,
              source: nodeId,
              target: ifFalseId,
              sourceHandle: 'ifFalse'
            })
          }
        }

        // КРИТИЧЕСКИ ВАЖНО: Обрабатываем parallel ветки
        if (block.parallel && Array.isArray(block.parallel)) {
          const parallelArray = block.parallel
          parallelArray.forEach((parallelBlock: JsonBlock, parallelIndex: number) => {
            if (parallelBlock) {
              const parallelId = convertBlockToNode(
                parallelBlock,
                { 
                  x: position.x + NODE_SPACING_X, 
                  y: position.y + (parallelIndex - parallelArray.length / 2) * 150 
                },
                nodeId
              )
              if (parallelId) {
                edges.push({
                  id: `edge-${nodeId}-parallel-${parallelIndex}-${parallelId}`,
                  source: nodeId,
                  target: parallelId,
                  sourceHandle: `parallel-${parallelIndex}`
                })
              }
            }
          })
        }

        // КРИТИЧЕСКИ ВАЖНО: Обрабатываем next блок ПОСЛЕ всех веток (ifTrue, ifFalse, cases, default, parallel)
        // Для parallel блоков next - это общее продолжение после выполнения всех веток
        if (block.next) {
          const nextId = convertBlockToNode(
            block.next,
            { x: position.x + NODE_SPACING_X, y: position.y },
            nodeId
          )
          if (nextId) {
            edges.push({
              id: `edge-${nodeId}-next-${nextId}`,
              source: nodeId,
              target: nextId,
              sourceHandle: 'next'
            })
            logger.debug('[NodeConverter] Next block processed for block', {
              blockType: block.type,
              blockId: nodeId,
              nextId,
              nextBlockType: block.next.type
            })
          } else {
            logger.warn('[NodeConverter] Failed to convert next block', {
              blockType: block.type,
              blockId: nodeId,
              nextBlockType: block.next.type
            })
          }
        }

        return nodeId
      }

      convertBlockToNode(block, startPosition)

      return {
        success: true,
        data: { nodes, edges }
      }
    } catch (error) {
      logger.error('[NodeConverter] Error converting JSON to nodes', { error })
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Приватные методы конвертации

  private static convertProcessorNode(node: FlowNode): JsonBlock | null {
    if (!node.data.processor) {
      logger.warn('[NodeConverter] Processor node missing processor', { nodeId: node.id })
      return null
    }

    return {
      type: 'processor',
      processor: node.data.processor,
      action: node.data.action || 'execute',
      parameters: node.data.parameters || {}
    }
  }

  private static convertIfNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outgoingEdges: Map<string, FlowEdge[]>,
    convertNodeToBlock: (nodeId: string, path: string[]) => JsonBlock | null,
    currentPath: string[]
  ): JsonBlock | null {
    if (!node.data.condition) {
      logger.warn('[NodeConverter] If node missing condition', { nodeId: node.id })
      return null
    }

    const block: JsonBlock = {
      type: 'if',
      condition: ConditionConverter.convertToJson(node.data.condition)
    }

    const nodeEdges = outgoingEdges.get(node.id) || []
    const ifTrueEdge = nodeEdges.find(e => e.sourceHandle === 'ifTrue')
    const ifFalseEdge = nodeEdges.find(e => e.sourceHandle === 'ifFalse')

    if (ifTrueEdge) {
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что ifTrue не указывает на сам if блок
      if (ifTrueEdge.target === node.id) {
        logger.warn('[NodeConverter] If ifTrue points to itself, skipping', {
          nodeId: node.id,
          ifTrueTarget: ifTrueEdge.target
        })
      } else {
        const ifTrueBlock = convertNodeToBlock(ifTrueEdge.target, currentPath)
        if (ifTrueBlock) {
          block.ifTrue = ifTrueBlock
        }
      }
    }

    if (ifFalseEdge) {
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что ifFalse не указывает на сам if блок
      if (ifFalseEdge.target === node.id) {
        logger.warn('[NodeConverter] If ifFalse points to itself, skipping', {
          nodeId: node.id,
          ifFalseTarget: ifFalseEdge.target
        })
      } else {
        const ifFalseBlock = convertNodeToBlock(ifFalseEdge.target, currentPath)
        if (ifFalseBlock) {
          block.ifFalse = ifFalseBlock
        }
      }
    }

    // КРИТИЧЕСКИ ВАЖНО: Для if блоков обрабатываем next ПОСЛЕ ifTrue и ifFalse
    // Next может использоваться для общего продолжения после всех веток
    const nextEdge = nodeEdges.find(e => {
      if (!e.sourceHandle) return false
      if (e.sourceHandle === 'next' || e.sourceHandle === 'output') return true
      return false
    })
    
    if (nextEdge && nextEdge.target !== node.id) {
      // Next не должен указывать на сам if блок
      const nextBlock = convertNodeToBlock(nextEdge.target, currentPath)
      if (nextBlock) {
        block.next = nextBlock
      }
    }

    return block
  }

  private static convertSwitchNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outgoingEdges: Map<string, FlowEdge[]>,
    convertNodeToBlock: (nodeId: string, path: string[]) => JsonBlock | null,
    currentPath: string[]
  ): JsonBlock | null {
    const block: JsonBlock = {
      type: 'switch',
      cases: {}
    }

    const nodeEdges = outgoingEdges.get(node.id) || []
    const caseEdges = nodeEdges.filter(e => e.sourceHandle?.startsWith('case-'))
    const defaultEdge = nodeEdges.find(e => e.sourceHandle === 'default')

    caseEdges.forEach(edge => {
      const caseKey = edge.sourceHandle?.replace('case-', '') || ''
      if (caseKey) {
        // КРИТИЧЕСКИ ВАЖНО: Проверяем, что case не указывает на сам switch блок
        if (edge.target === node.id) {
          logger.warn('[NodeConverter] Switch case points to itself, skipping', {
            nodeId: node.id,
            caseKey,
            caseTarget: edge.target
          })
        } else {
          const caseBlock = convertNodeToBlock(edge.target, currentPath)
          if (caseBlock) {
            block.cases![caseKey] = caseBlock
          }
        }
      }
    })

    if (defaultEdge) {
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что default не указывает на сам switch блок
      if (defaultEdge.target === node.id) {
        logger.warn('[NodeConverter] Switch default points to itself, skipping', {
          nodeId: node.id,
          defaultTarget: defaultEdge.target
        })
      } else {
        block.default = convertNodeToBlock(defaultEdge.target, currentPath) || undefined
      }
    }

    // КРИТИЧЕСКИ ВАЖНО: Для switch блоков обрабатываем next ПОСЛЕ cases и default
    // Next может использоваться для общего продолжения после всех веток
    const nextEdge = nodeEdges.find(e => {
      if (!e.sourceHandle) return false
      if (e.sourceHandle === 'next' || e.sourceHandle === 'output') return true
      return false
    })
    
    if (nextEdge && nextEdge.target !== node.id) {
      const nextBlock = convertNodeToBlock(nextEdge.target, currentPath)
      if (nextBlock) {
        block.next = nextBlock
      }
    }

    return block
  }

  private static convertParallelNode(
    node: FlowNode,
    nodeMap: Map<string, FlowNode>,
    outgoingEdges: Map<string, FlowEdge[]>,
    convertNodeToBlock: (nodeId: string, path: string[]) => JsonBlock | null,
    currentPath: string[]
  ): JsonBlock | null {
    const block: JsonBlock = {
      type: 'parallel',
      parallel: []
    }

    const nodeEdges = outgoingEdges.get(node.id) || []
    const parallelEdges = nodeEdges.filter(e => e.sourceHandle?.startsWith('parallel-'))
    
    logger.debug('[NodeConverter] Processing parallel node', {
      nodeId: node.id,
      totalEdges: nodeEdges.length,
      parallelEdgesCount: parallelEdges.length,
      allSourceHandles: nodeEdges.map(e => e.sourceHandle).filter(Boolean),
      parallelSourceHandles: parallelEdges.map(e => e.sourceHandle)
    })
    
    parallelEdges.sort((a, b) => {
      const aIndex = parseInt(a.sourceHandle?.replace('parallel-', '') || '0')
      const bIndex = parseInt(b.sourceHandle?.replace('parallel-', '') || '0')
      return aIndex - bIndex
    })

    parallelEdges.forEach((edge, index) => {
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что parallel ветка не указывает на сам parallel блок
      if (edge.target === node.id) {
        logger.warn('[NodeConverter] Parallel branch points to itself, skipping', {
          nodeId: node.id,
          parallelTarget: edge.target,
          parallelIndex: edge.sourceHandle?.replace('parallel-', '')
        })
      } else {
        // КРИТИЧЕСКИ ВАЖНО: convertNodeToBlock рекурсивно обрабатывает всю цепочку блоков через next
        // Это гарантирует, что все блоки внутри parallel ветки (включая wallet процессор) сохраняются
        const parallelBlock = convertNodeToBlock(edge.target, currentPath)
        if (parallelBlock) {
          block.parallel!.push(parallelBlock)
          logger.debug('[NodeConverter] Parallel branch converted', {
            nodeId: node.id,
            parallelIndex: index,
            parallelTarget: edge.target,
            sourceHandle: edge.sourceHandle,
            hasNext: !!parallelBlock.next,
            blockType: parallelBlock.type,
            processor: parallelBlock.processor,
            totalBranchesConverted: block.parallel!.length,
            totalBranchesExpected: parallelEdges.length
          })
        } else {
          logger.warn('[NodeConverter] Failed to convert parallel branch', {
            nodeId: node.id,
            parallelIndex: index,
            parallelTarget: edge.target
          })
        }
      }
    })

    // КРИТИЧЕСКИ ВАЖНО: Для parallel блоков обрабатываем next ПОСЛЕ всех parallel веток
    // Next может использоваться для общего продолжения после всех веток
    // Архитектура: parallel - массив веток (каждая ветка может иметь свою цепочку), next - общий выход после всех веток
    logger.debug('[NodeConverter] Parallel branches processing completed', {
      nodeId: node.id,
      totalBranches: block.parallel!.length,
      expectedBranches: parallelEdges.length,
      allEdges: nodeEdges.map(e => ({ sourceHandle: e.sourceHandle, target: e.target }))
    })
    
    const nextEdge = nodeEdges.find(e => {
      if (!e.sourceHandle) return false
      // Исключаем parallel edges, ищем только next или output
      if (e.sourceHandle.startsWith('parallel-')) return false
      if (e.sourceHandle === 'next' || e.sourceHandle === 'output') return true
      return false
    })
    
    if (nextEdge && nextEdge.target !== node.id) {
      const nextBlock = convertNodeToBlock(nextEdge.target, currentPath)
      if (nextBlock) {
        block.next = nextBlock
        logger.debug('[NodeConverter] Parallel next block converted', {
          nodeId: node.id,
          nextTarget: nextEdge.target,
          nextSourceHandle: nextEdge.sourceHandle,
          nextBlockType: nextBlock.type,
          nextBlockProcessor: nextBlock.processor,
          hasNext: !!nextBlock.next,
          totalBranches: block.parallel!.length
        })
      } else {
        logger.warn('[NodeConverter] Failed to convert parallel next block', {
          nodeId: node.id,
          nextTarget: nextEdge.target
        })
      }
    } else if (nextEdge && nextEdge.target === node.id) {
      logger.warn('[NodeConverter] Parallel next edge points to itself, skipping', {
        nodeId: node.id,
        nextTarget: nextEdge.target
      })
    }

    return block
  }

  private static convertCommandCallNode(node: FlowNode): JsonBlock | null {
    return {
      type: 'command_call',
      command: node.data.command || '',
      parameters: node.data.parameters || {}
    }
  }

  private static convertEventEmitterNode(node: FlowNode): JsonBlock | null {
    return {
      type: 'processor',
      processor: 'event_emitter',
      action: 'emit',
      parameters: {
        eventType: node.data.eventType || '',
        eventData: node.data.eventData || {}
      }
    }
  }

  private static convertProcessorBlock(
    block: JsonBlock,
    nodeId: string,
    position: { x: number; y: number }
  ): FlowNode {
    return {
      id: nodeId,
      type: 'processor',
      position,
      data: {
        label: block._label || block.processor || 'Processor',
        nodeType: 'processor',
        processor: block.processor || '',
        action: block.action || 'execute',
        parameters: block.parameters || {},
        enabled: block._enabled !== false
      }
    }
  }

  private static convertIfBlock(
    block: JsonBlock,
    nodeId: string,
    position: { x: number; y: number }
  ): FlowNode {
    return {
      id: nodeId,
      type: 'if',
      position,
      data: {
        label: block._label || 'If',
        nodeType: 'if',
        condition: ConditionConverter.convertFromJson(block.condition),
        enabled: block._enabled !== false
      }
    }
  }

  private static convertSwitchBlock(
    block: JsonBlock,
    nodeId: string,
    position: { x: number; y: number }
  ): FlowNode {
    return {
      id: nodeId,
      type: 'switch',
      position,
      data: {
        label: block._label || 'Switch',
        nodeType: 'switch',
        cases: block.cases || {},
        default: !!block.default,
        enabled: block._enabled !== false
      }
    }
  }

  private static convertParallelBlock(
    block: JsonBlock,
    nodeId: string,
    position: { x: number; y: number }
  ): FlowNode {
    return {
      id: nodeId,
      type: 'parallel',
      position,
      data: {
        label: block._label || 'Parallel',
        nodeType: 'parallel',
        enabled: block._enabled !== false
      }
    }
  }

  private static convertCommandCallBlock(
    block: JsonBlock,
    nodeId: string,
    position: { x: number; y: number }
  ): FlowNode {
    return {
      id: nodeId,
      type: 'command-call',
      position,
      data: {
        label: block._label || 'Command Call',
        nodeType: 'command-call',
        command: block.command || '',
        parameters: block.parameters || {},
        enabled: block._enabled !== false
      }
    }
  }

  private static findNextEdge(edges: FlowEdge[], nodeType: string): FlowEdge | undefined {
    const isBranchingBlock = ['if', 'switch', 'parallel', 'condition'].includes(nodeType)
    
    return edges.find(e => {
      if (!e.sourceHandle) return true
      if (e.sourceHandle === 'output' || e.sourceHandle === 'next') return true
      
      if (isBranchingBlock) {
        return false // Исключаем условные выходы
      }
      
      return e.sourceHandle !== 'ifTrue' && 
             e.sourceHandle !== 'ifFalse' && 
             !e.sourceHandle.startsWith('case-') && 
             e.sourceHandle !== 'default' &&
             !e.sourceHandle.startsWith('parallel-')
    })
  }

  private static addMetadata(block: JsonBlock, node: FlowNode): void {
    block._id = node.id
    block._x = node.position.x - this.CANVAS_CENTER_X
    block._y = node.position.y - this.CANVAS_CENTER_Y
    if (node.data.label) {
      block._label = node.data.label
    }
    if (node.data.enabled !== undefined) {
      block._enabled = node.data.enabled
    }
  }
}

