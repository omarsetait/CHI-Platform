-- Scalability Indexes for FWA Detection Platform
-- Optimized for millions of records across providers, doctors, patients

-- ===========================================
-- CLAIMS TABLE INDEXES
-- ===========================================

-- Primary filtering indexes for FWA rule queries
CREATE INDEX IF NOT EXISTS idx_claims_provider_id ON claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_service_date ON claims(service_date);
CREATE INDEX IF NOT EXISTS idx_claims_registration_date ON claims(registration_date);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_flagged ON claims(flagged);
CREATE INDEX IF NOT EXISTS idx_claims_claim_type ON claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_hospital ON claims(hospital);

-- Composite indexes for common FWA rule queries
CREATE INDEX IF NOT EXISTS idx_claims_provider_service_date ON claims(provider_id, service_date);
CREATE INDEX IF NOT EXISTS idx_claims_patient_service_date ON claims(patient_id, service_date);
CREATE INDEX IF NOT EXISTS idx_claims_provider_claim_type ON claims(provider_id, claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_provider_flagged ON claims(provider_id, flagged);
CREATE INDEX IF NOT EXISTS idx_claims_hospital_service_date ON claims(hospital, service_date);

-- GIN indexes for array columns (CPT codes, diagnosis codes)
CREATE INDEX IF NOT EXISTS idx_claims_cpt_codes ON claims USING GIN(cpt_codes);
CREATE INDEX IF NOT EXISTS idx_claims_diagnosis_codes ON claims USING GIN(diagnosis_codes);

-- Amount range queries for outlier detection
CREATE INDEX IF NOT EXISTS idx_claims_amount ON claims(amount);
CREATE INDEX IF NOT EXISTS idx_claims_outlier_score ON claims(outlier_score);

-- ===========================================
-- FWA CASES TABLE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_fwa_cases_provider_id ON fwa_cases(provider_id);
CREATE INDEX IF NOT EXISTS idx_fwa_cases_patient_id ON fwa_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_fwa_cases_status ON fwa_cases(status);
CREATE INDEX IF NOT EXISTS idx_fwa_cases_created_at ON fwa_cases(created_at);

-- Composite indexes for FWA case queries
CREATE INDEX IF NOT EXISTS idx_fwa_cases_provider_status ON fwa_cases(provider_id, status);

-- ===========================================
-- PROVIDER DIRECTORY TABLE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_provider_dir_name ON provider_directory(name);
CREATE INDEX IF NOT EXISTS idx_provider_dir_specialty ON provider_directory(specialty);
CREATE INDEX IF NOT EXISTS idx_provider_dir_city ON provider_directory(city);
CREATE INDEX IF NOT EXISTS idx_provider_dir_npi ON provider_directory(npi);
CREATE INDEX IF NOT EXISTS idx_provider_dir_contract_status ON provider_directory(contract_status);

-- ===========================================
-- FWA HIGH-RISK ENTITIES INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_high_risk_providers_risk ON fwa_high_risk_providers(risk_score);
CREATE INDEX IF NOT EXISTS idx_high_risk_providers_level ON fwa_high_risk_providers(risk_level);
CREATE INDEX IF NOT EXISTS idx_high_risk_doctors_risk ON fwa_high_risk_doctors(risk_score);
CREATE INDEX IF NOT EXISTS idx_high_risk_doctors_level ON fwa_high_risk_doctors(risk_level);
CREATE INDEX IF NOT EXISTS idx_high_risk_patients_risk ON fwa_high_risk_patients(risk_score);
CREATE INDEX IF NOT EXISTS idx_high_risk_patients_level ON fwa_high_risk_patients(risk_level);

-- ===========================================
-- CONTEXT 360 TABLE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_provider_360_provider_id ON provider_360(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_360_risk ON provider_360(risk_score);
CREATE INDEX IF NOT EXISTS idx_doctor_360_doctor_id ON doctor_360(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_360_risk ON doctor_360(risk_score);
CREATE INDEX IF NOT EXISTS idx_patient_360_patient_id ON patient_360(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_360_risk ON patient_360(risk_score);

-- ===========================================
-- PRE-AUTH CLAIMS INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_preauth_claims_provider_id ON pre_auth_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_preauth_claims_member_id ON pre_auth_claims(member_id);
CREATE INDEX IF NOT EXISTS idx_preauth_claims_status ON pre_auth_claims(status);
CREATE INDEX IF NOT EXISTS idx_preauth_claims_batch_id ON pre_auth_claims(batch_id);
CREATE INDEX IF NOT EXISTS idx_preauth_claims_created_at ON pre_auth_claims(created_at);

-- ===========================================
-- AUDIT LOGS INDEXES (for HIPAA compliance queries)
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);

-- ===========================================
-- STATISTICAL FEATURE STORE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_provider_statistics_provider_id ON provider_statistics(provider_id);
CREATE INDEX IF NOT EXISTS idx_doctor_statistics_doctor_id ON doctor_statistics(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_statistics_patient_id ON patient_statistics(patient_id);
CREATE INDEX IF NOT EXISTS idx_specialty_baselines_specialty ON specialty_baselines(specialty);
CREATE INDEX IF NOT EXISTS idx_population_statistics_metric_name ON population_statistics(metric_name);

-- ===========================================
-- ONLINE LISTENING INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_online_mentions_provider_name ON online_listening_mentions(provider_name);
CREATE INDEX IF NOT EXISTS idx_online_mentions_source ON online_listening_mentions(source);
CREATE INDEX IF NOT EXISTS idx_online_mentions_sentiment ON online_listening_mentions(sentiment);
CREATE INDEX IF NOT EXISTS idx_online_mentions_published_at ON online_listening_mentions(published_at);

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Scalability indexes created successfully';
END $$;
