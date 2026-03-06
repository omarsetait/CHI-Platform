import { sql } from "drizzle-orm";
import { db } from "./db";

export async function createDatabaseIndexes(): Promise<void> {
  console.log("[DB] Creating database indexes...");
  
  try {
    await db.execute(sql`
      -- FWA Cases indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_cases_status ON fwa_cases(status);
      CREATE INDEX IF NOT EXISTS idx_fwa_cases_phase ON fwa_cases(phase);
      CREATE INDEX IF NOT EXISTS idx_fwa_cases_priority ON fwa_cases(priority);
      CREATE INDEX IF NOT EXISTS idx_fwa_cases_provider_id ON fwa_cases(provider_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_cases_patient_id ON fwa_cases(patient_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_cases_created_at ON fwa_cases(created_at);
      
      -- FWA Analysis Findings indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_analysis_findings_case_id ON fwa_analysis_findings(case_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_analysis_findings_type ON fwa_analysis_findings(finding_type);
      CREATE INDEX IF NOT EXISTS idx_fwa_analysis_findings_source ON fwa_analysis_findings(source);
      CREATE INDEX IF NOT EXISTS idx_fwa_analysis_findings_severity ON fwa_analysis_findings(severity);
      
      -- FWA Categories indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_categories_case_id ON fwa_categories(case_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_categories_type ON fwa_categories(category_type);
      
      -- FWA Actions indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_actions_case_id ON fwa_actions(case_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_actions_status ON fwa_actions(status);
      CREATE INDEX IF NOT EXISTS idx_fwa_actions_type ON fwa_actions(action_type);
      
      -- FWA Behaviors indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_behaviors_category ON fwa_behaviors(category);
      CREATE INDEX IF NOT EXISTS idx_fwa_behaviors_status ON fwa_behaviors(status);
      CREATE INDEX IF NOT EXISTS idx_fwa_behaviors_priority ON fwa_behaviors(priority);
      
      -- Pre-Auth Claims indexes
      CREATE INDEX IF NOT EXISTS idx_pre_auth_claims_status ON pre_auth_claims(status);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_claims_batch_id ON pre_auth_claims(batch_id);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_claims_created_at ON pre_auth_claims(created_at);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_claims_provider_id ON pre_auth_claims(provider_id);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_claims_member_id ON pre_auth_claims(member_id);
      
      -- Pre-Auth Signals indexes
      CREATE INDEX IF NOT EXISTS idx_pre_auth_signals_claim_id ON pre_auth_signals(claim_id);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_signals_detector ON pre_auth_signals(detector);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_signals_severity ON pre_auth_signals(severity);
      
      -- Pre-Auth Decisions indexes
      CREATE INDEX IF NOT EXISTS idx_pre_auth_decisions_claim_id ON pre_auth_decisions(claim_id);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_decisions_is_final ON pre_auth_decisions(is_final);
      
      -- Pre-Auth Batches indexes
      CREATE INDEX IF NOT EXISTS idx_pre_auth_batches_status ON pre_auth_batches(status);
      CREATE INDEX IF NOT EXISTS idx_pre_auth_batches_priority ON pre_auth_batches(priority);
      
      -- Claim Ingest Items indexes
      CREATE INDEX IF NOT EXISTS idx_claim_ingest_items_batch_id ON claim_ingest_items(batch_id);
      CREATE INDEX IF NOT EXISTS idx_claim_ingest_items_status ON claim_ingest_items(status);
      CREATE INDEX IF NOT EXISTS idx_claim_ingest_items_stage ON claim_ingest_items(current_stage);
      CREATE INDEX IF NOT EXISTS idx_claim_ingest_items_created_at ON claim_ingest_items(created_at);
      
      -- Claim Ingest Batches indexes
      CREATE INDEX IF NOT EXISTS idx_claim_ingest_batches_status ON claim_ingest_batches(status);
      
      -- Provider Benchmarks indexes
      CREATE INDEX IF NOT EXISTS idx_provider_benchmarks_provider_id ON provider_benchmarks(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_benchmarks_peer_group_id ON provider_benchmarks(peer_group_id);
      CREATE INDEX IF NOT EXISTS idx_provider_benchmarks_period_start ON provider_benchmarks(period_start);
      
      -- Operational Findings Ledger indexes
      CREATE INDEX IF NOT EXISTS idx_operational_findings_provider_id ON operational_findings_ledger(provider_id);
      CREATE INDEX IF NOT EXISTS idx_operational_findings_status ON operational_findings_ledger(status);
      CREATE INDEX IF NOT EXISTS idx_operational_findings_category ON operational_findings_ledger(category);
      
      -- Evidence Packs indexes
      CREATE INDEX IF NOT EXISTS idx_evidence_packs_provider_id ON evidence_packs(provider_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_packs_status ON evidence_packs(status);
      
      -- Reconciliation Sessions indexes
      CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_provider_id ON reconciliation_sessions(provider_id);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_status ON reconciliation_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_scheduled_date ON reconciliation_sessions(scheduled_date);
      
      -- Context 360 indexes
      CREATE INDEX IF NOT EXISTS idx_patient_360_patient_id ON patient_360(patient_id);
      CREATE INDEX IF NOT EXISTS idx_provider_360_provider_id ON provider_360(provider_id);
      CREATE INDEX IF NOT EXISTS idx_doctor_360_doctor_id ON doctor_360(doctor_id);
      
      -- Digital Twins indexes
      CREATE INDEX IF NOT EXISTS idx_digital_twins_source_type ON digital_twins(source_type);
      CREATE INDEX IF NOT EXISTS idx_digital_twins_status ON digital_twins(status);
      
      -- Ghost Runs indexes
      CREATE INDEX IF NOT EXISTS idx_ghost_runs_status ON ghost_runs(status);
      CREATE INDEX IF NOT EXISTS idx_ghost_runs_agent_type ON ghost_runs(agent_type);
      
      -- Collusion Rings indexes
      CREATE INDEX IF NOT EXISTS idx_collusion_rings_status ON collusion_rings(status);
      CREATE INDEX IF NOT EXISTS idx_collusion_rings_ring_type ON collusion_rings(ring_type);
      
      -- Audit Logs indexes
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      
      -- Users indexes
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
      
      -- Agent Reports indexes
      CREATE INDEX IF NOT EXISTS idx_agent_reports_entity_id ON agent_reports(entity_id);
      CREATE INDEX IF NOT EXISTS idx_agent_reports_entity_type ON agent_reports(entity_type);
      CREATE INDEX IF NOT EXISTS idx_agent_reports_status ON agent_reports(status);
      
      -- FWA Feedback Events indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_feedback_events_case_id ON fwa_feedback_events(case_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_feedback_events_entity_id ON fwa_feedback_events(entity_id);
      
      -- Claims Feedback Events indexes
      CREATE INDEX IF NOT EXISTS idx_claims_feedback_events_claim_id ON claims_feedback_events(claim_id);
      CREATE INDEX IF NOT EXISTS idx_claims_feedback_events_provider_id ON claims_feedback_events(provider_id);
      
      -- Agent Performance Metrics indexes
      CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_id ON agent_performance_metrics(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_module ON agent_performance_metrics(module);
      
      -- Reconciliation Entities indexes
      CREATE INDEX IF NOT EXISTS idx_reconciliation_entities_entity_id ON reconciliation_entities(entity_id);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_entities_entity_type ON reconciliation_entities(entity_type);

      -- Claims V2 indexes (most-queried table)
      CREATE INDEX IF NOT EXISTS idx_claims_v2_member_id ON claims_v2(member_id);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_provider_id ON claims_v2(provider_id);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_practitioner_id ON claims_v2(practitioner_id);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_service_date ON claims_v2(service_date);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_status ON claims_v2(status);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_primary_diagnosis ON claims_v2(primary_diagnosis);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_claim_type ON claims_v2(claim_type);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_created_at ON claims_v2(created_at);
      CREATE INDEX IF NOT EXISTS idx_claims_v2_flagged ON claims_v2(flagged) WHERE flagged = true;

      -- Service Lines indexes
      CREATE INDEX IF NOT EXISTS idx_service_lines_claim_id ON service_lines(claim_id);
      CREATE INDEX IF NOT EXISTS idx_service_lines_service_code ON service_lines(service_code);

      -- Detection Results indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_claim_id ON fwa_detection_results(claim_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_provider_id ON fwa_detection_results(provider_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_composite_score ON fwa_detection_results(composite_score);
      CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_risk_level ON fwa_detection_results(composite_risk_level);
      CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_analyzed_at ON fwa_detection_results(analyzed_at);

      -- Provider Detection Results indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_provider_detection_provider_id ON fwa_provider_detection_results(provider_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_provider_detection_risk_level ON fwa_provider_detection_results(risk_level);

      -- Entity Timeline indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_provider_timeline_provider_id ON fwa_provider_timeline(provider_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_provider_timeline_batch_date ON fwa_provider_timeline(batch_date);
      CREATE INDEX IF NOT EXISTS idx_fwa_doctor_timeline_doctor_id ON fwa_doctor_timeline(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_fwa_patient_timeline_patient_id ON fwa_patient_timeline(patient_id);

      -- Feature Store indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_feature_store_entity ON fwa_feature_store(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_provider_feature_store_provider_id ON provider_feature_store(provider_id);
      CREATE INDEX IF NOT EXISTS idx_member_feature_store_member_id ON member_feature_store(member_id);

      -- Enforcement indexes
      CREATE INDEX IF NOT EXISTS idx_enforcement_cases_status ON enforcement_cases(status);
      CREATE INDEX IF NOT EXISTS idx_enforcement_cases_provider_id ON enforcement_cases(provider_id);
      CREATE INDEX IF NOT EXISTS idx_enforcement_dossiers_case_id ON enforcement_dossiers(case_id);

      -- Chat indexes
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON chat_conversations(session_id);

      -- KPI indexes
      CREATE INDEX IF NOT EXISTS idx_kpi_results_definition_id ON kpi_results(kpi_definition_id);
      CREATE INDEX IF NOT EXISTS idx_kpi_results_period_start ON kpi_results(period_start);

      -- High-risk entity indexes
      CREATE INDEX IF NOT EXISTS idx_fwa_high_risk_providers_risk_level ON fwa_high_risk_providers(risk_level);
      CREATE INDEX IF NOT EXISTS idx_fwa_high_risk_patients_risk_level ON fwa_high_risk_patients(risk_level);
      CREATE INDEX IF NOT EXISTS idx_fwa_high_risk_doctors_risk_level ON fwa_high_risk_doctors(risk_level);

      -- Knowledge documents indexes
      CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON knowledge_documents(category);
      CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(processing_status);
    `);
    
    console.log("[DB] Database indexes created successfully");
  } catch (error) {
    console.error("[DB] Error creating indexes:", error);
  }

  // Create backward-compatibility views for legacy table names
  try {
    await db.execute(sql`
      CREATE OR REPLACE VIEW fwa_analyzed_claims AS
      SELECT
        id,
        claim_number as claim_reference,
        member_id as patient_id,
        provider_id,
        primary_diagnosis as icd,
        cpt_codes[1] as cpt,
        amount as total_amount,
        status,
        service_date,
        created_at
      FROM claims_v2;
    `);
    console.log("[DB] Backward-compatibility views created successfully");
  } catch (error) {
    console.error("[DB] Error creating backward-compatibility views:", error);
  }
}
