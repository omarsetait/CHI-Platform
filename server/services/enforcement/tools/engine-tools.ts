import type { EngineType } from '../../../../shared/types/enforcement-workflow';
import type { AgentTool } from './agent-tool';
import { createAgentTool } from './agent-tool';
import type { IStorage } from '../../../storage';

const CLAIM_PARAMS = {
  type: 'object',
  properties: {
    claimId: { type: 'string', description: 'The claim ID to analyze' },
  },
  required: ['claimId'],
};

function createRuleEngineTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'rule_engine',
    description:
      'Retrieve rule-based detection results for a claim. Returns pattern matches, violation counts, and matched rule details from pre-computed analysis.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string }) => {
      const result = await storage.getDetectionResultsByClaimId(params.claimId);
      if (!result) {
        return { engine: 'rule_engine' as const, score: 0, findings: null, note: 'No detection results found' };
      }
      return {
        engine: 'rule_engine' as const,
        score: Number(result.ruleEngineScore) || 0,
        findings: result.ruleEngineFindings,
      };
    },
  });
}

function createStatisticalTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'statistical',
    description:
      'Retrieve statistical anomaly detection results for a claim. Returns deviation scores and peer comparisons from pre-computed analysis.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string }) => {
      const result = await storage.getDetectionResultsByClaimId(params.claimId);
      if (!result) {
        return { engine: 'statistical' as const, score: 0, findings: null, note: 'No detection results found' };
      }
      return {
        engine: 'statistical' as const,
        score: Number(result.statisticalScore) || 0,
        findings: result.statisticalFindings,
      };
    },
  });
}

function createUnsupervisedTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'unsupervised',
    description:
      'Retrieve unsupervised anomaly detection results for a claim. Returns anomaly scores, cluster assignments from pre-computed analysis.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string }) => {
      const result = await storage.getDetectionResultsByClaimId(params.claimId);
      if (!result) {
        return { engine: 'unsupervised' as const, score: 0, findings: null, note: 'No detection results found' };
      }
      return {
        engine: 'unsupervised' as const,
        score: Number(result.unsupervisedScore) || 0,
        findings: result.unsupervisedFindings,
      };
    },
  });
}

function createRagLlmTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'rag_llm',
    description:
      'Retrieve RAG/LLM analysis results for a claim. Returns contextual analysis and similar cases from pre-computed analysis.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string }) => {
      const result = await storage.getDetectionResultsByClaimId(params.claimId);
      if (!result) {
        return { engine: 'rag_llm' as const, score: 0, findings: null, note: 'No detection results found' };
      }
      return {
        engine: 'rag_llm' as const,
        score: Number(result.ragLlmScore) || 0,
        findings: result.ragLlmFindings,
      };
    },
  });
}

function createSemanticTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'semantic',
    description:
      'Retrieve semantic validation results for a claim. Returns ICD-10/CPT matching scores extracted from composite analysis.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string }) => {
      const result = await storage.getDetectionResultsByClaimId(params.claimId);
      if (!result) {
        return { engine: 'semantic' as const, score: 0, findings: null, note: 'No detection results found' };
      }
      return {
        engine: 'semantic' as const,
        score: Number(result.compositeScore) || 0,
        findings: { detectionSummary: result.detectionSummary, recommendedAction: result.recommendedAction },
      };
    },
  });
}

const ENGINE_TOOL_MAP: Record<EngineType, (storage: IStorage) => AgentTool> = {
  rule_engine: createRuleEngineTool,
  statistical: createStatisticalTool,
  unsupervised: createUnsupervisedTool,
  rag_llm: createRagLlmTool,
  semantic: createSemanticTool,
};

export function getEngineTools(engineTypes: EngineType[], storage: IStorage): AgentTool[] {
  return engineTypes.map((type) => ENGINE_TOOL_MAP[type](storage));
}
