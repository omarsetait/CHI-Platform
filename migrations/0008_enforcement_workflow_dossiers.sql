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
