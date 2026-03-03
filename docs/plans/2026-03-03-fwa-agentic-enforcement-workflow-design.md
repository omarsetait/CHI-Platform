# FWA Agentic Enforcement Workflow — Design Document

**Date:** 2026-03-03
**Status:** Approved
**Approach:** Stage-Specific LLM Agents + Smart Router Hybrid

## Problem Statement

The FWA module has 5 detection engine pillars, 6 agents (A1-A3, B1-B3), and an 8-stage enforcement workflow — but they are loosely connected. The agents are mostly UI concepts, and the enforcement stages lack autonomous decision-making. We need an agentic backbone that connects the engines to the enforcement workflow through LLM-orchestrated agents.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent autonomy | LLM-orchestrated agents | Each stage gets a reasoning agent that synthesizes engine outputs and makes decisions |
| Engine usage | Progressive depth | Early stages use fast engines (Rules, Statistical). Later stages unlock all 5. Optimizes cost and latency |
| Human-in-the-loop | Gates at Penalty + Appeal | Agents run autonomously through Finding→Warning→Corrective. Human approval required for financial/legal actions |
| Existing agents | A/B agents become tools | A1-A3 and B1-B3 become callable tools inside enforcement agents — not replaced, promoted to tool layer |
| LLM provider | LLM-agnostic abstraction | Provider interface supports OpenAI, Anthropic, Azure, local models. Swap without touching agent logic |
| Primary output | Enforcement Decision Package | Structured evidence document with engine results, agent reasoning, regulatory citations, and audit trail |

## Architecture Overview

```
                          ┌─────────────────────┐
                          │   Case Router        │
                          │   (State Machine)    │
                          │                      │
                          │  • Forward/backward  │
                          │  • Skip/loop logic   │
                          │  • HITL gate checks  │
                          └──────────┬───────────┘
                                     │ routes cases
          ┌──────────┬──────────┬────┴────┬──────────┬──────────┬──────────┐
          ▼          ▼          ▼         ▼          ▼          ▼          ▼
     ┌─────────┐┌─────────┐┌────────┐┌────────┐┌────────┐┌─────────┐┌────────┐
     │ Finding ││ Warning ││Correct-││Penalty ││Penalty ││ Appeal  ││Resolve │
     │ Agent   ││ Agent   ││ive     ││Propose ││Applied ││ Agent   ││ Agent  │
     │         ││         ││Action  ││Agent   ││Agent   ││         ││        │
     │         ││         ││Agent   ││[HITL]  ││[HITL]  ││[HITL]   ││        │
     └────┬────┘└────┬────┘└───┬────┘└───┬────┘└───┬────┘└────┬────┘└───┬────┘
          │          │         │         │         │          │         │
          └──────────┴─────────┴────┬────┴─────────┴──────────┴─────────┘
                                    │ agents call tools
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐┌──────────────┐┌──────────────┐
            │ A-Phase Tools││ B-Phase Tools││ Engine Tools  │
            │ A1: Analysis ││ B1: Regulatory│ (Progressive) │
            │ A2: Categorize│ B2: Medical  ││ Rules         │
            │ A3: Action   ││ B3: History  ││ Statistical   │
            └──────────────┘└──────────────┘│ Unsupervised  │
                                            │ RAG/LLM       │
                                            │ Semantic       │
                                            └──────────────┘
```

**Three layers:**
1. **Case Router** — deterministic state machine handling transitions. Not an LLM. Fast, cheap, predictable.
2. **Stage Agents** — LLM-powered agents with specialized prompts, dedicated tool kits, progressive engine access. Each receives and enriches a Case Dossier.
3. **Tool Layer** — A1-A3, B1-B3, and the 5 detection engines wrapped as callable tools via LLM tool-use.

## Case Dossier — Data Contract Between Agents

The Case Dossier is the shared state object flowing through the pipeline. Append-only for evidence — agents add findings but never remove previous work.

```typescript
interface CaseDossier {
  // Identity
  caseId: string;
  claimIds: string[];
  entities: {
    providerId?: string;
    patientId?: string;
    doctorId?: string;
  };

  // Current State
  currentStage: EnforcementStage;
  stageHistory: StageTransition[];

  // Progressive Evidence
  evidence: {
    engineResults: {
      ruleEngine?: EngineResult;       // from Finding stage
      statistical?: EngineResult;      // from Finding stage
      unsupervised?: EngineResult;     // from Warning stage
      ragLlm?: EngineResult;           // from Penalty stage
      semantic?: EngineResult;         // from Penalty stage
    };
    agentFindings: {
      a1Analysis?: AgentFinding;
      a2Categorization?: AgentFinding;
      a3ActionPlan?: AgentFinding;
      b1Regulatory?: AgentFinding;
      b2Medical?: AgentFinding;
      b3History?: AgentFinding;
    };
  };

  // Per-Stage Agent Reasoning
  stageDecisions: Record<EnforcementStage, {
    agentId: string;
    reasoning: string;
    decision: StageDecision;
    confidence: number;
    toolsInvoked: string[];
    timestamp: Date;
  }>;

  // Financial Impact
  financialImpact: {
    estimatedLoss: number;
    recoveryAmount: number;
    penaltyAmount?: number;
  };

  // Regulatory
  regulatoryCitations: RegulatoryReference[];
  violationCodes: string[];

  // HITL
  humanReviews: HumanReviewRecord[];
}
```

## Progressive Engine Depth

| Stage | Engines | A-Phase Tools | B-Phase Tools |
|-------|---------|---------------|---------------|
| Finding | Rules + Statistical | A1 | B3 |
| Warning | Rules + Statistical + Unsupervised | A1, A2 | B1, B3 |
| Corrective Action | Rules + Statistical + Unsupervised | A1, A3 | B1, B2 |
| Penalty Proposed | All 5 engines | A1, A2, A3 | B1, B2, B3 |
| Penalty Applied | All 5 engines | A1, A2, A3 | B1, B2, B3 |
| Appeal Review | All 5 + fresh re-run | A1, A2 | B1, B2, B3 |
| Resolution | All 5 (final validation) | A1, A2, A3 | B1, B2, B3 |

## Agent Specifications

### Finding Agent
- **Role:** First responder. Ingests raw detection results, documents the FWA finding with initial evidence.
- **Engines:** Rules + Statistical
- **Tools:** A1 (root cause analysis), B3 (entity history)
- **Decisions:** `advance` (→ Warning) | `dismiss` (insufficient evidence) | `escalate` (critical → Penalty)
- **Dossier contribution:** Initial evidence summary, entity risk profile, preliminary FWA category

### Warning Agent
- **Role:** Builds formal warning package with evidence citations and provider notification.
- **Engines:** Rules + Statistical + Unsupervised
- **Tools:** A1, A2 (categorization), B1 (regulatory), B3 (history)
- **Decisions:** `advance` (→ Corrective Action) | `loop_back` (→ Finding) | `escalate` (→ Penalty)
- **Dossier contribution:** Formal violation description, FWA type, regulatory citations, 30-day corrective deadline

### Corrective Action Agent
- **Role:** Monitors provider response, evaluates whether corrections address the violation.
- **Engines:** Rules + Statistical + Unsupervised
- **Tools:** A1, A3 (action monitoring), B1, B2 (medical)
- **Decisions:** `resolve` (corrections sufficient → Resolution) | `advance` (insufficient → Penalty) | `extend` (more time)
- **Dossier contribution:** Correction assessment, compliance gap analysis, timeline evaluation

### Penalty Proposal Agent [HITL Gate]
- **Role:** Calculates regulatory penalty based on severity, precedent, and financial impact.
- **Engines:** All 5
- **Tools:** A1, A2, A3, B1, B2, B3
- **Decisions:** `advance` (→ Penalty Applied, after HITL) | `loop_back` (→ Corrective Action) | `reduce` (re-calculate)
- **Dossier contribution:** Penalty calculation, regulatory precedents, financial impact, recommended amount

### Penalty Applied Agent [HITL Gate]
- **Role:** Validates and records the applied penalty. Generates enforcement decision package.
- **Engines:** All 5
- **Tools:** A1, A2, A3, B1, B2, B3
- **Decisions:** `advance` (→ Resolution if no appeal) | `hold` (awaiting appeal window)
- **Dossier contribution:** Applied penalty record, enforcement action log, provider notification

### Appeal Agent [HITL Gate]
- **Role:** Reviews provider appeal against original evidence. Re-runs engines with fresh data.
- **Engines:** All 5 + fresh re-run
- **Tools:** A1, A2, B1, B2, B3
- **Decisions:** `uphold` (→ Resolution) | `overturn` (→ Resolution) | `modify` (→ Penalty Proposed) | `remand` (→ Finding)
- **Dossier contribution:** Appeal analysis, counter-evidence, fresh engine comparison, final recommendation

### Resolution Agent
- **Role:** Closes the case. Produces the final Enforcement Decision Package.
- **Engines:** All 5 (final validation)
- **Tools:** A1, A2, A3, B1, B2, B3
- **Decisions:** `close`
- **Dossier contribution:** Final outcome summary, complete audit trail, lessons learned

## Case Router — State Machine

The router is deterministic (not an LLM). It reads agent decisions and applies transition rules.

```
              dismiss
        ┌──────────────── [CLOSED]
        │
   ┌────┴────┐   advance   ┌─────────┐   advance   ┌────────────┐
   │ Finding │────────────►│ Warning │────────────►│ Corrective │
   │ Agent   │             │ Agent   │◄────────────│ Action     │
   └────┬────┘             └────┬────┘  loop_back  └──┬─────┬───┘
        ▲                       │                     │     │
        │                       │ escalate    resolve │     │ advance
        │                       ▼                     │     │
        │               ┌──────────────┐              │     ▼
        │   remand      │   Penalty    │◄─────────────┘ ┌────────────┐
        │◄──────────────│   Proposal   │   modify       │  Penalty   │
        │               │   [HITL]     │◄───────────────│  Applied   │
        │               └──────┬───────┘                │  [HITL]    │
        │                      │ advance (HITL ok)      └──┬─────┬───┘
        │                      ▼                           │     │
        │               ┌──────────────┐                   │     │
        │               │   Penalty    │───────────────────┘     │
        │               │   Applied    │   hold (appeal window)  │
        │               │   [HITL]     │                         │
        │               └──────────────┘     advance (no appeal) │
        │                                                        │
        │               ┌──────────────┐                         │
        └───────────────│   Appeal     │◄────────────────────────┘
            remand      │   [HITL]     │       appeal_submitted
                        └──────┬───────┘
                               │ uphold / overturn
                               ▼
                        ┌──────────────┐
                        │  Resolution  │────► [CLOSED]
                        │  Agent       │
                        └──────────────┘
```

**Transition types:**
- `advance` → next stage in sequence
- `loop_back` → return to previous stage (agent specifies which)
- `escalate` → skip stages (e.g., Finding → Penalty for critical fraud)
- `dismiss` → close with insufficient evidence
- `resolve` → jump to Resolution (corrections sufficient)
- `hold` → stay in current stage (awaiting external event)
- `remand` → appeal sends case back to investigation

**HITL gate behavior:** When router reaches a HITL-gated stage, it queues the case for human review in `pending_review` status. Router checks review queue and resumes on approval.

## LLM-Agnostic Abstraction

```typescript
interface LLMProvider {
  chat(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse>;
}

interface EnforcementAgent {
  stage: EnforcementStage;
  systemPrompt: string;
  availableTools: AgentTool[];
  engineDepth: EngineType[];

  execute(dossier: CaseDossier, provider: LLMProvider): Promise<{
    enrichedDossier: CaseDossier;
    decision: StageDecision;
    reasoning: string;
    confidence: number;
  }>;
}

interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute(params: any): Promise<any>;
}

type ProviderConfig = {
  provider: 'openai' | 'anthropic' | 'azure' | 'local';
  model: string;
  apiKey: string;
  baseUrl?: string;
};
```

Existing functions (`runRuleEngineDetection()`, `runStatisticalDetection()`, etc.) in `server/services/fwa-pipeline-service.ts` get wrapped as `AgentTool` instances.

## Enforcement Decision Package (Final Output)

```typescript
interface EnforcementDecisionPackage {
  caseId: string;
  outcome: 'penalty_applied' | 'penalty_overturned' | 'corrected' | 'dismissed';
  executiveSummary: string;

  engineEvidence: {
    ruleViolations: RuleViolation[];
    statisticalAnomalies: StatisticalAnomaly[];
    clusterAnomalies: ClusterAnomaly[];
    ragFindings: RAGFinding[];
    semanticMismatches: SemanticMismatch[];
  };

  regulatoryCitations: {
    code: string;
    description: string;
    source: 'NPHIES' | 'CCHI' | 'MOH';
    relevance: string;
  }[];

  financialSummary: {
    totalClaimsAnalyzed: number;
    estimatedFraudAmount: number;
    recoveryRecommendation: number;
    penaltyAmount?: number;
  };

  agentDecisionLog: {
    stage: EnforcementStage;
    agent: string;
    decision: string;
    reasoning: string;
    confidence: number;
    timestamp: Date;
    engineResults: string[];
  }[];

  humanApprovals: {
    stage: EnforcementStage;
    reviewer: string;
    decision: string;
    notes: string;
    timestamp: Date;
  }[];
}
```

## Key Integration Points with Existing Code

| Existing Code | How It's Used |
|---------------|--------------|
| `server/services/fwa-pipeline-service.ts` — 5 detection engine functions | Wrapped as `AgentTool` instances for enforcement agents |
| `server/storage.ts` — fwaCases, fwaAnalysisFindings, fwaCategories, fwaActions tables | Extended with Case Dossier storage, stage transitions, agent decision logs |
| `server/routes/fwa-routes.ts` — case management endpoints | Extended with workflow execution, HITL approval, and dossier retrieval endpoints |
| `client/src/pages/fwa/enforcement.tsx` — enforcement UI | Enhanced with live agent status, dossier viewer, HITL approval interface |
| `client/src/pages/fwa/agent-config.tsx` — agent configuration | Extended with enforcement agent configs, engine depth settings, HITL thresholds |
| A1-A3, B1-B3 agent logic | Refactored into standalone tool functions callable by enforcement agents |
