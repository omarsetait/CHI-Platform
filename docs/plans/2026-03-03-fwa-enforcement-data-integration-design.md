# FWA Enforcement Data Integration — Design Document

**Date:** 2026-03-03
**Status:** Approved
**Depends on:** `2026-03-03-fwa-agentic-enforcement-workflow-design.md` (already implemented)

## Problem Statement

The agentic enforcement workflow (7 stage agents, case router, orchestrator) is built and tested, but disconnected from real data:

1. Engine tool wrappers pass `undefined` claim data to detection engines
2. Enforcement cases don't link to actual claims
3. A/B agent tools return empty stubs instead of querying real data
4. Workflow doesn't auto-start on case creation
5. KB embeddings for RAG/LLM engine not verified

## Design Decision: Reuse Pre-Computed Results

Instead of re-running the 5 detection engines live during workflow execution (slow, 2-10s per engine), **reuse pre-computed results** from the batch pipeline stored in `fwa_detection_results`. The engines already ran during batch processing. The LLM agents reason over cached results.

**Trade-offs:**
- Fast: no engine latency during workflow (~10-15s total for 3 autonomous stages)
- Data exists: batch pipeline has already analyzed claims
- Results may be stale for long-running cases (acceptable — Appeal stage can re-run if needed)

## Revised End-to-End Data Flow

```
User selects provider → "New Case"
  │
  ▼
Backend: Query provider's flagged claims (fwa_analyzed_claims)
  → Fetch detection results (fwa_detection_results) for those claims
  → Pick top suspicious claims by composite score
  │
  ▼
Create enforcement case (linked to provider + claim IDs)
  → Auto-create dossier (pre-loaded with claim IDs + engine results)
  → Auto-start workflow → Finding Agent → Warning → Corrective Action
  → Stops at Penalty Proposed (HITL gate, ~10-15s)
  │
  ▼
User reviews dossier → approves/rejects at HITL gate
  → Workflow continues to Resolution → Decision Package generated
```

## Gap 1: Engine Tool Wrappers — Read Pre-Computed Results

### Current (broken)
```typescript
execute: async (params) => {
  const result = await runRuleEngineDetection(params.claimData); // undefined!
}
```

### New Design
```typescript
execute: async (params) => {
  const results = await storage.getDetectionResultsByClaimId(params.claimId);
  return {
    engine: 'rule_engine',
    score: results.ruleEngineScore,
    findings: results.ruleEngineFindings,
  };
}
```

**Storage injection:** Tools need a `storage: IStorage` reference. Change tool factories to accept storage as a parameter: `getEngineTools(types, storage)` and `getToolsForStage(stage, storage)`. The orchestrator passes storage down from the route handler.

| Tool | Reads from `fwa_detection_results` |
|------|-------------------------------------|
| `rule_engine` | `ruleEngineScore` + `ruleEngineFindings` |
| `statistical` | `statisticalScore` + `statisticalFindings` |
| `unsupervised` | `unsupervisedScore` + `unsupervisedFindings` |
| `rag_llm` | `ragLlmScore` + `ragLlmFindings` |
| `semantic` | Extracted from `compositeScore` + semantic portion of findings |

**New storage method needed:**
```typescript
getDetectionResultsByClaimId(claimId: string): Promise<FwaDetectionResult | undefined>
getDetectionResultsByProvider(providerId: string): Promise<FwaDetectionResult[]>
```

## Gap 2: A/B Agent Tools — Connect to Real Data

| Tool | Query |
|------|-------|
| `a1_analysis` | `storage.getFwaAnalysisFindings(caseId)` — existing method |
| `a2_categorization` | `storage.getFwaCategories(caseId)` + `storage.getFwaBehaviors()` |
| `a3_action` | `storage.getFwaActions(caseId)` + enforcement case history |
| `b1_regulatory` | `storage.getFwaRegulatoryDocs()` — text search by query |
| `b2_medical` | `storage.getFwaMedicalGuidelines()` — text search by query |
| `b3_history` | `storage.getProvider360(providerId)` / `getPatient360` / `getDoctor360` |

All use simple SQL queries against existing tables. No embeddings needed.

**Storage injection:** Same pattern — `getAgentTools(types, storage)`.

## Gap 3: Case-to-Claims Linking + Auto-Workflow

### Enforcement case creation changes:

1. Accept `providerId` + violation details (unchanged)
2. **New:** Query `fwa_analyzed_claims` for this provider, sorted by composite score
3. **New:** Take top N claims (default 10) as the case's claim set
4. Create enforcement case with `linkedFwaCaseIds` populated
5. **New:** Auto-create dossier with:
   - `claimIds` from step 3
   - `entities.providerId` from input
   - Pre-loaded `evidence.engineResults` from `fwa_detection_results`
6. **New:** Auto-start `orchestrator.runUntilGate(dossier)`
7. Return enforcement case + dossier + workflow result

### New storage methods needed:
```typescript
getAnalyzedClaimsByProvider(providerId: string, limit?: number): Promise<FwaAnalyzedClaim[]>
```

## Gap 4: Storage Injection Through the Stack

Current tool creation is static:
```typescript
// tool-registry.ts
export function getToolsForStage(stage) {
  return [...getEngineTools(config.engines), ...getAgentTools(config.agents)];
}
```

New: pass storage through:
```typescript
export function getToolsForStage(stage, storage: IStorage) {
  return [...getEngineTools(config.engines, storage), ...getAgentTools(config.agents, storage)];
}
```

This propagates from:
```
Route handler (has storage)
  → Orchestrator (receives storage in constructor)
    → BaseEnforcementAgent.execute (receives storage)
      → getToolsForStage(stage, storage)
        → Individual tools (have storage reference)
```

## Gap 5: Verify KB Data Exists

Before the A/B tools can query regulatory/medical docs:
- Check if `fwa_regulatory_docs` has records
- Check if `fwa_medical_guidelines` has records
- Check if `policy_violation_catalogue` has records
- If empty, seed with demo data from the existing seeder

## Files to Modify

| File | Changes |
|------|---------|
| `server/services/enforcement/tools/engine-tools.ts` | Accept storage, fetch from fwa_detection_results |
| `server/services/enforcement/tools/ab-agent-tools.ts` | Accept storage, query real tables |
| `server/services/enforcement/tools/tool-registry.ts` | Pass storage through |
| `server/services/enforcement/tools/agent-tool.ts` | Add storage to factory |
| `server/services/enforcement/agents/base-agent.ts` | Accept and pass storage |
| `server/services/enforcement/workflow-orchestrator.ts` | Accept and pass storage |
| `server/routes/enforcement-workflow-routes.ts` | Auto-workflow on creation, pass storage |
| `server/storage.ts` | Add getDetectionResultsByClaimId, getAnalyzedClaimsByProvider |
| `server/services/enforcement/__tests__/integration.test.ts` | Update tests for storage injection |
