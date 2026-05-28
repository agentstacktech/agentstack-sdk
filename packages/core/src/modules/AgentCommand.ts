/**
 * AgentCommand - Client Commands Execution
 * Модуль для выполнения клиентских команд через Rules Engine
 * Philosophy: v0.2.1: 8DNA Architecture + Commands in Rules Engine
 */

import { HTTPClient } from '../client/http-client';

export interface CommandRequest {
  command: string;  // Format: category.action (e.g., "check.daily_reward")
  data?: Record<string, any>;  // Command parameters/data
}

export interface CommandResponse {
  success: boolean;
  command: string;
  handlers_matched: number;
  results: Array<{
    rule_id: string;
    rule_name: string;
    trigger: string;
    match_type: 'exact' | 'wildcard';
    actions_executed: number;
    results: Array<{
      success: boolean;
      result?: any;
      error?: string;
    }>;
    success?: boolean;
    error?: string;
  }>;
  timestamp: string;
  error?: string;
}

export class AgentCommand {
  private httpClient: HTTPClient;

  constructor(httpClient: HTTPClient) {
    this.httpClient = httpClient;
  }

  /**
   * Execute a client command
   * 
   * Commands are processed through Rules Engine command handlers.
   * Supports wildcard triggers (e.g., "action.*").
   * 
   * @param command Command string in format category.action (e.g., "check.daily_reward")
   * @param data Command parameters/data
   * @returns Command execution results
   * 
   * @example
   * ```typescript
   * const result = await sdk.command.executeCommand('check.daily_reward', {
   *   user_id: 123,
   *   today: '2025-01-20'
   * });
   * ```
   */
  async executeCommand(
    command: string,
    data: Record<string, any> = {}
  ): Promise<CommandResponse> {
    try {
      const response = await this.httpClient.post<CommandResponse>('/command', {
        command,
        data
      });

      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to execute command ${command}: ${error.message || error}`
      );
    }
  }

  /**
   * Execute multiple commands in batch
   * Executes commands sequentially to maintain order and proper error handling.
   * 
   * @param commands Array of command requests
   * @returns Array of command execution results
   */
  async executeBatch(
    commands: CommandRequest[]
  ): Promise<CommandResponse[]> {
    const results: CommandResponse[] = [];
    
    for (const cmd of commands) {
      try {
        const result = await this.executeCommand(cmd.command, cmd.data || {});
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          command: cmd.command,
          handlers_matched: 0,
          results: [],
          timestamp: new Date().toISOString(),
          error: error.message || String(error)
        });
      }
    }
    
    return results;
  }
}

