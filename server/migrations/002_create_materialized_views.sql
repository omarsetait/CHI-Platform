-- Materialized Views for FWA Statistical Analysis
-- Pre-computed aggregations for million-record scale

-- ===========================================
-- PROVIDER MONTHLY AGGREGATES
-- Used for trend analysis and baseline comparisons
-- ===========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_provider_monthly_stats AS
SELECT 
  provider_id,
  provider_name,
  hospital,
  DATE_TRUNC('month', service_date) AS month,
  COUNT(*) AS claim_count,
  SUM(CAST(amount AS DECIMAL)) AS total_amount,
  AVG(CAST(amount AS DECIMAL)) AS avg_amount,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(amount AS DECIMAL)) AS median_amount,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(amount AS DECIMAL)) AS p95_amount,
  AVG(CAST(outlier_score AS DECIMAL)) AS avg_outlier_score,
  SUM(CASE WHEN flagged = true THEN 1 ELSE 0 END) AS flagged_count,
  AVG(length_of_stay) AS avg_los,
  COUNT(DISTINCT patient_id) AS unique_patients,
  COUNT(DISTINCT claim_type) AS service_diversity
FROM claims
WHERE service_date IS NOT NULL AND provider_id IS NOT NULL
GROUP BY provider_id, provider_name, hospital, DATE_TRUNC('month', service_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_provider_monthly_pk 
ON mv_provider_monthly_stats(provider_id, month);

-- ===========================================
-- SPECIALTY BASELINE AGGREGATES
-- Population-level baselines by specialty
-- ===========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_specialty_baselines AS
SELECT 
  claim_type AS specialty,
  COUNT(*) AS total_claims,
  AVG(CAST(amount AS DECIMAL)) AS avg_amount,
  STDDEV(CAST(amount AS DECIMAL)) AS stddev_amount,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CAST(amount AS DECIMAL)) AS p25_amount,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(amount AS DECIMAL)) AS median_amount,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CAST(amount AS DECIMAL)) AS p75_amount,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(amount AS DECIMAL)) AS p95_amount,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY CAST(amount AS DECIMAL)) AS p99_amount,
  AVG(length_of_stay) AS avg_los,
  STDDEV(length_of_stay) AS stddev_los,
  AVG(CAST(outlier_score AS DECIMAL)) AS avg_outlier_score
FROM claims
WHERE claim_type IS NOT NULL
GROUP BY claim_type
HAVING COUNT(*) >= 10;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_specialty_baselines_pk 
ON mv_specialty_baselines(specialty);

-- ===========================================
-- PATIENT UTILIZATION AGGREGATES
-- For detecting patient-level FWA patterns
-- ===========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_patient_utilization AS
SELECT 
  patient_id,
  patient_name,
  COUNT(*) AS total_claims,
  COUNT(DISTINCT provider_id) AS unique_providers,
  COUNT(DISTINCT hospital) AS unique_hospitals,
  SUM(CAST(amount AS DECIMAL)) AS total_amount,
  AVG(CAST(amount AS DECIMAL)) AS avg_claim_amount,
  SUM(CASE WHEN flagged = true THEN 1 ELSE 0 END) AS flagged_claims,
  MIN(service_date) AS first_service_date,
  MAX(service_date) AS last_service_date,
  EXTRACT(DAY FROM MAX(service_date) - MIN(service_date)) AS active_days
FROM claims
WHERE patient_id IS NOT NULL
GROUP BY patient_id, patient_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_patient_utilization_pk 
ON mv_patient_utilization(patient_id);

-- ===========================================
-- HOSPITAL PERFORMANCE AGGREGATES
-- For hospital-level benchmarking
-- ===========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hospital_performance AS
SELECT 
  hospital,
  COUNT(*) AS total_claims,
  COUNT(DISTINCT provider_id) AS provider_count,
  COUNT(DISTINCT patient_id) AS patient_count,
  SUM(CAST(amount AS DECIMAL)) AS total_revenue,
  AVG(CAST(amount AS DECIMAL)) AS avg_claim_amount,
  AVG(CAST(outlier_score AS DECIMAL)) AS avg_outlier_score,
  SUM(CASE WHEN flagged = true THEN 1 ELSE 0 END) AS flagged_count,
  ROUND(SUM(CASE WHEN flagged = true THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) AS flag_rate_pct,
  AVG(length_of_stay) AS avg_los
FROM claims
WHERE hospital IS NOT NULL
GROUP BY hospital;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_hospital_performance_pk 
ON mv_hospital_performance(hospital);

-- ===========================================
-- FWA RISK DASHBOARD AGGREGATES
-- Pre-computed KPIs for dashboard
-- ===========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_fwa_dashboard_stats AS
SELECT 
  'all' AS scope,
  COUNT(*) AS total_claims,
  SUM(CASE WHEN flagged = true THEN 1 ELSE 0 END) AS flagged_claims,
  ROUND(SUM(CASE WHEN flagged = true THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) AS flag_rate,
  SUM(CAST(amount AS DECIMAL)) AS total_amount,
  SUM(CASE WHEN flagged = true THEN CAST(amount AS DECIMAL) ELSE 0 END) AS flagged_amount,
  AVG(CAST(outlier_score AS DECIMAL)) AS avg_risk_score,
  COUNT(DISTINCT provider_id) AS unique_providers,
  COUNT(DISTINCT patient_id) AS unique_patients,
  NOW() AS last_refresh
FROM claims;

-- ===========================================
-- REFRESH FUNCTION
-- Call this periodically to update materialized views
-- ===========================================

CREATE OR REPLACE FUNCTION refresh_fwa_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_monthly_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_specialty_baselines;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_patient_utilization;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hospital_performance;
  REFRESH MATERIALIZED VIEW mv_fwa_dashboard_stats;
  RAISE NOTICE 'All FWA materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Materialized views created successfully';
END $$;
