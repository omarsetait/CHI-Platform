import { sql } from "drizzle-orm";
import { db } from "./db";

export async function createDatabaseConstraints(): Promise<void> {
  console.log("[DB] Creating database CHECK constraints...");
  
  try {
    await db.execute(sql`
      -- Amount constraints (non-negative values)
      DO $$ BEGIN
        ALTER TABLE fwa_cases 
          ADD CONSTRAINT chk_fwa_cases_total_amount CHECK (total_amount >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE fwa_cases 
          ADD CONSTRAINT chk_fwa_cases_recovery_amount CHECK (recovery_amount IS NULL OR recovery_amount >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE fwa_actions 
          ADD CONSTRAINT chk_fwa_actions_amount CHECK (amount IS NULL OR amount >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE pre_auth_claims 
          ADD CONSTRAINT chk_pre_auth_claims_total_amount CHECK (total_amount IS NULL OR total_amount >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE claim_ingest_items 
          ADD CONSTRAINT chk_claim_ingest_items_amount CHECK (amount >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE operational_findings_ledger 
          ADD CONSTRAINT chk_operational_findings_amount CHECK (potential_amount >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE evidence_packs 
          ADD CONSTRAINT chk_evidence_packs_amount CHECK (target_amount >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      -- Score/percentage constraints (0-100 or 0-1 range)
      DO $$ BEGIN
        ALTER TABLE fwa_analysis_findings 
          ADD CONSTRAINT chk_fwa_analysis_findings_confidence CHECK (confidence >= 0 AND confidence <= 100);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE fwa_categories 
          ADD CONSTRAINT chk_fwa_categories_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE fwa_categories 
          ADD CONSTRAINT chk_fwa_categories_severity CHECK (severity_score >= 0 AND severity_score <= 100);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE pre_auth_signals 
          ADD CONSTRAINT chk_pre_auth_signals_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE pre_auth_decisions 
          ADD CONSTRAINT chk_pre_auth_decisions_score CHECK (aggregated_score IS NULL OR (aggregated_score >= 0 AND aggregated_score <= 1));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE provider_benchmarks 
          ADD CONSTRAINT chk_provider_benchmarks_percentile CHECK (peer_percentile IS NULL OR (peer_percentile >= 0 AND peer_percentile <= 100));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      -- Phase/layer constraints (valid ranges)
      DO $$ BEGIN
        ALTER TABLE pre_auth_claims 
          ADD CONSTRAINT chk_pre_auth_claims_phase CHECK (processing_phase >= 1 AND processing_phase <= 6);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE pre_auth_policy_rules 
          ADD CONSTRAINT chk_pre_auth_policy_rules_layer CHECK (layer >= 1 AND layer <= 6);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE pre_auth_agent_configs 
          ADD CONSTRAINT chk_pre_auth_agent_configs_layer CHECK (layer >= 1 AND layer <= 6);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      -- Count constraints (non-negative integers)
      DO $$ BEGIN
        ALTER TABLE pre_auth_batches 
          ADD CONSTRAINT chk_pre_auth_batches_total CHECK (total_claims >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE pre_auth_batches 
          ADD CONSTRAINT chk_pre_auth_batches_processed CHECK (processed_claims >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE claim_ingest_batches 
          ADD CONSTRAINT chk_claim_ingest_batches_total CHECK (total_claims >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE claim_ingest_batches 
          ADD CONSTRAINT chk_claim_ingest_batches_processed CHECK (processed_claims >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      -- Temperature constraint for AI agents (0-2 range)
      DO $$ BEGIN
        ALTER TABLE pre_auth_agent_configs 
          ADD CONSTRAINT chk_pre_auth_agent_configs_temp CHECK (temperature IS NULL OR (temperature >= 0 AND temperature <= 2));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      -- Weight constraint for agents (0-1 range typically)
      DO $$ BEGIN
        ALTER TABLE pre_auth_agent_configs 
          ADD CONSTRAINT chk_pre_auth_agent_configs_weight CHECK (weight IS NULL OR (weight >= 0 AND weight <= 10));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      -- Risk score constraints
      DO $$ BEGIN
        ALTER TABLE reconciliation_entities 
          ADD CONSTRAINT chk_reconciliation_entities_risk CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      
      DO $$ BEGIN
        ALTER TABLE claim_ingest_items 
          ADD CONSTRAINT chk_claim_ingest_items_risk CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    
    console.log("[DB] Database CHECK constraints created successfully");
  } catch (error) {
    console.error("[DB] Error creating constraints:", error);
  }
}
