import { describe, it, expect, vi } from 'vitest';
import { CaseRouter } from '../case-router';
import { EnforcementWorkflowOrchestrator } from '../workflow-orchestrator';
import type { CaseDossier } from '../../../../shared/types/enforcement-workflow';
import type { LLMProvider, ChatParams } from '../../llm/llm-provider';
import type { IStorage } from '../../../storage';

// Mock the tool registry so agents don't attempt real engine/tool calls.
// getToolsForStage returns an empty array — agents will skip the tool loop
// and immediately parse the first LLM response as the decision.
vi.mock('../tools/tool-registry', () => ({
  getToolsForStage: vi.fn().mockReturnValue([]),
  getToolConfigForStage: vi.fn().mockReturnValue(undefined),
}));

// ---------------------------------------------------------------------------
// CaseRouter unit tests
// ---------------------------------------------------------------------------
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
    it('penalty_applied → resolved', () => {
      expect(router.getNextStage('penalty_applied', 'advance')).toBe('resolved');
    });
  });

  describe('non-linear transitions', () => {
    it('finding dismiss → closed', () => {
      expect(router.getNextStage('finding', 'dismiss')).toBe('closed');
    });
    it('finding escalate → penalty_proposed', () => {
      expect(router.getNextStage('finding', 'escalate')).toBe('penalty_proposed');
    });
    it('corrective_action resolve → resolved', () => {
      expect(router.getNextStage('corrective_action', 'resolve')).toBe('resolved');
    });
    it('appeal_review uphold → resolved', () => {
      expect(router.getNextStage('appeal_review', 'uphold')).toBe('resolved');
    });
    it('appeal_review overturn → resolved', () => {
      expect(router.getNextStage('appeal_review', 'overturn')).toBe('resolved');
    });
    it('appeal_review modify → penalty_proposed', () => {
      expect(router.getNextStage('appeal_review', 'modify')).toBe('penalty_proposed');
    });
    it('appeal_review remand → finding', () => {
      expect(router.getNextStage('appeal_review', 'remand')).toBe('finding');
    });
  });

  describe('hold/extend', () => {
    it('hold stays in current stage', () => {
      expect(router.getNextStage('penalty_applied', 'hold')).toBe('penalty_applied');
    });
    it('extend stays in current stage', () => {
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
  });
});

// ---------------------------------------------------------------------------
// EnforcementWorkflowOrchestrator integration tests
// ---------------------------------------------------------------------------
describe('EnforcementWorkflowOrchestrator', () => {
  // Storage is never actually used because getToolsForStage is mocked to return [].
  // Provide a minimal mock to satisfy the type signature.
  const mockStorage = {} as IStorage;

  /**
   * Creates a mock LLMProvider that returns sequential responses.
   * Each call to chat() returns the next response in the array.
   * The responses should be JSON strings matching the decision format
   * expected by the agent's parseDecision method.
   */
  function createSequentialProvider(responses: string[]): LLMProvider {
    let callIndex = 0;
    return {
      model: 'test',
      chat: vi.fn().mockImplementation(async (_params: ChatParams) => {
        const response = responses[callIndex] || responses[responses.length - 1];
        callIndex++;
        return { content: response, finishReason: 'stop' };
      }),
    };
  }

  /**
   * Creates a minimal CaseDossier at the given stage for testing.
   */
  function createDossier(stage: string = 'finding'): CaseDossier {
    return {
      caseId: 'integration-test',
      enforcementCaseId: 'enf-int',
      claimIds: ['claim-1'],
      entities: { providerId: 'prov-1' },
      currentStage: stage as CaseDossier['currentStage'],
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

  it('executeStage advances finding to warning', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'advance', reasoning: 'Evidence found', confidence: 0.85 }),
    ]);
    const orchestrator = new EnforcementWorkflowOrchestrator(provider, mockStorage);
    const result = await orchestrator.executeStage(createDossier('finding'));

    expect(result.decision).toBe('advance');
    expect(result.nextStage).toBe('warning_issued');
    expect(result.requiresHITL).toBe(false);
  });

  it('runUntilGate stops at penalty (HITL)', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'advance', reasoning: 'Evidence found', confidence: 0.85 }),
      JSON.stringify({ decision: 'advance', reasoning: 'Warning issued', confidence: 0.9 }),
      JSON.stringify({ decision: 'advance', reasoning: 'Corrections insufficient', confidence: 0.88 }),
    ]);
    const orchestrator = new EnforcementWorkflowOrchestrator(provider, mockStorage);
    const result = await orchestrator.runUntilGate(createDossier());

    expect(result.nextStage).toBe('penalty_proposed');
    expect(result.requiresHITL).toBe(true);
    expect(result.enrichedDossier.stageHistory.length).toBeGreaterThanOrEqual(3);
  });

  it('dismiss at finding closes the case', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'dismiss', reasoning: 'No evidence', confidence: 0.95 }),
    ]);
    const orchestrator = new EnforcementWorkflowOrchestrator(provider, mockStorage);
    const result = await orchestrator.runUntilGate(createDossier());

    expect(result.nextStage).toBe('closed');
    expect(result.decision).toBe('dismiss');
  });

  it('escalate at finding jumps to penalty (HITL)', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'escalate', reasoning: 'Critical fraud', confidence: 0.98, targetStage: 'penalty_proposed' }),
    ]);
    const orchestrator = new EnforcementWorkflowOrchestrator(provider, mockStorage);
    const result = await orchestrator.runUntilGate(createDossier());

    expect(result.nextStage).toBe('penalty_proposed');
    expect(result.requiresHITL).toBe(true);
  });

  it('corrective action resolve reaches resolved', async () => {
    const provider = createSequentialProvider([
      JSON.stringify({ decision: 'advance', reasoning: 'Evidence found', confidence: 0.85 }),
      JSON.stringify({ decision: 'advance', reasoning: 'Warning issued', confidence: 0.9 }),
      JSON.stringify({ decision: 'resolve', reasoning: 'Provider corrected', confidence: 0.92 }),
    ]);
    const orchestrator = new EnforcementWorkflowOrchestrator(provider, mockStorage);
    const result = await orchestrator.runUntilGate(createDossier());

    expect(['resolved', 'closed']).toContain(result.nextStage);
  });
});
