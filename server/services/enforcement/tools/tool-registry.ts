import type {
  EnforcementStage,
  EngineType,
  AgentToolType,
} from '../../../../shared/types/enforcement-workflow';
import type { AgentTool } from './agent-tool';
import { getEngineTools } from './engine-tools';
import { getAgentTools } from './ab-agent-tools';
import type { IStorage } from '../../../storage';

interface StageToolConfig {
  engines: EngineType[];
  agents: AgentToolType[];
}

/**
 * Progressive depth: earlier stages use fewer engines/agents,
 * later stages unlock the full toolset for deeper analysis.
 */
const STAGE_TOOL_MAP: Record<string, StageToolConfig> = {
  finding: {
    engines: ['rule_engine', 'statistical'],
    agents: ['a1_analysis', 'b3_history'],
  },
  warning_issued: {
    engines: ['rule_engine', 'statistical', 'unsupervised'],
    agents: ['a1_analysis', 'a2_categorization', 'b1_regulatory', 'b3_history'],
  },
  corrective_action: {
    engines: ['rule_engine', 'statistical', 'unsupervised'],
    agents: ['a1_analysis', 'a3_action', 'b1_regulatory', 'b2_medical'],
  },
  penalty_proposed: {
    engines: ['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'],
    agents: [
      'a1_analysis',
      'a2_categorization',
      'a3_action',
      'b1_regulatory',
      'b2_medical',
      'b3_history',
    ],
  },
  penalty_applied: {
    engines: ['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'],
    agents: [
      'a1_analysis',
      'a2_categorization',
      'a3_action',
      'b1_regulatory',
      'b2_medical',
      'b3_history',
    ],
  },
  appeal_submitted: {
    engines: ['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'],
    agents: ['a1_analysis', 'a2_categorization', 'b1_regulatory', 'b2_medical', 'b3_history'],
  },
  appeal_review: {
    engines: ['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'],
    agents: ['a1_analysis', 'a2_categorization', 'b1_regulatory', 'b2_medical', 'b3_history'],
  },
  resolved: {
    engines: ['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'],
    agents: [
      'a1_analysis',
      'a2_categorization',
      'a3_action',
      'b1_regulatory',
      'b2_medical',
      'b3_history',
    ],
  },
};

export function getToolsForStage(stage: EnforcementStage, storage: IStorage): AgentTool[] {
  const config = STAGE_TOOL_MAP[stage];
  if (!config) return [];
  return [...getEngineTools(config.engines, storage), ...getAgentTools(config.agents, storage)];
}

export function getToolConfigForStage(
  stage: EnforcementStage,
): StageToolConfig | undefined {
  return STAGE_TOOL_MAP[stage];
}
