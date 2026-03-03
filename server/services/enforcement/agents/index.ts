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
