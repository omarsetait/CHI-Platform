# FWA Agentic Enforcement Workflow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an agentic enforcement workflow where 7 LLM-orchestrated stage agents use the 5 detection engines + A/B agent tools to autonomously process FWA cases through an 8-stage enforcement pipeline, with HITL gates at penalty and appeal stages.

**Architecture:** Stage-specific LLM agents connected by a deterministic state-machine router. Each agent has progressive engine depth access (fast engines early, all engines at penalty+). Existing A1-A3/B1-B3 agents become callable tools. An LLM-agnostic abstraction supports multiple providers.

**Tech Stack:** TypeScript, Drizzle ORM (PostgreSQL), Express, React, OpenAI SDK (via LLM abstraction), Vitest (unit tests), Playwright (e2e tests)

**Design doc:** `docs/plans/2026-03-03-fwa-agentic-enforcement-workflow-design.md`

---

## Phase 1: Core Types & LLM Abstraction Layer

### Task 1: Define Enforcement Workflow Types

**Files:**
- Create: `shared/types/enforcement-workflow.ts`

**Step 1: Write the type definitions**

```typescript
// shared/types/enforcement-workflow.ts

// Enforcement stages matching existing enforcementCaseStatusEnum in shared/schema.ts:2171
export type EnforcementStage =
  | 'finding'
  | 'warning_issued'
  | 'corrective_action'
  | 'penalty_proposed'
  | 'penalty_applied'
  | 'appeal_submitted'
  | 'appeal_review'
  | 'resolved'
  | 'closed';

// Agent decisions that drive the router
export type StageDecision =
  | 'advance'      // move to next stage
  | 'loop_back'    // return to previous stage
  | 'escalate'     // skip stages (e.g., finding → penalty)
  | 'dismiss'      // close case (insufficient evidence)
  | 'resolve'      // jump to resolution
  | 'hold'         // stay in current stage
  | 'extend'       // grant more time in current stage
  | 'reduce'       // re-calculate (penalty context)
  | 'uphold'       // appeal: penalty stands
  | 'overturn'     // appeal: penalty reversed
  | 'modify'       // appeal: adjust penalty
  | 'remand';      // appeal: send back for investigation

export type EngineType =
  | 'rule_engine'
  | 'statistical'
  | 'unsupervised'
  | 'rag_llm'
  | 'semantic';

export type AgentToolType =
  | 'a1_analysis'
  | 'a2_categorization'
  | 'a3_action'
  | 'b1_regulatory'
  | 'b2_medical'
  | 'b3_history';

// Engine result from any of the 5 engines
export interface EngineResult {
  engine: EngineType;
  score: number;
  findings: any;
  executedAt: Date;
  processingTimeMs: number;
}

// Finding from A/B agent tools
export interface AgentFinding {
  agent: AgentToolType;
  finding: any;
  confidence: number;
  executedAt: Date;
}

// Regulatory reference for citations
export interface RegulatoryReference {
  code: string;
  description: string;
  source: 'NPHIES' | 'CCHI' | 'MOH';
  relevance: string;
}

// Record of a stage transition
export interface StageTransition {
  fromStage: EnforcementStage;
  toStage: EnforcementStage;
  decision: StageDecision;
  agentId: string;
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

// Human review record for HITL gates
export interface HumanReviewRecord {
  stage: EnforcementStage;
  reviewerId: string;
  reviewerName: string;
  decision: 'approved' | 'rejected' | 'modify';
  notes: string;
  timestamp: Date;
}

// Per-stage agent decision record
export interface StageDecisionRecord {
  agentId: string;
  stage: EnforcementStage;
  reasoning: string;
  decision: StageDecision;
  confidence: number;
  toolsInvoked: string[];
  timestamp: Date;
  targetStage?: EnforcementStage; // for loop_back, escalate, remand
}

// The Case Dossier — shared state flowing through the pipeline
export interface CaseDossier {
  caseId: string;
  enforcementCaseId: string;
  claimIds: string[];
  entities: {
    providerId?: string;
    patientId?: string;
    doctorId?: string;
  };
  currentStage: EnforcementStage;
  stageHistory: StageTransition[];
  evidence: {
    engineResults: Partial<Record<EngineType, EngineResult>>;
    agentFindings: Partial<Record<AgentToolType, AgentFinding>>;
  };
  stageDecisions: Partial<Record<EnforcementStage, StageDecisionRecord>>;
  financialImpact: {
    estimatedLoss: number;
    recoveryAmount: number;
    penaltyAmount?: number;
  };
  regulatoryCitations: RegulatoryReference[];
  violationCodes: string[];
  humanReviews: HumanReviewRecord[];
  createdAt: Date;
  updatedAt: Date;
}

// Enforcement Decision Package — final output
export interface EnforcementDecisionPackage {
  caseId: string;
  outcome: 'penalty_applied' | 'penalty_overturned' | 'corrected' | 'dismissed';
  executiveSummary: string;
  engineEvidence: Partial<Record<EngineType, EngineResult>>;
  regulatoryCitations: RegulatoryReference[];
  financialSummary: {
    totalClaimsAnalyzed: number;
    estimatedFraudAmount: number;
    recoveryRecommendation: number;
    penaltyAmount?: number;
  };
  agentDecisionLog: StageDecisionRecord[];
  humanApprovals: HumanReviewRecord[];
  closedAt: Date;
}
```

**Step 2: Export from shared index**

Add the export to the shared barrel file or verify it's importable.

**Step 3: Commit**

```bash
git add shared/types/enforcement-workflow.ts
git commit -m "feat(fwa): add enforcement workflow type definitions"
```

---

### Task 2: Build LLM Provider Abstraction

**Files:**
- Create: `server/services/llm/llm-provider.ts`
- Create: `server/services/llm/openai-provider.ts`
- Create: `server/services/llm/index.ts`

**Step 1: Write failing test**

Create: `server/services/llm/__tests__/llm-provider.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../openai-provider';
import type { LLMProvider, ChatMessage, ToolDefinition, LLMResponse } from '../llm-provider';

describe('LLMProvider interface', () => {
  it('OpenAIProvider implements LLMProvider', () => {
    const provider = new OpenAIProvider({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    });
    expect(provider).toBeDefined();
    expect(typeof provider.chat).toBe('function');
  });
});

describe('OpenAIProvider', () => {
  it('constructs with config', () => {
    const provider = new OpenAIProvider({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      baseUrl: 'https://custom.api.com/v1',
    });
    expect(provider.model).toBe('gpt-4o');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/llm/__tests__/llm-provider.test.ts`
Expected: FAIL — modules don't exist yet

**Step 3: Write LLM provider interface**

```typescript
// server/services/llm/llm-provider.ts

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>; // JSON Schema
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface ChatParams {
  systemPrompt: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  readonly model: string;
  chat(params: ChatParams): Promise<LLMResponse>;
}

export interface ProviderConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'local';
  model: string;
  apiKey: string;
  baseUrl?: string;
}
```

**Step 4: Write OpenAI provider implementation**

```typescript
// server/services/llm/openai-provider.ts

import OpenAI from 'openai';
import type {
  LLMProvider,
  ChatParams,
  LLMResponse,
  ProviderConfig,
  ChatMessage,
} from './llm-provider';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  readonly model: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(params: ChatParams): Promise<LLMResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages.map((m) => this.toOpenAIMessage(m)),
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: params.tools?.map((t) => ({
        type: 'function' as const,
        function: t.function,
      })),
      temperature: params.temperature ?? 0.1,
      max_tokens: params.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      finishReason:
        choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
    };
  }

  private toOpenAIMessage(
    msg: ChatMessage
  ): OpenAI.Chat.ChatCompletionMessageParam {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId!,
      };
    }
    if (msg.role === 'assistant' && msg.toolCalls) {
      return {
        role: 'assistant',
        content: msg.content,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: tc.function,
        })),
      };
    }
    return { role: msg.role, content: msg.content };
  }
}
```

**Step 5: Write barrel export**

```typescript
// server/services/llm/index.ts
export type {
  LLMProvider,
  ChatParams,
  ChatMessage,
  LLMResponse,
  ToolCall,
  ToolDefinition,
  ProviderConfig,
} from './llm-provider';
export { OpenAIProvider } from './openai-provider';
```

**Step 6: Run test to verify it passes**

Run: `npx vitest run server/services/llm/__tests__/llm-provider.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add server/services/llm/
git commit -m "feat(fwa): add LLM-agnostic provider abstraction with OpenAI implementation"
```

---

### Task 3: Create LLM Provider Factory

**Files:**
- Create: `server/services/llm/provider-factory.ts`
- Modify: `server/services/llm/index.ts`

**Step 1: Write failing test**

Create: `server/services/llm/__tests__/provider-factory.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createLLMProvider, getDefaultProvider } from '../provider-factory';
import { OpenAIProvider } from '../openai-provider';

describe('createLLMProvider', () => {
  it('creates OpenAI provider', () => {
    const provider = createLLMProvider({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('throws for unsupported provider', () => {
    expect(() =>
      createLLMProvider({
        provider: 'unsupported' as any,
        model: 'test',
        apiKey: 'test',
      })
    ).toThrow('Unsupported LLM provider: unsupported');
  });
});

describe('getDefaultProvider', () => {
  it('returns a provider using env vars', () => {
    const provider = getDefaultProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.chat).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/llm/__tests__/provider-factory.test.ts`
Expected: FAIL

**Step 3: Write factory implementation**

```typescript
// server/services/llm/provider-factory.ts

import type { LLMProvider, ProviderConfig } from './llm-provider';
import { OpenAIProvider } from './openai-provider';

export function createLLMProvider(config: ProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
    case 'azure':
      return new OpenAIProvider(config);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

export function getDefaultProvider(): LLMProvider {
  return createLLMProvider({
    provider: 'openai',
    model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || 'gpt-4o',
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || '',
    baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}
```

**Step 4: Update barrel export**

Add to `server/services/llm/index.ts`:
```typescript
export { createLLMProvider, getDefaultProvider } from './provider-factory';
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run server/services/llm/__tests__/provider-factory.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add server/services/llm/
git commit -m "feat(fwa): add LLM provider factory with env-based default"
```

---

## Phase 2: Agent Tool Wrappers

### Task 4: Create Agent Tool Interface & Engine Tool Wrappers

**Files:**
- Create: `server/services/enforcement/tools/agent-tool.ts`
- Create: `server/services/enforcement/tools/engine-tools.ts`

**Step 1: Write failing test**

Create: `server/services/enforcement/tools/__tests__/engine-tools.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getEngineTools } from '../engine-tools';
import type { AgentTool } from '../agent-tool';

describe('getEngineTools', () => {
  it('returns tools for specified engine types', () => {
    const tools = getEngineTools(['rule_engine', 'statistical']);
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('rule_engine');
    expect(tools[1].name).toBe('statistical');
  });

  it('returns all 5 engine tools when all types specified', () => {
    const tools = getEngineTools([
      'rule_engine',
      'statistical',
      'unsupervised',
      'rag_llm',
      'semantic',
    ]);
    expect(tools).toHaveLength(5);
  });

  it('each tool has required properties', () => {
    const tools = getEngineTools(['rule_engine']);
    const tool = tools[0];
    expect(tool.name).toBe('rule_engine');
    expect(tool.description).toBeTruthy();
    expect(tool.parameters).toBeDefined();
    expect(typeof tool.execute).toBe('function');
  });

  it('converts to LLM tool definition format', () => {
    const tools = getEngineTools(['rule_engine']);
    const def = tools[0].toToolDefinition();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('rule_engine');
    expect(def.function.description).toBeTruthy();
    expect(def.function.parameters).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/enforcement/tools/__tests__/engine-tools.test.ts`
Expected: FAIL

**Step 3: Write AgentTool interface**

```typescript
// server/services/enforcement/tools/agent-tool.ts

import type { ToolDefinition } from '../../llm/llm-provider';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
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
```

**Step 4: Write engine tool wrappers**

```typescript
// server/services/enforcement/tools/engine-tools.ts

import type { EngineType } from '../../../../shared/types/enforcement-workflow';
import type { AgentTool } from './agent-tool';
import { createAgentTool } from './agent-tool';
import {
  runRuleEngineDetection,
  runStatisticalDetection,
  runUnsupervisedDetection,
  runRagLlmDetection,
  runSemanticValidation,
} from '../../fwa-detection-engine';

const CLAIM_PARAMS = {
  type: 'object',
  properties: {
    claimId: { type: 'string', description: 'The claim ID to analyze' },
  },
  required: ['claimId'],
};

function createRuleEngineTool(): AgentTool {
  return createAgentTool({
    name: 'rule_engine',
    description:
      'Run rule-based detection against 102+ FWA rules across 18 categories. Fast. Returns pattern matches, violation counts, and matched rule details. Use for initial triage and clear policy violations.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string; claimData?: any }) => {
      const start = Date.now();
      const result = await runRuleEngineDetection(params.claimData);
      return {
        engine: 'rule_engine',
        score: result.score,
        findings: result.findings,
        processingTimeMs: Date.now() - start,
      };
    },
  });
}

function createStatisticalTool(): AgentTool {
  return createAgentTool({
    name: 'statistical',
    description:
      'Run statistical anomaly detection using population-based z-score analysis with 62 features. Returns deviation scores, peer comparisons, and feature importance. Use for identifying outlier billing patterns.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string; claimData?: any }) => {
      const start = Date.now();
      const result = await runStatisticalDetection(params.claimData);
      return {
        engine: 'statistical',
        score: result.score,
        findings: result.findings,
        processingTimeMs: Date.now() - start,
      };
    },
  });
}

function createUnsupervisedTool(): AgentTool {
  return createAgentTool({
    name: 'unsupervised',
    description:
      'Run unsupervised anomaly detection using Isolation Forest, LOF, DBSCAN, Autoencoder, and Deep Learning. Returns anomaly scores, cluster assignments, and isolation scores. Use for detecting novel fraud patterns.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string; claimData?: any }) => {
      const start = Date.now();
      const result = await runUnsupervisedDetection(params.claimData);
      return {
        engine: 'unsupervised',
        score: result.score,
        findings: result.findings,
        processingTimeMs: Date.now() - start,
      };
    },
  });
}

function createRagLlmTool(): AgentTool {
  return createAgentTool({
    name: 'rag_llm',
    description:
      'Run RAG/LLM analysis using retrieval-augmented generation over regulatory and clinical knowledge bases. Returns contextual analysis, similar cases, and knowledge base matches. Use for complex cases requiring regulatory context.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string; claimData?: any }) => {
      const start = Date.now();
      const result = await runRagLlmDetection(params.claimData);
      return {
        engine: 'rag_llm',
        score: result.score,
        findings: result.findings,
        processingTimeMs: Date.now() - start,
      };
    },
  });
}

function createSemanticTool(): AgentTool {
  return createAgentTool({
    name: 'semantic',
    description:
      'Run semantic validation of ICD-10/CPT procedure-diagnosis matching using vector embeddings. Returns similarity scores and mismatch details. Use for validating clinical coding accuracy.',
    parameters: CLAIM_PARAMS,
    execute: async (params: { claimId: string; claimData?: any }) => {
      const start = Date.now();
      const result = await runSemanticValidation(params.claimData);
      return {
        engine: 'semantic',
        score: result.score,
        findings: result.findings,
        processingTimeMs: Date.now() - start,
      };
    },
  });
}

const ENGINE_TOOL_MAP: Record<EngineType, () => AgentTool> = {
  rule_engine: createRuleEngineTool,
  statistical: createStatisticalTool,
  unsupervised: createUnsupervisedTool,
  rag_llm: createRagLlmTool,
  semantic: createSemanticTool,
};

export function getEngineTools(engineTypes: EngineType[]): AgentTool[] {
  return engineTypes.map((type) => ENGINE_TOOL_MAP[type]());
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run server/services/enforcement/tools/__tests__/engine-tools.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add server/services/enforcement/
git commit -m "feat(fwa): add agent tool interface and 5 engine tool wrappers"
```

---

### Task 5: Create A-Phase and B-Phase Agent Tool Wrappers

**Files:**
- Create: `server/services/enforcement/tools/ab-agent-tools.ts`

**Step 1: Write failing test**

Create: `server/services/enforcement/tools/__tests__/ab-agent-tools.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getAgentTools } from '../ab-agent-tools';

describe('getAgentTools', () => {
  it('returns tools for specified agent types', () => {
    const tools = getAgentTools(['a1_analysis', 'b1_regulatory']);
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('a1_analysis');
    expect(tools[1].name).toBe('b1_regulatory');
  });

  it('returns all 6 agent tools', () => {
    const tools = getAgentTools([
      'a1_analysis', 'a2_categorization', 'a3_action',
      'b1_regulatory', 'b2_medical', 'b3_history',
    ]);
    expect(tools).toHaveLength(6);
  });

  it('each tool converts to LLM tool definition', () => {
    const tools = getAgentTools(['a1_analysis']);
    const def = tools[0].toToolDefinition();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('a1_analysis');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/enforcement/tools/__tests__/ab-agent-tools.test.ts`
Expected: FAIL

**Step 3: Write A/B agent tool wrappers**

```typescript
// server/services/enforcement/tools/ab-agent-tools.ts

import type { AgentToolType } from '../../../../shared/types/enforcement-workflow';
import type { AgentTool } from './agent-tool';
import { createAgentTool } from './agent-tool';

const CASE_PARAMS = {
  type: 'object',
  properties: {
    caseId: { type: 'string', description: 'The FWA case ID' },
    context: { type: 'string', description: 'Additional context for the analysis' },
  },
  required: ['caseId'],
};

function createA1AnalysisTool(): AgentTool {
  return createAgentTool({
    name: 'a1_analysis',
    description:
      'Run root cause analysis on flagged claims, providers, and denial patterns. Returns pattern findings, correlations, trends, and anomalies. Use to understand WHY fraud indicators were triggered.',
    parameters: CASE_PARAMS,
    execute: async (params: { caseId: string; context?: string }) => {
      // Wraps existing A1 analysis logic from fwa-routes.ts case run-analysis endpoint
      return {
        agent: 'a1_analysis',
        findingTypes: ['pattern', 'correlation', 'trend', 'anomaly'],
        // Actual implementation calls storage.getFwaAnalysisFindings() or triggers analysis
        findings: [],
        confidence: 0,
      };
    },
  });
}

function createA2CategorizationTool(): AgentTool {
  return createAgentTool({
    name: 'a2_categorization',
    description:
      'Categorize FWA findings into specific fraud types: coding fraud, management fraud, physician fraud, patient fraud. Returns category, subcategory, and confidence. Use after A1 analysis to classify the type of FWA.',
    parameters: CASE_PARAMS,
    execute: async (params: { caseId: string; context?: string }) => {
      return {
        agent: 'a2_categorization',
        categoryTypes: ['coding', 'management', 'physician', 'patient'],
        categories: [],
        confidence: 0,
      };
    },
  });
}

function createA3ActionTool(): AgentTool {
  return createAgentTool({
    name: 'a3_action',
    description:
      'Plan and monitor enforcement actions — preventive measures and recovery actions for live and historical claims. Returns action plan with timelines. Use to define what interventions should be taken.',
    parameters: CASE_PARAMS,
    execute: async (params: { caseId: string; context?: string }) => {
      return {
        agent: 'a3_action',
        actionTypes: ['preventive', 'recovery'],
        actionTracks: ['live_claims', 'historical_claims'],
        actions: [],
        confidence: 0,
      };
    },
  });
}

function createB1RegulatoryTool(): AgentTool {
  return createAgentTool({
    name: 'b1_regulatory',
    description:
      'Query regulatory knowledge base (NPHIES, CCHI, MOH guidelines) for applicable regulations, violation definitions, and penalty precedents. Returns regulatory citations and compliance requirements. Use for evidence-based regulatory justification.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Regulatory query or violation description' },
        sources: {
          type: 'array',
          items: { type: 'string', enum: ['NPHIES', 'CCHI', 'MOH'] },
          description: 'Regulatory sources to search',
        },
      },
      required: ['query'],
    },
    execute: async (params: { query: string; sources?: string[] }) => {
      return {
        agent: 'b1_regulatory',
        citations: [],
        confidence: 0,
      };
    },
  });
}

function createB2MedicalTool(): AgentTool {
  return createAgentTool({
    name: 'b2_medical',
    description:
      'Query medical knowledge base for clinical pathway validation, medical necessity guidelines, and standard-of-care protocols. Returns clinical justification analysis. Use to validate whether services were medically appropriate.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Medical/clinical query' },
        icdCodes: { type: 'array', items: { type: 'string' }, description: 'ICD-10 codes to validate' },
        cptCodes: { type: 'array', items: { type: 'string' }, description: 'CPT codes to validate' },
      },
      required: ['query'],
    },
    execute: async (params: { query: string; icdCodes?: string[]; cptCodes?: string[] }) => {
      return {
        agent: 'b2_medical',
        clinicalAnalysis: [],
        confidence: 0,
      };
    },
  });
}

function createB3HistoryTool(): AgentTool {
  return createAgentTool({
    name: 'b3_history',
    description:
      'Analyze patient and provider history for patterns — prior claims, billing trends, complaint history, and entity relationships. Returns timeline analysis and behavioral patterns. Use to establish pattern of behavior.',
    parameters: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Provider or patient ID' },
        entityType: { type: 'string', enum: ['provider', 'patient', 'doctor'], description: 'Entity type' },
        lookbackMonths: { type: 'number', description: 'Months of history to analyze' },
      },
      required: ['entityId', 'entityType'],
    },
    execute: async (params: { entityId: string; entityType: string; lookbackMonths?: number }) => {
      return {
        agent: 'b3_history',
        patterns: [],
        timeline: [],
        confidence: 0,
      };
    },
  });
}

const AGENT_TOOL_MAP: Record<AgentToolType, () => AgentTool> = {
  a1_analysis: createA1AnalysisTool,
  a2_categorization: createA2CategorizationTool,
  a3_action: createA3ActionTool,
  b1_regulatory: createB1RegulatoryTool,
  b2_medical: createB2MedicalTool,
  b3_history: createB3HistoryTool,
};

export function getAgentTools(agentTypes: AgentToolType[]): AgentTool[] {
  return agentTypes.map((type) => AGENT_TOOL_MAP[type]());
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run server/services/enforcement/tools/__tests__/ab-agent-tools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/services/enforcement/tools/
git commit -m "feat(fwa): add A1-A3 and B1-B3 agent tool wrappers"
```

---

### Task 6: Create Tool Registry with Progressive Depth

**Files:**
- Create: `server/services/enforcement/tools/tool-registry.ts`

**Step 1: Write failing test**

Create: `server/services/enforcement/tools/__tests__/tool-registry.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getToolsForStage } from '../tool-registry';

describe('getToolsForStage', () => {
  it('finding stage gets Rules + Statistical + A1 + B3', () => {
    const tools = getToolsForStage('finding');
    const names = tools.map((t) => t.name);
    expect(names).toContain('rule_engine');
    expect(names).toContain('statistical');
    expect(names).toContain('a1_analysis');
    expect(names).toContain('b3_history');
    expect(names).not.toContain('rag_llm');
    expect(names).not.toContain('semantic');
  });

  it('warning stage adds Unsupervised + A2 + B1', () => {
    const tools = getToolsForStage('warning_issued');
    const names = tools.map((t) => t.name);
    expect(names).toContain('unsupervised');
    expect(names).toContain('a2_categorization');
    expect(names).toContain('b1_regulatory');
  });

  it('penalty_proposed stage has all 5 engines + all agents', () => {
    const tools = getToolsForStage('penalty_proposed');
    const names = tools.map((t) => t.name);
    expect(names).toContain('rule_engine');
    expect(names).toContain('statistical');
    expect(names).toContain('unsupervised');
    expect(names).toContain('rag_llm');
    expect(names).toContain('semantic');
    expect(names).toContain('a1_analysis');
    expect(names).toContain('a2_categorization');
    expect(names).toContain('a3_action');
    expect(names).toContain('b1_regulatory');
    expect(names).toContain('b2_medical');
    expect(names).toContain('b3_history');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/enforcement/tools/__tests__/tool-registry.test.ts`

**Step 3: Write tool registry**

```typescript
// server/services/enforcement/tools/tool-registry.ts

import type { EnforcementStage, EngineType, AgentToolType } from '../../../../shared/types/enforcement-workflow';
import type { AgentTool } from './agent-tool';
import { getEngineTools } from './engine-tools';
import { getAgentTools } from './ab-agent-tools';

interface StageToolConfig {
  engines: EngineType[];
  agents: AgentToolType[];
}

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
    agents: ['a1_analysis', 'a2_categorization', 'a3_action', 'b1_regulatory', 'b2_medical', 'b3_history'],
  },
  penalty_applied: {
    engines: ['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'],
    agents: ['a1_analysis', 'a2_categorization', 'a3_action', 'b1_regulatory', 'b2_medical', 'b3_history'],
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
    agents: ['a1_analysis', 'a2_categorization', 'a3_action', 'b1_regulatory', 'b2_medical', 'b3_history'],
  },
};

export function getToolsForStage(stage: EnforcementStage): AgentTool[] {
  const config = STAGE_TOOL_MAP[stage];
  if (!config) return [];
  return [...getEngineTools(config.engines), ...getAgentTools(config.agents)];
}

export function getToolConfigForStage(stage: EnforcementStage): StageToolConfig | undefined {
  return STAGE_TOOL_MAP[stage];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run server/services/enforcement/tools/__tests__/tool-registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/services/enforcement/tools/
git commit -m "feat(fwa): add tool registry with progressive depth per enforcement stage"
```

---

## Phase 3: Enforcement Stage Agents

### Task 7: Create Base Enforcement Agent Class

**Files:**
- Create: `server/services/enforcement/agents/base-agent.ts`

**Step 1: Write failing test**

Create: `server/services/enforcement/agents/__tests__/base-agent.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BaseEnforcementAgent } from '../base-agent';
import type { CaseDossier, EnforcementStage } from '../../../../../shared/types/enforcement-workflow';
import type { LLMProvider, LLMResponse } from '../../../llm/llm-provider';

// Concrete test implementation
class TestAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'finding';
  systemPrompt = 'You are a test agent.';

  protected parseDecision(response: LLMResponse) {
    return {
      decision: 'advance' as const,
      reasoning: 'test reasoning',
      confidence: 0.95,
      targetStage: undefined,
    };
  }
}

function createMockProvider(): LLMProvider {
  return {
    model: 'test-model',
    chat: vi.fn().mockResolvedValue({
      content: JSON.stringify({ decision: 'advance', reasoning: 'test', confidence: 0.95 }),
      finishReason: 'stop',
    }),
  };
}

function createMinimalDossier(): CaseDossier {
  return {
    caseId: 'test-case-1',
    enforcementCaseId: 'enf-1',
    claimIds: ['claim-1'],
    entities: { providerId: 'prov-1' },
    currentStage: 'finding',
    stageHistory: [],
    evidence: { engineResults: {}, agentFindings: {} },
    stageDecisions: {},
    financialImpact: { estimatedLoss: 0, recoveryAmount: 0 },
    regulatoryCitations: [],
    violationCodes: [],
    humanReviews: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('BaseEnforcementAgent', () => {
  it('executes and returns enriched dossier with decision', async () => {
    const agent = new TestAgent();
    const provider = createMockProvider();
    const dossier = createMinimalDossier();

    const result = await agent.execute(dossier, provider);

    expect(result.decision).toBe('advance');
    expect(result.reasoning).toBe('test reasoning');
    expect(result.confidence).toBe(0.95);
    expect(result.enrichedDossier.stageDecisions.finding).toBeDefined();
  });

  it('records stage decision in dossier', async () => {
    const agent = new TestAgent();
    const provider = createMockProvider();
    const dossier = createMinimalDossier();

    const result = await agent.execute(dossier, provider);
    const decision = result.enrichedDossier.stageDecisions.finding;

    expect(decision?.decision).toBe('advance');
    expect(decision?.reasoning).toBe('test reasoning');
    expect(decision?.confidence).toBe(0.95);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/enforcement/agents/__tests__/base-agent.test.ts`

**Step 3: Write base agent class**

```typescript
// server/services/enforcement/agents/base-agent.ts

import type {
  CaseDossier,
  EnforcementStage,
  StageDecision,
  StageDecisionRecord,
} from '../../../../shared/types/enforcement-workflow';
import type {
  LLMProvider,
  LLMResponse,
  ChatMessage,
} from '../../llm/llm-provider';
import type { AgentTool } from '../tools/agent-tool';
import { getToolsForStage } from '../tools/tool-registry';

export interface AgentExecutionResult {
  enrichedDossier: CaseDossier;
  decision: StageDecision;
  reasoning: string;
  confidence: number;
  targetStage?: EnforcementStage;
  toolsInvoked: string[];
}

export abstract class BaseEnforcementAgent {
  abstract stage: EnforcementStage;
  abstract systemPrompt: string;

  protected maxToolRounds = 5; // max LLM ↔ tool call rounds

  async execute(
    dossier: CaseDossier,
    provider: LLMProvider
  ): Promise<AgentExecutionResult> {
    const tools = getToolsForStage(this.stage);
    const toolsInvoked: string[] = [];

    // Build initial message with dossier context
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: this.buildDossierPrompt(dossier),
      },
    ];

    let lastResponse: LLMResponse | null = null;

    // Tool-use loop: LLM calls tools, we execute, feed results back
    for (let round = 0; round < this.maxToolRounds; round++) {
      const response = await provider.chat({
        systemPrompt: this.systemPrompt,
        messages,
        tools: tools.map((t) => t.toToolDefinition()),
        temperature: 0.1,
      });

      lastResponse = response;

      if (response.finishReason !== 'tool_calls' || !response.toolCalls?.length) {
        break; // LLM is done calling tools
      }

      // Execute tool calls
      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });

      for (const toolCall of response.toolCalls) {
        const tool = tools.find((t) => t.name === toolCall.function.name);
        if (!tool) {
          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` }),
            toolCallId: toolCall.id,
          });
          continue;
        }

        toolsInvoked.push(tool.name);
        try {
          const params = JSON.parse(toolCall.function.arguments);
          // Inject claimData from dossier if tool expects it
          if ('claimId' in params && dossier.claimIds.length > 0) {
            params.claimData = params.claimData || { claimId: params.claimId };
          }
          const result = await tool.execute(params);
          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolCallId: toolCall.id,
          });
        } catch (err: any) {
          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: err.message }),
            toolCallId: toolCall.id,
          });
        }
      }
    }

    // Parse the final decision from LLM response
    const parsed = this.parseDecision(lastResponse!);

    // Record decision in dossier
    const decisionRecord: StageDecisionRecord = {
      agentId: `enforcement-${this.stage}`,
      stage: this.stage,
      reasoning: parsed.reasoning,
      decision: parsed.decision,
      confidence: parsed.confidence,
      toolsInvoked: [...new Set(toolsInvoked)],
      timestamp: new Date(),
      targetStage: parsed.targetStage,
    };

    const enrichedDossier: CaseDossier = {
      ...dossier,
      stageDecisions: {
        ...dossier.stageDecisions,
        [this.stage]: decisionRecord,
      },
      updatedAt: new Date(),
    };

    return {
      enrichedDossier,
      decision: parsed.decision,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      targetStage: parsed.targetStage,
      toolsInvoked: [...new Set(toolsInvoked)],
    };
  }

  protected abstract parseDecision(response: LLMResponse): {
    decision: StageDecision;
    reasoning: string;
    confidence: number;
    targetStage?: EnforcementStage;
  };

  protected buildDossierPrompt(dossier: CaseDossier): string {
    return `## Case Dossier

**Case ID:** ${dossier.caseId}
**Current Stage:** ${dossier.currentStage}
**Claims:** ${dossier.claimIds.join(', ')}
**Entities:** Provider=${dossier.entities.providerId || 'N/A'}, Patient=${dossier.entities.patientId || 'N/A'}

### Previous Evidence
${JSON.stringify(dossier.evidence, null, 2)}

### Previous Stage Decisions
${JSON.stringify(dossier.stageDecisions, null, 2)}

### Financial Impact
Estimated Loss: ${dossier.financialImpact.estimatedLoss}
Recovery Amount: ${dossier.financialImpact.recoveryAmount}

### Violation Codes
${dossier.violationCodes.join(', ') || 'None yet'}

### Regulatory Citations
${dossier.regulatoryCitations.map((c) => `- ${c.code}: ${c.description} (${c.source})`).join('\n') || 'None yet'}

---

Analyze this case using your available tools and provide your decision. Respond with JSON:
\`\`\`json
{
  "decision": "<your_decision>",
  "reasoning": "<detailed_reasoning>",
  "confidence": <0.0_to_1.0>,
  "targetStage": "<stage_if_loop_back_or_escalate>"
}
\`\`\``;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run server/services/enforcement/agents/__tests__/base-agent.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/services/enforcement/agents/
git commit -m "feat(fwa): add base enforcement agent with tool-use loop"
```

---

### Task 8: Implement All 7 Stage Agents

**Files:**
- Create: `server/services/enforcement/agents/finding-agent.ts`
- Create: `server/services/enforcement/agents/warning-agent.ts`
- Create: `server/services/enforcement/agents/corrective-action-agent.ts`
- Create: `server/services/enforcement/agents/penalty-proposal-agent.ts`
- Create: `server/services/enforcement/agents/penalty-applied-agent.ts`
- Create: `server/services/enforcement/agents/appeal-agent.ts`
- Create: `server/services/enforcement/agents/resolution-agent.ts`
- Create: `server/services/enforcement/agents/index.ts`

**Step 1: Write failing test for all agents**

Create: `server/services/enforcement/agents/__tests__/stage-agents.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { FindingAgent } from '../finding-agent';
import { WarningAgent } from '../warning-agent';
import { CorrectiveActionAgent } from '../corrective-action-agent';
import { PenaltyProposalAgent } from '../penalty-proposal-agent';
import { PenaltyAppliedAgent } from '../penalty-applied-agent';
import { AppealAgent } from '../appeal-agent';
import { ResolutionAgent } from '../resolution-agent';
import { getAgentForStage } from '../index';

describe('Stage Agents', () => {
  it('FindingAgent has correct stage and prompt', () => {
    const agent = new FindingAgent();
    expect(agent.stage).toBe('finding');
    expect(agent.systemPrompt).toContain('Finding Agent');
  });

  it('WarningAgent has correct stage', () => {
    const agent = new WarningAgent();
    expect(agent.stage).toBe('warning_issued');
  });

  it('CorrectiveActionAgent has correct stage', () => {
    const agent = new CorrectiveActionAgent();
    expect(agent.stage).toBe('corrective_action');
  });

  it('PenaltyProposalAgent has correct stage', () => {
    const agent = new PenaltyProposalAgent();
    expect(agent.stage).toBe('penalty_proposed');
  });

  it('PenaltyAppliedAgent has correct stage', () => {
    const agent = new PenaltyAppliedAgent();
    expect(agent.stage).toBe('penalty_applied');
  });

  it('AppealAgent has correct stage', () => {
    const agent = new AppealAgent();
    expect(agent.stage).toBe('appeal_review');
  });

  it('ResolutionAgent has correct stage', () => {
    const agent = new ResolutionAgent();
    expect(agent.stage).toBe('resolved');
  });
});

describe('getAgentForStage', () => {
  it('returns correct agent for each stage', () => {
    expect(getAgentForStage('finding')).toBeInstanceOf(FindingAgent);
    expect(getAgentForStage('warning_issued')).toBeInstanceOf(WarningAgent);
    expect(getAgentForStage('corrective_action')).toBeInstanceOf(CorrectiveActionAgent);
    expect(getAgentForStage('penalty_proposed')).toBeInstanceOf(PenaltyProposalAgent);
    expect(getAgentForStage('penalty_applied')).toBeInstanceOf(PenaltyAppliedAgent);
    expect(getAgentForStage('appeal_review')).toBeInstanceOf(AppealAgent);
    expect(getAgentForStage('resolved')).toBeInstanceOf(ResolutionAgent);
  });

  it('throws for invalid stage', () => {
    expect(() => getAgentForStage('closed')).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/enforcement/agents/__tests__/stage-agents.test.ts`

**Step 3: Implement each agent**

Each agent extends `BaseEnforcementAgent` with a specialized system prompt and `parseDecision`. The pattern is identical for all — only the prompt and valid decisions differ. Implement all 7 in parallel:

```typescript
// server/services/enforcement/agents/finding-agent.ts
import { BaseEnforcementAgent } from './base-agent';
import type { EnforcementStage, StageDecision } from '../../../../shared/types/enforcement-workflow';
import type { LLMResponse } from '../../llm/llm-provider';

export class FindingAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'finding';
  systemPrompt = `You are the **Finding Agent** in an FWA (Fraud, Waste, and Abuse) enforcement workflow.

## Your Role
You are the first responder. You receive raw detection results and must document the FWA finding with initial evidence. You assess whether there is sufficient evidence to proceed with enforcement.

## Available Tools
- **rule_engine**: Run rule-based detection (102+ rules, 18 categories). Use first for fast triage.
- **statistical**: Run statistical anomaly detection (z-score, 62 features). Use for outlier identification.
- **a1_analysis**: Run root cause analysis on the case. Use to understand why fraud indicators triggered.
- **b3_history**: Analyze entity history for behavioral patterns. Use to establish pattern of behavior.

## Your Decisions
- **advance**: Sufficient evidence found. Proceed to Warning stage.
- **dismiss**: Insufficient evidence. Close the case.
- **escalate**: Critical severity detected. Skip directly to Penalty Proposed stage.

## Instructions
1. Use rule_engine and statistical tools to analyze the claims
2. Use a1_analysis to understand root causes
3. Use b3_history if entity patterns are relevant
4. Assess the evidence and make your decision
5. Respond with JSON: { "decision", "reasoning", "confidence", "targetStage" }

Be thorough but decisive. Document your reasoning clearly — it becomes part of the permanent case record.`;

  protected parseDecision(response: LLMResponse) {
    return this.extractJsonDecision(response, ['advance', 'dismiss', 'escalate']);
  }

  private extractJsonDecision(response: LLMResponse, validDecisions: string[]) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      return {
        decision: (validDecisions.includes(parsed.decision) ? parsed.decision : 'advance') as StageDecision,
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        targetStage: parsed.targetStage as EnforcementStage | undefined,
      };
    } catch {
      return { decision: 'hold' as StageDecision, reasoning: 'Failed to parse agent response', confidence: 0 };
    }
  }
}
```

```typescript
// server/services/enforcement/agents/warning-agent.ts
import { BaseEnforcementAgent } from './base-agent';
import type { EnforcementStage, StageDecision } from '../../../../shared/types/enforcement-workflow';
import type { LLMResponse } from '../../llm/llm-provider';

export class WarningAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'warning_issued';
  systemPrompt = `You are the **Warning Agent** in an FWA enforcement workflow.

## Your Role
Build a formal warning package with evidence citations and provider notification. You strengthen the case with additional detection methods and categorize the FWA type.

## Available Tools
- **rule_engine**, **statistical**, **unsupervised**: Three detection engines for comprehensive analysis.
- **a1_analysis**: Root cause analysis. **a2_categorization**: FWA type classification.
- **b1_regulatory**: Regulatory citations from NPHIES/CCHI/MOH. **b3_history**: Entity history.

## Your Decisions
- **advance**: Warning package complete. Proceed to Corrective Action (30-day deadline).
- **loop_back**: Need more investigation. Return to Finding stage.
- **escalate**: Severity warrants skipping to Penalty Proposed.

Respond with JSON: { "decision", "reasoning", "confidence", "targetStage" }`;

  protected parseDecision(response: LLMResponse) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      const valid = ['advance', 'loop_back', 'escalate'];
      return {
        decision: (valid.includes(parsed.decision) ? parsed.decision : 'advance') as StageDecision,
        reasoning: parsed.reasoning || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        targetStage: parsed.targetStage as EnforcementStage | undefined,
      };
    } catch {
      return { decision: 'hold' as StageDecision, reasoning: 'Parse error', confidence: 0 };
    }
  }
}
```

```typescript
// server/services/enforcement/agents/corrective-action-agent.ts
import { BaseEnforcementAgent } from './base-agent';
import type { EnforcementStage, StageDecision } from '../../../../shared/types/enforcement-workflow';
import type { LLMResponse } from '../../llm/llm-provider';

export class CorrectiveActionAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'corrective_action';
  systemPrompt = `You are the **Corrective Action Agent** in an FWA enforcement workflow.

## Your Role
Monitor provider response and evaluate whether corrective measures adequately address the violation.

## Available Tools
- **rule_engine**, **statistical**, **unsupervised**: Re-run detection to see if patterns changed.
- **a1_analysis**: Re-analyze findings. **a3_action**: Monitor action implementation.
- **b1_regulatory**: Check compliance requirements. **b2_medical**: Validate medical corrections.

## Your Decisions
- **resolve**: Corrections sufficient. Proceed to Resolution.
- **advance**: Corrections insufficient. Proceed to Penalty Proposed.
- **extend**: Grant more time. Stay in current stage.

Respond with JSON: { "decision", "reasoning", "confidence", "targetStage" }`;

  protected parseDecision(response: LLMResponse) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      const valid = ['resolve', 'advance', 'extend'];
      return {
        decision: (valid.includes(parsed.decision) ? parsed.decision : 'hold') as StageDecision,
        reasoning: parsed.reasoning || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        targetStage: parsed.targetStage as EnforcementStage | undefined,
      };
    } catch {
      return { decision: 'hold' as StageDecision, reasoning: 'Parse error', confidence: 0 };
    }
  }
}
```

```typescript
// server/services/enforcement/agents/penalty-proposal-agent.ts
import { BaseEnforcementAgent } from './base-agent';
import type { EnforcementStage, StageDecision } from '../../../../shared/types/enforcement-workflow';
import type { LLMResponse } from '../../llm/llm-provider';

export class PenaltyProposalAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'penalty_proposed';
  systemPrompt = `You are the **Penalty Proposal Agent** in an FWA enforcement workflow. [HITL GATE — your recommendation requires human approval]

## Your Role
Calculate regulatory penalty based on violation severity, precedent, and financial impact. Use ALL 5 detection engines for comprehensive evidence.

## Available Tools
All 5 detection engines (rule_engine, statistical, unsupervised, rag_llm, semantic) and all agent tools (a1-a3, b1-b3).

## Your Decisions
- **advance**: Penalty recommendation ready for human review.
- **loop_back**: Give another chance. Return to Corrective Action.
- **reduce**: Re-calculate with adjusted parameters.

Include in your reasoning: penalty amount recommendation, regulatory basis, financial impact estimate.

Respond with JSON: { "decision", "reasoning", "confidence", "targetStage", "penaltyRecommendation": { "amount", "basis", "severity" } }`;

  protected parseDecision(response: LLMResponse) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      const valid = ['advance', 'loop_back', 'reduce'];
      return {
        decision: (valid.includes(parsed.decision) ? parsed.decision : 'advance') as StageDecision,
        reasoning: parsed.reasoning || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        targetStage: parsed.targetStage as EnforcementStage | undefined,
      };
    } catch {
      return { decision: 'hold' as StageDecision, reasoning: 'Parse error', confidence: 0 };
    }
  }
}
```

```typescript
// server/services/enforcement/agents/penalty-applied-agent.ts
import { BaseEnforcementAgent } from './base-agent';
import type { EnforcementStage, StageDecision } from '../../../../shared/types/enforcement-workflow';
import type { LLMResponse } from '../../llm/llm-provider';

export class PenaltyAppliedAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'penalty_applied';
  systemPrompt = `You are the **Penalty Applied Agent** in an FWA enforcement workflow. [HITL GATE]

## Your Role
Validate and record the applied penalty. Generate the enforcement action record. Monitor for appeal window.

## Your Decisions
- **advance**: No appeal expected/window closed. Proceed to Resolution.
- **hold**: Appeal window still open. Stay in current stage.

Respond with JSON: { "decision", "reasoning", "confidence" }`;

  protected parseDecision(response: LLMResponse) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      const valid = ['advance', 'hold'];
      return {
        decision: (valid.includes(parsed.decision) ? parsed.decision : 'hold') as StageDecision,
        reasoning: parsed.reasoning || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      };
    } catch {
      return { decision: 'hold' as StageDecision, reasoning: 'Parse error', confidence: 0 };
    }
  }
}
```

```typescript
// server/services/enforcement/agents/appeal-agent.ts
import { BaseEnforcementAgent } from './base-agent';
import type { EnforcementStage, StageDecision } from '../../../../shared/types/enforcement-workflow';
import type { LLMResponse } from '../../llm/llm-provider';

export class AppealAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'appeal_review';
  systemPrompt = `You are the **Appeal Agent** in an FWA enforcement workflow. [HITL GATE]

## Your Role
Review provider appeal against original evidence. Re-run ALL engines with fresh data to check if new evidence changes the outcome.

## Available Tools
All 5 engines (re-run with fresh data) + a1_analysis, a2_categorization, b1_regulatory, b2_medical, b3_history.

## Your Decisions
- **uphold**: Penalty stands. Proceed to Resolution.
- **overturn**: Penalty reversed. Proceed to Resolution.
- **modify**: Adjust penalty amount. Return to Penalty Proposed.
- **remand**: Need more investigation. Return to Finding.

Compare fresh engine results against original findings. Document what changed and why.

Respond with JSON: { "decision", "reasoning", "confidence", "targetStage" }`;

  protected parseDecision(response: LLMResponse) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      const valid = ['uphold', 'overturn', 'modify', 'remand'];
      return {
        decision: (valid.includes(parsed.decision) ? parsed.decision : 'uphold') as StageDecision,
        reasoning: parsed.reasoning || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        targetStage: parsed.targetStage as EnforcementStage | undefined,
      };
    } catch {
      return { decision: 'hold' as StageDecision, reasoning: 'Parse error', confidence: 0 };
    }
  }
}
```

```typescript
// server/services/enforcement/agents/resolution-agent.ts
import { BaseEnforcementAgent } from './base-agent';
import type { EnforcementStage, StageDecision } from '../../../../shared/types/enforcement-workflow';
import type { LLMResponse } from '../../llm/llm-provider';

export class ResolutionAgent extends BaseEnforcementAgent {
  stage: EnforcementStage = 'resolved';
  systemPrompt = `You are the **Resolution Agent** in an FWA enforcement workflow.

## Your Role
Close the case. Run final validation with all 5 engines. Produce the Enforcement Decision Package — the complete evidence summary with audit trail for regulators.

## Available Tools
All 5 engines (final validation) + all agent tools.

## Your Output
Generate a comprehensive summary including:
- Case outcome (penalty_applied, penalty_overturned, corrected, dismissed)
- Executive summary of findings
- Complete evidence trail from all engines
- All regulatory citations
- Financial impact summary
- Full agent decision log

Respond with JSON: { "decision": "close", "reasoning", "confidence", "outcome", "executiveSummary" }`;

  protected parseDecision(response: LLMResponse) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      return {
        decision: 'resolve' as StageDecision,
        reasoning: parsed.reasoning || parsed.executiveSummary || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.9)),
      };
    } catch {
      return { decision: 'resolve' as StageDecision, reasoning: 'Case resolved', confidence: 0.5 };
    }
  }
}
```

**Step 4: Write agent index with factory**

```typescript
// server/services/enforcement/agents/index.ts
import type { EnforcementStage } from '../../../../shared/types/enforcement-workflow';
import type { BaseEnforcementAgent } from './base-agent';
import { FindingAgent } from './finding-agent';
import { WarningAgent } from './warning-agent';
import { CorrectiveActionAgent } from './corrective-action-agent';
import { PenaltyProposalAgent } from './penalty-proposal-agent';
import { PenaltyAppliedAgent } from './penalty-applied-agent';
import { AppealAgent } from './appeal-agent';
import { ResolutionAgent } from './resolution-agent';

const AGENT_MAP: Partial<Record<EnforcementStage, () => BaseEnforcementAgent>> = {
  finding: () => new FindingAgent(),
  warning_issued: () => new WarningAgent(),
  corrective_action: () => new CorrectiveActionAgent(),
  penalty_proposed: () => new PenaltyProposalAgent(),
  penalty_applied: () => new PenaltyAppliedAgent(),
  appeal_review: () => new AppealAgent(),
  resolved: () => new ResolutionAgent(),
};

export function getAgentForStage(stage: EnforcementStage): BaseEnforcementAgent {
  const factory = AGENT_MAP[stage];
  if (!factory) {
    throw new Error(`No agent defined for stage: ${stage}`);
  }
  return factory();
}

export {
  FindingAgent,
  WarningAgent,
  CorrectiveActionAgent,
  PenaltyProposalAgent,
  PenaltyAppliedAgent,
  AppealAgent,
  ResolutionAgent,
};
```

**Step 5: Run tests**

Run: `npx vitest run server/services/enforcement/agents/__tests__/stage-agents.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add server/services/enforcement/agents/
git commit -m "feat(fwa): implement 7 enforcement stage agents with specialized prompts"
```

---

## Phase 4: Case Router (State Machine)

### Task 9: Implement the Case Router

**Files:**
- Create: `server/services/enforcement/case-router.ts`

**Step 1: Write failing test**

Create: `server/services/enforcement/__tests__/case-router.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { CaseRouter } from '../case-router';
import type { EnforcementStage } from '../../../../shared/types/enforcement-workflow';

describe('CaseRouter', () => {
  const router = new CaseRouter();

  describe('advance transitions', () => {
    it('finding → warning_issued', () => {
      expect(router.getNextStage('finding', 'advance')).toBe('warning_issued');
    });
    it('warning_issued → corrective_action', () => {
      expect(router.getNextStage('warning_issued', 'advance')).toBe('corrective_action');
    });
    it('corrective_action → penalty_proposed', () => {
      expect(router.getNextStage('corrective_action', 'advance')).toBe('penalty_proposed');
    });
    it('penalty_proposed → penalty_applied', () => {
      expect(router.getNextStage('penalty_proposed', 'advance')).toBe('penalty_applied');
    });
    it('penalty_applied → resolved (no appeal)', () => {
      expect(router.getNextStage('penalty_applied', 'advance')).toBe('resolved');
    });
    it('appeal_review uphold → resolved', () => {
      expect(router.getNextStage('appeal_review', 'uphold')).toBe('resolved');
    });
    it('appeal_review overturn → resolved', () => {
      expect(router.getNextStage('appeal_review', 'overturn')).toBe('resolved');
    });
  });

  describe('non-linear transitions', () => {
    it('finding dismiss → closed', () => {
      expect(router.getNextStage('finding', 'dismiss')).toBe('closed');
    });
    it('finding escalate → penalty_proposed', () => {
      expect(router.getNextStage('finding', 'escalate')).toBe('penalty_proposed');
    });
    it('warning_issued escalate → penalty_proposed', () => {
      expect(router.getNextStage('warning_issued', 'escalate')).toBe('penalty_proposed');
    });
    it('warning_issued loop_back → finding', () => {
      expect(router.getNextStage('warning_issued', 'loop_back')).toBe('finding');
    });
    it('corrective_action resolve → resolved', () => {
      expect(router.getNextStage('corrective_action', 'resolve')).toBe('resolved');
    });
    it('appeal_review modify → penalty_proposed', () => {
      expect(router.getNextStage('appeal_review', 'modify')).toBe('penalty_proposed');
    });
    it('appeal_review remand → finding', () => {
      expect(router.getNextStage('appeal_review', 'remand')).toBe('finding');
    });
  });

  describe('hold transitions', () => {
    it('hold keeps current stage', () => {
      expect(router.getNextStage('penalty_applied', 'hold')).toBe('penalty_applied');
    });
    it('extend keeps current stage', () => {
      expect(router.getNextStage('corrective_action', 'extend')).toBe('corrective_action');
    });
  });

  describe('HITL gates', () => {
    it('penalty_proposed requires HITL', () => {
      expect(router.requiresHITL('penalty_proposed')).toBe(true);
    });
    it('penalty_applied requires HITL', () => {
      expect(router.requiresHITL('penalty_applied')).toBe(true);
    });
    it('appeal_review requires HITL', () => {
      expect(router.requiresHITL('appeal_review')).toBe(true);
    });
    it('finding does not require HITL', () => {
      expect(router.requiresHITL('finding')).toBe(false);
    });
    it('warning_issued does not require HITL', () => {
      expect(router.requiresHITL('warning_issued')).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/enforcement/__tests__/case-router.test.ts`

**Step 3: Write case router**

```typescript
// server/services/enforcement/case-router.ts

import type { EnforcementStage, StageDecision } from '../../../shared/types/enforcement-workflow';

type TransitionMap = Partial<Record<StageDecision, EnforcementStage>>;

const TRANSITIONS: Record<string, TransitionMap> = {
  finding: {
    advance: 'warning_issued',
    dismiss: 'closed',
    escalate: 'penalty_proposed',
  },
  warning_issued: {
    advance: 'corrective_action',
    loop_back: 'finding',
    escalate: 'penalty_proposed',
  },
  corrective_action: {
    advance: 'penalty_proposed',
    resolve: 'resolved',
    extend: 'corrective_action', // stay
  },
  penalty_proposed: {
    advance: 'penalty_applied',
    loop_back: 'corrective_action',
    reduce: 'penalty_proposed', // re-calculate, stay
  },
  penalty_applied: {
    advance: 'resolved',
    hold: 'penalty_applied', // awaiting appeal window
  },
  appeal_submitted: {
    advance: 'appeal_review',
  },
  appeal_review: {
    uphold: 'resolved',
    overturn: 'resolved',
    modify: 'penalty_proposed',
    remand: 'finding',
  },
  resolved: {
    resolve: 'closed',
  },
};

const HITL_STAGES: Set<EnforcementStage> = new Set([
  'penalty_proposed',
  'penalty_applied',
  'appeal_review',
]);

export class CaseRouter {
  getNextStage(
    currentStage: EnforcementStage,
    decision: StageDecision,
    targetStage?: EnforcementStage
  ): EnforcementStage {
    // If agent specified a target (loop_back, escalate, remand), use it if valid
    if (targetStage && (decision === 'loop_back' || decision === 'escalate' || decision === 'remand')) {
      return targetStage;
    }

    // hold/extend always stay in current stage
    if (decision === 'hold' || decision === 'extend') {
      return currentStage;
    }

    const transitions = TRANSITIONS[currentStage];
    if (!transitions) {
      throw new Error(`No transitions defined for stage: ${currentStage}`);
    }

    const nextStage = transitions[decision];
    if (!nextStage) {
      throw new Error(`Invalid decision '${decision}' for stage '${currentStage}'`);
    }

    return nextStage;
  }

  requiresHITL(stage: EnforcementStage): boolean {
    return HITL_STAGES.has(stage);
  }

  getValidDecisions(stage: EnforcementStage): StageDecision[] {
    const transitions = TRANSITIONS[stage];
    if (!transitions) return [];
    return Object.keys(transitions) as StageDecision[];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run server/services/enforcement/__tests__/case-router.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/services/enforcement/case-router.ts server/services/enforcement/__tests__/
git commit -m "feat(fwa): implement case router state machine with HITL gates"
```

---

## Phase 5: Workflow Orchestrator

### Task 10: Create the Enforcement Workflow Orchestrator

This is the top-level service that ties everything together: it takes a case, runs the current stage's agent, uses the router to determine the next stage, and handles HITL gates.

**Files:**
- Create: `server/services/enforcement/workflow-orchestrator.ts`

**Step 1: Write failing test**

Create: `server/services/enforcement/__tests__/workflow-orchestrator.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { EnforcementWorkflowOrchestrator } from '../workflow-orchestrator';
import type { CaseDossier } from '../../../../shared/types/enforcement-workflow';
import type { LLMProvider } from '../../llm/llm-provider';

function createMockProvider(): LLMProvider {
  return {
    model: 'test',
    chat: vi.fn().mockResolvedValue({
      content: JSON.stringify({ decision: 'advance', reasoning: 'test', confidence: 0.9 }),
      finishReason: 'stop',
    }),
  };
}

function createDossier(stage: string = 'finding'): CaseDossier {
  return {
    caseId: 'case-1',
    enforcementCaseId: 'enf-1',
    claimIds: ['claim-1'],
    entities: { providerId: 'prov-1' },
    currentStage: stage as any,
    stageHistory: [],
    evidence: { engineResults: {}, agentFindings: {} },
    stageDecisions: {},
    financialImpact: { estimatedLoss: 0, recoveryAmount: 0 },
    regulatoryCitations: [],
    violationCodes: [],
    humanReviews: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('EnforcementWorkflowOrchestrator', () => {
  it('constructs with provider', () => {
    const orchestrator = new EnforcementWorkflowOrchestrator(createMockProvider());
    expect(orchestrator).toBeDefined();
  });

  it('executeStage runs the current stage agent and returns result', async () => {
    const orchestrator = new EnforcementWorkflowOrchestrator(createMockProvider());
    const dossier = createDossier('finding');
    const result = await orchestrator.executeStage(dossier);

    expect(result.decision).toBe('advance');
    expect(result.nextStage).toBe('warning_issued');
    expect(result.requiresHITL).toBe(false);
    expect(result.enrichedDossier.currentStage).toBe('warning_issued');
  });

  it('stops at HITL gate and returns pending status', async () => {
    const provider = createMockProvider();
    // Mock the corrective action agent to advance to penalty_proposed
    (provider.chat as any).mockResolvedValue({
      content: JSON.stringify({ decision: 'advance', reasoning: 'insufficient', confidence: 0.85 }),
      finishReason: 'stop',
    });

    const orchestrator = new EnforcementWorkflowOrchestrator(provider);
    const dossier = createDossier('corrective_action');
    const result = await orchestrator.executeStage(dossier);

    expect(result.nextStage).toBe('penalty_proposed');
    expect(result.requiresHITL).toBe(true);
  });

  it('dismiss closes the case', async () => {
    const provider = createMockProvider();
    (provider.chat as any).mockResolvedValue({
      content: JSON.stringify({ decision: 'dismiss', reasoning: 'no evidence', confidence: 0.95 }),
      finishReason: 'stop',
    });

    const orchestrator = new EnforcementWorkflowOrchestrator(provider);
    const dossier = createDossier('finding');
    const result = await orchestrator.executeStage(dossier);

    expect(result.nextStage).toBe('closed');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/services/enforcement/__tests__/workflow-orchestrator.test.ts`

**Step 3: Write orchestrator**

```typescript
// server/services/enforcement/workflow-orchestrator.ts

import type {
  CaseDossier,
  EnforcementStage,
  StageDecision,
  StageTransition,
} from '../../../shared/types/enforcement-workflow';
import type { LLMProvider } from '../llm/llm-provider';
import { CaseRouter } from './case-router';
import { getAgentForStage } from './agents';

export interface StageExecutionResult {
  enrichedDossier: CaseDossier;
  decision: StageDecision;
  reasoning: string;
  confidence: number;
  nextStage: EnforcementStage;
  requiresHITL: boolean;
  toolsInvoked: string[];
}

export class EnforcementWorkflowOrchestrator {
  private router: CaseRouter;
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
    this.router = new CaseRouter();
  }

  async executeStage(dossier: CaseDossier): Promise<StageExecutionResult> {
    const currentStage = dossier.currentStage;

    // Get the agent for current stage
    const agent = getAgentForStage(currentStage);

    // Execute the agent
    const agentResult = await agent.execute(dossier, this.provider);

    // Determine next stage via router
    const nextStage = this.router.getNextStage(
      currentStage,
      agentResult.decision,
      agentResult.targetStage
    );

    // Check if next stage requires HITL
    const requiresHITL = this.router.requiresHITL(nextStage);

    // Record the transition
    const transition: StageTransition = {
      fromStage: currentStage,
      toStage: nextStage,
      decision: agentResult.decision,
      agentId: `enforcement-${currentStage}`,
      reasoning: agentResult.reasoning,
      confidence: agentResult.confidence,
      timestamp: new Date(),
    };

    // Update dossier with new stage and transition history
    const enrichedDossier: CaseDossier = {
      ...agentResult.enrichedDossier,
      currentStage: nextStage,
      stageHistory: [...agentResult.enrichedDossier.stageHistory, transition],
      updatedAt: new Date(),
    };

    return {
      enrichedDossier,
      decision: agentResult.decision,
      reasoning: agentResult.reasoning,
      confidence: agentResult.confidence,
      nextStage,
      requiresHITL,
      toolsInvoked: agentResult.toolsInvoked,
    };
  }

  /**
   * Run the workflow until it hits a HITL gate, closes, or resolves.
   * Returns after each HITL gate so humans can approve.
   */
  async runUntilGate(dossier: CaseDossier): Promise<StageExecutionResult> {
    let current = dossier;
    let lastResult: StageExecutionResult | null = null;

    const terminalStages: Set<EnforcementStage> = new Set(['closed', 'resolved']);
    const maxIterations = 10; // prevent infinite loops

    for (let i = 0; i < maxIterations; i++) {
      if (terminalStages.has(current.currentStage)) {
        break;
      }

      const result = await this.executeStage(current);
      lastResult = result;

      // Stop if HITL required at the next stage
      if (result.requiresHITL) {
        return result;
      }

      // Stop if we've reached a terminal state
      if (terminalStages.has(result.nextStage)) {
        return result;
      }

      current = result.enrichedDossier;
    }

    if (!lastResult) {
      throw new Error('Workflow produced no results');
    }

    return lastResult;
  }

  /**
   * Resume workflow after HITL approval
   */
  async resumeAfterApproval(
    dossier: CaseDossier,
    approval: { reviewerId: string; reviewerName: string; decision: 'approved' | 'rejected' | 'modify'; notes: string }
  ): Promise<StageExecutionResult> {
    const updatedDossier: CaseDossier = {
      ...dossier,
      humanReviews: [
        ...dossier.humanReviews,
        {
          stage: dossier.currentStage,
          ...approval,
          timestamp: new Date(),
        },
      ],
    };

    if (approval.decision === 'rejected') {
      // Human rejected — loop back to previous non-HITL stage
      return {
        enrichedDossier: { ...updatedDossier, currentStage: 'corrective_action' },
        decision: 'loop_back',
        reasoning: `Human reviewer rejected: ${approval.notes}`,
        confidence: 1,
        nextStage: 'corrective_action',
        requiresHITL: false,
        toolsInvoked: [],
      };
    }

    // Approved or modify — continue workflow
    return this.runUntilGate(updatedDossier);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run server/services/enforcement/__tests__/workflow-orchestrator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/services/enforcement/
git commit -m "feat(fwa): implement enforcement workflow orchestrator with HITL gates"
```

---

## Phase 6: Database & Storage

### Task 11: Add Case Dossier Storage

**Files:**
- Create: `migrations/0007_enforcement_workflow_dossiers.sql`
- Modify: `shared/schema.ts` — add dossier table near enforcement tables (~line 2238)
- Modify: `server/storage.ts` — add dossier CRUD methods to IStorage interface (~line 451) and implementation (~line 3984)

**Step 1: Write migration**

```sql
-- migrations/0007_enforcement_workflow_dossiers.sql
CREATE TABLE IF NOT EXISTS enforcement_dossiers (
  id SERIAL PRIMARY KEY,
  case_id TEXT NOT NULL,
  enforcement_case_id TEXT NOT NULL,
  claim_ids JSONB NOT NULL DEFAULT '[]',
  entities JSONB NOT NULL DEFAULT '{}',
  current_stage TEXT NOT NULL DEFAULT 'finding',
  stage_history JSONB NOT NULL DEFAULT '[]',
  evidence JSONB NOT NULL DEFAULT '{"engineResults": {}, "agentFindings": {}}',
  stage_decisions JSONB NOT NULL DEFAULT '{}',
  financial_impact JSONB NOT NULL DEFAULT '{"estimatedLoss": 0, "recoveryAmount": 0}',
  regulatory_citations JSONB NOT NULL DEFAULT '[]',
  violation_codes JSONB NOT NULL DEFAULT '[]',
  human_reviews JSONB NOT NULL DEFAULT '[]',
  decision_package JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_enforcement_dossiers_case_id ON enforcement_dossiers(case_id);
CREATE INDEX idx_enforcement_dossiers_enforcement_case_id ON enforcement_dossiers(enforcement_case_id);
CREATE INDEX idx_enforcement_dossiers_current_stage ON enforcement_dossiers(current_stage);
CREATE INDEX idx_enforcement_dossiers_status ON enforcement_dossiers(status);
```

**Step 2: Add Drizzle schema definition**

Add to `shared/schema.ts` after the enforcement cases section (~line 2238):

```typescript
export const enforcementDossiers = pgTable("enforcement_dossiers", {
  id: serial("id").primaryKey(),
  caseId: text("case_id").notNull(),
  enforcementCaseId: text("enforcement_case_id").notNull(),
  claimIds: jsonb("claim_ids").notNull().default([]),
  entities: jsonb("entities").notNull().default({}),
  currentStage: text("current_stage").notNull().default('finding'),
  stageHistory: jsonb("stage_history").notNull().default([]),
  evidence: jsonb("evidence").notNull().default({ engineResults: {}, agentFindings: {} }),
  stageDecisions: jsonb("stage_decisions").notNull().default({}),
  financialImpact: jsonb("financial_impact").notNull().default({ estimatedLoss: 0, recoveryAmount: 0 }),
  regulatoryCitations: jsonb("regulatory_citations").notNull().default([]),
  violationCodes: jsonb("violation_codes").notNull().default([]),
  humanReviews: jsonb("human_reviews").notNull().default([]),
  decisionPackage: jsonb("decision_package"),
  status: text("status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEnforcementDossierSchema = createInsertSchema(enforcementDossiers);
export type EnforcementDossier = typeof enforcementDossiers.$inferSelect;
export type InsertEnforcementDossier = z.infer<typeof insertEnforcementDossierSchema>;
```

**Step 3: Add storage interface methods**

Add to `IStorage` interface in `server/storage.ts` (~line 452):

```typescript
// Enforcement Dossier methods
createEnforcementDossier(data: InsertEnforcementDossier): Promise<EnforcementDossier>;
getEnforcementDossier(id: number): Promise<EnforcementDossier | undefined>;
getEnforcementDossierByCaseId(caseId: string): Promise<EnforcementDossier | undefined>;
updateEnforcementDossier(id: number, data: Partial<InsertEnforcementDossier>): Promise<EnforcementDossier | undefined>;
listEnforcementDossiers(filters?: { status?: string; stage?: string }): Promise<EnforcementDossier[]>;
```

**Step 4: Implement storage methods**

Add implementation after the enforcement case methods (~line 3984):

```typescript
async createEnforcementDossier(data: InsertEnforcementDossier): Promise<EnforcementDossier> {
  const [dossier] = await db.insert(enforcementDossiers).values(data).returning();
  return dossier;
}

async getEnforcementDossier(id: number): Promise<EnforcementDossier | undefined> {
  const [dossier] = await db.select().from(enforcementDossiers).where(eq(enforcementDossiers.id, id));
  return dossier;
}

async getEnforcementDossierByCaseId(caseId: string): Promise<EnforcementDossier | undefined> {
  const [dossier] = await db.select().from(enforcementDossiers).where(eq(enforcementDossiers.caseId, caseId));
  return dossier;
}

async updateEnforcementDossier(id: number, data: Partial<InsertEnforcementDossier>): Promise<EnforcementDossier | undefined> {
  const [dossier] = await db
    .update(enforcementDossiers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(enforcementDossiers.id, id))
    .returning();
  return dossier;
}

async listEnforcementDossiers(filters?: { status?: string; stage?: string }): Promise<EnforcementDossier[]> {
  let query = db.select().from(enforcementDossiers);
  const conditions = [];
  if (filters?.status) conditions.push(eq(enforcementDossiers.status, filters.status));
  if (filters?.stage) conditions.push(eq(enforcementDossiers.currentStage, filters.stage));
  if (conditions.length) query = query.where(and(...conditions));
  return query.orderBy(desc(enforcementDossiers.updatedAt));
}
```

**Step 5: Run migration**

Run: `npm run db:push` or apply the SQL migration manually.

**Step 6: Commit**

```bash
git add migrations/0007_enforcement_workflow_dossiers.sql shared/schema.ts server/storage.ts
git commit -m "feat(fwa): add enforcement dossier storage with migration"
```

---

## Phase 7: API Endpoints

### Task 12: Add Enforcement Workflow API Routes

**Files:**
- Create: `server/routes/enforcement-workflow-routes.ts`
- Modify: `server/index.ts` — register the new route module

**Step 1: Write the route module**

```typescript
// server/routes/enforcement-workflow-routes.ts

import type { Express } from 'express';
import type { IStorage } from '../storage';
import { EnforcementWorkflowOrchestrator } from '../services/enforcement/workflow-orchestrator';
import { getDefaultProvider } from '../services/llm';
import type { CaseDossier } from '../../shared/types/enforcement-workflow';

export function registerEnforcementWorkflowRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: any, context: string) => void
) {
  const provider = getDefaultProvider();
  const orchestrator = new EnforcementWorkflowOrchestrator(provider);

  // Create a new enforcement workflow (creates dossier + links to enforcement case)
  app.post('/api/fwa/enforcement-workflow', async (req, res) => {
    try {
      const { enforcementCaseId, claimIds, entities } = req.body;

      const dossier = await storage.createEnforcementDossier({
        caseId: `dossier-${Date.now()}`,
        enforcementCaseId,
        claimIds: claimIds || [],
        entities: entities || {},
        currentStage: 'finding',
        stageHistory: [],
        evidence: { engineResults: {}, agentFindings: {} },
        stageDecisions: {},
        financialImpact: { estimatedLoss: 0, recoveryAmount: 0 },
        regulatoryCitations: [],
        violationCodes: [],
        humanReviews: [],
        status: 'active',
      });

      res.json(dossier);
    } catch (error) {
      handleRouteError(res, error, 'create enforcement workflow');
    }
  });

  // Execute the current stage of the workflow
  app.post('/api/fwa/enforcement-workflow/:id/execute', async (req, res) => {
    try {
      const dossierRecord = await storage.getEnforcementDossier(Number(req.params.id));
      if (!dossierRecord) {
        return res.status(404).json({ error: 'Dossier not found' });
      }

      // Convert DB record to CaseDossier
      const dossier = dbToDossier(dossierRecord);

      const result = await orchestrator.executeStage(dossier);

      // Persist updated dossier
      await storage.updateEnforcementDossier(dossierRecord.id, {
        currentStage: result.enrichedDossier.currentStage,
        stageHistory: result.enrichedDossier.stageHistory as any,
        evidence: result.enrichedDossier.evidence as any,
        stageDecisions: result.enrichedDossier.stageDecisions as any,
        financialImpact: result.enrichedDossier.financialImpact as any,
        regulatoryCitations: result.enrichedDossier.regulatoryCitations as any,
        humanReviews: result.enrichedDossier.humanReviews as any,
        status: result.nextStage === 'closed' ? 'closed' : 'active',
      });

      // Also update enforcement case status
      if (dossierRecord.enforcementCaseId) {
        await storage.updateEnforcementCase(dossierRecord.enforcementCaseId, {
          status: result.enrichedDossier.currentStage as any,
        });
      }

      res.json({
        decision: result.decision,
        reasoning: result.reasoning,
        confidence: result.confidence,
        nextStage: result.nextStage,
        requiresHITL: result.requiresHITL,
        toolsInvoked: result.toolsInvoked,
        dossier: result.enrichedDossier,
      });
    } catch (error) {
      handleRouteError(res, error, 'execute enforcement stage');
    }
  });

  // Run workflow until HITL gate
  app.post('/api/fwa/enforcement-workflow/:id/run', async (req, res) => {
    try {
      const dossierRecord = await storage.getEnforcementDossier(Number(req.params.id));
      if (!dossierRecord) {
        return res.status(404).json({ error: 'Dossier not found' });
      }

      const dossier = dbToDossier(dossierRecord);
      const result = await orchestrator.runUntilGate(dossier);

      await storage.updateEnforcementDossier(dossierRecord.id, {
        currentStage: result.enrichedDossier.currentStage,
        stageHistory: result.enrichedDossier.stageHistory as any,
        evidence: result.enrichedDossier.evidence as any,
        stageDecisions: result.enrichedDossier.stageDecisions as any,
        financialImpact: result.enrichedDossier.financialImpact as any,
        regulatoryCitations: result.enrichedDossier.regulatoryCitations as any,
        humanReviews: result.enrichedDossier.humanReviews as any,
        status: ['closed', 'resolved'].includes(result.nextStage) ? 'closed' : 'active',
      });

      res.json({
        decision: result.decision,
        reasoning: result.reasoning,
        confidence: result.confidence,
        nextStage: result.nextStage,
        requiresHITL: result.requiresHITL,
        stagesExecuted: result.enrichedDossier.stageHistory.length,
        dossier: result.enrichedDossier,
      });
    } catch (error) {
      handleRouteError(res, error, 'run enforcement workflow');
    }
  });

  // HITL approval endpoint
  app.post('/api/fwa/enforcement-workflow/:id/approve', async (req, res) => {
    try {
      const { reviewerId, reviewerName, decision, notes } = req.body;
      const dossierRecord = await storage.getEnforcementDossier(Number(req.params.id));
      if (!dossierRecord) {
        return res.status(404).json({ error: 'Dossier not found' });
      }

      const dossier = dbToDossier(dossierRecord);
      const result = await orchestrator.resumeAfterApproval(dossier, {
        reviewerId,
        reviewerName,
        decision,
        notes,
      });

      await storage.updateEnforcementDossier(dossierRecord.id, {
        currentStage: result.enrichedDossier.currentStage,
        stageHistory: result.enrichedDossier.stageHistory as any,
        evidence: result.enrichedDossier.evidence as any,
        stageDecisions: result.enrichedDossier.stageDecisions as any,
        humanReviews: result.enrichedDossier.humanReviews as any,
        status: ['closed', 'resolved'].includes(result.nextStage) ? 'closed' : 'active',
      });

      res.json({
        decision: result.decision,
        nextStage: result.nextStage,
        requiresHITL: result.requiresHITL,
        dossier: result.enrichedDossier,
      });
    } catch (error) {
      handleRouteError(res, error, 'approve enforcement workflow');
    }
  });

  // Get dossier details
  app.get('/api/fwa/enforcement-workflow/:id', async (req, res) => {
    try {
      const dossier = await storage.getEnforcementDossier(Number(req.params.id));
      if (!dossier) {
        return res.status(404).json({ error: 'Dossier not found' });
      }
      res.json(dossier);
    } catch (error) {
      handleRouteError(res, error, 'get enforcement dossier');
    }
  });

  // List dossiers with filters
  app.get('/api/fwa/enforcement-workflows', async (req, res) => {
    try {
      const { status, stage } = req.query;
      const dossiers = await storage.listEnforcementDossiers({
        status: status as string,
        stage: stage as string,
      });
      res.json(dossiers);
    } catch (error) {
      handleRouteError(res, error, 'list enforcement dossiers');
    }
  });
}

// Helper: convert DB record to CaseDossier interface
function dbToDossier(record: any): CaseDossier {
  return {
    caseId: record.caseId,
    enforcementCaseId: record.enforcementCaseId,
    claimIds: record.claimIds as string[],
    entities: record.entities as any,
    currentStage: record.currentStage as any,
    stageHistory: record.stageHistory as any[],
    evidence: record.evidence as any,
    stageDecisions: record.stageDecisions as any,
    financialImpact: record.financialImpact as any,
    regulatoryCitations: record.regulatoryCitations as any[],
    violationCodes: record.violationCodes as string[],
    humanReviews: record.humanReviews as any[],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
```

**Step 2: Register routes in server/index.ts**

Add import and registration call alongside existing FWA routes:

```typescript
import { registerEnforcementWorkflowRoutes } from './routes/enforcement-workflow-routes';

// In the route registration section:
registerEnforcementWorkflowRoutes(app, storage, handleRouteError);
```

**Step 3: Commit**

```bash
git add server/routes/enforcement-workflow-routes.ts server/index.ts
git commit -m "feat(fwa): add enforcement workflow API endpoints (execute, run, approve, CRUD)"
```

---

## Phase 8: Frontend Integration

### Task 13: Add Enforcement Workflow Controls to Enforcement Page

**Files:**
- Modify: `client/src/pages/fwa/enforcement.tsx` — add workflow execution buttons, dossier viewer, and HITL approval UI

This task adds:
1. A "Run AI Workflow" button on each enforcement case card
2. A dossier viewer showing the case progression, agent decisions, and evidence
3. HITL approval dialog for penalty/appeal stages
4. Real-time stage indicator showing which agent is running

**Step 1: Add API hooks**

Add workflow API calls to the enforcement page. Use the existing React Query pattern from the file (queries at ~line 149-154):

```typescript
// Add these API functions to enforcement.tsx or a shared api file:

async function createWorkflow(enforcementCaseId: string, claimIds: string[], entities: any) {
  const res = await fetch('/api/fwa/enforcement-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enforcementCaseId, claimIds, entities }),
  });
  return res.json();
}

async function executeWorkflowStage(dossierIdId: number) {
  const res = await fetch(`/api/fwa/enforcement-workflow/${dossierId}/execute`, { method: 'POST' });
  return res.json();
}

async function runWorkflowToGate(dossierId: number) {
  const res = await fetch(`/api/fwa/enforcement-workflow/${dossierId}/run`, { method: 'POST' });
  return res.json();
}

async function approveWorkflow(dossierId: number, approval: any) {
  const res = await fetch(`/api/fwa/enforcement-workflow/${dossierId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(approval),
  });
  return res.json();
}
```

**Step 2: Add workflow control UI**

Add to the case detail view (currently at ~line 286-590 in enforcement.tsx):
- "Start AI Workflow" button that creates a dossier and runs to first HITL gate
- Stage progression indicator showing which agent ran, what it decided, confidence
- HITL approval modal at gated stages with approve/reject/modify options
- Dossier evidence viewer (collapsible JSON tree of engine results and agent findings)

**Step 3: Add dossier detail panel**

Create a collapsible panel showing:
- Current stage with visual indicator
- Stage history timeline (which agents ran, what they decided, when)
- Engine evidence accordion (each engine's findings)
- Agent reasoning display (chain-of-thought from each stage agent)
- Financial impact tracker
- Regulatory citations list
- Human review log

**Step 4: Test the UI manually**

Navigate to FWA → Enforcement & Compliance and verify:
- Existing enforcement cases display correctly
- New "AI Workflow" button appears on case cards
- Clicking it creates a dossier and starts the pipeline
- Stage progression is visible
- HITL gates show approval dialog

**Step 5: Commit**

```bash
git add client/src/pages/fwa/enforcement.tsx
git commit -m "feat(fwa): add enforcement workflow UI with dossier viewer and HITL approval"
```

---

## Phase 9: Integration Testing

### Task 14: Write E2E Test for Enforcement Workflow

**Files:**
- Create: `e2e/enforcement-workflow.spec.ts`

**Step 1: Write the E2E test**

```typescript
// e2e/enforcement-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('FWA Enforcement Workflow', () => {
  test('can navigate to enforcement page', async ({ page }) => {
    await page.goto('/fwa/enforcement');
    await expect(page.getByText('Enforcement')).toBeVisible();
  });

  test('enforcement case cards display workflow status', async ({ page }) => {
    await page.goto('/fwa/enforcement');
    // Check that the STATUS_WORKFLOW stages are visible
    await expect(page.getByText('Finding')).toBeVisible();
    await expect(page.getByText('Warning')).toBeVisible();
    await expect(page.getByText('Resolved')).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e -- --grep "Enforcement Workflow"`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/enforcement-workflow.spec.ts
git commit -m "test(fwa): add E2E test for enforcement workflow page"
```

---

### Task 15: Write Unit Tests for Full Workflow Integration

**Files:**
- Create: `server/services/enforcement/__tests__/integration.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { EnforcementWorkflowOrchestrator } from '../workflow-orchestrator';
import { CaseRouter } from '../case-router';
import type { CaseDossier } from '../../../../shared/types/enforcement-workflow';
import type { LLMProvider } from '../../llm/llm-provider';

describe('Enforcement Workflow Integration', () => {
  function createSequentialProvider(responses: string[]): LLMProvider {
    let callIndex = 0;
    return {
      model: 'test',
      chat: vi.fn().mockImplementation(async () => {
        const response = responses[callIndex] || responses[responses.length - 1];
        callIndex++;
        return { content: response, finishReason: 'stop' };
      }),
    };
  }

  function createDossier(): CaseDossier {
    return {
      caseId: 'integration-test',
      enforcementCaseId: 'enf-int',
      claimIds: ['claim-1'],
      entities: { providerId: 'prov-1' },
      currentStage: 'finding',
      stageHistory: [],
      evidence: { engineResults: {}, agentFindings: {} },
      stageDecisions: {},
      financialImpact: { estimatedLoss: 50000, recoveryAmount: 0 },
      regulatoryCitations: [],
      violationCodes: [],
      humanReviews: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('runs finding → warning → corrective → stops at penalty (HITL)', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'advance', reasoning: 'Evidence found', confidence: 0.85 }),
      JSON.stringify({ decision: 'advance', reasoning: 'Warning issued', confidence: 0.9 }),
      JSON.stringify({ decision: 'advance', reasoning: 'Corrections insufficient', confidence: 0.88 }),
    ]);

    const orchestrator = new EnforcementWorkflowOrchestrator(provider);
    const result = await orchestrator.runUntilGate(createDossier());

    expect(result.nextStage).toBe('penalty_proposed');
    expect(result.requiresHITL).toBe(true);
    expect(result.enrichedDossier.stageHistory.length).toBeGreaterThanOrEqual(3);
  });

  it('dismiss at finding closes the case', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'dismiss', reasoning: 'No evidence', confidence: 0.95 }),
    ]);

    const orchestrator = new EnforcementWorkflowOrchestrator(provider);
    const result = await orchestrator.runUntilGate(createDossier());

    expect(result.nextStage).toBe('closed');
    expect(result.decision).toBe('dismiss');
  });

  it('escalate at finding jumps to penalty (HITL)', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'escalate', reasoning: 'Critical fraud', confidence: 0.98, targetStage: 'penalty_proposed' }),
    ]);

    const orchestrator = new EnforcementWorkflowOrchestrator(provider);
    const result = await orchestrator.runUntilGate(createDossier());

    expect(result.nextStage).toBe('penalty_proposed');
    expect(result.requiresHITL).toBe(true);
  });

  it('corrective action resolve jumps to resolution', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'advance', reasoning: 'Evidence found', confidence: 0.85 }),
      JSON.stringify({ decision: 'advance', reasoning: 'Warning issued', confidence: 0.9 }),
      JSON.stringify({ decision: 'resolve', reasoning: 'Provider corrected behavior', confidence: 0.92 }),
    ]);

    const orchestrator = new EnforcementWorkflowOrchestrator(provider);
    const result = await orchestrator.runUntilGate(createDossier());

    // resolve from corrective_action goes to 'resolved', which is terminal
    expect(['resolved', 'closed']).toContain(result.nextStage);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run server/services/enforcement/__tests__/integration.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add server/services/enforcement/__tests__/
git commit -m "test(fwa): add integration tests for full enforcement workflow"
```

---

## Summary of All Files

### New Files (Created)
| File | Purpose |
|------|---------|
| `shared/types/enforcement-workflow.ts` | All TypeScript types (CaseDossier, stages, decisions, etc.) |
| `server/services/llm/llm-provider.ts` | LLM provider interface (LLM-agnostic) |
| `server/services/llm/openai-provider.ts` | OpenAI implementation of LLM provider |
| `server/services/llm/provider-factory.ts` | Factory to create/swap LLM providers |
| `server/services/llm/index.ts` | Barrel export |
| `server/services/enforcement/tools/agent-tool.ts` | AgentTool interface |
| `server/services/enforcement/tools/engine-tools.ts` | 5 engine wrappers as tools |
| `server/services/enforcement/tools/ab-agent-tools.ts` | A1-A3, B1-B3 as tools |
| `server/services/enforcement/tools/tool-registry.ts` | Progressive depth tool registry |
| `server/services/enforcement/agents/base-agent.ts` | Base enforcement agent class |
| `server/services/enforcement/agents/finding-agent.ts` | Finding stage agent |
| `server/services/enforcement/agents/warning-agent.ts` | Warning stage agent |
| `server/services/enforcement/agents/corrective-action-agent.ts` | Corrective action agent |
| `server/services/enforcement/agents/penalty-proposal-agent.ts` | Penalty proposal agent |
| `server/services/enforcement/agents/penalty-applied-agent.ts` | Penalty applied agent |
| `server/services/enforcement/agents/appeal-agent.ts` | Appeal review agent |
| `server/services/enforcement/agents/resolution-agent.ts` | Resolution agent |
| `server/services/enforcement/agents/index.ts` | Agent factory + exports |
| `server/services/enforcement/case-router.ts` | State machine router |
| `server/services/enforcement/workflow-orchestrator.ts` | Top-level orchestrator |
| `server/routes/enforcement-workflow-routes.ts` | API endpoints |
| `migrations/0007_enforcement_workflow_dossiers.sql` | Database migration |
| `e2e/enforcement-workflow.spec.ts` | E2E test |

### Modified Files
| File | Changes |
|------|---------|
| `shared/schema.ts` | Add enforcementDossiers table definition |
| `server/storage.ts` | Add dossier CRUD to IStorage interface + implementation |
| `server/index.ts` | Register enforcement workflow routes |
| `client/src/pages/fwa/enforcement.tsx` | Add workflow controls, dossier viewer, HITL approval UI |

### Test Files
| File | Coverage |
|------|----------|
| `server/services/llm/__tests__/llm-provider.test.ts` | LLM provider interface |
| `server/services/llm/__tests__/provider-factory.test.ts` | Provider factory |
| `server/services/enforcement/tools/__tests__/engine-tools.test.ts` | Engine tool wrappers |
| `server/services/enforcement/tools/__tests__/ab-agent-tools.test.ts` | A/B agent tools |
| `server/services/enforcement/tools/__tests__/tool-registry.test.ts` | Progressive depth registry |
| `server/services/enforcement/agents/__tests__/base-agent.test.ts` | Base agent class |
| `server/services/enforcement/agents/__tests__/stage-agents.test.ts` | All 7 stage agents |
| `server/services/enforcement/__tests__/case-router.test.ts` | State machine transitions |
| `server/services/enforcement/__tests__/workflow-orchestrator.test.ts` | Orchestrator unit tests |
| `server/services/enforcement/__tests__/integration.test.ts` | Full workflow integration |
