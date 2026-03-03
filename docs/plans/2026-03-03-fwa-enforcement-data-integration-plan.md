# FWA Enforcement Data Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the agentic enforcement workflow to real data — engine tools read pre-computed results, A/B tools query existing tables, storage is injected through the stack, and case creation auto-starts the workflow.

**Architecture:** Thread `IStorage` from route handlers through orchestrator → agents → tool registry → individual tools. Engine tools fetch cached `fwa_detection_results` instead of re-running engines. A/B tools call existing storage methods. Case creation auto-creates a dossier, links top claims, and runs the workflow to the first HITL gate.

**Tech Stack:** TypeScript, Express, Drizzle ORM (PostgreSQL), Vitest

---

### Task 1: Add Storage Query Methods for Detection Results

**Files:**
- Modify: `server/storage.ts` (IStorage interface + MemStorage + DatabaseStorage)
- Modify: `shared/schema.ts` (imports only — tables already exist)

**Step 1: Add two new methods to the IStorage interface**

In `server/storage.ts`, add these methods to the `IStorage` interface after the existing enforcement dossier methods (~line 460):

```typescript
// Detection results for enforcement workflow
getDetectionResultsByClaimId(claimId: string): Promise<FwaDetectionResult | undefined>;
getDetectionResultsByProvider(providerId: string): Promise<FwaDetectionResult[]>;
getAnalyzedClaimsByProvider(providerId: string, limit?: number): Promise<FwaAnalyzedClaim[]>;
```

Add required imports at the top of `server/storage.ts`:
```typescript
import { fwaDetectionResults, fwaAnalyzedClaims } from '../shared/schema';
import type { FwaDetectionResult, FwaAnalyzedClaim } from '../shared/schema';
```

**Step 2: Implement in MemStorage**

In the MemStorage class, add stub implementations that return empty results:

```typescript
async getDetectionResultsByClaimId(claimId: string): Promise<FwaDetectionResult | undefined> {
  return undefined;
}
async getDetectionResultsByProvider(providerId: string): Promise<FwaDetectionResult[]> {
  return [];
}
async getAnalyzedClaimsByProvider(providerId: string, limit?: number): Promise<FwaAnalyzedClaim[]> {
  return [];
}
```

**Step 3: Implement in DatabaseStorage**

In the DatabaseStorage class, add real SQL implementations:

```typescript
async getDetectionResultsByClaimId(claimId: string): Promise<FwaDetectionResult | undefined> {
  const [result] = await db
    .select()
    .from(fwaDetectionResults)
    .where(eq(fwaDetectionResults.claimId, claimId))
    .orderBy(desc(fwaDetectionResults.analyzedAt))
    .limit(1);
  return result;
}

async getDetectionResultsByProvider(providerId: string): Promise<FwaDetectionResult[]> {
  return db
    .select()
    .from(fwaDetectionResults)
    .where(eq(fwaDetectionResults.providerId, providerId))
    .orderBy(desc(fwaDetectionResults.compositeScore))
    .limit(50);
}

async getAnalyzedClaimsByProvider(providerId: string, limit?: number): Promise<FwaAnalyzedClaim[]> {
  return db
    .select()
    .from(fwaAnalyzedClaims)
    .where(eq(fwaAnalyzedClaims.providerId, providerId))
    .orderBy(desc(fwaAnalyzedClaims.createdAt))
    .limit(limit || 10);
}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project server/tsconfig.json 2>&1 | head -20`
Expected: No errors related to the new methods

**Step 5: Commit**

```bash
git add server/storage.ts
git commit -m "feat(fwa): add storage methods for detection results and analyzed claims"
```

---

### Task 2: Inject Storage into Engine Tools

**Files:**
- Modify: `server/services/enforcement/tools/engine-tools.ts`

**Step 1: Rewrite engine-tools.ts to accept storage and fetch pre-computed results**

Replace the entire file content. Key changes:
- Remove all imports of detection engine functions (`runRuleEngineDetection`, etc.)
- Each tool factory accepts `storage: IStorage`
- Each tool `execute` fetches from `storage.getDetectionResultsByClaimId()`
- Falls back to score 0 / empty findings if no detection result exists

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project server/tsconfig.json 2>&1 | head -20`
Expected: Errors about `getEngineTools` call sites not passing `storage` — that's expected and will be fixed in Task 4.

**Step 3: Commit**

```bash
git add server/services/enforcement/tools/engine-tools.ts
git commit -m "feat(fwa): engine tools fetch pre-computed results from storage"
```

---

### Task 3: Inject Storage into A/B Agent Tools

**Files:**
- Modify: `server/services/enforcement/tools/ab-agent-tools.ts`

**Step 1: Rewrite ab-agent-tools.ts to accept storage and call real queries**

Replace the entire file. Key changes:
- Each tool factory accepts `storage: IStorage`
- a1_analysis calls `storage.getFwaAnalysisFindingsByCaseId(caseId)`
- a2_categorization calls `storage.getFwaCategoriesByCaseId(caseId)` + `storage.getFwaBehaviors()`
- a3_action calls `storage.getFwaActionsByCaseId(caseId)`
- b1_regulatory calls `storage.getFwaRegulatoryDocs()`
- b2_medical calls `storage.getFwaMedicalGuidelines()`
- b3_history calls `storage.getProvider360()` / `storage.getPatient360()` / `storage.getDoctor360()`

```typescript
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
      // Filter by source if provided, otherwise return all
      const filtered = params.sources
        ? docs.filter((d: any) => params.sources!.includes(d.source))
        : docs;
      // Simple text search on title/content
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project server/tsconfig.json 2>&1 | head -20`
Expected: Errors about `getAgentTools` call sites — fixed in Task 4.

**Step 3: Commit**

```bash
git add server/services/enforcement/tools/ab-agent-tools.ts
git commit -m "feat(fwa): A/B agent tools query real storage data"
```

---

### Task 4: Thread Storage Through Tool Registry, Base Agent, and Orchestrator

**Files:**
- Modify: `server/services/enforcement/tools/tool-registry.ts`
- Modify: `server/services/enforcement/agents/base-agent.ts`
- Modify: `server/services/enforcement/workflow-orchestrator.ts`

**Step 1: Update tool-registry.ts to pass storage**

In `server/services/enforcement/tools/tool-registry.ts`, change the `getToolsForStage` signature:

```typescript
import type { IStorage } from '../../../storage';
```

Change the function signature from:
```typescript
export function getToolsForStage(stage: EnforcementStage): AgentTool[] {
  const config = STAGE_TOOL_MAP[stage];
  if (!config) return [];
  return [...getEngineTools(config.engines), ...getAgentTools(config.agents)];
}
```

To:
```typescript
export function getToolsForStage(stage: EnforcementStage, storage: IStorage): AgentTool[] {
  const config = STAGE_TOOL_MAP[stage];
  if (!config) return [];
  return [...getEngineTools(config.engines, storage), ...getAgentTools(config.agents, storage)];
}
```

**Step 2: Update base-agent.ts to accept and pass storage**

In `server/services/enforcement/agents/base-agent.ts`:

Add import:
```typescript
import type { IStorage } from '../../../storage';
```

Change the `execute` method signature from:
```typescript
async execute(
  dossier: CaseDossier,
  provider: LLMProvider
): Promise<AgentExecutionResult> {
```

To:
```typescript
async execute(
  dossier: CaseDossier,
  provider: LLMProvider,
  storage: IStorage,
): Promise<AgentExecutionResult> {
```

Change the `getToolsForStage` call from:
```typescript
const tools = getToolsForStage(this.stage);
```

To:
```typescript
const tools = getToolsForStage(this.stage, storage);
```

**Step 3: Update workflow-orchestrator.ts to accept and pass storage**

In `server/services/enforcement/workflow-orchestrator.ts`:

Add import:
```typescript
import type { IStorage } from '../../storage';
```

Add storage to the constructor:
```typescript
export class EnforcementWorkflowOrchestrator {
  private router: CaseRouter;
  private provider: LLMProvider;
  private storage: IStorage;

  constructor(provider: LLMProvider, storage: IStorage) {
    this.provider = provider;
    this.storage = storage;
    this.router = new CaseRouter();
  }
```

In `executeStage`, change the agent.execute call from:
```typescript
const agentResult = await agent.execute(dossier, this.provider);
```

To:
```typescript
const agentResult = await agent.execute(dossier, this.provider, this.storage);
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project server/tsconfig.json 2>&1 | head -20`
Expected: Errors in routes about orchestrator constructor — fixed in Task 5.

**Step 5: Commit**

```bash
git add server/services/enforcement/tools/tool-registry.ts server/services/enforcement/agents/base-agent.ts server/services/enforcement/workflow-orchestrator.ts
git commit -m "feat(fwa): thread IStorage through orchestrator → agents → tools"
```

---

### Task 5: Update Route Handler — Pass Storage to Orchestrator

**Files:**
- Modify: `server/routes/enforcement-workflow-routes.ts`

**Step 1: Pass storage to orchestrator constructor**

Change the orchestrator instantiation from:
```typescript
const orchestrator = new EnforcementWorkflowOrchestrator(provider);
```

To:
```typescript
const orchestrator = new EnforcementWorkflowOrchestrator(provider, storage);
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project server/tsconfig.json 2>&1 | head -20`
Expected: Clean compilation (no errors)

**Step 3: Commit**

```bash
git add server/routes/enforcement-workflow-routes.ts
git commit -m "fix(fwa): pass storage to enforcement orchestrator in routes"
```

---

### Task 6: Auto-Workflow on Enforcement Case Creation

**Files:**
- Modify: `server/routes/fwa-routes.ts` (the case creation endpoint at ~line 4572)

**Step 1: Add imports at top of fwa-routes.ts**

```typescript
import { EnforcementWorkflowOrchestrator } from '../services/enforcement/workflow-orchestrator';
import { getDefaultProvider } from '../services/llm';
```

**Step 2: Modify the POST enforcement-cases handler**

After the enforcement case is created (`const enfCase = await storage.createEnforcementCase(...)`) and before `res.status(201).json(enfCase)`, add auto-dossier creation and workflow kickoff:

```typescript
      // Create enforcement case with provider name derived from directory
      const enfCase = await storage.createEnforcementCase({
        ...validatedData,
        providerName: provider[0].name,
      } as any);

      // Auto-create dossier and start workflow
      try {
        // Get top flagged claims for this provider
        const analyzedClaims = await storage.getAnalyzedClaimsByProvider(validatedData.providerId, 10);
        const claimIds = analyzedClaims.map((c: any) => c.id);

        // Get pre-computed detection results for evidence
        const detectionResults = await storage.getDetectionResultsByProvider(validatedData.providerId);
        const engineResults: Record<string, any> = {};
        for (const dr of detectionResults.slice(0, 10)) {
          engineResults[dr.claimId] = {
            compositeScore: Number(dr.compositeScore),
            ruleEngineScore: Number(dr.ruleEngineScore) || 0,
            statisticalScore: Number(dr.statisticalScore) || 0,
            unsupervisedScore: Number(dr.unsupervisedScore) || 0,
            ragLlmScore: Number(dr.ragLlmScore) || 0,
          };
        }

        // Create dossier linked to enforcement case
        const dossier = await storage.createEnforcementDossier({
          caseId: `dossier-${enfCase.id}`,
          enforcementCaseId: enfCase.id,
          claimIds,
          entities: { providerId: validatedData.providerId },
          currentStage: 'finding',
          stageHistory: [],
          evidence: { engineResults, agentFindings: {} },
          stageDecisions: {},
          financialImpact: { estimatedLoss: 0, recoveryAmount: 0 },
          regulatoryCitations: [],
          violationCodes: [],
          humanReviews: [],
          status: 'active',
        });

        // Auto-start workflow (runs Finding → Warning → Corrective → stops at Penalty HITL gate)
        const llmProvider = getDefaultProvider();
        const orchestrator = new EnforcementWorkflowOrchestrator(llmProvider, storage);
        const workflowResult = await orchestrator.runUntilGate({
          caseId: dossier.caseId,
          enforcementCaseId: dossier.enforcementCaseId,
          claimIds: dossier.claimIds as string[],
          entities: dossier.entities as any,
          currentStage: dossier.currentStage as any,
          stageHistory: [],
          evidence: dossier.evidence as any,
          stageDecisions: {},
          financialImpact: dossier.financialImpact as any,
          regulatoryCitations: [],
          violationCodes: [],
          humanReviews: [],
          createdAt: dossier.createdAt!,
          updatedAt: dossier.updatedAt!,
        });

        // Persist workflow results
        await storage.updateEnforcementDossier(dossier.id, {
          currentStage: workflowResult.enrichedDossier.currentStage,
          stageHistory: workflowResult.enrichedDossier.stageHistory as any,
          evidence: workflowResult.enrichedDossier.evidence as any,
          stageDecisions: workflowResult.enrichedDossier.stageDecisions as any,
          status: ['closed', 'resolved'].includes(workflowResult.nextStage) ? 'closed' : 'active',
        });

        // Update enforcement case status
        await storage.updateEnforcementCase(enfCase.id, {
          status: workflowResult.enrichedDossier.currentStage as any,
        });

        res.status(201).json({
          ...enfCase,
          workflow: {
            dossierId: dossier.id,
            currentStage: workflowResult.enrichedDossier.currentStage,
            decision: workflowResult.decision,
            reasoning: workflowResult.reasoning,
            requiresHITL: workflowResult.requiresHITL,
            stagesExecuted: workflowResult.enrichedDossier.stageHistory.length,
          },
        });
      } catch (workflowError: any) {
        // Workflow failed but case was created — return case with error note
        console.error('Auto-workflow failed:', workflowError.message);
        res.status(201).json({
          ...enfCase,
          workflow: { error: 'Auto-workflow failed. Start manually from enforcement workflow panel.' },
        });
      }
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project server/tsconfig.json 2>&1 | head -20`
Expected: Clean compilation

**Step 4: Commit**

```bash
git add server/routes/fwa-routes.ts
git commit -m "feat(fwa): auto-create dossier and start workflow on case creation"
```

---

### Task 7: Update Integration Tests for Storage Injection

**Files:**
- Modify: `server/services/enforcement/__tests__/integration.test.ts`

**Step 1: Update the mock to match new signature**

The mock for `getToolsForStage` already returns `[]`, but now the function signature includes `storage`. Update the mock and orchestrator calls:

Change the mock from:
```typescript
vi.mock('../tools/tool-registry', () => ({
  getToolsForStage: vi.fn().mockReturnValue([]),
  getToolConfigForStage: vi.fn().mockReturnValue(undefined),
}));
```

To:
```typescript
vi.mock('../tools/tool-registry', () => ({
  getToolsForStage: vi.fn().mockReturnValue([]),
  getToolConfigForStage: vi.fn().mockReturnValue(undefined),
}));
```

(Mock stays the same — it ignores extra params. But we need a mock storage.)

Add a mock storage factory after the mock:

```typescript
function createMockStorage(): any {
  return {
    getDetectionResultsByClaimId: vi.fn().mockResolvedValue(undefined),
    getDetectionResultsByProvider: vi.fn().mockResolvedValue([]),
    getAnalyzedClaimsByProvider: vi.fn().mockResolvedValue([]),
    getFwaAnalysisFindingsByCaseId: vi.fn().mockResolvedValue([]),
    getFwaCategoriesByCaseId: vi.fn().mockResolvedValue([]),
    getFwaActionsByCaseId: vi.fn().mockResolvedValue([]),
    getFwaRegulatoryDocs: vi.fn().mockResolvedValue([]),
    getFwaMedicalGuidelines: vi.fn().mockResolvedValue([]),
    getFwaBehaviors: vi.fn().mockResolvedValue([]),
    getProvider360: vi.fn().mockResolvedValue(undefined),
    getPatient360: vi.fn().mockResolvedValue(undefined),
    getDoctor360: vi.fn().mockResolvedValue(undefined),
  };
}
```

**Step 2: Update orchestrator instantiation in tests**

Change all `new EnforcementWorkflowOrchestrator(provider)` calls to:

```typescript
const mockStorage = createMockStorage();
const orchestrator = new EnforcementWorkflowOrchestrator(provider, mockStorage);
```

**Step 3: Run tests**

Run: `npx vitest run server/services/enforcement/__tests__/integration.test.ts`
Expected: All 23 tests PASS

**Step 4: Commit**

```bash
git add server/services/enforcement/__tests__/integration.test.ts
git commit -m "test(fwa): update integration tests for storage injection"
```

---

### Task 8: Add Unit Tests for Engine Tools with Storage

**Files:**
- Create: `server/services/enforcement/__tests__/engine-tools.test.ts`

**Step 1: Write tests for engine tools fetching from storage**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getEngineTools } from '../tools/engine-tools';

function createMockStorage(detectionResult: any = null): any {
  return {
    getDetectionResultsByClaimId: vi.fn().mockResolvedValue(detectionResult),
  };
}

describe('Engine Tools (storage-backed)', () => {
  const SAMPLE_RESULT = {
    claimId: 'claim-1',
    compositeScore: '85.50',
    ruleEngineScore: '78.00',
    statisticalScore: '72.50',
    unsupervisedScore: '65.00',
    ragLlmScore: '80.00',
    ruleEngineFindings: { matchedRules: [{ ruleId: 'R1', ruleName: 'Duplicate billing' }], totalRulesChecked: 50, violationCount: 3 },
    statisticalFindings: { modelPrediction: 0.82, featureImportance: [], peerComparison: { mean: 50, stdDev: 15, zScore: 2.3 }, historicalTrend: 'increasing' },
    unsupervisedFindings: { anomalyScore: 0.78, clusterAssignment: 2, clusterSize: 15, outlierReason: ['high_amount'], isolationForestScore: 0.85, nearestClusterDistance: 3.2 },
    ragLlmFindings: { contextualAnalysis: 'Suspicious pattern', similarCases: [], knowledgeBaseMatches: [], recommendation: 'Investigate', confidence: 0.8 },
    detectionSummary: 'High risk claim with multiple red flags',
    recommendedAction: 'Full investigation required',
  };

  it('rule_engine tool returns score and findings from storage', async () => {
    const storage = createMockStorage(SAMPLE_RESULT);
    const tools = getEngineTools(['rule_engine'], storage);
    const result = await tools[0].execute({ claimId: 'claim-1' });
    expect(result.engine).toBe('rule_engine');
    expect(result.score).toBe(78);
    expect(result.findings).toEqual(SAMPLE_RESULT.ruleEngineFindings);
    expect(storage.getDetectionResultsByClaimId).toHaveBeenCalledWith('claim-1');
  });

  it('statistical tool returns score and findings from storage', async () => {
    const storage = createMockStorage(SAMPLE_RESULT);
    const tools = getEngineTools(['statistical'], storage);
    const result = await tools[0].execute({ claimId: 'claim-1' });
    expect(result.engine).toBe('statistical');
    expect(result.score).toBe(72.5);
  });

  it('returns score 0 when no detection result exists', async () => {
    const storage = createMockStorage(null);
    const tools = getEngineTools(['rule_engine'], storage);
    const result = await tools[0].execute({ claimId: 'missing' });
    expect(result.score).toBe(0);
    expect(result.note).toBe('No detection results found');
  });

  it('creates all 5 engine tools', () => {
    const storage = createMockStorage(null);
    const tools = getEngineTools(['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'], storage);
    expect(tools).toHaveLength(5);
    expect(tools.map(t => t.name)).toEqual(['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic']);
  });

  it('each tool has a valid toToolDefinition', () => {
    const storage = createMockStorage(null);
    const tools = getEngineTools(['rule_engine'], storage);
    const def = tools[0].toToolDefinition();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('rule_engine');
    expect(def.function.parameters).toBeDefined();
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run server/services/enforcement/__tests__/engine-tools.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add server/services/enforcement/__tests__/engine-tools.test.ts
git commit -m "test(fwa): add unit tests for storage-backed engine tools"
```

---

### Task 9: Add Unit Tests for A/B Agent Tools with Storage

**Files:**
- Create: `server/services/enforcement/__tests__/ab-agent-tools.test.ts`

**Step 1: Write tests for A/B agent tools querying storage**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getAgentTools } from '../tools/ab-agent-tools';

function createMockStorage(overrides: Record<string, any> = {}): any {
  return {
    getFwaAnalysisFindingsByCaseId: vi.fn().mockResolvedValue(overrides.findings || []),
    getFwaCategoriesByCaseId: vi.fn().mockResolvedValue(overrides.categories || []),
    getFwaBehaviors: vi.fn().mockResolvedValue(overrides.behaviors || []),
    getFwaActionsByCaseId: vi.fn().mockResolvedValue(overrides.actions || []),
    getFwaRegulatoryDocs: vi.fn().mockResolvedValue(overrides.regulatoryDocs || []),
    getFwaMedicalGuidelines: vi.fn().mockResolvedValue(overrides.medicalGuidelines || []),
    getProvider360: vi.fn().mockResolvedValue(overrides.provider360 || null),
    getPatient360: vi.fn().mockResolvedValue(overrides.patient360 || null),
    getDoctor360: vi.fn().mockResolvedValue(overrides.doctor360 || null),
  };
}

describe('A/B Agent Tools (storage-backed)', () => {
  it('a1_analysis returns findings from storage', async () => {
    const mockFindings = [{ id: '1', type: 'pattern', description: 'Duplicate billing' }];
    const storage = createMockStorage({ findings: mockFindings });
    const tools = getAgentTools(['a1_analysis'], storage);
    const result = await tools[0].execute({ caseId: 'case-1' });
    expect(result.agent).toBe('a1_analysis');
    expect(result.findings).toEqual(mockFindings);
    expect(result.confidence).toBe(0.8);
    expect(storage.getFwaAnalysisFindingsByCaseId).toHaveBeenCalledWith('case-1');
  });

  it('a2_categorization returns categories and behaviors', async () => {
    const storage = createMockStorage({
      categories: [{ category: 'coding', confidence: 0.9 }],
      behaviors: [{ id: '1', name: 'upcoding' }],
    });
    const tools = getAgentTools(['a2_categorization'], storage);
    const result = await tools[0].execute({ caseId: 'case-1' });
    expect(result.agent).toBe('a2_categorization');
    expect(result.categories).toHaveLength(1);
    expect(result.behaviors).toHaveLength(1);
  });

  it('b3_history queries provider360 for provider entity type', async () => {
    const mockProvider = { id: 'prov-1', name: 'Test Provider', riskScore: 75 };
    const storage = createMockStorage({ provider360: mockProvider });
    const tools = getAgentTools(['b3_history'], storage);
    const result = await tools[0].execute({ entityId: 'prov-1', entityType: 'provider' });
    expect(result.agent).toBe('b3_history');
    expect(result.entity360).toEqual(mockProvider);
    expect(result.confidence).toBe(0.85);
    expect(storage.getProvider360).toHaveBeenCalledWith('prov-1');
  });

  it('b3_history queries patient360 for patient entity type', async () => {
    const storage = createMockStorage({ patient360: { id: 'pat-1' } });
    const tools = getAgentTools(['b3_history'], storage);
    await tools[0].execute({ entityId: 'pat-1', entityType: 'patient' });
    expect(storage.getPatient360).toHaveBeenCalledWith('pat-1');
  });

  it('empty data returns low confidence', async () => {
    const storage = createMockStorage();
    const tools = getAgentTools(['a1_analysis'], storage);
    const result = await tools[0].execute({ caseId: 'missing' });
    expect(result.confidence).toBe(0.1);
    expect(result.findings).toEqual([]);
  });

  it('creates all 6 agent tools', () => {
    const storage = createMockStorage();
    const tools = getAgentTools(
      ['a1_analysis', 'a2_categorization', 'a3_action', 'b1_regulatory', 'b2_medical', 'b3_history'],
      storage,
    );
    expect(tools).toHaveLength(6);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run server/services/enforcement/__tests__/ab-agent-tools.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add server/services/enforcement/__tests__/ab-agent-tools.test.ts
git commit -m "test(fwa): add unit tests for storage-backed A/B agent tools"
```

---

### Task 10: Run Full Test Suite and Verify End-to-End

**Step 1: Run all enforcement tests**

Run: `npx vitest run server/services/enforcement/__tests__/ --reporter verbose`
Expected: All tests pass (integration + engine-tools + ab-agent-tools)

**Step 2: Run full project TypeScript check**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

**Step 3: Verify the server starts**

Run: `timeout 10 npx tsx server/index.ts 2>&1 || true`
Expected: Server starts without import errors

**Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(fwa): resolve any remaining TypeScript or test issues"
```
