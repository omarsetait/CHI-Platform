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
