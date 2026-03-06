import type { Express } from "express";
import type { IStorage } from "../storage";
import {
  insertPatient360Schema,
  insertProvider360Schema,
  insertDoctor360Schema,
} from "@shared/schema";
import { auditDataAccess } from "../middleware/audit";

export function registerContextRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  // Helper to calculate risk level dynamically from score
  // Adjusted thresholds to match actual detection score distribution
  const calculateRiskLevel = (score: number): string => {
    if (score >= 40) return "critical";
    if (score >= 30) return "high";
    if (score >= 20) return "medium";
    if (score >= 10) return "low";
    return "minimal";
  };

  // Patient 360 Routes - with audit logging for PHI access
  app.get("/api/context/patient-360/:patientId", auditDataAccess("patient"), async (req, res) => {
    try {
      const patient = await storage.getPatient360(req.params.patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient 360 not found" });
      }
      
      // Enrich with additional data from detection results and claims
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get REAL detection score from fwa_patient_detection_results
      const patientDetection = await db.execute(sql`
        SELECT 
          composite_score, risk_level,
          rule_engine_score, statistical_score, unsupervised_score, rag_llm_score, semantic_score,
          risk_factors, aggregated_metrics, analyzed_at
        FROM fwa_patient_detection_results 
        WHERE patient_id = ${req.params.patientId}
        LIMIT 1
      `);
      
      // Get detection stats from claim-level results (join to get claim_reference for proper counting)
      const detectionStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_detections,
          COUNT(DISTINCT ac.claim_number) as flagged_claims,
          COUNT(DISTINCT dr.provider_id) as unique_providers,
          COUNT(DISTINCT ac.claim_number) FILTER (WHERE dr.composite_risk_level IN ('critical', 'high')) as critical_detections,
          MAX(dr.analyzed_at) as last_analyzed
        FROM fwa_detection_results dr
        JOIN claims_v2 ac ON ac.id = dr.claim_id
        WHERE dr.patient_id = ${req.params.patientId}
      `);
      
      // Get claims grouped by claim_reference (not individual service lines)
      // Healthcare claims have multiple service lines per claim - aggregate to claim level
      const claims = await db.execute(sql`
        SELECT 
          ac.claim_number,
          MIN(ac.id) as first_claim_id,
          COUNT(*) as service_line_count,
          SUM(ac.amount) as total_claim_amount,
          MIN(ac.service_date) as service_date, 
          MIN(ac.provider_id) as provider_id,
          MIN(ac.primary_diagnosis) as diagnosis,
          MIN(ac.practitioner_id) as practitioner_id,
          STRING_AGG(DISTINCT COALESCE(ac.description, ac.cpt_codes[1]), ', ') as services,
          MAX(dr.composite_score) as detection_score,
          MAX(dr.composite_risk_level) as risk_level
        FROM claims_v2 ac
        LEFT JOIN fwa_detection_results dr ON dr.claim_id = ac.id
        WHERE ac.member_id = ${req.params.patientId}
        GROUP BY ac.claim_number
        ORDER BY MIN(ac.service_date) DESC
        LIMIT 20
      `);
      
      // Parse claims_summary for enrichment
      const claimsSummary = typeof patient.claimsSummary === 'string' 
        ? JSON.parse(patient.claimsSummary) 
        : (patient.claimsSummary || {});
      
      const stats = detectionStats.rows[0] || {};
      const detection = patientDetection.rows[0] as any || {};
      
      // Use REAL detection score from fwa_patient_detection_results
      const riskScore = parseFloat(detection.composite_score || patient.riskScore || "0");
      const riskLevel = detection.risk_level || calculateRiskLevel(riskScore);
      
      // Build visit history from CLAIMS (grouped by claim_reference, not service lines)
      // Each row is now one claim with aggregated service lines
      const visitHistory = claims.rows.map((c: any) => ({
        date: c.service_date,
        claimId: c.first_claim_id,
        claimReference: c.claim_number,
        providerId: c.provider_id,
        providerName: c.provider_id,
        visitType: c.service_line_count > 1 
          ? `${c.service_line_count} services` 
          : (c.services || 'Visit'),
        claimAmount: parseFloat(c.total_claim_amount) || 0,
        serviceCount: parseInt(c.service_line_count) || 1,
        diagnosis: c.diagnosis,
        doctor: c.practitioner_id,
        detectionScore: parseFloat(c.detection_score) || 0,
        riskLevel: c.risk_level || 'minimal'
      }));
      
      // Get unique diagnoses from claims for chronic conditions display
      const diagnoses = await db.execute(sql`
        SELECT DISTINCT 
          ac.primary_diagnosis as code,
          MIN(ac.service_date) as first_diagnosed,
          MIN(ac.provider_id) as diagnosing_provider,
          COUNT(DISTINCT ac.claim_number) as claim_count
        FROM claims_v2 ac
        WHERE ac.member_id = ${req.params.patientId}
          AND ac.primary_diagnosis IS NOT NULL
          AND ac.primary_diagnosis != ''
        GROUP BY ac.primary_diagnosis
        ORDER BY MIN(ac.service_date) DESC
        LIMIT 10
      `);
      
      // Map ICD-10 codes to condition names (common codes)
      const icdCodeNames: Record<string, string> = {
        'K42.9': 'Umbilical Hernia',
        'I10': 'Essential Hypertension',
        'E11.9': 'Type 2 Diabetes Mellitus',
        'J45.909': 'Unspecified Asthma',
        'M54.5': 'Low Back Pain',
        'F32.9': 'Major Depressive Disorder',
        'E78.5': 'Hyperlipidemia',
        'J06.9': 'Acute Upper Respiratory Infection',
        'R10.9': 'Unspecified Abdominal Pain',
        'M79.3': 'Panniculitis',
        'K21.0': 'GERD with Esophagitis',
        'N39.0': 'Urinary Tract Infection',
        'R05': 'Cough',
        'Z00.00': 'Routine Medical Examination',
        'Z23': 'Vaccination/Immunization',
        'E03.9': 'Hypothyroidism',
        'G47.00': 'Insomnia',
        'R51': 'Headache',
        'R53.83': 'Fatigue',
        'M25.50': 'Joint Pain'
      };
      
      // Build chronic conditions from diagnoses
      const chronicConditionsList = diagnoses.rows.map((d: any) => ({
        condition: icdCodeNames[d.code] || `Diagnosis ${d.code}`,
        icdCode: d.code,
        diagnosedDate: d.first_diagnosed,
        status: d.claim_count > 1 ? 'managed' : 'active',
        treatingProvider: d.diagnosing_provider || 'Unknown'
      }));
      
      // Build FWA alerts with REAL detection data (matching frontend expected structure)
      const criticalCount = parseInt(stats.critical_detections as string) || 0;
      const flaggedCount = parseInt(stats.flagged_claims as string) || 0;
      const fwaAlerts = flaggedCount > 0 
        ? [{ 
            alertId: `PAT-${req.params.patientId}-001`,
            alertType: 'FWA Detection',
            description: `${criticalCount} critical risk detections out of ${flaggedCount} total flagged claims`,
            severity: riskLevel,
            status: 'active',
            detectedDate: detection.analyzed_at || new Date().toISOString()
          }]
        : [];
      
      // Build risk factors from detection results (matching frontend expected structure)
      const detectionRiskFactors = detection.risk_factors || [];
      const riskFactors = detectionRiskFactors.length > 0 
        ? detectionRiskFactors 
        : detection.composite_score && parseFloat(detection.composite_score) >= 30 
          ? [
              {
                factor: 'High Rule Engine Score',
                description: `Rule engine score of ${parseFloat(detection.rule_engine_score || 0).toFixed(1)}% indicates policy violations`,
                severity: riskLevel,
                confidence: Math.round(parseFloat(detection.rule_engine_score || 0)),
                detectedDate: detection.analyzed_at
              },
              {
                factor: 'Statistical Deviation',
                description: `Statistical score of ${parseFloat(detection.statistical_score || 0).toFixed(1)}% indicates significant deviation from population norms`,
                severity: parseFloat(detection.statistical_score || 0) >= 50 ? 'critical' : 'high',
                confidence: Math.round(parseFloat(detection.statistical_score || 0)),
                detectedDate: detection.analyzed_at
              }
            ]
          : [];
      const detectionBreakdown = detection.composite_score ? {
        ruleEngineScore: parseFloat(detection.rule_engine_score) || 0,
        statisticalScore: parseFloat(detection.statistical_score) || 0,
        unsupervisedScore: parseFloat(detection.unsupervised_score) || 0,
        ragLlmScore: parseFloat(detection.rag_llm_score) || 0,
        semanticScore: parseFloat(detection.semantic_score) || 0
      } : null;
      
      res.json({ 
        ...patient, 
        riskScore: riskScore,
        riskLevel: riskLevel,
        detectionBreakdown,
        riskFactors: Array.isArray(riskFactors) ? riskFactors : [],
        chronicConditions: chronicConditionsList.length > 0 ? chronicConditionsList : [],
        claimsSummary: {
          ...claimsSummary,
          totalClaims: claimsSummary.totalClaims || visitHistory.length,
          totalAmount: claimsSummary.totalAmount || visitHistory.reduce((s: number, v: any) => s + v.amount, 0),
          uniqueProviders: parseInt(stats.unique_providers as string) || 0,
          flaggedClaims: flaggedCount
        },
        visitHistory: visitHistory.length > 0 ? visitHistory : null,
        fwaAlerts: fwaAlerts.length > 0 ? fwaAlerts : null,
        lastAnalyzedAt: detection.analyzed_at || stats.last_analyzed || patient.lastAnalyzedAt
      });
    } catch (error) {
      handleRouteError(res, error, "/api/context/patient-360/:patientId", "fetch patient 360");
    }
  });

  app.get("/api/context/patient-360", async (req, res) => {
    try {
      const patients = await storage.listPatient360s();
      res.json(patients);
    } catch (error) {
      handleRouteError(res, error, "/api/context/patient-360", "list patient 360 records");
    }
  });

  app.post("/api/context/patient-360", async (req, res) => {
    try {
      const parsed = insertPatient360Schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const patient = await storage.createPatient360(parsed.data);
      res.status(201).json(patient);
    } catch (error) {
      handleRouteError(res, error, "/api/context/patient-360", "create patient 360");
    }
  });

  // Provider 360 Routes - with audit logging for sensitive data access
  app.get("/api/context/provider-360/:providerId", auditDataAccess("provider"), async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      const provider = await storage.getProvider360(req.params.providerId);
      
      // Get REAL detection score from fwa_provider_detection_results
      const providerDetection = await db.execute(sql`
        SELECT 
          composite_score, risk_level,
          rule_engine_score, statistical_score, unsupervised_score, rag_llm_score, semantic_score,
          risk_factors, aggregated_metrics, analyzed_at
        FROM fwa_provider_detection_results 
        WHERE provider_id = ${req.params.providerId}
        LIMIT 1
      `);
      
      // Get detection stats from claim-level results (join to get claim_reference for proper counting)
      const detectionStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_detections,
          COUNT(DISTINCT ac.claim_number) as flagged_claims,
          COUNT(DISTINCT dr.patient_id) as unique_patients,
          COUNT(DISTINCT ac.claim_number) FILTER (WHERE dr.composite_risk_level IN ('critical', 'high')) as critical_detections,
          MAX(dr.analyzed_at) as last_analyzed
        FROM fwa_detection_results dr
        JOIN claims_v2 ac ON ac.id = dr.claim_id
        WHERE dr.provider_id = ${req.params.providerId}
      `);
      
      // Get claims statistics
      const claimStats = await db.execute(sql`
        SELECT
          COUNT(DISTINCT claim_number) as total_claims,
          COUNT(*) as total_service_lines,
          COALESCE(SUM(amount::numeric), 0) as total_amount,
          COUNT(DISTINCT member_id) as unique_patients,
          COUNT(DISTINCT practitioner_id) as affiliated_doctors
        FROM claims_v2
        WHERE provider_id = ${req.params.providerId}
      `);
      
      // Get affiliated doctors from claims
      const doctorsQuery = await db.execute(sql`
        SELECT DISTINCT 
          ac.practitioner_id as doctor_id,
          COUNT(DISTINCT ac.claim_number) as claim_count
        FROM claims_v2 ac
        WHERE ac.provider_id = ${req.params.providerId}
          AND ac.practitioner_id IS NOT NULL
          AND ac.practitioner_id != ''
        GROUP BY ac.practitioner_id
        ORDER BY COUNT(DISTINCT ac.claim_number) DESC
        LIMIT 10
      `);
      
      const stats = detectionStats.rows[0] as any || {};
      const claimInfo = claimStats.rows[0] as any || {};
      const detection = providerDetection.rows[0] as any || {};
      
      // Build affiliated doctors list
      const affiliatedDoctorsList = doctorsQuery.rows.map((d: any) => ({
        doctorId: d.doctor_id,
        doctorName: `Dr. ${d.doctor_id}`,
        claimCount: parseInt(d.claim_count) || 0
      }));
      
      // Use REAL detection score from fwa_provider_detection_results
      const riskScore = parseFloat(detection.composite_score || provider?.riskScore || "0");
      const riskLevel = detection.risk_level || calculateRiskLevel(riskScore);
      
      // Build flags from detection data
      const criticalCount = parseInt(stats.critical_detections as string) || 0;
      const flaggedCount = parseInt(stats.flagged_claims as string) || 0;
      const flags = flaggedCount > 0 
        ? [{ 
            type: 'FWA Detection', 
            count: flaggedCount, 
            criticalCount,
            date: stats.last_analyzed,
            message: `${criticalCount} critical risk claims detected`
          }]
        : [];
      
      // Build detection breakdown
      const detectionBreakdown = detection.composite_score ? {
        ruleEngineScore: parseFloat(detection.rule_engine_score) || 0,
        statisticalScore: parseFloat(detection.statistical_score) || 0,
        unsupervisedScore: parseFloat(detection.unsupervised_score) || 0,
        ragLlmScore: parseFloat(detection.rag_llm_score) || 0,
        semanticScore: parseFloat(detection.semantic_score) || 0
      } : null;
      
      // If provider doesn't exist in provider_360, build response from claims data
      const baseProvider = provider || {
        providerId: req.params.providerId,
        providerName: `Provider ${req.params.providerId}`,
        providerType: 'Healthcare Facility',
        specialty: null,
        nphiesReference: null
      };
      
      // Calculate financial metrics
      const totalClaims = parseInt(claimInfo.total_claims as string) || 0;
      const totalAmount = parseFloat(claimInfo.total_amount as string) || 0;
      const uniquePatients = parseInt(claimInfo.unique_patients as string) || 0;
      const totalDoctors = parseInt(claimInfo.affiliated_doctors as string) || affiliatedDoctorsList.length;
      
      const financialMetrics = {
        totalRevenue: totalAmount,
        avgRevenuePerClaim: totalClaims > 0 ? totalAmount / totalClaims : 0,
        avgRevenuePerPatient: uniquePatients > 0 ? totalAmount / uniquePatients : 0,
        avgRevenuePerDoctor: totalDoctors > 0 ? totalAmount / totalDoctors : 0,
        claimsPerPatient: uniquePatients > 0 ? totalClaims / uniquePatients : 0
      };
      
      const performanceMetrics = {
        totalDoctors,
        avgClaimsPerDoctor: totalDoctors > 0 ? totalClaims / totalDoctors : 0,
        avgPatientsPerDoctor: totalDoctors > 0 ? uniquePatients / totalDoctors : 0,
        flaggedClaimRate: totalClaims > 0 ? (flaggedCount / totalClaims * 100) : 0,
        criticalDetectionRate: flaggedCount > 0 ? (criticalCount / flaggedCount * 100) : 0
      };
      
      res.json({ 
        ...baseProvider, 
        riskScore: riskScore,
        riskLevel: riskLevel,
        detectionBreakdown,
        riskFactors: detection.risk_factors || [],
        claimsSummary: {
          totalClaims,
          totalServiceLines: parseInt(claimInfo.total_service_lines as string) || 0,
          totalAmount,
          avgClaimAmount: totalClaims > 0 ? totalAmount / totalClaims : 0,
          uniquePatients,
          flaggedClaims: flaggedCount
        },
        financialMetrics,
        performanceMetrics,
        affiliatedDoctors: affiliatedDoctorsList.length > 0 ? affiliatedDoctorsList : [],
        flags: flags.length > 0 ? flags : [],
        lastAnalyzedAt: detection.analyzed_at || stats.last_analyzed
      });
    } catch (error) {
      handleRouteError(res, error, "/api/context/provider-360/:providerId", "fetch provider 360");
    }
  });

  app.get("/api/context/provider-360", async (req, res) => {
    try {
      const providers = await storage.listProvider360s();
      res.json(providers);
    } catch (error) {
      handleRouteError(res, error, "/api/context/provider-360", "list provider 360 records");
    }
  });

  app.post("/api/context/provider-360", async (req, res) => {
    try {
      const parsed = insertProvider360Schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const provider = await storage.createProvider360(parsed.data);
      res.status(201).json(provider);
    } catch (error) {
      handleRouteError(res, error, "/api/context/provider-360", "create provider 360");
    }
  });

  // Doctor 360 Routes - with audit logging for sensitive data access
  app.get("/api/context/doctor-360/:doctorId", auditDataAccess("doctor"), async (req, res) => {
    try {
      const doctor = await storage.getDoctor360(req.params.doctorId);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor 360 not found" });
      }
      
      // Enrich with additional data from detection results and claims
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get REAL detection score from fwa_doctor_detection_results
      const doctorDetection = await db.execute(sql`
        SELECT 
          composite_score, risk_level,
          rule_engine_score, statistical_score, unsupervised_score, rag_llm_score, semantic_score,
          risk_factors, aggregated_metrics, analyzed_at
        FROM fwa_doctor_detection_results 
        WHERE doctor_id = ${req.params.doctorId}
        LIMIT 1
      `);
      
      // Get detection stats for this doctor via claims (use claim_reference for proper claim counting)
      const detectionStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_detections,
          COUNT(DISTINCT ac.claim_number) as flagged_claims,
          COUNT(DISTINCT ac.member_id) as unique_patients,
          COUNT(DISTINCT ac.claim_number) FILTER (WHERE dr.composite_risk_level IN ('critical', 'high')) as critical_detections,
          MAX(dr.analyzed_at) as last_analyzed
        FROM fwa_detection_results dr
        JOIN claims_v2 ac ON dr.claim_id = ac.id
        WHERE ac.practitioner_id = ${req.params.doctorId}
      `);
      
      // Get claim statistics - count CLAIMS (by claim_reference) not service lines
      const claimStats = await db.execute(sql`
        SELECT
          COUNT(DISTINCT claim_number) as total_claims,
          COUNT(*) as total_service_lines,
          COALESCE(SUM(amount::numeric), 0) as total_amount,
          COUNT(DISTINCT member_id) as unique_patients,
          COUNT(DISTINCT provider_id) as facilities
        FROM claims_v2
        WHERE practitioner_id = ${req.params.doctorId}
      `);
      
      // Get recent claims for practice patterns with detection data
      const recentClaims = await db.execute(sql`
        SELECT ac.cpt_codes, ac.description as service_description, ac.amount, ac.service_date,
               dr.composite_score as detection_score, dr.composite_risk_level as claim_risk_level
        FROM claims_v2 ac
        LEFT JOIN fwa_detection_results dr ON dr.claim_id = ac.id
        WHERE ac.practitioner_id = ${req.params.doctorId}
        ORDER BY ac.service_date DESC
        LIMIT 10
      `);
      
      // Get affiliated facilities from claims
      const facilitiesQuery = await db.execute(sql`
        SELECT DISTINCT 
          ac.provider_id as facility_id,
          COUNT(DISTINCT ac.claim_number) as claim_count
        FROM claims_v2 ac
        WHERE ac.practitioner_id = ${req.params.doctorId}
          AND ac.provider_id IS NOT NULL
        GROUP BY ac.provider_id
        ORDER BY COUNT(DISTINCT ac.claim_number) DESC
        LIMIT 10
      `);
      
      // Get specialty code from claims (if available)
      const specialtyQuery = await db.execute(sql`
        SELECT specialty, COUNT(*) as cnt
        FROM claims_v2
        WHERE practitioner_id = ${req.params.doctorId}
          AND specialty IS NOT NULL AND specialty != ''
        GROUP BY specialty
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `);
      
      // Build affiliated facilities list
      const affiliatedFacilitiesList = facilitiesQuery.rows.map((f: any) => ({
        facilityId: f.facility_id,
        facilityName: `Facility ${f.facility_id}`,
        claimCount: parseInt(f.claim_count) || 0
      }));
      
      // Get specialty from query result or map from service types
      const specialtyRow = specialtyQuery.rows[0] as any;
      const derivedSpecialty = specialtyRow?.specialty || null;
      
      const stats = detectionStats.rows[0] || {};
      const claimInfo = claimStats.rows[0] || {};
      const detection = doctorDetection.rows[0] as any || {};
      
      // Use REAL detection score from fwa_doctor_detection_results
      const riskScore = parseFloat(detection.composite_score || doctor.riskScore || "0");
      const riskLevel = detection.risk_level || calculateRiskLevel(riskScore);
      
      // Parse claims_summary for enrichment
      const claimsSummary = typeof doctor.claimsSummary === 'string' 
        ? JSON.parse(doctor.claimsSummary) 
        : (doctor.claimsSummary || {});
      
      // Build detection breakdown
      const detectionBreakdown = detection.composite_score ? {
        ruleEngineScore: parseFloat(detection.rule_engine_score) || 0,
        statisticalScore: parseFloat(detection.statistical_score) || 0,
        unsupervisedScore: parseFloat(detection.unsupervised_score) || 0,
        ragLlmScore: parseFloat(detection.rag_llm_score) || 0,
        semanticScore: parseFloat(detection.semantic_score) || 0
      } : null;
      
      // Build flags history from detection data
      const criticalCount = parseInt(stats.critical_detections as string) || 0;
      const flaggedCount = parseInt(stats.flagged_claims as string) || 0;
      const flagsHistory = flaggedCount > 0 
        ? [{ 
            type: 'FWA Detection', 
            count: flaggedCount, 
            criticalCount,
            date: stats.last_analyzed,
            message: `${criticalCount} critical risk claims detected`
          }]
        : [];
      
      res.json({ 
        ...doctor, 
        specialty: derivedSpecialty || doctor.specialty || 'General Medicine',
        affiliatedFacilities: affiliatedFacilitiesList.length > 0 ? affiliatedFacilitiesList : doctor.affiliatedFacilities,
        riskScore: riskScore,
        riskLevel: riskLevel,
        detectionBreakdown,
        riskFactors: detection.risk_factors || [],
        claimsSummary: {
          ...claimsSummary,
          totalClaims: parseInt(claimInfo.total_claims as string) || claimsSummary.totalClaims || 0,
          totalServiceLines: parseInt(claimInfo.total_service_lines as string) || 0,
          totalAmount: parseFloat(claimInfo.total_amount as string) || claimsSummary.totalAmount || 0,
          avgClaimAmount: (parseInt(claimInfo.total_claims as string) || 0) > 0
            ? (parseFloat(claimInfo.total_amount as string) || 0) / (parseInt(claimInfo.total_claims as string) || 1)
            : 0,
          uniquePatients: parseInt(claimInfo.unique_patients as string) || claimsSummary.uniquePatients || 0,
          facilities: parseInt(claimInfo.facilities as string) || 0,
          flaggedClaims: flaggedCount
        },
        practicePatterns: {
          avgPatientsPerDay: Math.max(1, Math.round((parseInt(claimInfo.unique_patients as string) || 0) / Math.max(1, parseInt(claimInfo.total_claims as string) || 1) * 10) / 10),
          claimsPerPatient: (parseInt(claimInfo.unique_patients as string) || 0) > 0
            ? Math.round((parseInt(claimInfo.total_claims as string) || 0) / (parseInt(claimInfo.unique_patients as string) || 1) * 10) / 10
            : 0,
          avgAmountPerPatient: (parseInt(claimInfo.unique_patients as string) || 0) > 0
            ? Math.round((parseFloat(claimInfo.total_amount as string) || 0) / (parseInt(claimInfo.unique_patients as string) || 1))
            : 0,
          avgAmountPerClaim: (parseInt(claimInfo.total_claims as string) || 0) > 0
            ? Math.round((parseFloat(claimInfo.total_amount as string) || 0) / (parseInt(claimInfo.total_claims as string) || 1))
            : 0
        },
        flagsHistory: flagsHistory.length > 0 ? flagsHistory : null,
        recentClaims: recentClaims.rows.map((c: any) => ({
          service: c.service_description || c.cpt_codes,
          amount: parseFloat(c.amount) || 0,
          date: c.service_date,
          detectionScore: parseFloat(c.detection_score) || 0,
          riskLevel: c.claim_risk_level || 'minimal'
        })),
        lastAnalyzedAt: detection.analyzed_at || stats.last_analyzed || doctor.lastAnalyzedAt
      });
    } catch (error) {
      handleRouteError(res, error, "/api/context/doctor-360/:doctorId", "fetch doctor 360");
    }
  });

  app.get("/api/context/doctor-360", async (req, res) => {
    try {
      const doctors = await storage.listDoctor360s();
      res.json(doctors);
    } catch (error) {
      handleRouteError(res, error, "/api/context/doctor-360", "list doctor 360 records");
    }
  });

  app.post("/api/context/doctor-360", async (req, res) => {
    try {
      const parsed = insertDoctor360Schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const doctor = await storage.createDoctor360(parsed.data);
      res.status(201).json(doctor);
    } catch (error) {
      handleRouteError(res, error, "/api/context/doctor-360", "create doctor 360");
    }
  });

  // AI Agent triggers for 360 views
  app.post("/api/context/patient-360/:patientId/analyze", async (req, res) => {
    try {
      const { patientId } = req.params;
      const { patientName } = req.body;
      
      const { runPatient360Summarizer } = await import("../services/agent-orchestrator");
      const existingData = await storage.getPatient360(patientId);
      const result = await runPatient360Summarizer(patientId, patientName || `Patient ${patientId}`, existingData);
      
      if (existingData) {
        const updated = await storage.updatePatient360(patientId, {
          aiSummary: result.aiSummary,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore.toString(),
          riskFactors: result.riskFactors,
          behavioralPatterns: result.behavioralPatterns,
          fwaAlerts: result.fwaAlerts,
          lastAnalyzedAt: new Date()
        });
        res.json({ success: true, patient360: updated, analysis: result });
      } else {
        const created = await storage.createPatient360({
          patientId,
          patientName: patientName || `Patient ${patientId}`,
          aiSummary: result.aiSummary,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore.toString(),
          riskFactors: result.riskFactors,
          behavioralPatterns: result.behavioralPatterns,
          fwaAlerts: result.fwaAlerts,
          lastAnalyzedAt: new Date()
        });
        res.json({ success: true, patient360: created, analysis: result });
      }
    } catch (error) {
      handleRouteError(res, error, "/api/context/patient-360/:patientId/analyze", "run patient 360 analysis");
    }
  });

  app.post("/api/context/provider-360/:providerId/analyze", async (req, res) => {
    try {
      const { providerId } = req.params;
      const { providerName } = req.body;
      
      const { runProvider360Profiler } = await import("../services/agent-orchestrator");
      const existingData = await storage.getProvider360(providerId);
      const result = await runProvider360Profiler(providerId, providerName || `Provider ${providerId}`, existingData);
      
      if (existingData) {
        const updated = await storage.updateProvider360(providerId, {
          aiAssessment: result.aiAssessment,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore.toString(),
          specialtyBenchmarks: result.specialtyBenchmarks,
          peerRanking: result.peerRanking,
          billingPatterns: result.billingPatterns,
          flags: result.flags,
          lastAnalyzedAt: new Date()
        });
        res.json({ success: true, provider360: updated, analysis: result });
      } else {
        const created = await storage.createProvider360({
          providerId,
          providerName: providerName || `Provider ${providerId}`,
          aiAssessment: result.aiAssessment,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore.toString(),
          specialtyBenchmarks: result.specialtyBenchmarks,
          peerRanking: result.peerRanking,
          billingPatterns: result.billingPatterns,
          flags: result.flags,
          lastAnalyzedAt: new Date()
        });
        res.json({ success: true, provider360: created, analysis: result });
      }
    } catch (error) {
      handleRouteError(res, error, "/api/context/provider-360/:providerId/analyze", "run provider 360 analysis");
    }
  });
}
