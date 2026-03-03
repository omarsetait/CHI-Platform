import type { ToolDefinition } from '../../llm/llm-provider';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute(params: any): Promise<any>;
  toToolDefinition(): ToolDefinition;
}

export function createAgentTool(config: {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}): AgentTool {
  return {
    ...config,
    toToolDefinition(): ToolDefinition {
      return {
        type: 'function',
        function: {
          name: config.name,
          description: config.description,
          parameters: config.parameters,
        },
      };
    },
  };
}
