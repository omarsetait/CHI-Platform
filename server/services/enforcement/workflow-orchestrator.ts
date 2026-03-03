import type {
  CaseDossier,
  EnforcementStage,
  StageDecision,
  StageTransition,
} from '../../../shared/types/enforcement-workflow';
import type { LLMProvider } from '../llm/llm-provider';
import { CaseRouter } from './case-router';
import { getAgentForStage } from './agents';
import type { IStorage } from '../../storage';

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
  private storage: IStorage;

  constructor(provider: LLMProvider, storage: IStorage) {
    this.provider = provider;
    this.storage = storage;
    this.router = new CaseRouter();
  }

  async executeStage(dossier: CaseDossier): Promise<StageExecutionResult> {
    const currentStage = dossier.currentStage;
    const agent = getAgentForStage(currentStage);
    const agentResult = await agent.execute(dossier, this.provider, this.storage);

    const nextStage = this.router.getNextStage(
      currentStage,
      agentResult.decision,
      agentResult.targetStage
    );

    const requiresHITL = this.router.requiresHITL(nextStage);

    const transition: StageTransition = {
      fromStage: currentStage,
      toStage: nextStage,
      decision: agentResult.decision,
      agentId: `enforcement-${currentStage}`,
      reasoning: agentResult.reasoning,
      confidence: agentResult.confidence,
      timestamp: new Date(),
    };

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

  async runUntilGate(dossier: CaseDossier): Promise<StageExecutionResult> {
    let current = dossier;
    let lastResult: StageExecutionResult | null = null;

    const terminalStages: Set<EnforcementStage> = new Set<EnforcementStage>(['closed', 'resolved']);
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      if (terminalStages.has(current.currentStage)) break;

      const result = await this.executeStage(current);
      lastResult = result;

      if (result.requiresHITL) return result;
      if (terminalStages.has(result.nextStage)) return result;

      current = result.enrichedDossier;
    }

    if (!lastResult) throw new Error('Workflow produced no results');
    return lastResult;
  }

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

    return this.runUntilGate(updatedDossier);
  }
}
