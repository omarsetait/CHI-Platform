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
    extend: 'corrective_action',
  },
  penalty_proposed: {
    advance: 'penalty_applied',
    loop_back: 'corrective_action',
    reduce: 'penalty_proposed',
  },
  penalty_applied: {
    advance: 'resolved',
    hold: 'penalty_applied',
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

const HITL_STAGES: Set<EnforcementStage> = new Set<EnforcementStage>([
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
    if (targetStage && (decision === 'loop_back' || decision === 'escalate' || decision === 'remand')) {
      return targetStage;
    }
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
