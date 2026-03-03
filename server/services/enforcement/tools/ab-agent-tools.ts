import type { AgentToolType } from '../../../../shared/types/enforcement-workflow';
import type { AgentTool } from './agent-tool';
import { createAgentTool } from './agent-tool';
import type { IStorage } from '../../../storage';

const CASE_PARAMS = {
  type: 'object',
  properties: {
    caseId: { type: 'string', description: 'The FWA case ID' },
    context: { type: 'string', description: 'Additional context for analysis' },
  },
  required: ['caseId'],
};

function createA1AnalysisTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'a1_analysis',
    description:
      'Run root cause analysis on flagged claims, providers, and denial patterns. Returns pattern findings, correlations, trends, and anomalies.',
    parameters: CASE_PARAMS,
    execute: async (params: { caseId: string; context?: string }) => {
      const findings = await storage.getFwaAnalysisFindingsByCaseId(params.caseId);
      return {
        agent: 'a1_analysis',
        findingTypes: ['pattern', 'correlation', 'trend', 'anomaly'],
        findings,
        confidence: findings.length > 0 ? 0.8 : 0.1,
      };
    },
  });
}

function createA2CategorizationTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'a2_categorization',
    description:
      'Categorize FWA findings: coding fraud, management fraud, physician fraud, patient fraud. Returns category and confidence.',
    parameters: CASE_PARAMS,
    execute: async (params: { caseId: string; context?: string }) => {
      const [categories, behaviors] = await Promise.all([
        storage.getFwaCategoriesByCaseId(params.caseId),
        storage.getFwaBehaviors(),
      ]);
      return {
        agent: 'a2_categorization',
        categoryTypes: ['coding', 'management', 'physician', 'patient'],
        categories,
        behaviors,
        confidence: categories.length > 0 ? 0.75 : 0.1,
      };
    },
  });
}

function createA3ActionTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'a3_action',
    description:
      'Plan and monitor enforcement actions -- preventive and recovery actions for live and historical claims.',
    parameters: CASE_PARAMS,
    execute: async (params: { caseId: string; context?: string }) => {
      const actions = await storage.getFwaActionsByCaseId(params.caseId);
      return {
        agent: 'a3_action',
        actionTypes: ['preventive', 'recovery'],
        actions,
        confidence: actions.length > 0 ? 0.7 : 0.1,
      };
    },
  });
}

function createB1RegulatoryTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'b1_regulatory',
    description:
      'Query regulatory knowledge base (NPHIES, CCHI, MOH) for applicable regulations and penalty precedents.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Regulatory query or violation description' },
        sources: {
          type: 'array',
          items: { type: 'string', enum: ['NPHIES', 'CCHI', 'MOH'] },
        },
      },
      required: ['query'],
    },
    execute: async (params: { query: string; sources?: string[] }) => {
      const docs = await storage.getFwaRegulatoryDocs();
      const filtered = params.sources
        ? docs.filter((d: any) => params.sources!.includes(d.source))
        : docs;
      const matched = filtered.filter(
        (d: any) =>
          (d.title && d.title.toLowerCase().includes(params.query.toLowerCase())) ||
          (d.content && d.content.toLowerCase().includes(params.query.toLowerCase()))
      );
      return {
        agent: 'b1_regulatory',
        citations: matched.length > 0 ? matched.slice(0, 10) : filtered.slice(0, 5),
        confidence: matched.length > 0 ? 0.8 : 0.3,
      };
    },
  });
}

function createB2MedicalTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'b2_medical',
    description:
      'Query medical knowledge base for clinical pathway validation and medical necessity guidelines.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Medical/clinical query' },
        icdCodes: { type: 'array', items: { type: 'string' } },
        cptCodes: { type: 'array', items: { type: 'string' } },
      },
      required: ['query'],
    },
    execute: async (params: { query: string; icdCodes?: string[]; cptCodes?: string[] }) => {
      const guidelines = await storage.getFwaMedicalGuidelines();
      const matched = guidelines.filter(
        (g: any) =>
          (g.title && g.title.toLowerCase().includes(params.query.toLowerCase())) ||
          (g.content && g.content.toLowerCase().includes(params.query.toLowerCase()))
      );
      return {
        agent: 'b2_medical',
        clinicalAnalysis: matched.length > 0 ? matched.slice(0, 10) : guidelines.slice(0, 5),
        confidence: matched.length > 0 ? 0.75 : 0.2,
      };
    },
  });
}

function createB3HistoryTool(storage: IStorage): AgentTool {
  return createAgentTool({
    name: 'b3_history',
    description:
      'Analyze patient/provider history -- prior claims, billing trends, complaint history. Returns 360 view and behavioral patterns.',
    parameters: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Provider or patient ID' },
        entityType: { type: 'string', enum: ['provider', 'patient', 'doctor'] },
        lookbackMonths: { type: 'number', description: 'Months of history' },
      },
      required: ['entityId', 'entityType'],
    },
    execute: async (params: {
      entityId: string;
      entityType: string;
      lookbackMonths?: number;
    }) => {
      let entityData: any = null;
      if (params.entityType === 'provider') {
        entityData = await storage.getProvider360(params.entityId);
      } else if (params.entityType === 'patient') {
        entityData = await storage.getPatient360(params.entityId);
      } else if (params.entityType === 'doctor') {
        entityData = await storage.getDoctor360(params.entityId);
      }
      return {
        agent: 'b3_history',
        entityType: params.entityType,
        entity360: entityData || { note: `No ${params.entityType} data found for ${params.entityId}` },
        confidence: entityData ? 0.85 : 0.1,
      };
    },
  });
}

const AGENT_TOOL_MAP: Record<AgentToolType, (storage: IStorage) => AgentTool> = {
  a1_analysis: createA1AnalysisTool,
  a2_categorization: createA2CategorizationTool,
  a3_action: createA3ActionTool,
  b1_regulatory: createB1RegulatoryTool,
  b2_medical: createB2MedicalTool,
  b3_history: createB3HistoryTool,
};

export function getAgentTools(agentTypes: AgentToolType[], storage: IStorage): AgentTool[] {
  return agentTypes.map((type) => AGENT_TOOL_MAP[type](storage));
}
