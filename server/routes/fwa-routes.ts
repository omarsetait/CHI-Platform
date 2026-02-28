import type { Express } from "express";
import type { IStorage } from "../storage";
import OpenAI from "openai";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { withRetry } from "../utils/openai-utils";
import { sanitizeForAI } from "../utils/input-sanitizer";
import { auditDataAccess } from "../middleware/audit";
import { db } from "../db";
import {
  insertFwaCaseSchema,
  insertFwaAnalysisFindingSchema,
  insertFwaCategorySchema,
  insertFwaActionSchema,
  insertFwaRegulatoryDocSchema,
  insertFwaMedicalGuidelineSchema,
  insertFwaAgentConfigSchema,
  insertFwaBehaviorSchema,
  insertFwaBatchSchema,
  insertAgentReportSchema,
  claims,
  fwaClaimServices,
  providerFeatureStore,
  memberFeatureStore,
  peerGroupBaselines,
  mlClaimInference,
  mlLearnedPatterns,
  fwaDetectionResults,
  fwaDetectionRuns,
  provider360,
  patient360,
  doctor360,
  fwaProviderDetectionResults,
  fwaDoctorDetectionResults,
  fwaPatientDetectionResults,
  fwaProviderTimeline,
  fwaDoctorTimeline,
  fwaPatientTimeline,
  providerDirectory,
  enforcementCases,
  fwaCases,
  preAuthClaims,
  type InsertFwaAgentConfig,
} from "@shared/schema";
import { mlEngine, FeatureEngineeringService } from "../services/ml-unsupervised-engine";
import { getEntityData } from "../services/demo-data-seeder";
import { populationStatsService, featureWeightsService, statisticalLearningEngine } from "../services/statistical-learning-engine";
import { aggregateProviderDetection } from "../services/fwa-detection-engine";
import { 
  runRegulatoryOversight, 
  runRegulatoryOversightBatch, 
  getClaimHistoryPatterns,
  type RegulatoryOversightResult 
} from "../services/regulatory-oversight-engine";
import { 
  runEnhancedFWAAnalysis, 
  seedEnhancedFWARules 
} from "../services/enhanced-fwa-rules";

const letterGenerationSchema = z.object({
  providers: z.array(z.object({
    id: z.string().max(100),
    name: z.string().max(200),
  })).min(1),
  summary: z.string().max(5000),
  claimCount: z.number().int().optional(),
  totalAmount: z.number().optional(),
});

const reportGenerationSchema = z.object({
  agentId: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityName: z.string().min(1).max(200),
  phase: z.number().int().min(1).max(3),
});

const historyAgentSchema = z.object({
  agentType: z.enum(["patient", "provider"]),
  agentName: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  entityName: z.string().min(1).max(200),
  historyData: z.any().optional(),
});

const kbQuerySchema = z.object({
  kbType: z.enum(["regulatory", "medical", "history"]),
  query: z.string().min(1).max(2000),
  context: z.any().optional(),
});

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export function registerFwaRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  // Admin endpoint to manually seed database (for production initialization)
  // Support both GET (browser) and POST (curl) methods
  app.all("/api/admin/seed-database", async (req, res) => {
    try {
      // Strict token-based authentication - requires ADMIN_SEED_TOKEN env var
      const authToken = req.headers["x-admin-token"] || req.query.token;
      const expectedToken = process.env.ADMIN_SEED_TOKEN;
      
      if (!expectedToken || authToken !== expectedToken) {
        return res.status(401).json({ error: "Unauthorized. ADMIN_SEED_TOKEN must be configured and x-admin-token header must match." });
      }

      console.log("[Admin] Manual database seeding triggered...");
      
      // Import and run the seeder
      const { seedDatabaseWithDemoData } = await import("../services/demo-data-seeder");
      await seedDatabaseWithDemoData();
      
      // Get counts after seeding
      const { fwaAnalyzedClaims, fwaCases } = await import("@shared/schema");
      const { count } = await import("drizzle-orm");
      
      const claimsResult = await db.select({ count: count() }).from(fwaAnalyzedClaims);
      const casesResult = await db.select({ count: count() }).from(fwaCases);
      
      const claimCount = claimsResult[0]?.count || 0;
      const caseCount = casesResult[0]?.count || 0;
      
      console.log(`[Admin] Seeding complete. Claims: ${claimCount}, Cases: ${caseCount}`);
      
      res.json({
        success: true,
        message: "Database seeding completed",
        counts: {
          analyzedClaims: claimCount,
          fwaCases: caseCount
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/admin/seed-database", "seed database");
    }
  });
  
  // Admin endpoint to verify database state (for debugging production)
  app.get("/api/admin/verify-database", async (req, res) => {
    try {
      const authToken = req.headers["x-admin-token"] || req.query.token;
      const expectedToken = process.env.ADMIN_SEED_TOKEN;
      
      if (!expectedToken || authToken !== expectedToken) {
        return res.status(401).json({ error: "Unauthorized. ADMIN_SEED_TOKEN must be configured." });
      }

      const { 
        fwaAnalyzedClaims, fwaCases, enforcementCases,
        fwaProviderDetectionResults, fwaDoctorDetectionResults, 
        fwaPatientDetectionResults, fwaDetectionResults 
      } = await import("@shared/schema");
      const { count } = await import("drizzle-orm");
      
      // Get counts from all relevant tables
      const [claims, cases, enforcement, providers, doctors, patients, detections] = await Promise.all([
        db.select({ count: count() }).from(fwaAnalyzedClaims),
        db.select({ count: count() }).from(fwaCases),
        db.select({ count: count() }).from(enforcementCases),
        db.select({ count: count() }).from(fwaProviderDetectionResults),
        db.select({ count: count() }).from(fwaDoctorDetectionResults),
        db.select({ count: count() }).from(fwaPatientDetectionResults),
        db.select({ count: count() }).from(fwaDetectionResults),
      ]);
      
      // Get database connection info (safe - no credentials)
      const dbUrl = process.env.DATABASE_URL || "";
      const dbHost = dbUrl.includes("@") ? dbUrl.split("@")[1]?.split("/")[0] : "unknown";
      const dbName = dbUrl.split("/").pop()?.split("?")[0] || "unknown";
      
      res.json({
        database: { host: dbHost, name: dbName },
        counts: {
          fwaAnalyzedClaims: claims[0]?.count || 0,
          fwaCases: cases[0]?.count || 0,
          enforcementCases: enforcement[0]?.count || 0,
          fwaProviderDetectionResults: providers[0]?.count || 0,
          fwaDoctorDetectionResults: doctors[0]?.count || 0,
          fwaPatientDetectionResults: patients[0]?.count || 0,
          fwaDetectionResults: detections[0]?.count || 0,
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
      });
    } catch (error) {
      handleRouteError(res, error, "/api/admin/verify-database", "verify database");
    }
  });

  // Admin endpoint to seed audit sessions data
  app.get("/api/admin/seed-audit-sessions", async (req, res) => {
    try {
      const authToken = req.headers["x-admin-token"] || req.query.token;
      const expectedToken = process.env.ADMIN_SEED_TOKEN;
      
      if (!expectedToken || authToken !== expectedToken) {
        return res.status(401).json({ error: "Unauthorized. ADMIN_SEED_TOKEN must be configured." });
      }

      const { sql } = await import("drizzle-orm");
      
      // Clean up existing data first
      await db.execute(sql`DELETE FROM audit_findings WHERE audit_session_id IN ('as-001', 'as-002', 'as-003')`);
      await db.execute(sql`DELETE FROM audit_sessions WHERE id IN ('as-001', 'as-002', 'as-003')`);
      
      // Seed audit sessions
      await db.execute(sql`
        INSERT INTO audit_sessions (id, audit_number, provider_id, provider_name, type, status, risk_score, risk_factors, scheduled_date, location, audit_scope, audit_team, findings, recommendations)
        VALUES 
          ('as-001', 'AUD-2025-001', 'PRV-001', 'King Faisal Specialist Hospital', 'routine_inspection', 'completed', '0.72', ARRAY['High claim volume', 'Billing anomalies'], NOW() - INTERVAL '30 days', 'Riyadh', ARRAY['billing', 'clinical'], '[{"name":"Dr. Ahmed Al-Hassan","role":"Lead Auditor","department":"CHI Audit Division"}]'::jsonb, '[{"category":"billing","severity":"high","description":"Duplicate billing pattern detected"}]'::jsonb, ARRAY['Implement billing review controls', 'Staff training on coding guidelines']),
          ('as-002', 'AUD-2025-002', 'PRV-004', 'Dallah Hospital', 'follow_up_audit', 'in_progress', '0.55', ARRAY['Previous findings'], NOW() - INTERVAL '7 days', 'Riyadh', ARRAY['documentation'], '[{"name":"Ms. Fatima Al-Rashid","role":"Clinical Auditor","department":"CHI Clinical Review"}]'::jsonb, '[]'::jsonb, ARRAY[]::text[]),
          ('as-003', 'AUD-2025-003', 'PRV-003', 'Dr. Sulaiman Al Habib', 'complaint_investigation', 'completed', '0.85', ARRAY['Patient complaints', 'Overbilling allegations'], NOW() - INTERVAL '45 days', 'Riyadh', ARRAY['billing', 'clinical', 'documentation'], '[{"name":"Mr. Khalid Al-Otaibi","role":"Senior Auditor","department":"CHI Enforcement"}]'::jsonb, '[{"category":"compliance","severity":"critical","description":"Prior authorization bypass"},{"category":"billing","severity":"high","description":"Upcoding pattern"}]'::jsonb, ARRAY['Formal warning', 'Recovery of overpayments', 'Compliance monitoring'])
        ON CONFLICT (id) DO NOTHING
      `);
      
      // Seed audit findings
      await db.execute(sql`
        INSERT INTO audit_findings (id, audit_session_id, finding_number, category, severity, status, title, description, evidence, recommendation)
        VALUES 
          ('af-001', 'as-003', 'FND-2025-001', 'billing', 'high', 'confirmed', 'Duplicate Billing for Same Service Date', 'Provider submitted multiple claims for identical services on the same date.', 'Claims CLM-001, CLM-002 show duplicate charges', 'Recover overpayment and issue formal warning'),
          ('af-002', 'as-003', 'FND-2025-002', 'documentation', 'medium', 'confirmed', 'Insufficient Clinical Documentation', 'Medical records lack sufficient detail to support billed services.', '23% of reviewed claims had inadequate documentation', 'Require documentation improvement plan'),
          ('af-003', 'as-003', 'FND-2025-003', 'compliance', 'critical', 'referred_to_enforcement', 'Prior Authorization Bypass', 'Services requiring prior authorization performed without approval.', '12 procedures valued at 145,000 SAR without authorization', 'Refer to Enforcement for penalty'),
          ('af-004', 'as-002', 'FND-2025-004', 'clinical', 'medium', 'draft', 'Questionable Medical Necessity', 'Some diagnostic tests appear not medically necessary.', 'Pattern of ordering expensive imaging for minor complaints', 'Request clinical justification'),
          ('af-005', 'as-001', 'FND-2025-005', 'administrative', 'low', 'draft', 'Credentialing Documentation Gap', 'Provider credentialing files missing updated certifications.', '3 physicians have expired certifications', 'Request updated credentials within 30 days')
        ON CONFLICT (id) DO NOTHING
      `);
      
      res.json({ success: true, message: "Audit sessions and findings seeded" });
    } catch (error) {
      handleRouteError(res, error, "/api/admin/seed-audit-sessions", "seed audit sessions");
    }
  });

  // Admin endpoint to populate rule violations in detection results
  app.get("/api/admin/populate-rule-violations", async (req, res) => {
    try {
      const authToken = req.headers["x-admin-token"] || req.query.token;
      const expectedToken = process.env.ADMIN_SEED_TOKEN;
      
      if (!expectedToken || authToken !== expectedToken) {
        return res.status(401).json({ error: "Unauthorized. ADMIN_SEED_TOKEN must be configured." });
      }

      const { sql } = await import("drizzle-orm");
      
      // Update critical/high risk claims with billing violations
      const highRiskResult = await db.execute(sql`
        UPDATE fwa_detection_results 
        SET rule_engine_findings = jsonb_build_object(
          'matchedRules', jsonb_build_array(
            jsonb_build_object(
              'ruleCode', 'FWA-BILL-001',
              'ruleName', 'Duplicate Billing Pattern',
              'category', 'Billing',
              'severity', 'high',
              'description', 'Multiple claims for same service on same date detected',
              'suggestedAction', 'Review billing records for potential duplicate submissions'
            ),
            jsonb_build_object(
              'ruleCode', 'FWA-DOC-003',
              'ruleName', 'Documentation Deficiency',
              'category', 'Documentation',
              'severity', 'medium',
              'description', 'Insufficient clinical documentation to support billed services',
              'suggestedAction', 'Request additional documentation from provider'
            )
          ),
          'violationCount', 2,
          'totalRulesChecked', 102
        )
        WHERE composite_risk_level IN ('critical', 'high')
      `);
      
      // Update medium risk claims with upcoding violations
      const mediumResult = await db.execute(sql`
        UPDATE fwa_detection_results 
        SET rule_engine_findings = jsonb_build_object(
          'matchedRules', jsonb_build_array(
            jsonb_build_object(
              'ruleCode', 'FWA-UPCD-002',
              'ruleName', 'Upcoding Suspicion',
              'category', 'Coding',
              'severity', 'medium',
              'description', 'Higher-level procedure code used than clinical documentation supports',
              'suggestedAction', 'Verify procedure code against medical records'
            )
          ),
          'violationCount', 1,
          'totalRulesChecked', 102
        )
        WHERE composite_risk_level = 'medium'
      `);
      
      res.json({
        success: true,
        message: "Rule violations populated",
        updatedRecords: {
          highRisk: "updated",
          mediumRisk: "updated"
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/admin/populate-rule-violations", "populate rule violations");
    }
  });

  // Enhanced FWA Analysis Routes
  app.post("/api/fwa/enhanced-analysis/:claimId", async (req, res) => {
    try {
      const { claimId } = req.params;
      
      if (!claimId) {
        return res.status(400).json({ error: "Claim ID is required" });
      }

      const analysis = await runEnhancedFWAAnalysis(claimId);
      res.json(analysis);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      handleRouteError(res, error, "/api/fwa/enhanced-analysis/:claimId", "run enhanced FWA analysis");
    }
  });

  app.post("/api/fwa/rules/seed-enhanced", async (req, res) => {
    try {
      // Admin authorization required for database seeding
      const authToken = req.headers["x-admin-token"] || req.query.token;
      const expectedToken = process.env.ADMIN_SEED_TOKEN;
      
      if (!expectedToken || authToken !== expectedToken) {
        return res.status(401).json({ error: "Unauthorized. ADMIN_SEED_TOKEN must be configured." });
      }
      
      const insertedCount = await seedEnhancedFWARules();
      res.json({
        success: true,
        message: "Enhanced FWA rules seeded successfully",
        rulesInserted: insertedCount
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules/seed-enhanced", "seed enhanced FWA rules");
    }
  });

  // Generate AI penalization letter for FWA findings
  app.post("/api/generate-letter", async (req, res) => {
    try {
      const validatedData = letterGenerationSchema.parse(req.body);
      const { providers, summary, claimCount, totalAmount } = validatedData;

      const providerNames = providers.map((p) => sanitizeForAI(p.name)).join(", ");
      const providerIds = providers.map((p) => sanitizeForAI(p.id)).join(", ");
      const sanitizedSummary = sanitizeForAI(summary);

      const prompt = `You are a healthcare insurance fraud auditor. Generate a formal penalization letter to be sent to healthcare providers regarding Fraud, Waste, and Abuse (FWA) findings from our claims analysis.

Provider(s): ${providerNames}
Provider ID(s): ${providerIds}
Total Claims Reviewed: ${claimCount}
Total Amount at Issue: $${totalAmount?.toLocaleString() || "N/A"}

Summary of Findings:
${sanitizedSummary}

Generate a formal letter that:
1. Opens with a formal salutation and reference to the audit period
2. Summarizes the key FWA findings in a serious, professional tone
3. Lists specific violations with their financial impact
4. States the consequences and required corrective actions
5. Sets a deadline for response (30 days from date of letter)
6. Includes escalation warnings for non-compliance
7. Closes with a formal signature block

The tone should be firm, authoritative, and leave no ambiguity about the seriousness of the findings. Use specific dollar amounts and percentages where available.`;

      const response = await withRetry(() => openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a senior healthcare insurance fraud investigator writing formal penalization letters to providers. Your letters are legally sound, professionally written, and convey the seriousness of FWA findings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 2000,
      }));

      const letter = response.choices[0]?.message?.content || "Unable to generate letter.";
      
      res.json({ letter });
    } catch (error) {
      handleRouteError(res, error, "/api/generate-letter", "generate letter");
    }
  });

  // GET /api/fwa/stats - Dashboard statistics
  app.get("/api/fwa/stats", async (req, res) => {
    try {
      const cases = await storage.getFwaCases();
      const totalCases = cases.length;
      const draftCases = cases.filter((c) => c.status === "draft").length;
      const analyzingCases = cases.filter((c) => c.status === "analyzing").length;
      const categorizedCases = cases.filter((c) => c.status === "categorized").length;
      const actionPendingCases = cases.filter((c) => c.status === "action_pending").length;
      const resolvedCases = cases.filter((c) => c.status === "resolved").length;
      const escalatedCases = cases.filter((c) => c.status === "escalated").length;
      
      const criticalCases = cases.filter((c) => c.priority === "critical").length;
      const highPriorityCases = cases.filter((c) => c.priority === "high").length;
      
      let totalAmount = 0;
      let totalRecovery = 0;
      for (const c of cases) {
        totalAmount += parseFloat(c.totalAmount || "0");
        totalRecovery += parseFloat(c.recoveryAmount || "0");
      }
      
      res.json({
        totalCases,
        draftCases,
        analyzingCases,
        categorizedCases,
        actionPendingCases,
        resolvedCases,
        escalatedCases,
        criticalCases,
        highPriorityCases,
        totalAmount: totalAmount.toFixed(2),
        totalRecovery: totalRecovery.toFixed(2),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/stats", "fetch FWA stats");
    }
  });

  // GET /api/fwa/kpi-stats - KPI Dashboard statistics from real detection data
  app.get("/api/fwa/kpi-stats", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get case statistics - actual recovery amounts from resolved cases
      const cases = await storage.getFwaCases();
      const resolvedCases = cases.filter(c => c.status === "resolved").length;
      let totalRecovery = 0;
      let totalFlaggedAmount = 0;
      for (const c of cases) {
        totalRecovery += parseFloat(c.recoveryAmount || "0");
        totalFlaggedAmount += parseFloat(c.totalAmount || "0");
      }
      
      // Get detection results statistics with actual amounts flagged
      const detectionStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_detections,
          COALESCE(AVG(CASE WHEN processing_time_ms IS NOT NULL THEN processing_time_ms ELSE 0 END), 0) as avg_detection_time_ms,
          COUNT(CASE WHEN composite_risk_level IN ('critical', 'high') THEN 1 END) as high_risk_count,
          COUNT(CASE WHEN composite_risk_level = 'medium' THEN 1 END) as medium_risk_count,
          COUNT(CASE WHEN composite_risk_level = 'low' THEN 1 END) as low_risk_count,
          COALESCE(SUM(CASE 
            WHEN composite_risk_level IN ('critical', 'high', 'medium') 
            AND composite_score IS NOT NULL 
            AND composite_score::text ~ '^-?[0-9.]+$'
            THEN composite_score::decimal * 1000
            ELSE 0 
          END), 0) as preventive_savings
        FROM fwa_detection_results
      `);
      
      // Get category breakdown from FWA cases
      const categoryBreakdown = await db.execute(sql`
        SELECT 
          COALESCE(category, 'unknown') as category,
          COUNT(*) as count
        FROM fwa_cases
        GROUP BY category
      `);
      
      // Get monthly trends (last 6 months) 
      const monthlyTrends = await db.execute(sql`
        SELECT 
          TO_CHAR(created_at, 'Mon') as month,
          EXTRACT(MONTH FROM created_at) as month_num,
          COUNT(*) as case_count,
          COALESCE(SUM(CASE WHEN total_amount IS NOT NULL AND total_amount::text ~ '^-?[0-9.]+$' THEN total_amount::decimal ELSE 0 END), 0) as flagged_amount,
          COALESCE(SUM(CASE WHEN recovery_amount IS NOT NULL AND recovery_amount::text ~ '^-?[0-9.]+$' THEN recovery_amount::decimal ELSE 0 END), 0) as recovered_amount
        FROM fwa_cases
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
        ORDER BY month_num
      `);
      
      // Get top flagged providers - aggregate by provider and sort by highest risk
      const topProviders = await db.execute(sql`
        WITH provider_stats AS (
          SELECT 
            TRIM(fs.entity_id) as provider_id,
            SUM(COALESCE(fs.claim_count, 0)) as flagged_claims,
            SUM(CASE WHEN fs.total_amount IS NOT NULL AND fs.total_amount::text ~ '^-?[0-9.]+$' THEN fs.total_amount::decimal ELSE 0 END) as total_amount,
            MAX(COALESCE(ABS(CASE WHEN fs.z_score IS NOT NULL AND fs.z_score::text ~ '^-?[0-9.]+$' THEN fs.z_score::decimal ELSE 0 END) * 10, 0) + 
                COALESCE((CASE WHEN fs.rejection_rate IS NOT NULL AND fs.rejection_rate::text ~ '^-?[0-9.]+$' THEN fs.rejection_rate::decimal ELSE 0 END) * 50, 0)) as risk_score
          FROM fwa_feature_store fs
          WHERE fs.entity_type = 'provider'
          GROUP BY TRIM(fs.entity_id)
        )
        SELECT 
          ps.provider_id,
          p.name as provider_name,
          ps.flagged_claims,
          ROUND(ps.total_amount::decimal, 2) as total_amount,
          ROUND(ps.risk_score::decimal, 2) as risk_score,
          CASE 
            WHEN ps.risk_score >= 80 THEN 'critical'
            WHEN ps.risk_score >= 60 THEN 'high'
            ELSE 'medium'
          END as risk_level
        FROM provider_stats ps
        LEFT JOIN provider_directory p ON ps.provider_id = p.id
        ORDER BY ps.risk_score DESC NULLS LAST
        LIMIT 5
      `);
      
      const stats = detectionStats.rows?.[0] || {};
      const avgDetectionTimeHours = (parseFloat(String(stats.avg_detection_time_ms || 0)) / 1000 / 60 / 60).toFixed(2);
      const preventiveSavings = parseFloat(String(stats.preventive_savings || 0));
      
      // Format category breakdown - no mock fallback
      const categories = (categoryBreakdown.rows || []).map((row: any) => ({
        name: String(row.category || "unknown").charAt(0).toUpperCase() + String(row.category || "unknown").slice(1),
        value: parseInt(String(row.count || 0)),
        color: row.category === "coding" ? "#f43f5e" : 
               row.category === "management" ? "#f59e0b" : 
               row.category === "physician" ? "#3b82f6" : 
               row.category === "patient" ? "#a855f7" : "#6b7280"
      }));
      
      // Format monthly data
      const monthlyData = (monthlyTrends.rows || []).map((row: any) => ({
        month: String(row.month || ""),
        preventive: parseFloat(String(row.flagged_amount || 0)),
        recovery: parseFloat(String(row.recovered_amount || 0))
      }));
      
      // Format top providers - unique, with proper names
      const seenProviders = new Set<string>();
      const providers = (topProviders.rows || [])
        .filter((row: any) => {
          const id = String(row.provider_id || "").trim();
          if (seenProviders.has(id)) return false;
          seenProviders.add(id);
          return true;
        })
        .map((row: any) => ({
          id: String(row.provider_id || "").trim(),
          name: row.provider_name || `Provider ${String(row.provider_id || "").trim().substring(0, 8)}`,
          riskScore: parseFloat(String(row.risk_score || 0)),
          flaggedClaims: parseInt(String(row.flagged_claims || 0)),
          totalAmount: parseFloat(String(row.total_amount || 0)),
          status: row.risk_level === "critical" ? "Investigation" : 
                  row.risk_level === "high" ? "Under Review" : "Monitoring"
        }));
      
      // Calculate actual impact from real data
      // prospectiveImpact = flagged amounts from high/medium risk detections (live claims)
      // retrospectiveFindings = actual recovered amounts from resolved cases (historical)
      res.json({
        totalImpact: totalRecovery + preventiveSavings,
        prospectiveImpact: preventiveSavings,
        retrospectiveFindings: totalRecovery,
        casesResolved: resolvedCases,
        avgDetectionTime: parseFloat(avgDetectionTimeHours) || 0.5,
        totalDetections: parseInt(String(stats.total_detections || 0)),
        highRiskCount: parseInt(String(stats.high_risk_count || 0)),
        mediumRiskCount: parseInt(String(stats.medium_risk_count || 0)),
        lowRiskCount: parseInt(String(stats.low_risk_count || 0)),
        categoryBreakdown: categories,
        monthlyData: monthlyData,
        topProviders: providers
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/kpi-stats", "fetch KPI stats");
    }
  });

  // GET /api/fwa/detection/configs - Get all detection method configurations
  app.get("/api/fwa/detection/configs", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaDetectionConfigs } = await import("@shared/schema");
      const configs = await db.select().from(fwaDetectionConfigs);
      res.json(configs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection/configs", "fetch detection configs");
    }
  });

  // PATCH /api/fwa/detection/configs/:method - Update detection method configuration
  app.patch("/api/fwa/detection/configs/:method", async (req, res) => {
    try {
      const { method } = req.params;
      const { isEnabled, weight, threshold } = req.body;
      
      const { db } = await import("../db");
      const { fwaDetectionConfigs } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const updates: any = { updatedAt: new Date() };
      if (isEnabled !== undefined) updates.isEnabled = isEnabled;
      if (weight !== undefined) updates.weight = weight.toString();
      if (threshold !== undefined) updates.threshold = threshold.toString();
      
      await db.update(fwaDetectionConfigs)
        .set(updates)
        .where(eq(fwaDetectionConfigs.method, method));
      
      const updated = await db.select().from(fwaDetectionConfigs).where(eq(fwaDetectionConfigs.method, method));
      res.json(updated[0] || { message: "Config not found" });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection/configs/:method", "update detection config");
    }
  });

  // POST /api/fwa/seed - Seed sample FWA data
  app.post("/api/fwa/seed", async (req, res) => {
    try {
      const existingCases = await storage.getFwaCases();
      if (existingCases.length > 0) {
        return res.json({ message: "FWA data already seeded", cases: existingCases.length });
      }

      const sampleCases = [
        { caseId: "FWA-2025-001", claimId: "CLM-10001", providerId: "PROV-501", patientId: "PAT-1001", status: "analyzing" as const, phase: "a1_analysis" as const, priority: "high" as const, totalAmount: "125000.00" },
        { caseId: "FWA-2025-002", claimId: "CLM-10002", providerId: "PROV-302", patientId: "PAT-1002", status: "categorized" as const, phase: "a2_categorization" as const, priority: "critical" as const, totalAmount: "85000.00", recoveryAmount: "42500.00" },
        { caseId: "FWA-2025-003", claimId: "CLM-10003", providerId: "PROV-201", patientId: "PAT-1003", status: "action_pending" as const, phase: "a3_action" as const, priority: "medium" as const, totalAmount: "32000.00", recoveryAmount: "16000.00" },
        { caseId: "FWA-2025-004", claimId: "CLM-10004", providerId: "PROV-401", patientId: "PAT-1004", status: "resolved" as const, phase: "a3_action" as const, priority: "low" as const, totalAmount: "15000.00", recoveryAmount: "15000.00" },
        { caseId: "FWA-2025-005", claimId: "CLM-10005", providerId: "PROV-601", patientId: "PAT-1005", status: "draft" as const, phase: "a1_analysis" as const, priority: "high" as const, totalAmount: "78000.00" },
      ];

      const createdCases = await Promise.all(
        sampleCases.map((c) => storage.createFwaCase(c))
      );

      for (const fwaCase of createdCases) {
        await storage.createFwaFinding({
          caseId: fwaCase.id,
          findingType: "pattern",
          source: "claims_data",
          description: "Unusual billing pattern detected with frequency anomalies",
          confidence: "0.87",
          severity: fwaCase.priority ?? "medium",
          evidence: { patterns: ["high_frequency", "unusual_timing"], claimCount: 15 } as Record<string, any>,
        });

        if (fwaCase.status !== "draft" && fwaCase.status !== "analyzing") {
          await storage.createFwaCategory({
            caseId: fwaCase.id,
            categoryType: "coding",
            subCategory: "Upcoding",
            evidenceChain: { findings: ["billing_pattern"], rules: ["coding_guideline_violation"] },
            confidenceScore: "0.82",
            severityScore: "0.75",
            recommendedActions: ["Review coding practices", "Request documentation"],
          });
        }

        if (fwaCase.status === "action_pending" || fwaCase.status === "resolved") {
          await storage.createFwaAction({
            caseId: fwaCase.id,
            actionType: "recovery",
            actionTrack: "historical_claims",
            status: fwaCase.status === "resolved" ? "completed" : "pending",
            targetClaimId: fwaCase.claimId,
            amount: fwaCase.recoveryAmount ?? "0",
            justification: "Recovery action based on FWA analysis findings",
            executedBy: "system",
          });
        }
      }

      const existingDocs = await storage.getFwaRegulatoryDocs();
      if (existingDocs.length === 0) {
        const sampleDocs = [
          { title: "NPHIES Claim Submission Guidelines", category: "nphies" as const, content: "Guidelines for proper claim submission through NPHIES...", regulationId: "NPHIES-2024-001", effectiveDate: new Date("2024-01-01"), jurisdiction: "Saudi Arabia" },
          { title: "CCHI Fraud Prevention Standards", category: "cchi" as const, content: "Standards for fraud prevention in healthcare claims...", regulationId: "CCHI-FP-2024", effectiveDate: new Date("2024-03-15"), jurisdiction: "Saudi Arabia" },
        ];
        await Promise.all(sampleDocs.map((d) => storage.createFwaRegulatoryDoc(d)));
      }

      const existingGuidelines = await storage.getFwaMedicalGuidelines();
      if (existingGuidelines.length === 0) {
        const sampleGuidelines = [
          { title: "Medical Necessity Criteria for Imaging", category: "medical_necessity" as const, content: "Criteria for determining medical necessity of imaging procedures...", sourceAuthority: "Saudi Health Council", specialtyArea: "Radiology" },
          { title: "Treatment Pathway: Cardiac Procedures", category: "treatment_pathway" as const, content: "Standard treatment pathways for cardiac procedures...", sourceAuthority: "MOH Clinical Guidelines", specialtyArea: "Cardiology" },
        ];
        await Promise.all(sampleGuidelines.map((g) => storage.createFwaMedicalGuideline(g)));
      }

      res.status(201).json({ message: "FWA sample data seeded successfully", cases: createdCases.length });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/seed", "seed FWA data");
    }
  });

  // Helper to auto-seed FWA cases if storage is empty (disabled when DISABLE_SEEDER=true)
  async function ensureFwaCasesSeeded() {
    if (process.env.DISABLE_SEEDER === 'true') {
      return; // Skip auto-seeding when seeder is disabled
    }
    const existingCases = await storage.getFwaCases();
    if (existingCases.length === 0) {
      const sampleCases = [
        { caseId: "FWA-2025-001", claimId: "CLM-10001", providerId: "PRV-001", patientId: "PAT-1001", status: "analyzing" as const, phase: "a1_analysis" as const, priority: "critical" as const, totalAmount: "45000.00", flagReason: "Unusual billing pattern", claimType: "Inpatient" },
        { caseId: "FWA-2025-002", claimId: "CLM-10002", providerId: "PRV-002", patientId: "PAT-1002", status: "categorized" as const, phase: "a2_categorization" as const, priority: "high" as const, totalAmount: "28500.00", recoveryAmount: "14250.00", flagReason: "Duplicate services", claimType: "Outpatient" },
        { caseId: "FWA-2025-003", claimId: "CLM-10003", providerId: "PRV-003", patientId: "PAT-1003", status: "action_pending" as const, phase: "a3_action" as const, priority: "high" as const, totalAmount: "65200.00", recoveryAmount: "32600.00", flagReason: "Upcoding detected", claimType: "Surgical" },
        { caseId: "FWA-2025-004", claimId: "CLM-10004", providerId: "PRV-004", patientId: "PAT-1004", status: "resolved" as const, phase: "a3_action" as const, priority: "medium" as const, totalAmount: "18900.00", recoveryAmount: "18900.00", flagReason: "Excessive services", claimType: "Emergency" },
        { caseId: "FWA-2025-005", claimId: "CLM-10005", providerId: "PRV-005", patientId: "PAT-1005", status: "draft" as const, phase: "a1_analysis" as const, priority: "medium" as const, totalAmount: "125000.00", flagReason: "High cost outlier", claimType: "Oncology" },
        { caseId: "FWA-2025-006", claimId: "CLM-10006", providerId: "PRV-008", patientId: "PAT-1006", status: "analyzing" as const, phase: "a1_analysis" as const, priority: "critical" as const, totalAmount: "32400.00", flagReason: "Unbundling suspected", claimType: "Pediatrics" },
        { caseId: "FWA-2025-007", claimId: "CLM-10007", providerId: "PRV-001", patientId: "PAT-1007", status: "categorized" as const, phase: "a2_categorization" as const, priority: "critical" as const, totalAmount: "78500.00", recoveryAmount: "39250.00", flagReason: "Phantom billing", claimType: "Cardiology" },
        { caseId: "FWA-2025-008", claimId: "CLM-10008", providerId: "PRV-006", patientId: "PAT-1008", status: "draft" as const, phase: "a1_analysis" as const, priority: "low" as const, totalAmount: "5600.00", flagReason: "Minor discrepancy", claimType: "Dermatology" },
        { caseId: "FWA-2025-009", claimId: "CLM-10009", providerId: "PRV-007", patientId: "PAT-1009", status: "resolved" as const, phase: "a3_action" as const, priority: "low" as const, totalAmount: "12800.00", recoveryAmount: "12800.00", flagReason: "Coding review", claimType: "Internal Medicine" },
        { caseId: "FWA-2025-010", claimId: "CLM-10010", providerId: "PRV-002", patientId: "PAT-1010", status: "analyzing" as const, phase: "a1_analysis" as const, priority: "high" as const, totalAmount: "42000.00", flagReason: "Frequency anomaly", claimType: "Orthopedics" },
        { caseId: "FWA-2025-011", claimId: "CLM-10011", providerId: "PRV-003", patientId: "PAT-1011", status: "categorized" as const, phase: "a2_categorization" as const, priority: "high" as const, totalAmount: "95000.00", recoveryAmount: "47500.00", flagReason: "Provider pattern", claimType: "Neurology" },
        { caseId: "FWA-2025-012", claimId: "CLM-10012", providerId: "PRV-004", patientId: "PAT-1012", status: "action_pending" as const, phase: "a3_action" as const, priority: "medium" as const, totalAmount: "55000.00", recoveryAmount: "27500.00", flagReason: "Length of stay outlier", claimType: "General Surgery" },
      ];
      await Promise.all(sampleCases.map((c) => storage.createFwaCase(c)));
    }
  }

  // GET /api/fwa/cases - List all FWA cases with detection data
  app.get("/api/fwa/cases", async (req, res) => {
    try {
      await ensureFwaCasesSeeded();
      const { status, priority, phase, includeDetection } = req.query;
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get cases with latest detection results joined
      const casesWithDetection = await db.execute(sql`
        SELECT 
          c.*,
          dr.composite_score,
          dr.composite_risk_level as detection_risk_level,
          dr.rule_engine_score,
          dr.statistical_score,
          dr.unsupervised_score,
          dr.rag_llm_score,
          dr.primary_detection_method,
          dr.detection_summary,
          dr.recommended_action,
          dr.analyzed_at as last_detection_at,
          dr.rule_engine_findings,
          dr.statistical_findings,
          dr.unsupervised_findings,
          dr.rag_llm_findings
        FROM fwa_cases c
        LEFT JOIN LATERAL (
          SELECT * FROM fwa_detection_results 
          WHERE claim_id = c.claim_id OR case_id = c.id
          ORDER BY analyzed_at DESC 
          LIMIT 1
        ) dr ON true
        ORDER BY c.created_at DESC
      `);
      
      let cases = casesWithDetection.rows.map((row: any) => ({
        id: row.id,
        caseId: row.case_id,
        claimId: row.claim_id,
        providerId: row.provider_id,
        patientId: row.patient_id,
        status: row.status,
        phase: row.phase,
        priority: row.priority,
        totalAmount: row.total_amount,
        recoveryAmount: row.recovery_amount,
        assignedTo: row.assigned_to,
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Detection data from latest run
        compositeScore: row.composite_score,
        detectionRiskLevel: row.detection_risk_level,
        ruleEngineScore: row.rule_engine_score,
        statisticalScore: row.statistical_score,
        unsupervisedScore: row.unsupervised_score,
        ragLlmScore: row.rag_llm_score,
        primaryDetectionMethod: row.primary_detection_method,
        detectionSummary: row.detection_summary,
        recommendedAction: row.recommended_action,
        lastDetectionAt: row.last_detection_at,
        ruleEngineFindings: row.rule_engine_findings,
        statisticalFindings: row.statistical_findings,
        unsupervisedFindings: row.unsupervised_findings,
        ragLlmFindings: row.rag_llm_findings
      }));
      
      if (status && typeof status === "string") {
        cases = cases.filter((c: any) => c.status === status);
      }
      if (priority && typeof priority === "string") {
        cases = cases.filter((c: any) => c.priority === priority);
      }
      if (phase && typeof phase === "string") {
        cases = cases.filter((c: any) => c.phase === phase);
      }
      
      res.json(cases);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases", "fetch FWA cases");
    }
  });

  // GET /api/fwa/cases/:id - Get case by ID or claimId
  app.get("/api/fwa/cases/:id", auditDataAccess("fwa_case"), async (req, res) => {
    try {
      await ensureFwaCasesSeeded();
      let fwaCase = await storage.getFwaCaseById(req.params.id);
      if (!fwaCase) {
        fwaCase = await storage.getFwaCaseByClaimId(req.params.id);
      }
      if (!fwaCase) {
        return res.status(404).json({ error: "FWA case not found" });
      }
      res.json(fwaCase);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id", "fetch FWA case");
    }
  });

  // POST /api/fwa/cases - Create new case
  app.post("/api/fwa/cases", async (req, res) => {
    try {
      const parsed = insertFwaCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const fwaCase = await storage.createFwaCase(parsed.data);
      res.status(201).json(fwaCase);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases", "create FWA case");
    }
  });

  // PATCH /api/fwa/cases/:id - Update case (supports both UUID id and human-readable caseId)
  app.patch("/api/fwa/cases/:id", async (req, res) => {
    try {
      const partialSchema = insertFwaCaseSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      
      // First try to update by the provided id
      let fwaCase = await storage.updateFwaCase(req.params.id, parsed.data);
      
      // If not found, try to find the case by caseId or claimId and update using its UUID
      if (!fwaCase) {
        let existingCase = await storage.getFwaCaseById(req.params.id);
        if (!existingCase) {
          existingCase = await storage.getFwaCaseByClaimId(req.params.id);
        }
        // Also check if the id matches a caseId pattern (e.g., "FWA-2025-001")
        if (!existingCase) {
          const allCases = await storage.getFwaCases();
          existingCase = allCases.find(c => c.caseId === req.params.id);
        }
        if (existingCase) {
          fwaCase = await storage.updateFwaCase(existingCase.id, parsed.data);
        }
      }
      
      if (!fwaCase) {
        return res.status(404).json({ error: "FWA case not found" });
      }
      res.json(fwaCase);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id", "update FWA case");
    }
  });

  // POST /api/fwa/cases/:id/run-analysis - Run AI analysis for case
  app.post("/api/fwa/cases/:id/run-analysis", async (req, res) => {
    try {
      const { targetPhase } = req.body;
      if (!targetPhase || !["a1_analysis", "a2_categorization", "a3_action"].includes(targetPhase)) {
        return res.status(400).json({ error: "Invalid targetPhase. Must be a1_analysis, a2_categorization, or a3_action" });
      }

      let fwaCase = await storage.getFwaCaseById(req.params.id);
      if (!fwaCase) {
        fwaCase = await storage.getFwaCaseByClaimId(req.params.id);
      }
      if (!fwaCase) {
        return res.status(404).json({ error: "FWA case not found" });
      }

      const entityType = fwaCase.providerId && fwaCase.providerId !== "N/A" ? "provider" : 
                         fwaCase.patientId && fwaCase.patientId !== "N/A" ? "patient" : "provider";
      const entityId = entityType === "provider" ? fwaCase.providerId : fwaCase.patientId;
      const entityData = getEntityData(entityType, entityId || "unknown");

      const phaseMap: Record<string, "A1" | "A2" | "A3"> = {
        "a1_analysis": "A1",
        "a2_categorization": "A2",
        "a3_action": "A3"
      };
      const phase = phaseMap[targetPhase];

      const { runAgent } = await import("../services/agent-orchestrator");
      const agentResult = await runAgent({
        entityId: entityId || fwaCase.caseId,
        entityType: entityType as "provider" | "patient" | "doctor",
        entityName: entityData?.name || fwaCase.caseId,
        agentId: `${phase.toLowerCase()}_${entityType}_analyzer`,
        agentName: `${phase} ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Analyzer`,
        phase,
        entityData,
      });

      const createdItems: any[] = [];

      if (targetPhase === "a1_analysis") {
        for (const finding of agentResult.findings) {
          const created = await storage.createFwaFinding({
            caseId: fwaCase.id,
            findingType: "pattern",
            source: "claims_data",
            description: finding.description || finding.title,
            confidence: String(Math.round(finding.confidence * 100)),
            severity: finding.severity === "critical" ? "critical" : finding.severity === "high" ? "high" : finding.severity === "medium" ? "medium" : "low",
            evidence: { title: finding.title, evidence: finding.evidence, category: finding.category } as Record<string, any>,
          });
          createdItems.push(created);
        }
      } else if (targetPhase === "a2_categorization") {
        for (const finding of agentResult.findings) {
          const subCategory = finding.category || "billing_anomaly";
          const created = await storage.createFwaCategory({
            caseId: fwaCase.id,
            categoryType: "coding",
            subCategory: subCategory,
            confidenceScore: String(Math.round(finding.confidence * 100)),
            severityScore: String(finding.severity === "critical" ? 95 : finding.severity === "high" ? 75 : finding.severity === "medium" ? 50 : 25),
            evidenceChain: { description: finding.description, evidence: finding.evidence } as Record<string, any>,
          });
          createdItems.push(created);
        }
      } else if (targetPhase === "a3_action") {
        const baseRecovery = typeof agentResult.metrics.recoveryPotential === 'number' 
          ? agentResult.metrics.recoveryPotential 
          : parseFloat(String(agentResult.metrics.recoveryPotential).replace(/[^0-9.]/g, '')) || 0;
        
        for (const rec of agentResult.recommendations) {
          const isRecovery = rec.action.toLowerCase().includes("recover") || rec.action.toLowerCase().includes("payment") || rec.action.toLowerCase().includes("refund");
          const created = await storage.createFwaAction({
            caseId: fwaCase.id,
            actionType: isRecovery ? "recovery" : "preventive",
            actionTrack: "live_claims",
            status: "pending",
            amount: isRecovery ? String(Math.round(baseRecovery)) : null,
            justification: `${rec.action} (Timeline: ${rec.timeline || 'TBD'})`,
            executedBy: fwaCase.assignedTo || "AI Agent",
          });
          createdItems.push(created);
        }
      }

      const statusMap: Record<string, string> = {
        "a1_analysis": "analyzing",
        "a2_categorization": "categorized",
        "a3_action": "action_pending"
      };

      await storage.updateFwaCase(fwaCase.id, { 
        phase: targetPhase as any,
        status: statusMap[targetPhase] as any
      });

      res.json({
        success: true,
        phase: targetPhase,
        itemsCreated: createdItems.length,
        agentSummary: agentResult.executiveSummary,
        metrics: agentResult.metrics,
        items: createdItems,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/run-analysis", "run AI analysis");
    }
  });

  // GET /api/fwa/cases/:id/findings - Get findings for case
  app.get("/api/fwa/cases/:id/findings", async (req, res) => {
    try {
      let fwaCase = await storage.getFwaCaseById(req.params.id);
      if (!fwaCase) {
        fwaCase = await storage.getFwaCaseByClaimId(req.params.id);
      }
      if (!fwaCase) {
        return res.json([]);
      }
      const findings = await storage.getFwaFindingsByCaseId(fwaCase.id);
      res.json(findings);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/findings", "fetch FWA findings");
    }
  });

  // POST /api/fwa/cases/:id/findings - Add finding to case
  app.post("/api/fwa/cases/:id/findings", async (req, res) => {
    try {
      const parsed = insertFwaAnalysisFindingSchema.safeParse({
        ...req.body,
        caseId: req.params.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const finding = await storage.createFwaFinding(parsed.data);
      res.status(201).json(finding);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/findings", "create FWA finding");
    }
  });

  // GET /api/fwa/cases/:id/categories - Get categories for case
  app.get("/api/fwa/cases/:id/categories", async (req, res) => {
    try {
      let fwaCase = await storage.getFwaCaseById(req.params.id);
      if (!fwaCase) {
        fwaCase = await storage.getFwaCaseByClaimId(req.params.id);
      }
      if (!fwaCase) {
        return res.json([]);
      }
      const categories = await storage.getFwaCategoriesByCaseId(fwaCase.id);
      res.json(categories);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/categories", "fetch FWA categories");
    }
  });

  // POST /api/fwa/cases/:id/categories - Add category to case
  app.post("/api/fwa/cases/:id/categories", async (req, res) => {
    try {
      const parsed = insertFwaCategorySchema.safeParse({
        ...req.body,
        caseId: req.params.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const category = await storage.createFwaCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/categories", "create FWA category");
    }
  });

  // GET /api/fwa/cases/:id/actions - Get actions for case
  app.get("/api/fwa/cases/:id/actions", async (req, res) => {
    try {
      let fwaCase = await storage.getFwaCaseById(req.params.id);
      if (!fwaCase) {
        fwaCase = await storage.getFwaCaseByClaimId(req.params.id);
      }
      if (!fwaCase) {
        return res.json([]);
      }
      const actions = await storage.getFwaActionsByCaseId(fwaCase.id);
      res.json(actions);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/actions", "fetch FWA actions");
    }
  });

  // POST /api/fwa/cases/:id/actions - Add action to case
  app.post("/api/fwa/cases/:id/actions", async (req, res) => {
    try {
      const parsed = insertFwaActionSchema.safeParse({
        ...req.body,
        caseId: req.params.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const action = await storage.createFwaAction(parsed.data);
      res.status(201).json(action);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/actions", "create FWA action");
    }
  });

  // PATCH /api/fwa/actions/:id - Update action
  app.patch("/api/fwa/actions/:id", async (req, res) => {
    try {
      const partialSchema = insertFwaActionSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const action = await storage.updateFwaAction(req.params.id, parsed.data);
      if (!action) {
        return res.status(404).json({ error: "FWA action not found" });
      }
      res.json(action);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/actions/:id", "update FWA action");
    }
  });

  // GET /api/fwa/cases/:id/services - Get claim services for case
  app.get("/api/fwa/cases/:id/services", async (req, res) => {
    try {
      let fwaCase = await storage.getFwaCaseById(req.params.id);
      if (!fwaCase) {
        fwaCase = await storage.getFwaCaseByClaimId(req.params.id);
      }
      if (!fwaCase) {
        return res.json([]);
      }
      
      // Try multiple strategies to find claim and services
      let services: any[] = [];
      
      // Strategy 1: Look up claim by claimNumber
      let claim = await db.select().from(claims).where(eq(claims.claimNumber, fwaCase.claimId)).limit(1);
      
      // Strategy 2: Look up claim by id if claimNumber didn't match
      if (claim.length === 0) {
        claim = await db.select().from(claims).where(eq(claims.id, fwaCase.claimId)).limit(1);
      }
      
      // Strategy 3: Try to find services directly by the case's claimId
      if (claim.length === 0) {
        services = await db.select().from(fwaClaimServices).where(eq(fwaClaimServices.claimId, fwaCase.claimId));
      } else {
        // Found the claim, get services by claim.id
        services = await db.select().from(fwaClaimServices).where(eq(fwaClaimServices.claimId, claim[0].id));
      }
      
      // Strategy 4: If still no services found, generate realistic mock services based on case data
      if (services.length === 0 && fwaCase) {
        const totalAmount = parseFloat(fwaCase.totalAmount as string) || 5000;
        const claimType = fwaCase.claimType || "Outpatient";
        const flagReason = fwaCase.flagReason || "";
        
        // Generate 2-5 services based on claim type and amount
        const serviceCount = Math.min(5, Math.max(2, Math.floor(totalAmount / 2000)));
        const baseAmount = totalAmount / serviceCount;
        
        const serviceTemplates = getServiceTemplatesForClaimType(claimType, flagReason);
        
        for (let i = 0; i < serviceCount; i++) {
          const template = serviceTemplates[i % serviceTemplates.length];
          const variance = 0.8 + Math.random() * 0.4; // 80-120% of base amount
          services.push({
            id: `svc-${fwaCase.claimId}-${i + 1}`,
            claimId: fwaCase.claimId,
            serviceCode: template.code,
            serviceName: template.name,
            quantity: template.quantity || 1,
            unitPrice: (baseAmount * variance).toFixed(2),
            totalPrice: (baseAmount * variance * (template.quantity || 1)).toFixed(2),
            serviceDate: fwaCase.createdAt ? new Date(fwaCase.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            diagnosisCode: template.diagnosisCode,
            modifiers: template.modifiers || null,
            renderingProviderId: fwaCase.providerId,
            status: "billed",
            notes: template.notes || null,
          });
        }
      }
      
      res.json(services);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/:id/services", "fetch claim services");
    }
  });
  
  // Helper function to generate realistic service templates based on claim type
  function getServiceTemplatesForClaimType(claimType: string, flagReason: string): Array<{code: string; name: string; quantity?: number; diagnosisCode: string; modifiers?: string; notes?: string}> {
    const isUpcoding = flagReason.toLowerCase().includes("upcod");
    const isDuplicate = flagReason.toLowerCase().includes("duplicate");
    const isUnbundling = flagReason.toLowerCase().includes("unbundl");
    
    if (claimType === "Inpatient") {
      return [
        { code: "99223", name: "Hospital admission - high severity", diagnosisCode: "I21.9", notes: isUpcoding ? "High-level E/M code - verify medical necessity" : null },
        { code: "99233", name: "Subsequent hospital care - high complexity", diagnosisCode: "I21.9" },
        { code: "36556", name: "Central venous catheter insertion", diagnosisCode: "I21.9", modifiers: isUnbundling ? "59" : null },
        { code: "93010", name: "ECG interpretation", quantity: isDuplicate ? 3 : 1, diagnosisCode: "I21.9", notes: isDuplicate ? "Multiple ECGs on same day - verify necessity" : null },
        { code: "71046", name: "Chest X-ray", diagnosisCode: "J18.9" },
      ];
    } else if (claimType === "Emergency") {
      return [
        { code: "99285", name: "Emergency department visit - high severity", diagnosisCode: "R07.9", notes: isUpcoding ? "Level 5 ED visit - verify severity documentation" : null },
        { code: "12001", name: "Simple laceration repair", diagnosisCode: "S01.80", quantity: 1 },
        { code: "99291", name: "Critical care first hour", diagnosisCode: "R57.9" },
        { code: "36415", name: "Venipuncture", diagnosisCode: "R07.9" },
        { code: "80053", name: "Comprehensive metabolic panel", diagnosisCode: "R07.9" },
      ];
    } else {
      // Outpatient / Other
      return [
        { code: "99215", name: "Office visit - high complexity", diagnosisCode: "I10", notes: isUpcoding ? "High-level office visit - verify documentation" : null },
        { code: "99214", name: "Office visit - moderate complexity", diagnosisCode: "I10" },
        { code: "36415", name: "Venipuncture", diagnosisCode: "I10" },
        { code: "80061", name: "Lipid panel", diagnosisCode: "E78.5" },
        { code: "93000", name: "ECG complete", diagnosisCode: "I10", quantity: isDuplicate ? 2 : 1 },
      ];
    }
  }

  // GET /api/fwa/regulatory-docs - List regulatory docs
  app.get("/api/fwa/regulatory-docs", async (req, res) => {
    try {
      await seedCHIDemoData();
      const docs = await storage.getFwaRegulatoryDocs();
      res.json(docs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/regulatory-docs", "fetch regulatory docs");
    }
  });

  // POST /api/fwa/regulatory-docs - Add regulatory doc
  app.post("/api/fwa/regulatory-docs", async (req, res) => {
    try {
      const parsed = insertFwaRegulatoryDocSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const doc = await storage.createFwaRegulatoryDoc(parsed.data);
      res.status(201).json(doc);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/regulatory-docs", "create regulatory doc");
    }
  });

  // GET /api/fwa/medical-guidelines - List medical guidelines
  app.get("/api/fwa/medical-guidelines", async (req, res) => {
    try {
      await seedCHIDemoData();
      const guidelines = await storage.getFwaMedicalGuidelines();
      res.json(guidelines);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/medical-guidelines", "fetch medical guidelines");
    }
  });

  // POST /api/fwa/medical-guidelines - Add medical guideline
  app.post("/api/fwa/medical-guidelines", async (req, res) => {
    try {
      const parsed = insertFwaMedicalGuidelineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const guideline = await storage.createFwaMedicalGuideline(parsed.data);
      res.status(201).json(guideline);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/medical-guidelines", "create medical guideline");
    }
  });

  // GET /api/fwa/high-risk-providers - List high-risk providers from pre-computed detection data
  app.get("/api/fwa/high-risk-providers", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Use pre-computed provider detection results for fast query
      const providers = await db.execute(sql`
        SELECT 
          pdr.provider_id,
          COALESCE(pdr.composite_score, 0) as avg_risk_score,
          COALESCE(pdr.composite_score, 0) as max_risk_score,
          pdr.risk_level,
          pdr.rule_engine_score,
          pdr.statistical_score,
          pdr.unsupervised_score,
          pdr.rag_score,
          pdr.semantic_score,
          pdr.analyzed_at as last_detection_date,
          COALESCE((pdr.aggregated_metrics->>'totalClaims')::integer, fs.claim_count, 0) as total_claims,
          COALESCE(fs.unique_patients, 0) as unique_patients,
          COALESCE((pdr.aggregated_metrics->>'totalExposure')::numeric, fs.total_amount, 0) as total_exposure,
          pd.name as provider_name,
          pd.specialty
        FROM fwa_provider_detection_results pdr
        LEFT JOIN fwa_feature_store fs ON fs.entity_id = pdr.provider_id AND fs.entity_type = 'provider'
        LEFT JOIN provider_directory pd ON pd.id = pdr.provider_id
        ORDER BY pdr.composite_score DESC NULLS LAST
        LIMIT 20
      `);
      
      // Helper to safely parse numeric values
      const safeNum = (val: any, fallback: number = 0): number => {
        if (val === null || val === undefined) return fallback;
        const num = parseFloat(String(val));
        return Number.isFinite(num) ? num : fallback;
      };

      // Provider name mapping for known providers
      const providerNames: Record<string, string> = {
        'PRV-GEN-0001': 'مستشفى الحبيب (Al Habib Hospital)',
        'PRV-GEN-0002': 'مستشفى المواساة (Al Mouwasat Hospital)',
        'PRV-GEN-0003': 'المستشفى السعودي الألماني (Saudi German Hospital)',
        'PRV-GEN-0004': 'مستشفى دله (Dallah Hospital)',
        'PRV-GEN-0005': 'مستشفى سليمان الحبيب (Sulaiman Al Habib)',
        'PRV-GEN-0006': 'مركز الرياض الطبي (Riyadh Medical Center)',
        'PRV-GEN-0007': 'مستشفى الملك فيصل التخصصي (King Faisal Specialist)',
        'PRV-GEN-0008': 'مستشفى الملك خالد الجامعي (King Khalid University Hospital)',
        'PRV-GEN-0009': 'مركز جدة الطبي (Jeddah Medical Center)',
        'PRV-GEN-0010': 'مستشفى الدمام المركزي (Dammam Central Hospital)',
      };

      // Dynamic risk level calculation from score
      // Adjusted thresholds to match actual detection score distribution (max ~45%)
      const calculateRiskLevel = (score: number): "critical" | "high" | "medium" | "low" | "minimal" => {
        if (score >= 40) return "critical";
        if (score >= 30) return "high";
        if (score >= 20) return "medium";
        if (score >= 10) return "low";
        return "minimal";
      };

      const formattedProviders = providers.rows.map((p: any, idx: number) => {
        const providerId = p.provider_id?.trim() || `PRV-${idx + 1}`;
        const avgRiskScore = safeNum(p.avg_risk_score, 0);
        const maxRiskScore = safeNum(p.max_risk_score, 0);
        const totalExposure = safeNum(p.total_exposure, 0);
        const totalClaims = parseInt(p.total_claims) || 0;
        const uniquePatients = parseInt(p.unique_patients) || 0;
        // Calculate risk level dynamically from score instead of using stored value
        const riskLevel = calculateRiskLevel(avgRiskScore);
        
        // Determine flagged status from pre-computed risk level
        const isHighRisk = riskLevel === 'high' || riskLevel === 'critical';
        const isCritical = riskLevel === 'critical';
        
        // Generate meaningful reasons based on actual data
        const reasons: string[] = [];
        if (isCritical) reasons.push("Critical risk level detected");
        if (isHighRisk) reasons.push("Elevated risk patterns identified");
        if (avgRiskScore >= 50) reasons.push(`Risk score: ${avgRiskScore.toFixed(1)}%`);
        if (safeNum(p.statistical_score, 0) > 20) reasons.push(`Statistical deviation: ${safeNum(p.statistical_score, 0).toFixed(1)}`);
        if (totalExposure > 500000) reasons.push(`High exposure: SAR ${totalExposure.toLocaleString()}`);
        if (totalClaims > 30) reasons.push(`High volume: ${totalClaims} claims`);
        if (reasons.length === 0) reasons.push("Routine monitoring - no significant concerns");

        // Get provider name from mapping or generate from ID
        const providerName = p.provider_name || providerNames[providerId] || 
          (providerId.startsWith('PRV-GEN') ? `Saudi Healthcare Provider ${providerId.replace('PRV-GEN-', '')}` : 
           `Provider ${providerId.substring(0, 8)}`);

        return {
          id: `p${idx + 1}`,
          providerId: providerId,
          providerName: providerName,
          providerType: "Healthcare Facility",
          specialty: p.specialty || "Multi-Specialty",
          organization: "Saudi Healthcare Network",
          riskScore: avgRiskScore.toFixed(2),
          riskLevel: riskLevel,
          totalClaims: totalClaims,
          flaggedClaims: isHighRisk ? 1 : 0,
          denialRate: "0.00",
          avgClaimAmount: (totalClaims > 0 ? totalExposure / totalClaims : 0).toFixed(2),
          totalExposure: totalExposure.toFixed(2),
          claimsPerMonth: String(Math.round(totalClaims / 6)),
          cpmTrend: avgRiskScore > 40 ? "+5.2" : "-2.1",
          cpmPeerAverage: "35.00",
          fwaCaseCount: isHighRisk ? 1 : 0,
          uniquePatients: uniquePatients,
          reasons: reasons,
          lastFlaggedDate: p.last_detection_date || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      res.json(formattedProviders);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/high-risk-providers", "fetch high-risk providers");
    }
  });

  // GET /api/fwa/providers/:providerId/profile - Comprehensive provider drill-down with claims and findings
  app.get("/api/fwa/providers/:providerId/profile", async (req, res) => {
    try {
      const { providerId } = req.params;
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Provider name mapping
      const providerNames: Record<string, string> = {
        'PRV-GEN-0001': 'مستشفى الحبيب (Al Habib Hospital)',
        'PRV-GEN-0002': 'مستشفى المواساة (Al Mouwasat Hospital)',
        'PRV-GEN-0003': 'المستشفى السعودي الألماني (Saudi German Hospital)',
        'PRV-GEN-0004': 'مستشفى دله (Dallah Hospital)',
        'PRV-GEN-0005': 'مستشفى سليمان الحبيب (Sulaiman Al Habib)',
        'PRV-GEN-0006': 'مركز الرياض الطبي (Riyadh Medical Center)',
        'PRV-GEN-0007': 'مستشفى الملك فيصل التخصصي (King Faisal Specialist)',
        'PRV-GEN-0008': 'مستشفى الملك خالد الجامعي (King Khalid University Hospital)',
        'PRV-GEN-0009': 'مركز جدة الطبي (Jeddah Medical Center)',
        'PRV-GEN-0010': 'مستشفى الدمام المركزي (Dammam Central Hospital)',
      };
      
      // Get provider summary from detection results directly (not feature store)
      const providerStats = await db.execute(sql`
        SELECT 
          provider_id,
          COUNT(*) as total_detections,
          COUNT(DISTINCT claim_id) as claim_count,
          COUNT(DISTINCT patient_id) as unique_patients,
          COALESCE(AVG(CASE WHEN composite_score IS NOT NULL THEN composite_score::decimal ELSE NULL END), 0) as avg_risk_score,
          COALESCE(MAX(CASE WHEN composite_score IS NOT NULL THEN composite_score::decimal ELSE NULL END), 0) as max_risk_score,
          SUM(CASE WHEN composite_risk_level IN ('critical', 'high') THEN 1 ELSE 0 END) as high_risk_count,
          SUM(CASE WHEN composite_risk_level = 'critical' THEN 1 ELSE 0 END) as critical_count,
          MIN(analyzed_at) as first_detection,
          MAX(analyzed_at) as last_detection
        FROM fwa_detection_results
        WHERE provider_id = ${providerId}
        GROUP BY provider_id
      `);
      
      // Get claim amounts from provider detection results (aggregated_metrics) or fallback to analyzed claims
      const providerExposure = await db.execute(sql`
        SELECT 
          COALESCE((aggregated_metrics->>'totalExposure')::numeric, 0) as total_exposure,
          COALESCE((aggregated_metrics->>'totalClaims')::integer, 0) as total_claims,
          COALESCE((aggregated_metrics->>'avgClaimAmount')::numeric, 0) as avg_claim_amount
        FROM fwa_provider_detection_results
        WHERE provider_id = ${providerId}
      `);
      
      // Fallback to analyzed claims if aggregated_metrics not available
      const claimAmounts = await db.execute(sql`
        SELECT 
          COALESCE(SUM(CASE WHEN ac.total_amount IS NOT NULL THEN ac.total_amount::decimal ELSE 0 END), 0) as total_amount,
          COALESCE(AVG(CASE WHEN ac.total_amount IS NOT NULL THEN ac.total_amount::decimal ELSE 0 END), 0) as avg_claim_amount
        FROM fwa_detection_results dr
        LEFT JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.id
        WHERE dr.provider_id = ${providerId}
      `);
      
      // Get all claims for this provider with detection results
      const providerClaims = await db.execute(sql`
        SELECT 
          dr.id as detection_id,
          dr.claim_id,
          dr.patient_id as member_id,
          dr.composite_score,
          dr.composite_risk_level,
          dr.rule_engine_score,
          dr.statistical_score,
          dr.unsupervised_score,
          dr.rag_llm_score,
          dr.rule_engine_findings,
          dr.statistical_findings,
          dr.unsupervised_findings,
          dr.rag_llm_findings,
          dr.analyzed_at,
          COALESCE(ac.total_amount::decimal, 0) as claim_amount,
          COALESCE(ac.claim_occurrence_date, dr.analyzed_at) as service_date,
          ac.principal_diagnosis_code as diagnosis_code,
          ac.service_code as procedure_code,
          COALESCE(ac.original_status, 'submitted') as claim_status
        FROM fwa_detection_results dr
        LEFT JOIN fwa_analyzed_claims ac ON dr.claim_id::text = ac.id::text OR dr.claim_id = ac.claim_reference
        WHERE dr.provider_id = ${providerId}
        ORDER BY dr.analyzed_at DESC
        LIMIT 50
      `);
      
      // Get rule hit summary for this provider - use 'description' field (actual field name in data)
      const ruleHits = await db.execute(sql`
        WITH expanded_rules AS (
          SELECT 
            jsonb_array_elements(rule_engine_findings->'matchedRules') as rule
          FROM fwa_detection_results
          WHERE provider_id = ${providerId}
            AND rule_engine_findings->'matchedRules' IS NOT NULL
            AND jsonb_array_length(rule_engine_findings->'matchedRules') > 0
        )
        SELECT 
          rule->>'ruleCode' as rule_code,
          rule->>'ruleName' as rule_name,
          rule->>'severity' as severity,
          COALESCE(
            rule->>'description',
            rule->>'humanReadableExplanation',
            'Rule violation detected based on claim pattern analysis'
          ) as explanation,
          COUNT(*) as hit_count
        FROM expanded_rules
        GROUP BY 
          rule->>'ruleCode',
          rule->>'ruleName',
          rule->>'severity',
          COALESCE(
            rule->>'description',
            rule->>'humanReadableExplanation',
            'Rule violation detected based on claim pattern analysis'
          )
        ORDER BY hit_count DESC
        LIMIT 20
      `);
      
      const stats = providerStats.rows[0] as any;
      const exposure = providerExposure.rows[0] as any;
      const amounts = claimAmounts.rows[0] as any;
      
      // Safely parse numeric values
      const safeNum = (val: any, fallback: number = 0): number => {
        if (val === null || val === undefined) return fallback;
        const num = parseFloat(String(val));
        return Number.isFinite(num) ? num : fallback;
      };
      
      // Calculate computed statistics - prefer aggregated_metrics over fallback
      const avgRiskScore = stats ? safeNum(stats.avg_risk_score, 0) : 0;
      const maxRiskScore = stats ? safeNum(stats.max_risk_score, 0) : 0;
      const highRiskCount = stats ? parseInt(stats.high_risk_count) || 0 : 0;
      const criticalCount = stats ? parseInt(stats.critical_count) || 0 : 0;
      // Use aggregated_metrics first, then fallback to stats
      const claimCount = exposure?.total_claims > 0 
        ? parseInt(exposure.total_claims) 
        : (stats ? parseInt(stats.claim_count) || 0 : 0);
      const totalAmount = exposure?.total_exposure > 0 
        ? safeNum(exposure.total_exposure, 0) 
        : (amounts ? safeNum(amounts.total_amount, 0) : 0);
      const avgClaimAmount = exposure?.avg_claim_amount > 0 
        ? safeNum(exposure.avg_claim_amount, 0) 
        : (amounts ? safeNum(amounts.avg_claim_amount, 0) : 0);
      
      // Generate risk explanation summary based on real data
      const riskExplanation: string[] = [];
      if (stats) {
        if (criticalCount > 0) {
          riskExplanation.push(`CRITICAL: ${criticalCount} claims flagged as critical risk requiring immediate review`);
        }
        if (highRiskCount > 0) {
          riskExplanation.push(`HIGH: ${highRiskCount} claims flagged as high-risk with potential FWA indicators`);
        }
        if (avgRiskScore >= 30) {
          riskExplanation.push(`Elevated average risk score (${avgRiskScore.toFixed(1)}%): Consistent pattern of concerning billing behavior`);
        }
        if (maxRiskScore >= 40) {
          riskExplanation.push(`Maximum risk score of ${maxRiskScore.toFixed(1)}% detected: At least one claim shows significant anomalies`);
        }
        if (totalAmount > 500000) {
          riskExplanation.push(`High total exposure (SAR ${totalAmount.toLocaleString()}): Large financial exposure requiring monitoring`);
        }
        if (riskExplanation.length === 0) {
          riskExplanation.push("No significant risk factors detected - routine monitoring recommended");
        }
      } else {
        riskExplanation.push("No detection data available for this provider");
      }
      
      // Get provider name
      const providerName = providerNames[providerId] || 
        (providerId.startsWith('PRV-GEN') ? `Saudi Healthcare Provider ${providerId.replace('PRV-GEN-', '')}` : 
         `Provider ${providerId.substring(0, 8)}`);
      
      res.json({
        providerId,
        providerName,
        summary: stats ? {
          claimCount: claimCount,
          totalAmount: totalAmount,
          avgClaimAmount: avgClaimAmount,
          avgRiskScore: avgRiskScore,
          maxRiskScore: maxRiskScore,
          highRiskCount: highRiskCount,
          criticalCount: criticalCount,
          uniquePatients: parseInt(stats.unique_patients) || 0,
          firstDetection: stats.first_detection,
          lastDetection: stats.last_detection,
          riskLevel: avgRiskScore >= 40 || criticalCount >= 3 ? 'critical' :
                     avgRiskScore >= 30 || highRiskCount >= 5 ? 'high' :
                     avgRiskScore >= 20 || highRiskCount >= 2 ? 'medium' : 'low'
        } : null,
        riskExplanation,
        claims: providerClaims.rows.map((c: any) => ({
          detectionId: c.detection_id,
          claimId: c.claim_id,
          memberId: c.member_id,
          compositeScore: parseFloat(c.composite_score) || 0,
          riskLevel: c.composite_risk_level,
          methodScores: {
            ruleEngine: parseFloat(c.rule_engine_score) || 0,
            statistical: parseFloat(c.statistical_score) || 0,
            unsupervised: parseFloat(c.unsupervised_score) || 0,
            ragLlm: parseFloat(c.rag_llm_score) || 0
          },
          findings: {
            ruleEngine: c.rule_engine_findings,
            statistical: c.statistical_findings,
            unsupervised: c.unsupervised_findings,
            ragLlm: c.rag_llm_findings
          },
          claimAmount: parseFloat(c.claim_amount) || 0,
          serviceDate: c.service_date,
          diagnosisCode: c.diagnosis_code,
          procedureCode: c.procedure_code,
          status: c.claim_status,
          analyzedAt: c.analyzed_at
        })),
        ruleHitSummary: ruleHits.rows.map((r: any) => ({
          ruleCode: r.rule_code,
          ruleName: r.rule_name,
          severity: r.severity,
          explanation: r.explanation,
          hitCount: parseInt(r.hit_count)
        }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/providers/:providerId/profile", "fetch provider profile");
    }
  });

  // GET /api/fwa/patients/:memberId/profile - Patient drill-down with claims and risk factors
  app.get("/api/fwa/patients/:memberId/profile", async (req, res) => {
    try {
      const { memberId } = req.params;
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get patient stats from feature store
      const patientStats = await db.execute(sql`
        SELECT 
          entity_id as member_id,
          claim_count,
          total_amount,
          avg_claim_amount,
          z_score,
          percentile_rank,
          rejection_rate,
          flag_rate,
          computed_at
        FROM fwa_feature_store 
        WHERE entity_type = 'patient' AND entity_id = ${memberId}
        LIMIT 1
      `);
      
      // Get all detection results for this patient
      const patientClaims = await db.execute(sql`
        SELECT 
          dr.id as detection_id,
          dr.claim_id,
          dr.provider_id,
          dr.composite_score,
          dr.composite_risk_level,
          dr.rule_engine_score,
          dr.statistical_score,
          dr.rule_engine_findings,
          dr.analyzed_at,
          ac.total_amount as claim_amount,
          ac.claim_occurrence_date as service_date,
          ac.principal_diagnosis_code as diagnosis_code,
          ac.service_code as procedure_code,
          ac.original_status as claim_status
        FROM fwa_detection_results dr
        LEFT JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.claim_reference
        WHERE dr.patient_id = ${memberId}
        ORDER BY dr.analyzed_at DESC
        LIMIT 50
      `);
      
      const stats = patientStats.rows[0] as any;
      
      // Generate patient-specific risk explanation
      const riskExplanation: string[] = [];
      if (stats) {
        const zScore = parseFloat(stats.z_score) || 0;
        const claimCount = parseInt(stats.claim_count) || 0;
        
        if (claimCount > 50) {
          riskExplanation.push(`HIGH claim frequency: ${claimCount} claims on record. This is significantly above average patient utilization.`);
        }
        if (Math.abs(zScore) > 2) {
          riskExplanation.push(`Statistical anomaly detected in utilization patterns (z-score: ${zScore.toFixed(2)}).`);
        }
      }
      
      // Analyze provider diversity
      const uniqueProviders = new Set(patientClaims.rows.map((c: any) => c.provider_id)).size;
      if (uniqueProviders > 10) {
        riskExplanation.push(`Doctor shopping indicator: Patient has visited ${uniqueProviders} different providers.`);
      }
      
      res.json({
        memberId,
        summary: stats ? {
          claimCount: parseInt(stats.claim_count) || 0,
          totalAmount: parseFloat(stats.total_amount) || 0,
          avgClaimAmount: parseFloat(stats.avg_claim_amount) || 0,
          zScore: parseFloat(stats.z_score) || 0,
          percentileRank: parseFloat(stats.percentile_rank) || 50,
          uniqueProviders,
          lastComputed: stats.computed_at
        } : null,
        riskExplanation,
        claims: patientClaims.rows.map((c: any) => ({
          detectionId: c.detection_id,
          claimId: c.claim_id,
          providerId: c.provider_id,
          compositeScore: parseFloat(c.composite_score) || 0,
          riskLevel: c.composite_risk_level,
          ruleEngineScore: parseFloat(c.rule_engine_score) || 0,
          statisticalScore: parseFloat(c.statistical_score) || 0,
          ruleEngineFindings: c.rule_engine_findings,
          claimAmount: parseFloat(c.claim_amount) || 0,
          serviceDate: c.service_date,
          diagnosisCode: c.diagnosis_code,
          procedureCode: c.procedure_code,
          status: c.claim_status,
          analyzedAt: c.analyzed_at
        }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/patients/:memberId/profile", "fetch patient profile");
    }
  });

  // GET /api/fwa/doctors/:doctorId/profile - Doctor drill-down with claims and risk factors
  app.get("/api/fwa/doctors/:doctorId/profile", async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get doctor stats from doctor_360 table (most complete data)
      const doctorStats = await db.execute(sql`
        SELECT 
          d.doctor_id,
          d.doctor_name,
          d.specialty,
          d.license_number,
          d.primary_facility_id,
          d.primary_facility_name,
          d.risk_score,
          d.risk_level,
          d.claims_summary,
          d.practice_patterns,
          d.flags,
          f.claim_count,
          f.total_amount,
          f.avg_claim_amount,
          f.z_score,
          f.percentile_rank,
          f.rejection_rate,
          f.flag_rate,
          f.computed_at
        FROM doctor_360 d
        LEFT JOIN fwa_feature_store f ON f.entity_id = d.doctor_id AND f.entity_type = 'doctor'
        WHERE d.doctor_id = ${doctorId}
        LIMIT 1
      `);
      
      // Get detection results for this doctor (join via practitioner_license)
      const doctorClaims = await db.execute(sql`
        SELECT 
          dr.id as detection_id,
          dr.claim_id,
          dr.provider_id,
          dr.patient_id as member_id,
          dr.composite_score,
          dr.composite_risk_level,
          dr.rule_engine_score,
          dr.rule_engine_findings,
          dr.analyzed_at,
          ac.total_amount as claim_amount,
          ac.claim_occurrence_date as service_date,
          ac.principal_diagnosis_code as diagnosis_code,
          ac.service_code as procedure_code,
          ac.original_status as claim_status
        FROM fwa_analyzed_claims ac
        JOIN fwa_detection_results dr ON dr.claim_id = ac.id
        WHERE ac.practitioner_license = ${doctorId}
        ORDER BY dr.analyzed_at DESC
        LIMIT 50
      `);
      
      const stats = doctorStats.rows[0] as any;
      
      // Parse claims_summary from doctor_360
      const claimsSummary = stats?.claims_summary || {};
      const practicePatterns = stats?.practice_patterns || {};
      
      // Generate doctor-specific risk explanation
      const riskExplanation: string[] = [];
      if (stats) {
        const riskScore = parseFloat(stats.risk_score) || 0;
        const zScore = parseFloat(stats.z_score) || 0;
        const avgClaim = parseFloat(stats.avg_claim_amount) || claimsSummary.avg_amount || 0;
        const rejectionRate = parseFloat(stats.rejection_rate) || 0;
        
        if (riskScore > 50) {
          riskExplanation.push(`Elevated risk score (${riskScore.toFixed(1)}%). This doctor has been flagged for further review.`);
        }
        if (Math.abs(zScore) > 2.5) {
          riskExplanation.push(`Statistical anomaly in billing patterns (z-score: ${zScore.toFixed(2)}). This doctor's claims deviate significantly from specialty peers.`);
        }
        if (avgClaim > 10000) {
          riskExplanation.push(`HIGH average claim amount (SAR ${avgClaim.toFixed(2)}). May indicate upcoding or high-complexity cases.`);
        }
        if (rejectionRate > 0.25) {
          riskExplanation.push(`Elevated rejection rate (${(rejectionRate * 100).toFixed(1)}%): Claims are frequently denied.`);
        }
      }
      
      res.json({
        doctorId,
        doctorName: stats?.doctor_name || `Dr. ${doctorId}`,
        specialty: stats?.specialty || null,
        licenseNumber: stats?.license_number || doctorId,
        primaryFacility: stats?.primary_facility_name || stats?.primary_facility_id || null,
        riskScore: parseFloat(stats?.risk_score) || 0,
        riskLevel: stats?.risk_level || 'low',
        summary: stats ? {
          claimCount: claimsSummary.total_claims || parseInt(stats.claim_count) || 0,
          totalAmount: claimsSummary.total_amount || parseFloat(stats.total_amount) || 0,
          avgClaimAmount: claimsSummary.avg_amount || parseFloat(stats.avg_claim_amount) || 0,
          zScore: parseFloat(stats.z_score) || 0,
          percentileRank: parseFloat(stats.percentile_rank) || 50,
          rejectionRate: parseFloat(stats.rejection_rate) || 0,
          uniquePatients: claimsSummary.unique_patients || 0,
          lastClaimDate: claimsSummary.last_claim_date || null,
          lastComputed: stats.computed_at
        } : null,
        practicePatterns: {
          avgPatientsPerDay: practicePatterns.avg_patients_per_day || 0,
          avgClaimPerPatient: practicePatterns.avg_claim_per_patient || 0,
          specialtyCode: practicePatterns.specialty_code || null
        },
        flags: stats?.flags || [],
        riskExplanation,
        claims: doctorClaims.rows.map((c: any) => ({
          detectionId: c.detection_id,
          claimId: c.claim_id,
          providerId: c.provider_id,
          memberId: c.member_id,
          compositeScore: parseFloat(c.composite_score) || 0,
          riskLevel: c.composite_risk_level,
          ruleEngineScore: parseFloat(c.rule_engine_score) || 0,
          ruleEngineFindings: c.rule_engine_findings,
          claimAmount: parseFloat(c.claim_amount) || 0,
          serviceDate: c.service_date,
          diagnosisCode: c.diagnosis_code,
          procedureCode: c.procedure_code,
          status: c.claim_status,
          analyzedAt: c.analyzed_at
        }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/doctors/:doctorId/profile", "fetch doctor profile");
    }
  });

  // POST /api/fwa/providers/:providerId/audit-report - Generate comprehensive provider audit report
  app.post("/api/fwa/providers/:providerId/audit-report", async (req, res) => {
    try {
      const { providerId } = req.params;
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // 1. Get provider summary from detection_results (same source as high-risk entities)
      const providerStats = await db.execute(sql`
        SELECT 
          provider_id,
          COUNT(*) as total_detections,
          COUNT(DISTINCT claim_id) as claim_count,
          COUNT(DISTINCT patient_id) as unique_patients,
          COALESCE(AVG(CASE WHEN composite_score IS NOT NULL THEN composite_score::decimal ELSE NULL END), 0) as avg_risk_score,
          COALESCE(MAX(CASE WHEN composite_score IS NOT NULL THEN composite_score::decimal ELSE NULL END), 0) as max_risk_score,
          SUM(CASE WHEN composite_risk_level IN ('critical', 'high') THEN 1 ELSE 0 END) as high_risk_count,
          SUM(CASE WHEN composite_risk_level = 'critical' THEN 1 ELSE 0 END) as critical_count
        FROM fwa_detection_results
        WHERE provider_id = ${providerId}
        GROUP BY provider_id
      `);
      
      // Get total exposure and 5-method scores from provider detection results
      const providerExposure = await db.execute(sql`
        SELECT 
          COALESCE((aggregated_metrics->>'totalExposure')::numeric, 0) as total_exposure,
          COALESCE((aggregated_metrics->>'totalClaims')::integer, 0) as total_claims,
          COALESCE((aggregated_metrics->>'avgClaimAmount')::numeric, 0) as avg_claim_amount,
          composite_score,
          risk_level,
          rule_engine_score,
          statistical_score,
          unsupervised_score,
          rag_llm_score,
          rag_score,
          semantic_score,
          risk_factors,
          matched_rules,
          anomaly_indicators,
          flagged_indicators,
          rule_engine_findings,
          statistical_findings
        FROM fwa_provider_detection_results
        WHERE provider_id = ${providerId}
      `);
      
      // Fallback to analyzed claims if aggregated_metrics not available
      const claimAmounts = await db.execute(sql`
        SELECT 
          COALESCE(SUM(CASE WHEN ac.total_amount IS NOT NULL THEN ac.total_amount::decimal ELSE 0 END), 0) as total_amount,
          COALESCE(AVG(CASE WHEN ac.total_amount IS NOT NULL THEN ac.total_amount::decimal ELSE 0 END), 0) as avg_claim_amount
        FROM fwa_detection_results dr
        LEFT JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.id
        WHERE dr.provider_id = ${providerId}
      `);
      
      // 2. Get ALL claims with detection results for this provider (fix JOIN to use ac.id)
      const allClaims = await db.execute(sql`
        SELECT 
          dr.id as detection_id,
          dr.claim_id,
          dr.patient_id as member_id,
          dr.composite_score,
          dr.composite_risk_level,
          dr.rule_engine_score,
          dr.statistical_score,
          dr.unsupervised_score,
          dr.rag_llm_score,
          dr.semantic_score,
          dr.rule_engine_findings,
          dr.statistical_findings,
          dr.unsupervised_findings,
          dr.rag_llm_findings,
          dr.primary_detection_method,
          dr.detection_summary,
          dr.recommended_action,
          dr.analyzed_at,
          ac.total_amount as claim_amount,
          ac.claim_occurrence_date as service_date,
          ac.principal_diagnosis_code as diagnosis_code,
          ac.service_description as diagnosis_description,
          ac.service_code as procedure_code,
          ac.service_description as procedure_description,
          ac.original_status as claim_status
        FROM fwa_detection_results dr
        LEFT JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.id
        WHERE dr.provider_id = ${providerId}
        ORDER BY dr.composite_score DESC NULLS LAST
        LIMIT 100
      `);
      
      // 3. Get rule violation summary - use 'description' field (actual field name in data)
      const ruleViolations = await db.execute(sql`
        WITH expanded_rules AS (
          SELECT 
            jsonb_array_elements(rule_engine_findings->'matchedRules') as rule
          FROM fwa_detection_results
          WHERE provider_id = ${providerId}
            AND rule_engine_findings->'matchedRules' IS NOT NULL
            AND jsonb_array_length(rule_engine_findings->'matchedRules') > 0
        )
        SELECT 
          rule->>'ruleCode' as rule_code,
          rule->>'ruleName' as rule_name,
          rule->>'category' as category,
          rule->>'severity' as severity,
          COALESCE(
            rule->>'description',
            rule->>'humanReadableExplanation',
            'Rule violation detected based on claim pattern analysis'
          ) as explanation,
          COALESCE(
            rule->>'suggestedAction',
            'Review claim documentation and verify service details'
          ) as suggested_action,
          COUNT(*) as hit_count
        FROM expanded_rules
        GROUP BY 
          rule->>'ruleCode',
          rule->>'ruleName',
          rule->>'category',
          rule->>'severity',
          COALESCE(
            rule->>'description',
            rule->>'humanReadableExplanation',
            'Rule violation detected based on claim pattern analysis'
          ),
          COALESCE(
            rule->>'suggestedAction',
            'Review claim documentation and verify service details'
          )
        ORDER BY hit_count DESC
      `);
      
      // 4. Get enforcement history if any
      const enforcements = await db.execute(sql`
        SELECT 
          id, case_number, status, violation_title as finding_type, description as finding_description,
          penalty_type as sanction_type, fine_amount as penalty_amount, violation_code as regulatory_reference,
          created_at, updated_at
        FROM enforcement_cases
        WHERE provider_id = ${providerId}
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      // 5. Get provider complaints if any
      const complaints = await db.execute(sql`
        SELECT 
          id, complaint_number, source, category,
          description, status,
          received_date, resolution
        FROM provider_complaints
        WHERE provider_id = ${providerId}
        ORDER BY received_date DESC
        LIMIT 10
      `);
      
      const stats = providerStats.rows[0] as any;
      const exposure = providerExposure.rows[0] as any;
      const amounts = claimAmounts.rows[0] as any;
      
      // Calculate values - prefer aggregated_metrics over detection_results
      const claimCount = exposure?.total_claims > 0 
        ? parseInt(exposure.total_claims) 
        : (parseInt(stats?.claim_count) || 0);
      const totalAmount = exposure?.total_exposure > 0 
        ? parseFloat(exposure.total_exposure) 
        : (parseFloat(amounts?.total_amount) || 0);
      
      // Use provider-level composite score (this is the accurate risk score)
      const providerCompositeScore = parseFloat(exposure?.composite_score) || 0;
      const avgRiskScore = providerCompositeScore > 0 
        ? providerCompositeScore 
        : (parseFloat(stats?.avg_risk_score) || 0);
      const maxRiskScore = parseFloat(stats?.max_risk_score) || 0;
      const highRiskCount = parseInt(stats?.high_risk_count) || 0;
      const criticalCount = parseInt(stats?.critical_count) || 0;
      
      // Use provider composite score as the risk score (correct value from fwa_provider_detection_results)
      let riskScore = avgRiskScore;
      
      // Calculate dynamic risk level based on adjusted thresholds (matching actual score distribution ~45% max)
      const calculateDynamicRiskLevel = (score: number): string => {
        if (score >= 40) return 'CRITICAL';
        if (score >= 30) return 'HIGH';
        if (score >= 20) return 'MEDIUM';
        if (score >= 10) return 'LOW';
        return 'MINIMAL';
      };
      
      // Parse provider-level 5-method scores for the report
      const providerMethodScores = {
        ruleEngine: parseFloat(exposure?.rule_engine_score) || 0,
        statistical: parseFloat(exposure?.statistical_score) || 0,
        unsupervised: parseFloat(exposure?.unsupervised_score) || 0,
        ragLlm: parseFloat(exposure?.rag_llm_score || exposure?.rag_score) || 0,
        semantic: parseFloat(exposure?.semantic_score) || 0
      };
      
      // Parse provider risk factors from detection results
      const providerRiskFactors = Array.isArray(exposure?.risk_factors) 
        ? exposure.risk_factors 
        : [];
      const providerAnomalyIndicators = Array.isArray(exposure?.anomaly_indicators) 
        ? exposure.anomaly_indicators 
        : [];
      const providerFlaggedIndicators = Array.isArray(exposure?.flagged_indicators) 
        ? exposure.flagged_indicators 
        : [];
      
      // Get claims with elevated risk (include medium since most are minimal)
      // Sort by composite_score descending and take top claims
      const elevatedRiskClaims = allClaims.rows.filter((c: any) => {
        const score = parseFloat(c.composite_score) || 0;
        const level = c.composite_risk_level?.toLowerCase();
        return level === 'critical' || level === 'high' || level === 'medium' || score >= 10;
      });
      
      // If no elevated claims, just take the top-scoring claims
      const highRiskClaims = elevatedRiskClaims.length > 0 
        ? elevatedRiskClaims 
        : allClaims.rows.slice(0, 20);
      
      // Generate executive summary with dynamic risk level
      const dynamicRiskLevel = calculateDynamicRiskLevel(riskScore);
      const executiveSummary = {
        providerRiskLevel: dynamicRiskLevel,
        compositeRiskScore: riskScore,
        totalClaimsAnalyzed: claimCount,
        totalExposure: totalAmount,
        highRiskClaimsCount: highRiskClaims.length,
        criticalClaimsCount: allClaims.rows.filter((c: any) => c.composite_risk_level === 'critical').length,
        ruleViolationsCount: ruleViolations.rows.length,
        enforcementHistoryCount: enforcements.rows.length,
        complaintsCount: complaints.rows.length,
        // Add 5-method scores at executive summary level
        methodScores: providerMethodScores
      };
      
      // Generate risk factors summary with explanations (based on detection results)
      const riskFactorsSummary: Array<{factor: string; severity: string; explanation: string}> = [];
      
      // First, add provider-level risk factors from detection results (actual stored data)
      providerRiskFactors.forEach((factor: string) => {
        if (factor && typeof factor === 'string') {
          riskFactorsSummary.push({
            factor: 'Detection Finding',
            severity: riskScore >= 40 ? 'CRITICAL' : riskScore >= 30 ? 'HIGH' : 'MEDIUM',
            explanation: factor
          });
        }
      });
      
      // Add anomaly indicators from provider detection
      providerAnomalyIndicators.forEach((indicator: string) => {
        if (indicator && typeof indicator === 'string') {
          riskFactorsSummary.push({
            factor: 'Anomaly Indicator',
            severity: 'HIGH',
            explanation: indicator
          });
        }
      });
      
      // Add flagged indicators from provider detection
      providerFlaggedIndicators.forEach((indicator: string) => {
        if (indicator && typeof indicator === 'string') {
          riskFactorsSummary.push({
            factor: 'Flagged Pattern',
            severity: 'HIGH',
            explanation: indicator
          });
        }
      });
      
      // Add risk score based factors
      if (riskScore >= 40) {
        riskFactorsSummary.push({
          factor: 'Critical Provider Risk Score',
          severity: 'CRITICAL',
          explanation: `Provider has a composite risk score of ${riskScore.toFixed(1)}%, exceeding the critical threshold of 40%. This indicates significant FWA risk patterns detected across multiple detection methods.`
        });
      } else if (riskScore >= 30) {
        riskFactorsSummary.push({
          factor: 'High Provider Risk Score',
          severity: 'HIGH',
          explanation: `Provider has a composite risk score of ${riskScore.toFixed(1)}%, exceeding the high-risk threshold of 30%. Review recommended.`
        });
      }
      
      if (criticalCount > 0) {
        riskFactorsSummary.push({
          factor: 'Critical Risk Claims',
          severity: 'CRITICAL',
          explanation: `${criticalCount} claim(s) flagged as critical risk requiring immediate review. These claims show significant anomalies in billing patterns, amounts, or documentation.`
        });
      }
      
      if (highRiskCount > 0) {
        riskFactorsSummary.push({
          factor: 'High Risk Claims',
          severity: 'HIGH',
          explanation: `${highRiskCount} claim(s) flagged as high risk with potential FWA indicators. These claims require detailed investigation.`
        });
      }
      
      // Add 5-method score based factors
      if (providerMethodScores.ruleEngine > 0) {
        riskFactorsSummary.push({
          factor: 'Rule Engine Detection',
          severity: providerMethodScores.ruleEngine >= 30 ? 'HIGH' : 'MEDIUM',
          explanation: `Rule engine score: ${providerMethodScores.ruleEngine.toFixed(1)}%. Policy violations detected based on CHI regulatory rules and billing pattern analysis.`
        });
      }
      
      if (providerMethodScores.statistical > 0) {
        riskFactorsSummary.push({
          factor: 'Statistical Anomaly',
          severity: providerMethodScores.statistical >= 30 ? 'HIGH' : 'MEDIUM',
          explanation: `Statistical score: ${providerMethodScores.statistical.toFixed(1)}%. Billing patterns deviate significantly from peer providers in the same specialty.`
        });
      }
      
      if (providerMethodScores.unsupervised > 0) {
        riskFactorsSummary.push({
          factor: 'Unsupervised Learning Detection',
          severity: providerMethodScores.unsupervised >= 30 ? 'HIGH' : 'MEDIUM',
          explanation: `Unsupervised score: ${providerMethodScores.unsupervised.toFixed(1)}%. Anomaly detection identified unusual claim patterns using clustering analysis.`
        });
      }
      
      if (providerMethodScores.ragLlm > 0) {
        riskFactorsSummary.push({
          factor: 'AI/LLM Analysis',
          severity: providerMethodScores.ragLlm >= 30 ? 'HIGH' : 'MEDIUM',
          explanation: `RAG/LLM score: ${providerMethodScores.ragLlm.toFixed(1)}%. AI analysis found contextual risk indicators from knowledge base comparison.`
        });
      }
      
      if (providerMethodScores.semantic > 0) {
        riskFactorsSummary.push({
          factor: 'Semantic Validation',
          severity: providerMethodScores.semantic >= 30 ? 'HIGH' : 'MEDIUM',
          explanation: `Semantic score: ${providerMethodScores.semantic.toFixed(1)}%. Diagnosis-procedure code matching identified potential clinical inconsistencies.`
        });
      }
      
      // Add top rule violations to risk factors
      ruleViolations.rows.slice(0, 3).forEach((r: any) => {
        riskFactorsSummary.push({
          factor: `Rule: ${r.rule_name || 'Policy Violation'}`,
          severity: r.severity?.toUpperCase() || 'MEDIUM',
          explanation: r.explanation || `Triggered ${r.hit_count} times. Category: ${r.category || 'General'}`
        });
      });
      
      // Generate recommended actions
      const recommendedActions: string[] = [];
      if (executiveSummary.providerRiskLevel === 'CRITICAL') {
        recommendedActions.push('URGENT: Escalate to CHI FWA Investigation Unit immediately');
        recommendedActions.push('Suspend new claim payments pending review');
        recommendedActions.push('Schedule on-site audit within 30 days');
      } else if (executiveSummary.providerRiskLevel === 'HIGH') {
        recommendedActions.push('Assign case to Senior FWA Analyst for detailed review');
        recommendedActions.push('Request supporting documentation for flagged claims');
        recommendedActions.push('Initiate provider communication via formal letter');
      } else if (executiveSummary.providerRiskLevel === 'MEDIUM') {
        recommendedActions.push('Add to monitoring watchlist');
        recommendedActions.push('Review high-risk claims manually');
        recommendedActions.push('Schedule quarterly pattern review');
      } else {
        recommendedActions.push('Continue routine monitoring');
        recommendedActions.push('No immediate action required');
      }
      
      // Build comprehensive report
      const auditReport = {
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          reportType: 'Provider Audit Report',
          providerId: providerId,
          reportVersion: '1.0',
          generatedBy: 'FWA Detection Platform'
        },
        executiveSummary,
        riskFactorsSummary,
        recommendedActions,
        providerProfile: stats ? {
          providerId: stats.provider_id,
          claimCount,
          totalAmount: totalAmount.toFixed(2),
          avgClaimAmount: amounts ? parseFloat(amounts.avg_claim_amount).toFixed(2) : '0.00',
          avgRiskScore: avgRiskScore.toFixed(2),
          maxRiskScore: maxRiskScore.toFixed(2),
          highRiskCount,
          criticalCount,
          uniquePatients: parseInt(stats.unique_patients) || 0
        } : null,
        ruleViolationsDetail: ruleViolations.rows.map((r: any) => ({
          ruleCode: r.rule_code,
          ruleName: r.rule_name,
          category: r.category,
          severity: r.severity,
          hitCount: parseInt(r.hit_count),
          explanation: r.explanation,
          suggestedAction: r.suggested_action
        })),
        highRiskClaims: highRiskClaims.slice(0, 20).map((c: any) => ({
          claimId: c.claim_id,
          compositeScore: parseFloat(c.composite_score) || 0,
          riskLevel: c.composite_risk_level,
          claimAmount: parseFloat(c.claim_amount) || 0,
          serviceDate: c.service_date,
          diagnosisCode: c.diagnosis_code,
          diagnosisDescription: c.diagnosis_description,
          procedureCode: c.procedure_code,
          procedureDescription: c.procedure_description,
          primaryDetectionMethod: c.primary_detection_method,
          detectionSummary: c.detection_summary,
          recommendedAction: c.recommended_action,
          ruleEngineFindings: c.rule_engine_findings,
          methodScores: {
            ruleEngine: parseFloat(c.rule_engine_score) || 0,
            statistical: parseFloat(c.statistical_score) || 0,
            unsupervised: parseFloat(c.unsupervised_score) || 0,
            ragLlm: parseFloat(c.rag_llm_score) || 0,
            semantic: parseFloat(c.semantic_score) || 0
          }
        })),
        // Add provider-level 5-method detection scores for the profile
        providerMethodScores,
        allClaimsSummary: {
          totalClaims: allClaims.rows.length,
          criticalCount: allClaims.rows.filter((c: any) => c.composite_risk_level === 'critical').length,
          highCount: allClaims.rows.filter((c: any) => c.composite_risk_level === 'high').length,
          mediumCount: allClaims.rows.filter((c: any) => c.composite_risk_level === 'medium').length,
          lowCount: allClaims.rows.filter((c: any) => c.composite_risk_level === 'low').length
        },
        enforcementHistory: enforcements.rows.map((e: any) => ({
          caseNumber: e.case_number,
          status: e.status,
          findingType: e.finding_type,
          findingDescription: e.finding_description,
          sanctionType: e.sanction_type,
          penaltyAmount: e.penalty_amount,
          regulatoryReference: e.regulatory_reference,
          createdAt: e.created_at
        })),
        complaintHistory: complaints.rows.map((c: any) => ({
          complaintNumber: c.complaint_number,
          source: c.source,
          category: c.category,
          description: c.description,
          status: c.status,
          receivedDate: c.received_date,
          resolution: c.resolution
        }))
      };
      
      res.json(auditReport);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/providers/:providerId/audit-report", "generate provider audit report");
    }
  });

  // GET /api/fwa/agent-configs - List agent configs (with auto-seeding)
  app.get("/api/fwa/agent-configs", async (req, res) => {
    try {
      let configs = await storage.getFwaAgentConfigs();
      
      if (configs.length === 0) {
        const defaultConfigs = [
          { agentName: "A1: Analysis Agent", agentType: "analysis" as const, enabled: true, threshold: "0.75", parameters: { description: "Performs root cause analysis on flagged claims, providers, and denial patterns", autoAction: true } as Record<string, any> },
          { agentName: "A2: Categorization Agent", agentType: "categorization" as const, enabled: true, threshold: "0.80", parameters: { description: "Consumes A1 insights and categorizes findings into specific FWA types", autoAction: true } as Record<string, any> },
          { agentName: "A3: Action Agent", agentType: "action" as const, enabled: true, threshold: "0.85", parameters: { description: "Executes automated interventions on live claims and recovers inappropriately paid claims", autoAction: false } as Record<string, any> },
          { agentName: "B3: History Agents", agentType: "history_retrieval" as const, enabled: true, threshold: "0.75", parameters: { description: "Specialized agents for patient and provider history analysis", autoAction: true } as Record<string, any> },
        ];
        await Promise.all(defaultConfigs.map(c => storage.createFwaAgentConfig(c as InsertFwaAgentConfig)));
        configs = await storage.getFwaAgentConfigs();
      }
      
      res.json(configs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/agent-configs", "fetch FWA agent configs");
    }
  });

  // PATCH /api/fwa/agent-configs/:agentType - Update agent config by agent type
  app.patch("/api/fwa/agent-configs/:agentType", async (req, res) => {
    try {
      const { enabled, parameters, threshold } = req.body;
      const updateData: Partial<InsertFwaAgentConfig> = {};
      
      if (enabled !== undefined) {
        updateData.enabled = Boolean(enabled);
      }
      if (parameters !== undefined && typeof parameters === "object") {
        updateData.parameters = parameters;
      }
      if (threshold !== undefined) {
        const thresholdNum = parseFloat(String(threshold));
        if (!isNaN(thresholdNum) && thresholdNum >= 0 && thresholdNum <= 1) {
          updateData.threshold = thresholdNum.toFixed(2);
        }
      }
      
      const config = await storage.updateFwaAgentConfigByType(req.params.agentType, updateData);
      if (!config) {
        return res.status(404).json({ error: "FWA agent config not found" });
      }
      res.json(config);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/agent-configs/:agentType", "update FWA agent config");
    }
  });

  // GET /api/fwa/workqueue - List work queue claims from detection results
  app.get("/api/fwa/workqueue", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaDetectionResults, fwaAnalyzedClaims } = await import("@shared/schema");
      const { eq, sql, desc, inArray } = await import("drizzle-orm");
      
      // Get high-scoring detection results as work queue items
      // Optimized: Use index on composite_score with simple WHERE/ORDER
      const results = await db.execute(sql`
        SELECT 
          dr.id,
          dr.claim_id,
          dr.provider_id,
          dr.patient_id,
          COALESCE(dr.composite_score, 0) as composite_score,
          dr.composite_risk_level,
          dr.detection_summary,
          dr.recommended_action,
          dr.primary_detection_method,
          dr.analyzed_at,
          ac.claim_reference,
          ac.claim_type,
          ac.service_description,
          COALESCE(ac.total_amount, 0) as claim_amount
        FROM fwa_detection_results dr
        LEFT JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.id
        WHERE dr.composite_score IS NOT NULL AND dr.composite_score >= 0
        ORDER BY dr.composite_score DESC NULLS LAST
        LIMIT 50
      `);
      
      const workQueue = results.rows.map((r: any, idx: number) => ({
        id: `wq${idx + 1}`,
        claimId: r.claim_id,
        claimNumber: r.claim_reference || `CLM-${idx + 1}`,
        providerId: r.provider_id?.substring(0, 20) || `PRV-${idx + 1}`,
        providerName: `Provider ${r.provider_id?.substring(0, 8) || idx + 1}`,
        patientId: r.patient_id?.substring(0, 20) || `PAT-${idx + 1}`,
        patientName: `Patient ${r.patient_id?.substring(0, 8) || idx + 1}`,
        claimAmount: String(r.claim_amount || 0),
        riskScore: String(r.composite_score || 0),
        riskLevel: r.composite_risk_level || "low",
        queueStatus: "pending",
        assignedTo: null,
        priority: r.composite_risk_level || "low",
        flagReason: r.detection_summary || "Automated detection",
        claimType: r.claim_type || "Unknown",
        serviceDate: r.analyzed_at || new Date(),
        createdAt: r.analyzed_at || new Date(),
        updatedAt: r.analyzed_at || new Date()
      }));
      
      res.json(workQueue);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/workqueue", "fetch work queue");
    }
  });

  // GET /api/fwa/high-risk-patients - List high-risk patients from detection results
  app.get("/api/fwa/high-risk-patients", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get patients directly from detection results
      const patients = await db.execute(sql`
        WITH detection_stats AS (
          SELECT 
            patient_id,
            COUNT(*) as total_detections,
            COUNT(DISTINCT claim_id) as total_claims,
            COUNT(DISTINCT provider_id) as unique_providers,
            COALESCE(AVG(CASE WHEN composite_score IS NOT NULL THEN composite_score::decimal ELSE NULL END), 0) as avg_risk_score,
            COALESCE(MAX(CASE WHEN composite_score IS NOT NULL THEN composite_score::decimal ELSE NULL END), 0) as max_risk_score,
            SUM(CASE WHEN composite_risk_level IN ('critical', 'high') THEN 1 ELSE 0 END) as high_risk_count,
            SUM(CASE WHEN composite_risk_level = 'critical' THEN 1 ELSE 0 END) as critical_count,
            MAX(analyzed_at) as last_detection_date
          FROM fwa_detection_results
          WHERE patient_id IS NOT NULL AND patient_id != ''
          GROUP BY patient_id
          HAVING COUNT(*) >= 1
        ),
        claim_amounts AS (
          SELECT 
            dr.patient_id,
            COALESCE(SUM(CASE WHEN ac.total_amount IS NOT NULL THEN ac.total_amount::decimal ELSE 0 END), 0) as total_amount,
            COALESCE(AVG(CASE WHEN ac.total_amount IS NOT NULL THEN ac.total_amount::decimal ELSE 0 END), 0) as avg_claim_amount
          FROM fwa_detection_results dr
          LEFT JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.id
          WHERE dr.patient_id IS NOT NULL
          GROUP BY dr.patient_id
        )
        SELECT 
          ds.patient_id,
          ds.total_detections,
          ds.total_claims,
          ds.unique_providers,
          ROUND(ds.avg_risk_score, 2) as avg_risk_score,
          ROUND(ds.max_risk_score, 2) as max_risk_score,
          ds.high_risk_count,
          ds.critical_count,
          ds.last_detection_date,
          ROUND(COALESCE(ca.total_amount, p360.claims_amount, 0), 2) as total_amount,
          CASE 
            WHEN ds.avg_risk_score >= 40 OR ds.critical_count >= 3 THEN 'critical'
            WHEN ds.avg_risk_score >= 30 OR ds.high_risk_count >= 5 THEN 'high'
            WHEN ds.avg_risk_score >= 20 OR ds.high_risk_count >= 2 THEN 'medium'
            ELSE 'low'
          END as risk_level,
          CASE 
            WHEN ds.avg_risk_score >= 40 OR ds.critical_count >= 3 THEN 1
            WHEN ds.avg_risk_score >= 30 OR ds.high_risk_count >= 5 THEN 2
            WHEN ds.avg_risk_score >= 20 OR ds.high_risk_count >= 2 THEN 3
            ELSE 4
          END as risk_order
        FROM detection_stats ds
        LEFT JOIN claim_amounts ca ON ds.patient_id = ca.patient_id
        LEFT JOIN (
          SELECT patient_id, (claims_summary->>'totalAmount')::numeric as claims_amount
          FROM patient_360
        ) p360 ON ds.patient_id = p360.patient_id
        ORDER BY 
          risk_order ASC, 
          -- Within each risk bucket, prioritize by combined score (risk 60% + normalized exposure 40%)
          (ds.avg_risk_score * 0.6) + (LEAST(COALESCE(ca.total_amount, p360.claims_amount, 0) / 50000, 40) * 0.4) DESC,
          ds.avg_risk_score DESC
        LIMIT 20
      `);
      
      // Helper to safely parse numeric values
      const safeNum = (val: any, fallback: number = 0): number => {
        if (val === null || val === undefined) return fallback;
        const num = parseFloat(String(val));
        return Number.isFinite(num) ? num : fallback;
      };

      // Saudi patient name mapping
      const patientNames = [
        'محمد أحمد الشمري (Mohammed Al Shammari)',
        'فهد عبدالله القحطاني (Fahd Al Qahtani)',
        'عبدالرحمن سعد الدوسري (Abdulrahman Al Dosari)',
        'سلطان خالد العتيبي (Sultan Al Otaibi)',
        'نورة محمد الغامدي (Noura Al Ghamdi)',
        'سارة عبدالله الحربي (Sara Al Harbi)',
        'أحمد فهد المطيري (Ahmed Al Mutairi)',
        'خالد سعود الزهراني (Khaled Al Zahrani)',
        'عايشة ناصر الشهري (Aisha Al Shehri)',
        'منى صالح البلوي (Mona Al Balawi)'
      ];

      const formattedPatients = patients.rows.map((p: any, idx: number) => {
        const patientId = p.patient_id?.trim() || `PAT-${idx + 1}`;
        const avgRiskScore = safeNum(p.avg_risk_score, 0);
        const maxRiskScore = safeNum(p.max_risk_score, 0);
        const totalAmount = safeNum(p.total_amount, 0);
        const highRiskCount = parseInt(p.high_risk_count) || 0;
        const criticalCount = parseInt(p.critical_count) || 0;
        const totalClaims = parseInt(p.total_claims) || 0;
        const uniqueProviders = parseInt(p.unique_providers) || 0;
        
        // Generate meaningful reasons based on actual data
        const reasons: string[] = [];
        if (uniqueProviders > 5) reasons.push("Doctor shopping pattern: Multiple providers visited");
        else if (uniqueProviders > 3) reasons.push(`High provider diversity: ${uniqueProviders} different providers`);
        if (criticalCount > 0) reasons.push(`${criticalCount} critical risk detections`);
        if (highRiskCount > 0) reasons.push(`${highRiskCount} high-risk claims flagged`);
        if (avgRiskScore >= 50) reasons.push(`Elevated average risk score: ${avgRiskScore.toFixed(1)}%`);
        if (totalAmount > 100000) reasons.push(`High claim volume: SAR ${totalAmount.toLocaleString()}`);
        if (reasons.length === 0) reasons.push("Routine monitoring - no significant concerns");

        return {
          id: `pt${idx + 1}`,
          patientId: patientId,
          patientName: patientNames[idx % patientNames.length],
          memberId: `MBR-${1000 + idx}`,
          riskScore: avgRiskScore.toFixed(2),
          riskLevel: p.risk_level || "low",
          totalClaims: totalClaims,
          flaggedClaims: highRiskCount,
          totalAmount: totalAmount.toFixed(2),
          fwaCaseCount: highRiskCount + criticalCount,
          uniqueProviders: uniqueProviders,
          primaryDiagnosis: "Various",
          reasons: reasons,
          lastClaimDate: p.last_detection_date || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      res.json(formattedPatients);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/high-risk-patients", "fetch high-risk patients");
    }
  });

  // FWA Behaviors CRUD Routes
  app.get("/api/fwa/behaviors", async (req, res) => {
    try {
      let behaviors = await storage.getFwaBehaviors();
      
      if (behaviors.length === 0) {
        const mockBehaviors = [
          { behaviorCode: "RU32", name: "Impossible Procedures - Gender Mismatch", description: "Detects claims for procedures that are impossible based on patient gender", category: "impossible_procedures" as const, severity: "fraud" as const, priority: "critical" as const, status: "active" as const, decision: "auto_reject" as const, rejectionMessage: "Claim rejected: Procedure is not applicable for patient gender", technicalLogic: "IF procedure IN (gender_specific_list) AND patient_gender != expected_gender THEN flag", dataRequired: ["patient_gender", "procedure_code", "icd10_code"], createdBy: "system" },
          { behaviorCode: "RU35", name: "Duplicate Claims - Same Day Service", description: "Identifies duplicate claims submitted for the same patient, provider, and service on the same day", category: "duplicate_claims" as const, severity: "waste" as const, priority: "high" as const, status: "active" as const, decision: "manual_review" as const, rejectionMessage: "Potential duplicate claim detected", technicalLogic: "IF EXISTS same (patient_id, provider_id, service_code, service_date) THEN flag", dataRequired: ["patient_id", "provider_id", "service_code", "service_date"], createdBy: "system" },
        ];
        
        await Promise.all(mockBehaviors.map((b) => storage.createFwaBehavior(b)));
        behaviors = await storage.getFwaBehaviors();
      }
      
      const { category, severity, status } = req.query;
      
      if (category && typeof category === "string") {
        behaviors = behaviors.filter((b) => b.category === category);
      }
      if (severity && typeof severity === "string") {
        behaviors = behaviors.filter((b) => b.severity === severity);
      }
      if (status && typeof status === "string") {
        behaviors = behaviors.filter((b) => b.status === status);
      }
      
      res.json(behaviors);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/behaviors", "fetch FWA behaviors");
    }
  });

  app.get("/api/fwa/behaviors/:id", async (req, res) => {
    try {
      const behavior = await storage.getFwaBehavior(req.params.id);
      if (!behavior) {
        return res.status(404).json({ error: "FWA behavior not found" });
      }
      res.json(behavior);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/behaviors/:id", "fetch FWA behavior");
    }
  });

  app.post("/api/fwa/behaviors", async (req, res) => {
    try {
      const parsed = insertFwaBehaviorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const behavior = await storage.createFwaBehavior(parsed.data);
      res.status(201).json(behavior);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/behaviors", "create FWA behavior");
    }
  });

  app.patch("/api/fwa/behaviors/:id", async (req, res) => {
    try {
      const partialSchema = insertFwaBehaviorSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const behavior = await storage.updateFwaBehavior(req.params.id, parsed.data);
      if (!behavior) {
        return res.status(404).json({ error: "FWA behavior not found" });
      }
      res.json(behavior);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/behaviors/:id", "update FWA behavior");
    }
  });

  app.delete("/api/fwa/behaviors/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFwaBehavior(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "FWA behavior not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/behaviors/:id", "delete FWA behavior");
    }
  });

  // GET /api/fwa/high-risk-doctors - List high-risk doctors from actual detection data
  app.get("/api/fwa/high-risk-doctors", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get doctors from doctor_360 table (real data)
      // Prioritize by BOTH risk score AND exposure amount (weighted)
      // Filter out invalid doctor IDs (procedure names stored incorrectly)
      const doctors = await db.execute(sql`
        SELECT 
          d.doctor_id,
          d.doctor_name,
          d.specialty,
          d.license_number,
          d.primary_facility_name,
          COALESCE(d.risk_score, 0) as risk_score,
          d.risk_level,
          d.claims_summary,
          d.last_analyzed_at,
          COALESCE((d.claims_summary->>'totalAmount')::numeric, 0) as exposure_amount,
          -- Priority Score: combines risk (60%) + normalized exposure (40%)
          (COALESCE(d.risk_score, 0) * 0.6) + 
          (LEAST(COALESCE((d.claims_summary->>'totalAmount')::numeric, 0) / 50000, 40) * 0.4) as priority_score
        FROM doctor_360 d
        WHERE d.doctor_id NOT LIKE 'biopsy%'
          AND d.doctor_id NOT LIKE 'needle%'
          AND d.doctor_id NOT LIKE 'excision%'
          AND d.doctor_id !~ '^[a-z]+ [a-z]+$'
        ORDER BY 
          -- First by risk level bucket (critical/high first)
          CASE 
            WHEN COALESCE(d.risk_score, 0) >= 40 THEN 1
            WHEN COALESCE(d.risk_score, 0) >= 30 THEN 2
            WHEN COALESCE(d.risk_score, 0) >= 20 THEN 3
            ELSE 4
          END,
          -- Then by priority score within each bucket
          (COALESCE(d.risk_score, 0) * 0.6) + 
          (LEAST(COALESCE((d.claims_summary->>'totalAmount')::numeric, 0) / 50000, 40) * 0.4) DESC
        LIMIT 20
      `);
      
      // Helper to safely parse numeric values
      const safeNum = (val: any, fallback: number = 0): number => {
        if (val === null || val === undefined) return fallback;
        const num = parseFloat(String(val));
        return Number.isFinite(num) ? num : fallback;
      };

      // Dynamic risk level calculation from score (consistent with providers)
      // Adjusted thresholds to match actual detection score distribution
      const calculateRiskLevel = (score: number): "critical" | "high" | "medium" | "low" | "minimal" => {
        if (score >= 40) return "critical";
        if (score >= 30) return "high";
        if (score >= 20) return "medium";
        if (score >= 10) return "low";
        return "minimal";
      };
      
      const formattedDoctors = doctors.rows.map((d: any, idx: number) => {
        const doctorId = d.doctor_id?.trim() || `DOC-${idx + 1}`;
        const riskScore = safeNum(d.risk_score, 0);
        const claimsSummary = typeof d.claims_summary === 'string' 
          ? JSON.parse(d.claims_summary) 
          : (d.claims_summary || {});
        
        const totalClaims = parseInt(claimsSummary.totalClaims) || 0;
        const totalExposure = safeNum(claimsSummary.totalAmount, 0);
        const uniquePatients = parseInt(claimsSummary.uniquePatients) || 0;
        const avgClaimAmount = safeNum(claimsSummary.avgAmount, 0);
        
        // Calculate risk level dynamically from score
        const riskLevel = calculateRiskLevel(riskScore);
        
        // Determine flagged status
        const isHighRisk = riskLevel === 'high' || riskLevel === 'critical';
        const isCritical = riskLevel === 'critical';
        const flaggedClaims = isCritical ? 2 : (isHighRisk ? 1 : 0);
        
        // Generate meaningful reasons based on actual data
        const reasons: string[] = [];
        if (isCritical) reasons.push("Critical risk level detected");
        if (isHighRisk) reasons.push("Elevated risk patterns identified");
        if (riskScore >= 30) reasons.push(`Risk score: ${riskScore.toFixed(1)}%`);
        if (totalExposure > 100000) reasons.push(`High exposure: SAR ${totalExposure.toLocaleString()}`);
        if (totalClaims > 50) reasons.push(`High volume: ${totalClaims} claims`);
        if (uniquePatients > 30) reasons.push(`High patient volume: ${uniquePatients} unique patients`);
        if (reasons.length === 0) reasons.push("Routine monitoring - no significant concerns");

        return {
          id: `d${idx + 1}`,
          doctorId: doctorId,
          doctorName: d.doctor_name || `Dr. ${doctorId}`,
          specialty: d.specialty || "General Practice",
          licenseNumber: d.license_number || doctorId,
          organization: "Saudi Healthcare Network",
          riskScore: riskScore.toFixed(2),
          riskLevel: riskLevel,
          totalClaims: totalClaims,
          flaggedClaims: flaggedClaims,
          avgClaimAmount: avgClaimAmount.toFixed(2),
          totalExposure: totalExposure.toFixed(2),
          uniquePatients: uniquePatients,
          fwaCaseCount: flaggedClaims,
          reasons: reasons,
          lastFlaggedDate: d.last_analyzed_at || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      res.json(formattedDoctors);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/high-risk-doctors", "fetch high-risk doctors");
    }
  });

  // FWA Batches Routes
  app.get("/api/fwa/batches", async (req, res) => {
    try {
      const batches = await storage.getFwaBatches();
      res.json(batches);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batches", "fetch FWA batches");
    }
  });

  app.post("/api/fwa/batches", async (req, res) => {
    try {
      const parsed = insertFwaBatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const batch = await storage.createFwaBatch(parsed.data);
      res.status(201).json(batch);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batches", "create FWA batch");
    }
  });

  app.get("/api/fwa/batches/:id", async (req, res) => {
    try {
      const batch = await storage.getFwaBatch(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batches/:id", "fetch FWA batch");
    }
  });

  // Reset a batch to pending status so analysis can be re-run
  app.post("/api/fwa/batches/:id/reset", async (req, res) => {
    try {
      const batch = await storage.getFwaBatch(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      await storage.updateFwaBatch(req.params.id, {
        status: "pending",
        processedClaims: 0,
        flaggedClaims: 0,
        progress: "0",
        startedAt: null,
        completedAt: null,
        errorMessage: null,
      });
      
      const updatedBatch = await storage.getFwaBatch(req.params.id);
      res.json({ message: "Batch reset successfully", batch: updatedBatch });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batches/:id/reset", "reset FWA batch");
    }
  });

  // Generate realistic fake amounts for batch claims based on service codes
  // Saudi healthcare pricing reference in SAR
  const serviceCodeAmounts: Record<string, { min: number; max: number; base: number }> = {
    // Consultation & Office Visits
    "99201": { min: 150, max: 300, base: 200 },
    "99202": { min: 200, max: 400, base: 300 },
    "99203": { min: 300, max: 600, base: 450 },
    "99204": { min: 400, max: 800, base: 600 },
    "99205": { min: 500, max: 1200, base: 850 },
    "99213": { min: 200, max: 450, base: 325 },
    "99214": { min: 300, max: 600, base: 450 },
    "99215": { min: 400, max: 900, base: 650 },
    // Emergency Services
    "99281": { min: 300, max: 800, base: 550 },
    "99282": { min: 500, max: 1200, base: 850 },
    "99283": { min: 800, max: 2000, base: 1400 },
    "99284": { min: 1500, max: 3500, base: 2500 },
    "99285": { min: 2500, max: 6000, base: 4250 },
    // Diagnostic Imaging
    "70553": { min: 2000, max: 5000, base: 3500 },   // MRI Brain
    "71046": { min: 200, max: 500, base: 350 },      // Chest X-Ray
    "72148": { min: 2500, max: 6000, base: 4250 },   // MRI Lumbar
    "74176": { min: 1500, max: 4000, base: 2750 },   // CT Abdomen
    "76856": { min: 400, max: 1000, base: 700 },     // Pelvic Ultrasound
    // Laboratory
    "80053": { min: 150, max: 400, base: 275 },      // Comprehensive Metabolic
    "85025": { min: 50, max: 150, base: 100 },       // CBC
    "84443": { min: 100, max: 300, base: 200 },      // TSH
    "80061": { min: 120, max: 350, base: 235 },      // Lipid Panel
    // Surgical Procedures
    "27447": { min: 40000, max: 120000, base: 80000 }, // Knee Replacement
    "33533": { min: 80000, max: 250000, base: 165000 }, // CABG
    "44970": { min: 15000, max: 45000, base: 30000 },  // Laparoscopic Appendectomy
    "47562": { min: 18000, max: 55000, base: 36500 },  // Laparoscopic Cholecystectomy
    "27130": { min: 50000, max: 150000, base: 100000 }, // Hip Replacement
    // Physical Therapy
    "97110": { min: 150, max: 400, base: 275 },
    "97140": { min: 200, max: 500, base: 350 },
    // Dialysis
    "90935": { min: 1500, max: 4000, base: 2750 },
    "90937": { min: 2000, max: 5000, base: 3500 },
    // Default ranges by ICD category
  };
  
  const diagnosisCategoryAmounts: Record<string, { min: number; max: number; base: number }> = {
    "A": { min: 500, max: 5000, base: 2750 },     // Infectious diseases
    "B": { min: 500, max: 5000, base: 2750 },     // Infectious diseases
    "C": { min: 5000, max: 150000, base: 77500 }, // Neoplasms (cancer)
    "D": { min: 1000, max: 20000, base: 10500 },  // Blood disorders
    "E": { min: 500, max: 8000, base: 4250 },     // Endocrine (diabetes, thyroid)
    "F": { min: 400, max: 5000, base: 2700 },     // Mental disorders
    "G": { min: 1000, max: 30000, base: 15500 },  // Nervous system
    "H": { min: 300, max: 15000, base: 7650 },    // Eye and ear
    "I": { min: 2000, max: 200000, base: 101000 },// Circulatory (heart)
    "J": { min: 300, max: 10000, base: 5150 },    // Respiratory
    "K": { min: 500, max: 40000, base: 20250 },   // Digestive
    "L": { min: 200, max: 8000, base: 4100 },     // Skin
    "M": { min: 500, max: 80000, base: 40250 },   // Musculoskeletal
    "N": { min: 500, max: 50000, base: 25250 },   // Genitourinary
    "O": { min: 5000, max: 100000, base: 52500 }, // Pregnancy
    "P": { min: 2000, max: 50000, base: 26000 },  // Perinatal
    "Q": { min: 3000, max: 80000, base: 41500 },  // Congenital
    "R": { min: 200, max: 3000, base: 1600 },     // Symptoms (unspecified)
    "S": { min: 1000, max: 60000, base: 30500 },  // Injuries
    "T": { min: 1000, max: 50000, base: 25500 },  // Injuries/Poisoning
    "Z": { min: 150, max: 2000, base: 1075 },     // Health encounters
  };

  app.post("/api/fwa/batches/:id/generate-amounts", async (req, res) => {
    try {
      const batchId = req.params.id;
      const batch = await storage.getFwaBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Get all claims for this batch (use high limit to get all claims)
      const { claims: allClaims } = await storage.getClaims({ limit: 100000 });
      const batchPrefix = `CLM-${batchId.slice(0, 8)}`;
      const batchClaims = allClaims.filter(c => c.id.startsWith(batchPrefix));

      if (batchClaims.length === 0) {
        return res.status(404).json({ error: "No claims found for this batch" });
      }

      let updated = 0;
      const updates: { id: string; amount: string; oldAmount: string }[] = [];
      
      // Generate realistic amounts based on service codes and diagnosis
      for (const claim of batchClaims) {
        let amountRange = { min: 200, max: 15000, base: 7600 }; // Default range
        
        // First check CPT/service codes if available
        const cptCodes = claim.cptCodes || [];
        for (const code of cptCodes) {
          if (serviceCodeAmounts[code]) {
            amountRange = serviceCodeAmounts[code];
            break;
          }
        }
        
        // If no CPT match, use ICD diagnosis category
        if (amountRange.base === 7600 && claim.icd) {
          const diagCategory = claim.icd.charAt(0).toUpperCase();
          if (diagnosisCategoryAmounts[diagCategory]) {
            amountRange = diagnosisCategoryAmounts[diagCategory];
          }
        }
        
        // Generate amount with some variance
        // Use a realistic distribution: most claims are near base, some outliers
        const variance = Math.random();
        let amount: number;
        
        if (variance < 0.6) {
          // 60% of claims: near base amount (+/- 20%)
          amount = amountRange.base * (0.8 + Math.random() * 0.4);
        } else if (variance < 0.85) {
          // 25% of claims: moderate variance
          amount = amountRange.min + Math.random() * (amountRange.max - amountRange.min) * 0.5;
        } else if (variance < 0.95) {
          // 10% of claims: higher amounts (potential flags)
          amount = amountRange.base * (1.5 + Math.random() * 1.0);
        } else {
          // 5% of claims: suspicious outliers (very high for FWA detection)
          amount = amountRange.max * (1.2 + Math.random() * 2.0);
        }
        
        // Round to 2 decimal places
        const newAmount = Math.round(amount * 100) / 100;
        
        await storage.updateClaim(claim.id, {
          amount: newAmount.toFixed(2)
        });
        
        updates.push({
          id: claim.id,
          oldAmount: claim.amount,
          amount: newAmount.toFixed(2)
        });
        updated++;
      }
      
      // Calculate stats for response
      const amounts = updates.map(u => parseFloat(u.amount));
      const totalAmount = amounts.reduce((sum, a) => sum + a, 0);
      const avgAmount = totalAmount / amounts.length;
      const highValueClaims = amounts.filter(a => a > 50000).length;
      const suspiciousClaims = amounts.filter(a => a > 100000).length;
      
      res.json({ 
        message: `Generated realistic amounts for ${updated} claims`,
        updated,
        stats: {
          totalAmount: totalAmount.toFixed(2),
          averageAmount: avgAmount.toFixed(2),
          minAmount: Math.min(...amounts).toFixed(2),
          maxAmount: Math.max(...amounts).toFixed(2),
          highValueClaims,
          suspiciousClaims
        },
        sampleUpdates: updates.slice(0, 10)
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batches/:id/generate-amounts", "generate fake amounts");
    }
  });

  // Create batch with parsed claims from file upload
  // Flexible schema to handle real-world Excel files with various column formats
  const batchWithClaimsSchema = z.object({
    batchName: z.string().min(1).max(200),
    fileName: z.string().min(1).max(500),
    fileSize: z.number().int().positive(),
    claims: z.array(z.object({
      // Core fields - all optional to handle various file formats
      claimReference: z.string().optional(),
      claimNumber: z.string().optional(),
      patientId: z.string().optional(),
      policyNo: z.string().optional(),
      policyNumber: z.string().optional(),
      // Amount can be string or number from Excel
      amount: z.union([z.string(), z.number()]).optional(),
      principalDiagnosisCode: z.string().optional(),
      icd: z.string().optional(),
      description: z.string().optional(),
      providerId: z.string().optional(),
      providerName: z.string().optional(),
      hospital: z.string().optional(),
      payer: z.string().optional(),
      batchNumber: z.string().optional(),
      batchDate: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      isNewborn: z.union([z.boolean(), z.string()]).optional(),
      isChronic: z.union([z.boolean(), z.string()]).optional(),
      isPreExisting: z.union([z.boolean(), z.string()]).optional(),
      policyEffectiveDate: z.string().optional(),
      policyExpiryDate: z.string().optional(),
      practitionerLicense: z.string().optional(),
      specialtyCode: z.string().optional(),
      city: z.string().optional(),
      providerType: z.string().optional(),
      networkStatus: z.string().optional(),
      claimType: z.string().optional(),
      serviceDate: z.string().optional(),
      claimOccurrenceDate: z.string().optional(),
      benefitCode: z.string().optional(),
      isPreAuthorized: z.union([z.boolean(), z.string()]).optional(),
      secondaryDiagnosisCodes: z.string().optional(),
      status: z.string().optional(),
    }).passthrough()).min(1), // passthrough allows any additional fields
    // AI-confirmed field mappings
    fieldMappings: z.record(z.string(), z.string()).optional(),
  });

  app.post("/api/fwa/batches/create-with-claims", async (req, res) => {
    try {
      const parsed = batchWithClaimsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }

      const { batchName, fileName, fileSize, claims, fieldMappings } = parsed.data;

      // Create batch record with AI field mappings metadata if provided
      const batch = await storage.createFwaBatch({
        batchName,
        fileName,
        fileSize,
        status: "pending",
        totalClaims: claims.length,
        processedClaims: 0,
        flaggedClaims: 0,
        uploadedBy: "Current User",
        progress: "0",
        // Store AI-confirmed field mappings in metadata for audit trail (as JSONB object)
        metadata: fieldMappings ? { 
          aiFieldMappings: fieldMappings,
          mappingConfirmedAt: new Date().toISOString()
        } : undefined,
      });

      // Create claim records for each claim in the batch
      const createdClaims: any[] = [];
      for (const claim of claims) {
        const claimId = `CLM-${batch.id.slice(0, 8)}-${String(createdClaims.length + 1).padStart(4, "0")}`;
        
        // Handle various field name formats from different Excel files
        const claimRef = claim.claimReference || claim.claimNumber || claimId;
        const policyNum = claim.policyNo || claim.policyNumber || "UNKNOWN";
        const providerInfo = claim.providerId || claim.providerName || claim.hospital || "UNKNOWN";
        const diagnosisCode = claim.principalDiagnosisCode || claim.icd || null;
        const occurrenceDate = claim.claimOccurrenceDate || claim.serviceDate || claim.batchDate;
        
        // Parse amount - handle string or number formats
        let amountValue = "0.00";
        if (claim.amount != null) {
          const amountStr = String(claim.amount).replace(/[^0-9.-]/g, "");
          const parsed = parseFloat(amountStr);
          amountValue = isNaN(parsed) ? "0.00" : parsed.toFixed(2);
        }
        
        try {
          const createdClaim = await storage.createClaim({
            id: claimId,
            claimNumber: claimRef,
            policyNumber: policyNum,
            registrationDate: claim.batchDate ? new Date(claim.batchDate) : new Date(),
            claimType: claim.claimType || "outpatient",
            hospital: providerInfo,
            amount: amountValue,
            outlierScore: "0.00",
            description: claim.description || null,
            icd: diagnosisCode,
            hasSurgery: "No",
            surgeryFee: null,
            hasIcu: "No",
            lengthOfStay: null,
            similarClaims: null,
            similarClaimsInHospital: null,
            providerId: claim.providerId || null,
            providerName: claim.providerName || null,
            patientId: claim.patientId || null,
            patientName: null,
            serviceDate: occurrenceDate ? new Date(occurrenceDate) : null,
            status: "pending",
            category: claim.benefitCode || null,
            flagged: false,
            flagReason: null,
            cptCodes: null,
            diagnosisCodes: claim.secondaryDiagnosisCodes ? claim.secondaryDiagnosisCodes.split("|") : null,
          });
          createdClaims.push({ ...createdClaim, batchId: batch.id });
        } catch (claimError) {
          console.error(`Failed to create claim ${claimId}:`, claimError);
        }
      }

      res.status(201).json({
        batch,
        claimsCreated: createdClaims.length,
        claimIds: createdClaims.map(c => c.id),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batches/create-with-claims", "create batch with claims");
    }
  });

  // Get claims by batch ID
  app.get("/api/fwa/batches/:id/claims", async (req, res) => {
    try {
      const batchId = req.params.id;
      const batch = await storage.getFwaBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      const { claims: allClaims } = await storage.getClaims({ limit: 100000 });
      const batchClaims = allClaims.filter(c => 
        c.id.startsWith(`CLM-${batchId.slice(0, 8)}`)
      );

      res.json(batchClaims);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batches/:id/claims", "fetch batch claims");
    }
  });

  // Agent Reports Routes
  app.get("/api/fwa/agent-reports", async (req, res) => {
    try {
      const reports = await storage.getAgentReports();
      res.json(reports);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/agent-reports", "fetch agent reports");
    }
  });

  app.post("/api/fwa/agent-report", async (req, res) => {
    try {
      const parsed = insertAgentReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const report = await storage.createAgentReport(parsed.data);
      res.status(201).json(report);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/agent-report", "create agent report");
    }
  });

  // POST /api/fwa/generate-agent-report - Generate AI agent report using runAgent
  const generateAgentReportSchema = z.object({
    entityId: z.string().min(1).max(100),
    entityType: z.enum(["provider", "patient", "doctor"]),
    entityName: z.string().min(1).max(200),
    agentId: z.string().min(1).max(100),
    agentName: z.string().min(1).max(200),
    phase: z.enum(["A1", "A2", "A3"]),
  });

  app.post("/api/fwa/generate-agent-report", async (req, res) => {
    try {
      const parsed = generateAgentReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }

      const { entityId, entityType, entityName, agentId, agentName, phase } = parsed.data;
      const entityData = getEntityData(entityType, entityId);

      const { runAgent } = await import("../services/agent-orchestrator");
      const agentResult = await runAgent({
        entityId,
        entityType,
        entityName: sanitizeForAI(entityName),
        agentId,
        agentName: sanitizeForAI(agentName),
        phase,
        entityData,
      });

      res.json(agentResult);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/generate-agent-report", "generate agent report");
    }
  });

  // History Agent Route
  const historyAgentInputSchema = z.object({
    agentType: z.enum(["patient", "provider"]).optional().default("provider"),
    agentName: z.string().min(1).max(100),
    entityId: z.string().min(1).max(100),
    entityName: z.string().min(1).max(200),
    historyData: z.any().optional(),
  });
  
  app.post("/api/fwa/history-agent", async (req, res) => {
    try {
      const validatedData = historyAgentInputSchema.parse(req.body);
      const sanitizedEntityName = sanitizeForAI(validatedData.entityName);
      const sanitizedAgentName = sanitizeForAI(validatedData.agentName);
      
      const { runHistoryAgent } = await import("../services/agent-orchestrator");
      const result = await runHistoryAgent(
        validatedData.agentType, 
        sanitizedAgentName,
        validatedData.entityId,
        sanitizedEntityName,
        validatedData.historyData
      );
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/history-agent", "run history agent");
    }
  });

  // Knowledge Base Agent Route - RAG-powered with vector search
  const kbQueryInputSchema = z.object({
    kbType: z.enum(["regulatory", "medical", "history", "rag"]).default("rag"),
    query: z.string().min(1).max(2000),
    context: z.any().optional(),
  });
  
  app.post("/api/fwa/knowledge-base-query", async (req, res) => {
    try {
      const validatedData = kbQueryInputSchema.parse(req.body);
      const sanitizedQuery = sanitizeForAI(validatedData.query);
      
      // Use RAG-powered query for semantic search
      if (validatedData.kbType === "rag") {
        const { ragKnowledgeBaseQuery } = await import("../services/embedding-service");
        const result = await ragKnowledgeBaseQuery(sanitizedQuery);
        return res.json(result);
      }
      
      // Fallback to existing agent-based query
      const { runKnowledgeBaseAgent } = await import("../services/agent-orchestrator");
      const result = await runKnowledgeBaseAgent(validatedData.kbType, sanitizedQuery, validatedData.context);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/knowledge-base-query", "run knowledge base query");
    }
  });

  // Generate embeddings for all knowledge base records
  app.post("/api/fwa/knowledge-base/generate-embeddings", async (req, res) => {
    try {
      const { generateKnowledgeBaseEmbeddings } = await import("../services/embedding-service");
      const result = await generateKnowledgeBaseEmbeddings();
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/knowledge-base/generate-embeddings", "generate embeddings");
    }
  });

  // Semantic search across knowledge base
  app.post("/api/fwa/knowledge-base/semantic-search", async (req, res) => {
    try {
      const { query, limit = 5 } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }
      const { semanticSearch } = await import("../services/embedding-service");
      const results = await semanticSearch(sanitizeForAI(query), limit);
      res.json(results);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/knowledge-base/semantic-search", "semantic search");
    }
  });

  // GET /api/fwa/knowledge-base/stats - Knowledge Hub statistics from detection runs
  app.get("/api/fwa/knowledge-base/stats", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Get rule hit counts from detection results
      const ruleHits = await db.execute(sql`
        SELECT 
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'ruleCode' as rule_code,
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'ruleName' as rule_name,
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'category' as category,
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'severity' as severity,
          COUNT(*) as hit_count
        FROM fwa_detection_results
        WHERE rule_engine_findings->'matchedRules' IS NOT NULL 
          AND jsonb_array_length(rule_engine_findings->'matchedRules') > 0
        GROUP BY 
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'ruleCode',
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'ruleName',
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'category',
          jsonb_array_elements(rule_engine_findings->'matchedRules')->>'severity'
        ORDER BY hit_count DESC
        LIMIT 50
      `);
      
      // Get total detection stats
      const totals = await db.execute(sql`
        SELECT 
          COUNT(*) as total_detections,
          COUNT(CASE WHEN jsonb_array_length(rule_engine_findings->'matchedRules') > 0 THEN 1 END) as detections_with_rules,
          COUNT(CASE WHEN composite_risk_level IN ('critical', 'high') THEN 1 END) as high_risk_detections,
          MAX(analyzed_at) as last_detection_at
        FROM fwa_detection_results
      `);
      
      const stats = totals.rows[0] as any;
      
      res.json({
        totalDetections: parseInt(stats?.total_detections || "0"),
        detectionsWithRules: parseInt(stats?.detections_with_rules || "0"),
        highRiskDetections: parseInt(stats?.high_risk_detections || "0"),
        lastDetectionAt: stats?.last_detection_at,
        ruleHitCounts: ruleHits.rows.map((r: any) => ({
          ruleCode: r.rule_code,
          ruleName: r.rule_name,
          category: r.category,
          severity: r.severity,
          hitCount: parseInt(r.hit_count)
        }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/knowledge-base/stats", "get knowledge base stats");
    }
  });

  // ============================================
  // CHI Regulatory Extensions API Routes
  // ============================================

  // Policy Violations Catalogue
  app.get("/api/fwa/chi/policy-violations", async (req, res) => {
    try {
      await seedCHIDemoData();
      const violations = await storage.getPolicyViolations();
      res.json(violations);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/policy-violations", "get policy violations");
    }
  });

  app.get("/api/fwa/chi/policy-violations/:id", async (req, res) => {
    try {
      const violation = await storage.getPolicyViolation(req.params.id);
      if (!violation) {
        return res.status(404).json({ message: "Policy violation not found" });
      }
      res.json(violation);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/policy-violations/:id", "get policy violation");
    }
  });

  // Clinical Pathway Rules
  app.get("/api/fwa/chi/clinical-pathways", async (req, res) => {
    try {
      await seedCHIDemoData();
      const pathways = await storage.getClinicalPathwayRules();
      res.json(pathways);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/clinical-pathways", "get clinical pathway rules");
    }
  });

  // Provider Complaints
  app.get("/api/fwa/chi/complaints", async (req, res) => {
    try {
      await seedCHIDemoData();
      const complaints = await storage.getProviderComplaints();
      res.json(complaints);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/complaints", "get provider complaints");
    }
  });

  // Online Listening Mentions
  app.get("/api/fwa/chi/online-listening", async (req, res) => {
    try {
      await seedCHIDemoData();
      const mentions = await storage.getOnlineListeningMentions();
      res.json(mentions);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/online-listening", "get online listening mentions");
    }
  });

  // Listening Source Configurations
  app.get("/api/fwa/chi/online-listening/configs", async (req, res) => {
    try {
      let configs = await storage.getListeningSourceConfigs();
      if (configs.length === 0) {
        const defaults = [
          { sourceId: "alriyadh", sourceName: "Al Riyadh", sourceNameAr: "صحيفة الرياض", enabled: true, apiSupported: true, keywords: ["صحة", "تأمين", "مستشفى"], providerNames: [] },
          { sourceId: "almadina", sourceName: "Al Madina", sourceNameAr: "صحيفة المدينة", enabled: true, apiSupported: true, keywords: ["رعاية صحية", "تأمين طبي"], providerNames: [] },
          { sourceId: "alsharq_alawsat", sourceName: "Al Sharq Al Awsat", sourceNameAr: "الشرق الأوسط", enabled: true, apiSupported: true, keywords: ["مستشفيات", "ضمان صحي"], providerNames: [] },
          { sourceId: "okaz", sourceName: "Okaz", sourceNameAr: "صحيفة عكاظ", enabled: true, apiSupported: true, keywords: ["قطاع صحي", "احتيال"], providerNames: [] },
          { sourceId: "sabq", sourceName: "Sabq", sourceNameAr: "صحيفة سبق", enabled: true, apiSupported: true, keywords: ["وزارة الصحة", "مجلس الضمان"], providerNames: [] },
          { sourceId: "news_article", sourceName: "Healthcare News", sourceNameAr: "أخبار الرعاية الصحية", enabled: true, apiSupported: true, keywords: [], providerNames: [] },
          { sourceId: "medical_journal", sourceName: "Saudi Medical Journal", sourceNameAr: "المجلة الطبية السعودية", enabled: true, apiSupported: true, keywords: [], providerNames: [] }
        ];
        for (const d of defaults) {
          await storage.createListeningSourceConfig(d);
        }
        configs = await storage.getListeningSourceConfigs();
      }
      res.json(configs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/online-listening/configs", "get listening source configs");
    }
  });

  app.put("/api/fwa/chi/online-listening/configs", async (req, res) => {
    try {
      const configs = req.body;
      if (!Array.isArray(configs)) {
        return res.status(400).json({ message: "Expected array of configurations" });
      }
      const results = [];
      for (const cfg of configs) {
        const existing = await storage.getListeningSourceConfig(cfg.sourceId);
        if (existing) {
          const updated = await storage.updateListeningSourceConfig(existing.id, {
            enabled: cfg.enabled,
            keywords: cfg.keywords || [],
            keywordsAr: cfg.keywordsAr || [],
            providerNames: cfg.providerNames || [],
            providerNamesAr: cfg.providerNamesAr || []
          });
          results.push(updated);
        } else {
          const created = await storage.createListeningSourceConfig(cfg);
          results.push(created);
        }
      }
      res.json(results);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/online-listening/configs", "update listening source configs");
    }
  });

  // Fetch real news from NewsAPI and analyze with AI
  const newsSearchSchema = z.object({
    keywords: z.array(z.string()).min(1).max(10),
    providers: z.array(z.string()).optional(),
    sources: z.array(z.enum(["news_article", "medical_journal"])).default(["news_article"]),
  });

  app.post("/api/fwa/chi/online-listening/fetch", async (req, res) => {
    try {
      const validatedData = newsSearchSchema.parse(req.body);
      const { keywords } = validatedData;
      
      const newsApiKey = process.env.NEWS_API_KEY;
      if (!newsApiKey) {
        return res.status(400).json({ 
          error: "NewsAPI key not configured", 
          message: "Please add NEWS_API_KEY to your environment secrets" 
        });
      }

      console.log("[Online Listening] Fetching news with keywords:", keywords);
      
      const results: any[] = [];
      const errors: string[] = [];
      
      // Get enabled sources from database configuration
      const enabledConfigs = await storage.getListeningSourceConfigs();
      const enabledSources = enabledConfigs.filter(s => s.enabled);
      
      // Map source IDs to domains
      const sourceDomainMap: Record<string, string> = {
        alriyadh: "alriyadh.com",
        almadina: "al-madina.com",
        alsharq_alawsat: "aawsat.com",
        okaz: "okaz.com.sa",
        sabq: "sabq.org",
        arab_news: "arabnews.com",
        saudi_gazette: "saudigazette.com.sa",
        spa: "spa.gov.sa",
        aleqt: "aleqt.com",
        alwatan: "alwatan.com.sa",
      };
      
      // Build domains list from enabled sources only
      const saudiDomains = enabledSources
        .map(s => sourceDomainMap[s.sourceId])
        .filter(d => d)
        .join(",");
      
      console.log("[Online Listening] Using domains:", saudiDomains || "none configured");
      
      // 1. Search Arabic healthcare news (broader search - NewsAPI has limited Saudi coverage)
      const arabicKeywords = ["السعودية مستشفى", "صحة السعودية", "تأمين صحي سعودي", "وزارة الصحة السعودية"];
      for (const keyword of arabicKeywords.slice(0, 3)) {
        try {
          const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&language=ar&sortBy=publishedAt&pageSize=15`;
          console.log("[Online Listening] Fetching Arabic news for:", keyword);
          const response = await fetch(url, { headers: { "X-Api-Key": newsApiKey } });
          if (response.ok) {
            const data = await response.json();
            console.log(`[Online Listening] Arabic results for "${keyword}": ${data.totalResults} total`);
            if (data.articles?.length > 0) {
              results.push(...data.articles.map((a: any) => ({ ...a, searchKeyword: keyword, sourceType: 'arabic_news' })));
            }
          } else {
            const errText = await response.text();
            console.log(`[Online Listening] API error for "${keyword}":`, errText);
          }
        } catch (e: any) {
          console.log("[Online Listening] Fetch error:", e.message);
        }
      }
      
      // 2. Saudi Arabia top headlines (general - health category often empty)
      try {
        const saResponse = await fetch(
          `https://newsapi.org/v2/top-headlines?country=sa&pageSize=20`,
          { headers: { "X-Api-Key": newsApiKey } }
        );
        if (saResponse.ok) {
          const saData = await saResponse.json();
          console.log(`[Online Listening] SA headlines: ${saData.totalResults} total`);
          // Filter for healthcare-related content
          const healthArticles = (saData.articles || []).filter((a: any) => {
            const text = `${a.title || ""} ${a.description || ""}`.toLowerCase();
            return text.includes("صح") || text.includes("مستشف") || text.includes("طب") || 
                   text.includes("health") || text.includes("hospital") || text.includes("medical");
          });
          results.push(...healthArticles.map((a: any) => ({ ...a, sourceType: 'sa_headlines' })));
        }
      } catch (e: any) { 
        console.log("[Online Listening] SA headlines error:", e.message); 
      }
      
      // 3. English healthcare news about Saudi Arabia
      try {
        const enUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent("Saudi Arabia healthcare OR Saudi hospital OR Saudi health ministry")}&language=en&sortBy=publishedAt&pageSize=10`;
        const enResponse = await fetch(enUrl, { headers: { "X-Api-Key": newsApiKey } });
        if (enResponse.ok) {
          const enData = await enResponse.json();
          console.log(`[Online Listening] English SA healthcare results: ${enData.totalResults} total`);
          if (enData.articles?.length > 0) {
            results.push(...enData.articles.map((a: any) => ({ ...a, sourceType: 'english_news' })));
          }
        }
      } catch (e: any) {
        console.log("[Online Listening] English news error:", e.message);
      }
      
      // Deduplicate by URL and filter for Saudi healthcare relevance
      const seenUrls = new Set<string>();
      const saudiHealthKeywords = [
        /سعود|saudi|riyadh|الرياض|جدة|jeddah|مكة|mecca|المملكة/i,
        /مستشفى|hospital|صحة|health|طبي|medical|علاج|treatment/i,
        /تأمين|insurance|ضمان|وزارة الصحة|ministry.*health/i,
        /الحبيب|المواساة|السعودي الألماني|دله|فيصل التخصصي/i,
      ];
      
      const articles = results.filter(article => {
        if (!article?.url || seenUrls.has(article.url)) return false;
        seenUrls.add(article.url);
        
        // Check if article is relevant to Saudi healthcare
        const content = `${article.title || ""} ${article.description || ""}`.toLowerCase();
        const isSaudiRelated = saudiHealthKeywords[0].test(content);
        const isHealthRelated = saudiHealthKeywords[1].test(content) || saudiHealthKeywords[2].test(content);
        const isProviderMentioned = saudiHealthKeywords[3].test(content);
        
        // Must be Saudi-related AND (health-related OR mention a provider)
        const isRelevant = isSaudiRelated && (isHealthRelated || isProviderMentioned);
        if (!isRelevant) {
          console.log(`[Online Listening] Filtering out irrelevant: ${article.title?.substring(0, 40)}...`);
        }
        return isRelevant;
      });
      
      console.log(`[Online Listening] Total relevant articles after dedup: ${articles.length}`);
      
      if (articles.length === 0) {
        return res.json({ 
          mentions: [], 
          message: "No articles found for the given keywords",
          errors: errors.length > 0 ? errors : undefined
        });
      }

      // Saudi healthcare providers to detect in content
      const saudiHealthcareProviders = [
        { pattern: /مستشفى الحبيب|Dr\.?\s*Sulaiman\s*Al\s*Habib|الحبيب/i, name: "مستشفى الحبيب", nameEn: "Dr. Sulaiman Al Habib Hospital" },
        { pattern: /مستشفى المواساة|Al\s*Mouwasat|المواساة/i, name: "مستشفى المواساة", nameEn: "Al Mouwasat Hospital" },
        { pattern: /السعودي الألماني|Saudi\s*German|المستشفى السعودي/i, name: "المستشفى السعودي الألماني", nameEn: "Saudi German Hospital" },
        { pattern: /مستشفى دله|Dallah\s*Hospital|دله/i, name: "مستشفى دله", nameEn: "Dallah Hospital" },
        { pattern: /الملك فيصل التخصصي|King\s*Faisal\s*Specialist/i, name: "مستشفى الملك فيصل التخصصي", nameEn: "King Faisal Specialist Hospital" },
        { pattern: /مستشفى الملك خالد|King\s*Khalid/i, name: "مستشفى الملك خالد", nameEn: "King Khalid Hospital" },
        { pattern: /مستشفى الملك عبدالعزيز|King\s*Abdulaziz/i, name: "مستشفى الملك عبدالعزيز", nameEn: "King Abdulaziz Hospital" },
        { pattern: /المستشفى التخصصي|Specialist\s*Hospital/i, name: "المستشفى التخصصي", nameEn: "Specialist Hospital" },
        { pattern: /مجمع الملك سعود|King\s*Saud\s*Medical/i, name: "مجمع الملك سعود الطبي", nameEn: "King Saud Medical City" },
        { pattern: /مدينة الملك فهد|King\s*Fahd\s*Medical/i, name: "مدينة الملك فهد الطبية", nameEn: "King Fahd Medical City" },
        { pattern: /مجلس الضمان الصحي|CHI|Council\s*of.*Health\s*Insurance/i, name: "مجلس الضمان الصحي", nameEn: "Council of Health Insurance" },
        { pattern: /وزارة الصحة|Ministry\s*of\s*Health|MOH/i, name: "وزارة الصحة", nameEn: "Ministry of Health" },
        { pattern: /بوبا العربية|Bupa\s*Arabia/i, name: "بوبا العربية", nameEn: "Bupa Arabia" },
        { pattern: /التعاونية للتأمين|Tawuniya/i, name: "التعاونية للتأمين", nameEn: "Tawuniya Insurance" },
        { pattern: /ميدغلف|MedGulf/i, name: "ميدغلف", nameEn: "MedGulf Insurance" },
      ];
      
      // Function to extract healthcare provider from content
      const extractHealthcareProvider = (content: string): { name: string; nameEn: string } | null => {
        for (const provider of saudiHealthcareProviders) {
          if (provider.pattern.test(content)) {
            return { name: provider.name, nameEn: provider.nameEn };
          }
        }
        return null;
      };
      
      // Store articles directly first (fast) - no waiting for AI analysis
      const savedMentions = [];
      
      for (const article of articles.slice(0, 30)) { // Save up to 30 articles
        try {
          // Detect if content contains Arabic characters
          const content = article.title + (article.description ? ` - ${article.description}` : "");
          const hasArabic = /[\u0600-\u06FF]/.test(content);
          const detectedLanguage = hasArabic ? 'ar' : 'en';
          
          // Extract healthcare provider from content (not news source)
          const extractedProvider = extractHealthcareProvider(content);
          
          // Create mention record immediately without AI (fast)
          const mention = {
            providerId: null,
            providerName: extractedProvider?.name || null, // Only set if healthcare provider detected
            source: "news_article" as const,
            sourceUrl: article.url,
            authorHandle: article.author,
            content: content,
            sentiment: "neutral" as const, // Will be analyzed later if needed
            sentimentScore: "0",
            topics: article.searchKeyword ? [article.searchKeyword] : [],
            engagementCount: 0,
            reachEstimate: 10000,
            isVerified: true,
            requiresAction: false,
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
            capturedAt: new Date(),
            metadata: { 
              newsSource: article.source?.name || "Unknown",
              articleTitle: article.title,
              language: detectedLanguage,
              searchKeyword: article.searchKeyword,
              providerNameEn: extractedProvider?.nameEn || null,
              needsAnalysis: true 
            },
            createdAt: new Date()
          };

          // Save to database
          await storage.createOnlineListeningMention(mention);
          savedMentions.push(mention);
          console.log(`[Online Listening] Saved article [${detectedLanguage}]: ${article.title?.substring(0, 50)}...`);
        } catch (saveError: any) {
          // Skip duplicates silently
          if (!saveError.message?.includes('duplicate')) {
            console.error("Error saving article:", saveError.message);
          }
        }
      }

      console.log(`[Online Listening] Saved ${savedMentions.length} new mentions to database`);
      
      res.json({ 
        mentions: savedMentions, 
        totalFetched: articles.length,
        saved: savedMentions.length,
        message: `Found ${articles.length} articles, saved ${savedMentions.length} new mentions`
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/online-listening/fetch", "fetch online mentions");
    }
  });

  // Grok Twitter/X listening endpoint (uses Replit OpenRouter - no API key required)
  const grokTwitterSearchSchema = z.object({
    keywords: z.array(z.string()).min(1).max(10),
    providers: z.array(z.string()).optional(),
  });

  app.post("/api/fwa/chi/online-listening/twitter", async (req, res) => {
    try {
      const { searchTwitterForHealthcareProviders, isGrokConfigured } = await import("../services/grok-twitter-service");
      
      if (!isGrokConfigured()) {
        return res.status(400).json({ 
          error: "Grok AI not configured",
          message: "OpenRouter AI integration not available"
        });
      }

      const validatedData = grokTwitterSearchSchema.parse(req.body);
      const { keywords, providers } = validatedData;

      console.log("[Grok Twitter] Analyzing Twitter/X for:", keywords);
      
      const result = await searchTwitterForHealthcareProviders(keywords, providers || []);
      
      // Get existing mentions to avoid duplicates
      const existingMentions = await storage.getOnlineListeningMentions();
      const existingUrls = new Set(existingMentions.map(m => m.sourceUrl).filter(Boolean));
      const existingContents = new Set(existingMentions.map(m => m.content?.substring(0, 50)).filter(Boolean));
      
      // Save mentions to database (skip duplicates)
      const savedMentions: any[] = [];
      for (const mention of result.mentions) {
        // Skip if URL already exists
        if (mention.sourceUrl && existingUrls.has(mention.sourceUrl)) {
          console.log("[Grok Twitter] Skipping duplicate URL:", mention.sourceUrl);
          continue;
        }
        // Skip if content already exists (first 50 chars)
        const contentKey = mention.content?.substring(0, 50);
        if (contentKey && existingContents.has(contentKey)) {
          console.log("[Grok Twitter] Skipping duplicate content");
          continue;
        }
        
        const saved = await storage.createOnlineListeningMention({
          source: "twitter",
          sourceUrl: mention.sourceUrl || null,
          providerName: mention.providerName || null,
          authorHandle: mention.authorHandle || null,
          content: mention.content,
          publishedAt: mention.publishedAt,
          sentimentScore: String(mention.sentimentScore),
          sentiment: mention.sentiment as any,
          topics: mention.topics,
          engagementCount: mention.engagementEstimate,
          reachEstimate: mention.reachEstimate,
          requiresAction: mention.requiresAction,
          metadata: { alertLevel: mention.alertLevel },
        });
        savedMentions.push(saved);
        existingUrls.add(mention.sourceUrl || "");
        existingContents.add(contentKey || "");
      }

      console.log(`[Grok Twitter] Saved ${savedMentions.length} mentions`);
      
      res.json({
        mentions: savedMentions,
        summary: result.summary,
        totalFound: result.totalFound,
        analysisTimestamp: result.analysisTimestamp,
        message: `تم تحليل ${result.totalFound} منشور من منصة إكس`
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/online-listening/twitter", "analyze Twitter mentions");
    }
  });

  // Provider reputation analysis via Grok
  app.get("/api/fwa/chi/online-listening/reputation/:providerName", async (req, res) => {
    try {
      const { analyzeProviderReputation, isGrokConfigured } = await import("../services/grok-twitter-service");
      
      if (!isGrokConfigured()) {
        return res.status(400).json({ error: "Grok AI not configured" });
      }

      const { providerName } = req.params;
      const result = await analyzeProviderReputation(providerName);
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/online-listening/reputation", "analyze provider reputation");
    }
  });

  // ========== ENFORCEMENT CASES CRUD ==========
  
  // Seed CHI demo data if empty (with per-table caching to avoid repeated DB checks)
  // NOTE: Enforcement cases are NOT seeded - they must be created by users linked to real Provider Directory
  const seededTables = new Set<string>();
  async function seedCHIDemoData() {
    // Seed circulars
    if (!seededTables.has('circulars')) {
      seededTables.add('circulars');
      const existingCirculars = await storage.getRegulatoryCirculars();
      if (existingCirculars.length === 0) {
        const circularData = [
          {
            circularNumber: "CHI-CIR-2025-001",
            title: "Updated FWA Detection Guidelines for NPHIES Claims",
            summary: "New algorithms and notification requirements for fraud detection in Q1 2025.",
            content: "This circular outlines the updated fraud detection algorithms and provider notification requirements effective Q1 2025.",
            type: "policy_update" as const,
            status: "published" as const,
            priority: "high" as const,
            effectiveDate: new Date("2025-01-15"),
            publishedAt: new Date("2025-01-10"),
            authorizedBy: "Dr. Ibrahim Al-Mutairi",
            targetAudience: ["all_providers", "insurers"],
          },
          {
            circularNumber: "CHI-CIR-2025-002",
            title: "Mandatory Pre-Authorization Requirements for High-Cost Procedures",
            summary: "Pre-authorization required for procedures over SAR 50,000.",
            content: "All procedures exceeding SAR 50,000 require CHI pre-authorization starting February 2025.",
            type: "compliance_bulletin" as const,
            status: "published" as const,
            priority: "critical" as const,
            effectiveDate: new Date("2025-02-01"),
            publishedAt: new Date("2025-01-12"),
            authorizedBy: "CHI Board of Directors",
            targetAudience: ["all_providers", "insurers", "tpas"],
          },
          {
            circularNumber: "CHI-CIR-2025-003",
            title: "New Penalty Framework for Repeat FWA Offenders",
            summary: "Escalating penalties for multiple FWA violations.",
            content: "Escalating penalty structure for providers with multiple FWA violations within 12 months.",
            type: "enforcement_notice" as const,
            status: "review" as const,
            priority: "high" as const,
            effectiveDate: new Date("2025-03-01"),
            authorizedBy: "Legal Affairs Department",
            targetAudience: ["all_providers"],
          },
        ];
        for (const data of circularData) {
          await storage.createRegulatoryCircular(data);
        }
      }
    }

    // Seed audit sessions
    if (!seededTables.has('audit_sessions')) {
      seededTables.add('audit_sessions');
      const existingSessions = await storage.getAuditSessions();
      if (existingSessions.length === 0) {
        const sessionData = [
          {
            auditNumber: "AUD-2025-001",
            providerId: "PRV-001",
            providerName: "Al-Shifa Medical Center",
            type: "risk_based_audit" as const,
            status: "scheduled" as const,
            scheduledDate: new Date("2025-01-25"),
            location: "Riyadh - Main Branch",
            auditTeam: [
              { name: "Ahmed Al-Rashid", role: "Lead Auditor", department: "FWA Investigation" },
              { name: "Sara Al-Fahad", role: "Clinical Reviewer", department: "Clinical Affairs" },
            ],
            auditScope: ["billing", "documentation", "compliance"],
          },
          {
            auditNumber: "AUD-2025-002",
            providerId: "PRV-004",
            providerName: "Eastern Province Medical Group",
            type: "routine_inspection" as const,
            status: "in_progress" as const,
            scheduledDate: new Date("2025-01-15"),
            location: "Dammam - Central Office",
            auditTeam: [
              { name: "Khalid Al-Dosari", role: "Lead Auditor", department: "Compliance" },
              { name: "Noura Al-Qahtani", role: "Compliance Specialist", department: "Compliance" },
            ],
            auditScope: ["credentials", "operations", "compliance"],
          },
          {
            auditNumber: "AUD-2025-003",
            providerId: "PRV-003",
            providerName: "Jeddah Specialty Clinic",
            type: "complaint_investigation" as const,
            status: "completed" as const,
            scheduledDate: new Date("2025-01-08"),
            location: "Jeddah - Branch A",
            auditTeam: [
              { name: "Mohammed Al-Harbi", role: "Lead Investigator", department: "FWA Investigation" },
            ],
            auditScope: ["billing", "claims"],
            findings: [
              { category: "billing", severity: "major", description: "Systematic duplicate billing detected", evidence: "23 duplicate claims identified", recommendation: "Implement billing review process" }
            ],
            correctiveActions: [
              { action: "Implement billing review process", dueDate: "2025-02-15", status: "pending" },
              { action: "Staff retraining", dueDate: "2025-02-01", status: "completed" },
            ],
          },
        ];
        for (const data of sessionData) {
          await storage.createAuditSession(data);
        }
      }
    }

    // Seed Knowledge Hub: Policy Violations
    if (!seededTables.has('policy_violations')) {
      seededTables.add('policy_violations');
      const existingViolations = await storage.getPolicyViolations();
      if (existingViolations.length === 0) {
        const violationData = [
          {
            violationCode: "CHI-FWA-101",
            title: "Upcoding of Medical Procedures",
            category: "billing",
            description: "Billing for a more expensive service than was actually performed.",
            severity: "major" as const,
            defaultSanction: "fine" as const,
            fineRangeMin: "50000",
            fineRangeMax: "200000",
            regulatoryBasis: "CHI Circular 2024-45",
            effectiveDate: new Date("2024-01-01"),
            escalationPath: ["warning", "fine", "suspension"],
          },
          {
            violationCode: "CHI-FWA-203",
            title: "Unbundling of Services",
            category: "billing",
            description: "Billing separately for services that should be billed together as a bundle.",
            severity: "major" as const,
            defaultSanction: "fine" as const,
            fineRangeMin: "25000",
            fineRangeMax: "150000",
            regulatoryBasis: "CHI Circular 2024-32",
            effectiveDate: new Date("2024-01-01"),
            escalationPath: ["warning", "fine", "suspension"],
          },
          {
            violationCode: "CHI-FWA-305",
            title: "Duplicate Billing",
            category: "billing",
            description: "Submitting multiple claims for the same service rendered once.",
            severity: "critical" as const,
            defaultSanction: "suspension" as const,
            fineRangeMin: "100000",
            fineRangeMax: "500000",
            suspensionDaysMin: 30,
            suspensionDaysMax: 180,
            regulatoryBasis: "CHI Circular 2024-18",
            effectiveDate: new Date("2024-01-01"),
            escalationPath: ["fine", "suspension", "license_revocation"],
          },
        ];
        for (const v of violationData) {
          await storage.createPolicyViolation(v);
        }
      }
    }

    // Seed Knowledge Hub: Clinical Pathway Rules
    if (!seededTables.has('clinical_pathways')) {
      seededTables.add('clinical_pathways');
      const existingPathways = await storage.getClinicalPathwayRules();
      if (existingPathways.length === 0) {
        const pathwayData = [
          {
            ruleCode: "CP-DIABETES-001",
            title: "Type 2 Diabetes Outpatient Care Rule",
            category: "care_level_mismatch" as const,
            description: "Detects when Type 2 Diabetes management is billed at inappropriate care levels. Routine HbA1c monitoring and medication adjustments should be done in outpatient settings.",
            specialty: "Endocrinology",
            procedureCodes: ["99213", "99214", "83036"],
            diagnosisCodes: ["E11.9", "E11.65"],
            allowedSettings: ["outpatient", "ambulatory"],
            prohibitedSettings: ["inpatient"],
            requiresPriorAuth: false,
            clinicalEvidence: "ADA Standards of Medical Care 2024",
          },
          {
            ruleCode: "CP-CARDIAC-002",
            title: "Cardiac Catheterization LOS Rule",
            category: "length_of_stay" as const,
            description: "Maximum length of stay rule for uncomplicated cardiac catheterization procedures. Extended stays require clinical justification.",
            specialty: "Cardiology",
            procedureCodes: ["92920", "92928", "93458"],
            diagnosisCodes: ["I21.0", "I21.1", "I21.4"],
            allowedSettings: ["inpatient"],
            maxLengthOfStay: 3,
            requiresPriorAuth: true,
            clinicalEvidence: "ACC/AHA Guidelines 2023",
          },
        ];
        for (const p of pathwayData) {
          await storage.createClinicalPathwayRule(p);
        }
      }
    }

    // Seed Knowledge Hub: Regulatory Documents
    if (!seededTables.has('regulatory_docs')) {
      seededTables.add('regulatory_docs');
      const existingRegDocs = await storage.getFwaRegulatoryDocs();
      if (existingRegDocs.length === 0) {
        const regDocData = [
          {
            regulationId: "REG-CHI-2024-001",
            title: "CHI FWA Detection and Prevention Guidelines",
            category: "cchi" as const,
            effectiveDate: new Date("2024-01-01"),
            jurisdiction: "Saudi Arabia - CHI",
            content: "Comprehensive guidelines for detecting and preventing fraud, waste, and abuse in Saudi healthcare claims processing.",
          },
          {
            regulationId: "REG-CHI-2024-002",
            title: "Provider Credentialing Standards",
            category: "moh" as const,
            effectiveDate: new Date("2024-03-15"),
            jurisdiction: "Saudi Arabia - CHI",
            content: "Standards and requirements for healthcare provider credentialing and ongoing verification.",
          },
        ];
        for (const rd of regDocData) {
          await storage.createFwaRegulatoryDoc(rd);
        }
      }
    }

    // Seed Knowledge Hub: Medical Guidelines
    if (!seededTables.has('medical_guidelines')) {
      seededTables.add('medical_guidelines');
      const existingGuidelines = await storage.getFwaMedicalGuidelines();
      if (existingGuidelines.length === 0) {
        const guidelineData = [
          {
            title: "Antibiotic Stewardship Guidelines",
            category: "clinical_practice" as const,
            content: "Evidence-based guidelines for appropriate antibiotic prescribing to combat antimicrobial resistance. These guidelines outline the proper selection, dosing, and duration of antibiotic therapy.",
            sourceAuthority: "IDSA (Infectious Diseases Society of America)",
            specialtyArea: "Infectious Disease",
          },
          {
            title: "Appropriate Use Criteria for Diagnostic Imaging",
            category: "medical_necessity" as const,
            content: "Criteria for appropriate utilization of CT, MRI, and other imaging modalities. These criteria establish when advanced imaging is medically necessary versus when alternatives should be considered.",
            sourceAuthority: "ACR (American College of Radiology)",
            specialtyArea: "Radiology",
          },
        ];
        for (const mg of guidelineData) {
          await storage.createFwaMedicalGuideline(mg);
        }
      }
    }

    // Seed Knowledge Hub: Provider Complaints
    if (!seededTables.has('provider_complaints')) {
      seededTables.add('provider_complaints');
      const existingComplaints = await storage.getProviderComplaints();
      if (existingComplaints.length === 0) {
        const complaintData = [
          {
            complaintNumber: "CMP-2025-001",
            providerId: "PRV-001",
            providerName: "Al-Shifa Medical Center",
            source: "patient_hotline" as const,
            category: "billing_dispute",
            severity: "major" as const,
            status: "under_review" as const,
            description: "Patient received unexpected bill for services claimed to be covered. Alleges provider charged for services not rendered.",
            receivedDate: new Date("2025-01-05"),
            dueDate: new Date("2025-02-05"),
          },
          {
            complaintNumber: "CMP-2025-002",
            providerId: "PRV-002",
            providerName: "Riyadh General Hospital",
            source: "insurance_company" as const,
            category: "quality_of_care",
            severity: "moderate" as const,
            status: "received" as const,
            description: "Pattern of incomplete documentation affecting claims adjudication. Multiple requests for additional information.",
            receivedDate: new Date("2025-01-08"),
            dueDate: new Date("2025-02-08"),
          },
        ];
        for (const c of complaintData) {
          await storage.createProviderComplaint(c);
        }
      }
    }

    // Online Listening: Seed Saudi-specific social media mentions for fraud case studies
    if (!seededTables.has('online_listening')) {
      seededTables.add('online_listening');
      const existingMentions = await storage.getOnlineListeningMentions();
      if (existingMentions.length === 0) {
        const saudiMentionsData = [
          // === Case Study 1: Dental Ring ===
          {
            providerId: "PRV-CS1-001",
            providerName: "Al Noor Dental Center",
            source: "twitter" as const,
            authorHandle: "@SaudiPatient_22",
            content: "My dental clinic charged Bupa for 3 root canals I never had — anyone else experiencing this? مركز النور لطب الأسنان #تأمين_صحي #احتيال",
            sentiment: "very_negative" as const,
            sentimentScore: "-0.9200",
            topics: ["billing_fraud", "dental", "phantom_billing"],
            engagementCount: 342,
            reachEstimate: 15200,
            requiresAction: true,
            publishedAt: new Date("2026-02-15T14:30:00Z"),
          },
          {
            providerId: "PRV-CS1-004",
            providerName: "Pearl Dental Center",
            source: "twitter" as const,
            authorHandle: "@ConsumerRights_SA",
            content: "@CHI_Saudi I was billed SAR 4,500 for procedures I didn't receive at Pearl Dental Center. This is fraud! When will CHI take action? مركز اللؤلؤة لطب الأسنان",
            sentiment: "very_negative" as const,
            sentimentScore: "-0.8800",
            topics: ["billing_fraud", "dental", "regulatory_complaint"],
            engagementCount: 567,
            reachEstimate: 28400,
            requiresAction: true,
            publishedAt: new Date("2026-02-18T09:15:00Z"),
          },
          {
            providerId: "PRV-CS1-002",
            providerName: "Smile Plus Clinic",
            source: "forum" as const,
            authorHandle: "RiyadhResident_88",
            content: "Warning: Smile Plus Clinic in Olaya district charged my insurance for dental work that was never done. They billed for 2 crowns and a root canal on a single visit. تحذير من عيادة سمايل بلس",
            sentiment: "negative" as const,
            sentimentScore: "-0.7500",
            topics: ["dental", "billing_fraud", "consumer_warning"],
            engagementCount: 89,
            reachEstimate: 4200,
            requiresAction: true,
            publishedAt: new Date("2026-02-10T16:45:00Z"),
          },

          // === Case Study 2: OB/GYN Upcoding ===
          {
            providerId: "PRV-CS2-001",
            providerName: "Al Hayat Women's Hospital",
            source: "twitter" as const,
            authorHandle: "@UmmAhmed_JED",
            content: "My wife was pressured into a C-section at Al Hayat Hospital even though the doctor said natural delivery was fine. SAR 12,000 bill! Who benefits from these unnecessary surgeries? #مستشفى_الحياة #ولادة_قيصرية",
            sentiment: "very_negative" as const,
            sentimentScore: "-0.8500",
            topics: ["upcoding", "obstetrics", "unnecessary_procedures"],
            engagementCount: 891,
            reachEstimate: 42000,
            requiresAction: true,
            publishedAt: new Date("2026-02-20T11:20:00Z"),
          },
          {
            source: "news_article" as const,
            providerName: "Multiple providers",
            content: "Rising C-section rates in Saudi private hospitals spark regulatory concern — CHI data shows a 68% C-section rate at some Jeddah facilities vs 23% national average. Health economists warn this may indicate systematic upcoding.",
            sentiment: "negative" as const,
            sentimentScore: "-0.6000",
            topics: ["upcoding", "obstetrics", "regulatory", "c_section_rates"],
            engagementCount: 2340,
            reachEstimate: 156000,
            requiresAction: false,
            publishedAt: new Date("2026-02-22T08:00:00Z"),
            sourceUrl: "https://www.arabnews.com/health/article/2026/02/22/rising-csection-rates",
          },

          // === General Healthcare Mentions (Background) ===
          // Negative: Insurance coverage complaint
          {
            source: "twitter" as const,
            authorHandle: "@FrustratedExpat_KSA",
            content: "Submitted a claim to my insurer 3 weeks ago for a specialist visit and still no response. The new NPHIES portal keeps timing out. How is this acceptable? #NPHIES #تأمين_طبي",
            sentiment: "negative" as const,
            sentimentScore: "-0.6500",
            topics: ["insurance_coverage", "nphies", "claims_delay"],
            engagementCount: 213,
            reachEstimate: 9800,
            requiresAction: false,
            publishedAt: new Date("2026-02-12T10:00:00Z"),
          },
          // Negative: NPHIES system issues
          {
            source: "sabq" as const,
            providerName: "Multiple providers",
            content: "مقدمو خدمات صحية يشتكون من أعطال متكررة في نظام نفيس خلال ساعات الذروة، مما يؤخر معالجة المطالبات ويؤثر على التدفق النقدي للمستشفيات الصغيرة. NPHIES downtime complaints rise among providers.",
            sentiment: "negative" as const,
            sentimentScore: "-0.5500",
            topics: ["nphies", "system_outage", "provider_complaints"],
            engagementCount: 456,
            reachEstimate: 34000,
            requiresAction: false,
            publishedAt: new Date("2026-02-14T07:30:00Z"),
            sourceUrl: "https://sabq.org/saudia/nphies-downtime-2026",
          },
          // Negative: Medication pricing concerns
          {
            source: "okaz" as const,
            content: "ارتفاع أسعار الأدوية المزمنة في الصيدليات الخاصة يثير قلق المرضى — بعض الأدوية زادت بنسبة 40% خلال 6 أشهر. مجلس الضمان الصحي يدرس وضع سقف سعري. Medication prices surge concerns patients.",
            sentiment: "negative" as const,
            sentimentScore: "-0.5000",
            topics: ["medication_pricing", "pharmacy", "cost_of_care"],
            engagementCount: 1120,
            reachEstimate: 78000,
            requiresAction: false,
            publishedAt: new Date("2026-02-08T12:00:00Z"),
            sourceUrl: "https://www.okaz.com.sa/news/local/medication-prices-2026",
          },
          // Positive: CHI regulations
          {
            source: "alriyadh" as const,
            content: "مجلس الضمان الصحي يطلق مبادرة جديدة لتعزيز الشفافية في الفوترة الطبية وحماية حقوق المؤمن لهم. المبادرة تشمل خط ساخن للإبلاغ عن المخالفات. CHI launches billing transparency initiative with fraud hotline.",
            sentiment: "positive" as const,
            sentimentScore: "0.7200",
            topics: ["chi_regulation", "transparency", "patient_rights"],
            engagementCount: 876,
            reachEstimate: 92000,
            requiresAction: false,
            publishedAt: new Date("2026-02-05T09:00:00Z"),
            sourceUrl: "https://www.alriyadh.com/health/chi-transparency-2026",
          },
          // Positive: CHI enforcement actions
          {
            source: "twitter" as const,
            authorHandle: "@HealthPolicy_SA",
            content: "Good to see CHI cracking down on fraudulent billing practices. 12 clinics fined in January alone. This is how you protect patients and the insurance system. أحسنت يا مجلس الضمان الصحي #CHI #مكافحة_الاحتيال",
            sentiment: "positive" as const,
            sentimentScore: "0.8000",
            topics: ["chi_enforcement", "fraud_prevention", "positive_sentiment"],
            engagementCount: 1543,
            reachEstimate: 67000,
            requiresAction: false,
            publishedAt: new Date("2026-02-25T15:45:00Z"),
          },
          // Neutral: Wait time complaints
          {
            source: "almadina" as const,
            providerName: "King Fahd Medical City",
            content: "مدينة الملك فهد الطبية تعلن عن خطة لتقليل أوقات الانتظار في العيادات الخارجية بنسبة 30% خلال الربع القادم. الخطة تشمل توسيع ساعات العمل وإضافة عيادات مسائية. Wait time reduction plan announced.",
            sentiment: "neutral" as const,
            sentimentScore: "0.1500",
            topics: ["wait_times", "service_improvement", "outpatient"],
            engagementCount: 312,
            reachEstimate: 45000,
            requiresAction: false,
            publishedAt: new Date("2026-02-17T06:00:00Z"),
            sourceUrl: "https://www.al-madina.com/article/wait-time-plan-2026",
          },
          // Neutral: SBS V3.0 compliance challenges
          {
            source: "sabq" as const,
            providerName: "Multiple providers",
            content: "مقدمو الخدمات الصحية يستعدون لتطبيق معايير SBS V3.0 الجديدة — التحديات تشمل تحديث أنظمة الفوترة وتدريب الكوادر. مجلس الضمان يمدد فترة الامتثال 3 أشهر إضافية. SBS V3.0 compliance deadline extended.",
            sentiment: "neutral" as const,
            sentimentScore: "0.0500",
            topics: ["sbs_v3", "compliance", "provider_readiness"],
            engagementCount: 198,
            reachEstimate: 21000,
            requiresAction: false,
            publishedAt: new Date("2026-02-03T14:00:00Z"),
            sourceUrl: "https://sabq.org/saudia/sbs-v3-compliance-2026",
          },
        ];
        for (const mention of saudiMentionsData) {
          await storage.createOnlineListeningMention(mention);
        }
      }
    }
  }

  // Provider lookup endpoint for enforcement case creation (from Provider Directory)
  app.get("/api/fwa/chi/providers", async (req, res) => {
    try {
      const { search } = req.query;
      const providers = await db.select({
        id: providerDirectory.id,
        name: providerDirectory.name,
        npi: providerDirectory.npi,
        specialty: providerDirectory.specialty,
        organization: providerDirectory.organization,
        city: providerDirectory.city,
        region: providerDirectory.region,
        contractStatus: providerDirectory.contractStatus,
      }).from(providerDirectory)
        .orderBy(providerDirectory.name);
      
      // Filter by search query if provided
      let filteredProviders = providers;
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        filteredProviders = providers.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          (p.npi && p.npi.toLowerCase().includes(searchLower)) ||
          (p.organization && p.organization.toLowerCase().includes(searchLower))
        );
      }
      
      res.json(filteredProviders);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/providers", "get providers for enforcement");
    }
  });

  app.get("/api/fwa/chi/enforcement-cases", async (req, res) => {
    try {
      // Single SQL JOIN query to get enforcement cases with provider names
      const cases = await db.select({
        id: enforcementCases.id,
        caseNumber: enforcementCases.caseNumber,
        providerId: enforcementCases.providerId,
        providerName: sql`COALESCE(${providerDirectory.name}, ${enforcementCases.providerName})`,
        status: enforcementCases.status,
        violationCode: enforcementCases.violationCode,
        violationTitle: enforcementCases.violationTitle,
        severity: enforcementCases.severity,
        description: enforcementCases.description,
        evidenceSummary: enforcementCases.evidenceSummary,
        findingDate: enforcementCases.findingDate,
        warningIssuedDate: enforcementCases.warningIssuedDate,
        warningDueDate: enforcementCases.warningDueDate,
        correctiveActionDescription: enforcementCases.correctiveActionDescription,
        correctiveActionDueDate: enforcementCases.correctiveActionDueDate,
        correctiveActionCompletedDate: enforcementCases.correctiveActionCompletedDate,
        penaltyType: enforcementCases.penaltyType,
        fineAmount: enforcementCases.fineAmount,
        suspensionStartDate: enforcementCases.suspensionStartDate,
        suspensionEndDate: enforcementCases.suspensionEndDate,
        penaltyAppliedDate: enforcementCases.penaltyAppliedDate,
        appealSubmittedDate: enforcementCases.appealSubmittedDate,
        appealReason: enforcementCases.appealReason,
        appealDecision: enforcementCases.appealDecision,
        appealDecisionDate: enforcementCases.appealDecisionDate,
        resolutionDate: enforcementCases.resolutionDate,
        resolutionNotes: enforcementCases.resolutionNotes,
        linkedComplaintIds: enforcementCases.linkedComplaintIds,
        linkedFwaCaseIds: enforcementCases.linkedFwaCaseIds,
        assignedInvestigator: enforcementCases.assignedInvestigator,
        assignedReviewer: enforcementCases.assignedReviewer,
        createdAt: enforcementCases.createdAt,
        updatedAt: enforcementCases.updatedAt,
      }).from(enforcementCases)
        .leftJoin(providerDirectory, eq(enforcementCases.providerId, providerDirectory.id));
      
      res.json(cases);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/enforcement-cases", "get enforcement cases");
    }
  });

  app.get("/api/fwa/chi/enforcement-cases/:id", async (req, res) => {
    try {
      // Single SQL JOIN query to get enforcement case with provider name
      const caseResult = await db.select({
        id: enforcementCases.id,
        caseNumber: enforcementCases.caseNumber,
        providerId: enforcementCases.providerId,
        providerName: sql`COALESCE(${providerDirectory.name}, ${enforcementCases.providerName})`,
        status: enforcementCases.status,
        violationCode: enforcementCases.violationCode,
        violationTitle: enforcementCases.violationTitle,
        severity: enforcementCases.severity,
        description: enforcementCases.description,
        evidenceSummary: enforcementCases.evidenceSummary,
        findingDate: enforcementCases.findingDate,
        warningIssuedDate: enforcementCases.warningIssuedDate,
        warningDueDate: enforcementCases.warningDueDate,
        correctiveActionDescription: enforcementCases.correctiveActionDescription,
        correctiveActionDueDate: enforcementCases.correctiveActionDueDate,
        correctiveActionCompletedDate: enforcementCases.correctiveActionCompletedDate,
        penaltyType: enforcementCases.penaltyType,
        fineAmount: enforcementCases.fineAmount,
        suspensionStartDate: enforcementCases.suspensionStartDate,
        suspensionEndDate: enforcementCases.suspensionEndDate,
        penaltyAppliedDate: enforcementCases.penaltyAppliedDate,
        appealSubmittedDate: enforcementCases.appealSubmittedDate,
        appealReason: enforcementCases.appealReason,
        appealDecision: enforcementCases.appealDecision,
        appealDecisionDate: enforcementCases.appealDecisionDate,
        resolutionDate: enforcementCases.resolutionDate,
        resolutionNotes: enforcementCases.resolutionNotes,
        linkedComplaintIds: enforcementCases.linkedComplaintIds,
        linkedFwaCaseIds: enforcementCases.linkedFwaCaseIds,
        assignedInvestigator: enforcementCases.assignedInvestigator,
        assignedReviewer: enforcementCases.assignedReviewer,
        createdAt: enforcementCases.createdAt,
        updatedAt: enforcementCases.updatedAt,
      }).from(enforcementCases)
        .leftJoin(providerDirectory, eq(enforcementCases.providerId, providerDirectory.id))
        .where(eq(enforcementCases.id, req.params.id))
        .limit(1);
      
      if (caseResult.length === 0) {
        return res.status(404).json({ message: "Enforcement case not found" });
      }
      
      res.json(caseResult[0]);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/enforcement-cases/:id", "get enforcement case");
    }
  });

  const enforcementCaseInputSchema = z.object({
    providerId: z.string().min(1, "Provider ID is required"),
    violationCode: z.string().optional(),
    violationTitle: z.string().optional(),
    severity: z.enum(["minor", "moderate", "major", "critical"]).default("major"),
    description: z.string().min(1, "Description is required"),
    caseNumber: z.string().optional(),
    findingDate: z.date().optional(),
    status: z.enum(["finding", "warning_issued", "corrective_action", "penalty_proposed", "penalty_applied", "appeal_submitted", "appeal_review", "resolved", "closed"]).optional(),
  });

  app.post("/api/fwa/chi/enforcement-cases", async (req, res) => {
    try {
      const validatedData = enforcementCaseInputSchema.parse(req.body);
      
      // Lookup provider from provider_directory to get name
      const provider = await db.select({ id: providerDirectory.id, name: providerDirectory.name })
        .from(providerDirectory)
        .where(eq(providerDirectory.id, validatedData.providerId))
        .limit(1);
      
      if (provider.length === 0) {
        return res.status(400).json({ 
          message: "Invalid provider ID. Provider must exist in Provider Directory.",
          error: "PROVIDER_NOT_FOUND"
        });
      }
      
      // Create enforcement case with provider name derived from directory
      const enfCase = await storage.createEnforcementCase({
        ...validatedData,
        providerName: provider[0].name,
      } as any);
      
      res.status(201).json(enfCase);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/enforcement-cases", "create enforcement case");
    }
  });

  app.patch("/api/fwa/chi/enforcement-cases/:id", async (req, res) => {
    try {
      const enfCase = await storage.updateEnforcementCase(req.params.id, req.body);
      if (!enfCase) {
        return res.status(404).json({ message: "Enforcement case not found" });
      }
      res.json(enfCase);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/enforcement-cases/:id", "update enforcement case");
    }
  });

  // ========== REGULATORY CIRCULARS CRUD ==========
  
  app.get("/api/fwa/chi/circulars", async (req, res) => {
    try {
      await seedCHIDemoData();
      const circulars = await storage.getRegulatoryCirculars();
      res.json(circulars);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/circulars", "get regulatory circulars");
    }
  });

  app.get("/api/fwa/chi/circulars/:id", async (req, res) => {
    try {
      const circular = await storage.getRegulatoryCircular(req.params.id);
      if (!circular) {
        return res.status(404).json({ message: "Circular not found" });
      }
      res.json(circular);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/circulars/:id", "get circular");
    }
  });

  const circularInputSchema = z.object({
    title: z.string().min(1, "Title is required"),
    type: z.enum(["policy_update", "enforcement_notice", "guidance", "compliance_bulletin", "market_alert", "technical_bulletin"]).default("guidance"),
    summary: z.string().optional(),
    content: z.string().min(1, "Content is required"),
    effectiveDate: z.string().or(z.date()).optional(),
    circularNumber: z.string().optional(),
    status: z.enum(["draft", "review", "approved", "published", "superseded", "archived"]).optional(),
  });

  app.post("/api/fwa/chi/circulars", async (req, res) => {
    try {
      const validatedData = circularInputSchema.parse(req.body);
      const effectiveDate = validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : undefined;
      const circular = await storage.createRegulatoryCircular({ ...validatedData, effectiveDate } as any);
      res.status(201).json(circular);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/circulars", "create circular");
    }
  });

  app.patch("/api/fwa/chi/circulars/:id", async (req, res) => {
    try {
      const circular = await storage.updateRegulatoryCircular(req.params.id, req.body);
      if (!circular) {
        return res.status(404).json({ message: "Circular not found" });
      }
      res.json(circular);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/circulars/:id", "update circular");
    }
  });

  // Send circular notification to providers via email (requires admin token)
  app.post("/api/fwa/chi/circulars/:id/send", async (req, res) => {
    try {
      // Admin authorization required for sending mass emails
      const authToken = req.headers["x-admin-token"] || req.query.token;
      const expectedToken = process.env.ADMIN_SEED_TOKEN;
      
      if (!expectedToken || authToken !== expectedToken) {
        return res.status(401).json({ message: "Unauthorized. ADMIN_SEED_TOKEN must be configured for email distribution." });
      }

      const circular = await storage.getRegulatoryCircular(req.params.id);
      if (!circular) {
        return res.status(404).json({ message: "Circular not found" });
      }

      // Only allow sending for approved or published circulars
      if (circular.status !== 'approved' && circular.status !== 'published') {
        return res.status(400).json({ 
          message: "Cannot send circular. Only approved or published circulars can be distributed." 
        });
      }

      // Get recipients - either from request body or from provider directory
      let recipients: { email: string; name?: string }[] = [];
      
      if (req.body.recipients && Array.isArray(req.body.recipients)) {
        recipients = req.body.recipients;
      } else if (req.body.sendToAllProviders) {
        // Get all providers with emails from directory
        const providers = await storage.getAllProviderDirectoryEntries() || [];
        recipients = providers
          .filter((p: any) => p.email)
          .map((p: any) => ({ email: p.email, name: p.name }));
      }

      if (recipients.length === 0) {
        return res.status(400).json({ 
          message: "No recipients specified. Provide recipients array or set sendToAllProviders: true" 
        });
      }

      // Import email service dynamically
      const { sendCircularNotification } = await import('../services/email-service');
      
      const result = await sendCircularNotification({
        circularNumber: circular.circularNumber,
        title: circular.title,
        type: circular.type,
        effectiveDate: circular.effectiveDate ? new Date(circular.effectiveDate).toLocaleDateString() : 'N/A',
        summary: circular.summary || '',
        content: circular.content || undefined,
        recipients
      });

      // Update circular to mark as distributed
      if (result.sentCount > 0) {
        await storage.updateRegulatoryCircular(req.params.id, {
          status: 'published',
          publishedAt: new Date()
        });
      }

      res.json({
        message: `Email sent to ${result.sentCount} recipient(s)`,
        ...result
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/circulars/:id/send", "send circular notification");
    }
  });

  // Test email configuration (requires admin token)
  app.post("/api/fwa/chi/test-email", async (req, res) => {
    try {
      // Admin authorization required
      const authToken = req.headers["x-admin-token"] || req.query.token;
      const expectedToken = process.env.ADMIN_SEED_TOKEN;
      
      if (!expectedToken || authToken !== expectedToken) {
        return res.status(401).json({ message: "Unauthorized. ADMIN_SEED_TOKEN must be configured." });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const { sendTestEmail } = await import('../services/email-service');
      const result = await sendTestEmail(email);
      
      if (result.success) {
        res.json({ message: "Test email sent successfully", success: true });
      } else {
        res.status(500).json({ message: result.error || "Failed to send test email", success: false });
      }
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/test-email", "send test email");
    }
  });

  // ========== AUDIT SESSIONS CRUD ==========
  
  app.get("/api/fwa/chi/audit-sessions", async (req, res) => {
    try {
      await seedCHIDemoData();
      const sessions = await storage.getAuditSessions();
      res.json(sessions);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions", "get audit sessions");
    }
  });

  app.get("/api/fwa/chi/audit-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getAuditSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      res.json(session);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions/:id", "get audit session");
    }
  });

  const auditSessionInputSchema = z.object({
    providerId: z.string().min(1, "Provider ID is required"),
    providerName: z.string().min(1, "Provider name is required"),
    type: z.enum(["routine_inspection", "risk_based_audit", "complaint_investigation", "follow_up_audit", "desk_review", "site_visit"]).default("risk_based_audit"),
    scheduledDate: z.string().or(z.date()).optional(),
    location: z.string().optional(),
    auditTeam: z.array(z.object({ name: z.string(), role: z.string().optional() })).optional(),
    auditScope: z.array(z.string()).optional(),
    auditNumber: z.string().optional(),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "follow_up_required", "report_pending"]).optional(),
  });

  app.post("/api/fwa/chi/audit-sessions", async (req, res) => {
    try {
      const validatedData = auditSessionInputSchema.parse(req.body);
      const scheduledDate = validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : undefined;
      const session = await storage.createAuditSession({ ...validatedData, scheduledDate } as any);
      res.status(201).json(session);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions", "create audit session");
    }
  });

  app.patch("/api/fwa/chi/audit-sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateAuditSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      res.json(session);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions/:id", "update audit session");
    }
  });

  // ========== AUDIT FINDINGS CRUD ==========
  
  app.get("/api/fwa/chi/audit-sessions/:sessionId/findings", async (req, res) => {
    try {
      const findings = await storage.getAuditFindings(req.params.sessionId);
      res.json(findings);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions/:sessionId/findings", "get audit findings");
    }
  });

  app.get("/api/fwa/chi/audit-findings/:id", async (req, res) => {
    try {
      const finding = await storage.getAuditFinding(req.params.id);
      if (!finding) {
        return res.status(404).json({ message: "Audit finding not found" });
      }
      res.json(finding);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-findings/:id", "get audit finding");
    }
  });

  const auditFindingInputSchema = z.object({
    auditSessionId: z.string().min(1, "Audit session ID is required"),
    findingNumber: z.string().optional(),
    category: z.string().min(1, "Category is required"),
    severity: z.enum(["low", "medium", "high", "critical"]),
    status: z.enum(["draft", "confirmed", "disputed", "resolved", "referred_to_enforcement"]).optional(),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    evidence: z.string().optional(),
    recommendation: z.string().optional(),
    linkedClaimIds: z.array(z.string()).optional(),
    linkedDetectionIds: z.array(z.string()).optional(),
    potentialAmount: z.string().optional(),
    regulatoryReference: z.string().optional(),
    providerResponse: z.string().optional(),
    auditorNotes: z.string().optional(),
    enforcementCaseId: z.string().optional(),
    createdBy: z.string().optional(),
  });

  app.post("/api/fwa/chi/audit-findings", async (req, res) => {
    try {
      const validatedData = auditFindingInputSchema.parse(req.body);
      const finding = await storage.createAuditFinding(validatedData as any);
      res.status(201).json(finding);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-findings", "create audit finding");
    }
  });

  app.patch("/api/fwa/chi/audit-findings/:id", async (req, res) => {
    try {
      const finding = await storage.updateAuditFinding(req.params.id, req.body);
      if (!finding) {
        return res.status(404).json({ message: "Audit finding not found" });
      }
      res.json(finding);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-findings/:id", "update audit finding");
    }
  });

  app.delete("/api/fwa/chi/audit-findings/:id", async (req, res) => {
    try {
      await storage.deleteAuditFinding(req.params.id);
      res.json({ success: true, message: "Finding deleted" });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-findings/:id", "delete audit finding");
    }
  });

  // ========== AUDIT REPORT GENERATION ==========

  app.get("/api/fwa/chi/audit-sessions/:sessionId/report", async (req, res) => {
    try {
      const session = await storage.getAuditSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      
      const findings = await storage.getAuditFindings(req.params.sessionId);
      const checklists = await storage.getAuditChecklists(req.params.sessionId);
      
      // Calculate summary statistics
      const findingsByCategory: Record<string, number> = {};
      const findingsBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      let totalPotentialAmount = 0;
      
      findings.forEach((f) => {
        findingsByCategory[f.category] = (findingsByCategory[f.category] || 0) + 1;
        if (f.severity) findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] || 0) + 1;
        if (f.potentialAmount) totalPotentialAmount += parseFloat(f.potentialAmount) || 0;
      });
      
      const checklistStats = {
        total: checklists.length,
        completed: checklists.filter((c) => c.status === 'completed').length,
        pending: checklists.filter((c) => c.status === 'pending').length,
      };
      
      const report = {
        session: {
          id: session.id,
          auditNumber: session.auditNumber,
          providerName: session.providerName,
          providerId: session.providerId,
          type: session.type,
          status: session.status,
          scheduledDate: session.scheduledDate,
          location: session.location,
          auditTeam: session.auditTeam,
          auditScope: session.auditScope,
        },
        summary: {
          totalFindings: findings.length,
          findingsByCategory,
          findingsBySeverity,
          totalPotentialAmount: totalPotentialAmount.toFixed(2),
          checklistStats,
        },
        findings: findings.map((f) => ({
          findingNumber: f.findingNumber,
          category: f.category,
          severity: f.severity,
          status: f.status,
          title: f.title,
          description: f.description,
          evidence: f.evidence,
          recommendation: f.recommendation,
          potentialAmount: f.potentialAmount,
          regulatoryReference: f.regulatoryReference,
          linkedClaimIds: f.linkedClaimIds,
        })),
        checklists: checklists.map((c) => ({
          itemCode: c.itemCode,
          category: c.category,
          description: c.description,
          status: c.status,
          completedAt: c.completedAt,
          notes: c.notes,
        })),
        generatedAt: new Date().toISOString(),
      };
      
      res.json(report);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions/:sessionId/report", "generate audit report");
    }
  });

  // ========== AUDIT CHECKLISTS CRUD ==========

  app.get("/api/fwa/chi/audit-sessions/:sessionId/checklists", async (req, res) => {
    try {
      const checklists = await storage.getAuditChecklists(req.params.sessionId);
      res.json(checklists);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions/:sessionId/checklists", "get audit checklists");
    }
  });

  app.post("/api/fwa/chi/audit-sessions/:sessionId/checklists/initialize", async (req, res) => {
    try {
      const { category } = req.body;
      const checklists = await storage.createDefaultChecklists(req.params.sessionId, category || 'all');
      res.status(201).json(checklists);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-sessions/:sessionId/checklists/initialize", "initialize checklists");
    }
  });

  app.patch("/api/fwa/chi/audit-checklists/:id", async (req, res) => {
    try {
      const checklist = await storage.updateAuditChecklist(req.params.id, req.body);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.json(checklist);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/chi/audit-checklists/:id", "update checklist item");
    }
  });

  // =============================================================================
  // FWA Detection Engine - 4 Detection Methods
  // =============================================================================

  // Import detection engine dynamically to avoid circular deps
  const loadDetectionEngine = async () => {
    const { runFullDetection, runFastDetection, getDetectionConfigs, saveDetectionResult, 
            runRuleEngineDetection, runStatisticalDetection, 
            runUnsupervisedDetection, runRagLlmDetection,
            updateDetectionConfig, getDefaultDetectionConfigs } = await import("../services/fwa-detection-engine");
    return { runFullDetection, runFastDetection, getDetectionConfigs, saveDetectionResult,
             runRuleEngineDetection, runStatisticalDetection,
             runUnsupervisedDetection, runRagLlmDetection,
             updateDetectionConfig, getDefaultDetectionConfigs };
  };

  // Get detection method configurations with full algorithm descriptions
  app.get("/api/fwa/detection-engine/configs", async (req, res) => {
    try {
      const engine = await loadDetectionEngine();
      const configs = await engine.getDetectionConfigs();
      res.json(configs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/configs", "get detection configs");
    }
  });

  // Update detection method configuration
  app.put("/api/fwa/detection-engine/configs/:method", async (req, res) => {
    try {
      const { method } = req.params;
      const { isEnabled, weight, threshold } = req.body;
      
      const engine = await loadDetectionEngine();
      const updatedConfigs = await engine.updateDetectionConfig(method, {
        isEnabled,
        weight,
        threshold
      });
      
      res.json(updatedConfigs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/configs/:method", "update detection config");
    }
  });

  // Reset detection configs to defaults
  app.post("/api/fwa/detection-engine/configs/reset", async (req, res) => {
    try {
      const engine = await loadDetectionEngine();
      const defaultConfigs = engine.getDefaultDetectionConfigs();
      res.json(defaultConfigs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/configs/reset", "reset detection configs");
    }
  });

  // Run full detection on a claim
  app.post("/api/fwa/detection-engine/analyze", async (req, res) => {
    try {
      const { claimId, claim } = req.body;
      
      // If claimId provided, fetch claim from database
      let claimData = claim;
      if (claimId && !claim) {
        const dbClaim = await storage.getClaimById(claimId);
        if (!dbClaim) {
          return res.status(404).json({ message: "Claim not found" });
        }
        claimData = {
          id: dbClaim.id,
          claimNumber: dbClaim.claimNumber,
          providerId: dbClaim.providerId,
          patientId: dbClaim.patientId,
          amount: parseFloat(dbClaim.amount as string),
          diagnosisCode: dbClaim.diagnosis,
          procedureCode: dbClaim.cptCode,
          serviceDate: dbClaim.date,
          description: dbClaim.description,
          claimType: dbClaim.claimType
        };
      }
      
      if (!claimData) {
        return res.status(400).json({ message: "Either claimId or claim data required" });
      }
      
      const engine = await loadDetectionEngine();
      const result = await engine.runFullDetection(claimData);
      
      // Optionally save result
      if (req.body.save !== false) {
        await engine.saveDetectionResult(result);
      }
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/analyze", "analyze claim");
    }
  });

  // Run individual detection methods
  app.post("/api/fwa/detection-engine/rule-engine", async (req, res) => {
    try {
      const engine = await loadDetectionEngine();
      const result = await engine.runRuleEngineDetection(req.body);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/rule-engine", "rule engine detection");
    }
  });

  app.post("/api/fwa/detection-engine/statistical", async (req, res) => {
    try {
      const engine = await loadDetectionEngine();
      const result = await engine.runStatisticalDetection(req.body);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/statistical", "statistical detection");
    }
  });

  app.post("/api/fwa/detection-engine/unsupervised", async (req, res) => {
    try {
      const engine = await loadDetectionEngine();
      const result = await engine.runUnsupervisedDetection(req.body);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/unsupervised", "unsupervised detection");
    }
  });

  app.post("/api/fwa/detection-engine/rag-llm", async (req, res) => {
    try {
      const engine = await loadDetectionEngine();
      const result = await engine.runRagLlmDetection(req.body);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/rag-llm", "RAG/LLM detection");
    }
  });

  // Batch analyze multiple claims
  app.post("/api/fwa/detection-engine/batch-analyze", async (req, res) => {
    try {
      const { claimIds } = req.body;
      if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
        return res.status(400).json({ message: "claimIds array required" });
      }
      
      const engine = await loadDetectionEngine();
      const results: any[] = [];
      
      for (const claimId of claimIds.slice(0, 10)) { // Limit to 10 claims per batch
        const dbClaim = await storage.getClaimById(claimId);
        if (dbClaim) {
          const claimData = {
            id: dbClaim.id,
            claimNumber: dbClaim.claimNumber,
            providerId: dbClaim.providerId || dbClaim.hospital,
            patientId: dbClaim.patientId,
            amount: parseFloat(dbClaim.amount as string) || 0,
            diagnosisCode: dbClaim.icd,  // Fixed: use icd field
            procedureCode: dbClaim.cptCodes?.[0] || null,  // Fixed: use cptCodes array
            serviceDate: dbClaim.serviceDate,
            description: dbClaim.description,
            claimType: dbClaim.claimType
          };
          const result = await engine.runFullDetection(claimData);
          await engine.saveDetectionResult(result);
          results.push(result);
        }
      }
      
      res.json({ 
        analyzed: results.length, 
        results,
        summary: {
          avgCompositeScore: results.reduce((sum, r) => sum + r.compositeScore, 0) / results.length,
          criticalCount: results.filter(r => r.compositeRiskLevel === 'critical').length,
          highCount: results.filter(r => r.compositeRiskLevel === 'high').length,
          mediumCount: results.filter(r => r.compositeRiskLevel === 'medium').length,
          lowCount: results.filter(r => r.compositeRiskLevel === 'low').length
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/batch-analyze", "batch analyze claims");
    }
  });

  // ============================================
  // REGULATORY OVERSIGHT ENDPOINTS
  // 5-Phase Analysis for CHI Regulatory Detection
  // ============================================

  // Run full regulatory oversight analysis on a claim
  app.post("/api/fwa/regulatory-oversight/analyze", async (req, res) => {
    try {
      const { claimId, claim } = req.body;
      
      let claimData = claim;
      if (claimId && !claim) {
        const claimResult = await db.select().from(claims)
          .where(eq(claims.id, claimId))
          .limit(1);
        
        if (claimResult.length === 0) {
          return res.status(404).json({ message: "Claim not found" });
        }
        claimData = claimResult[0];
      }
      
      if (!claimData) {
        return res.status(400).json({ message: "Either claimId or claim data required" });
      }
      
      const result = await runRegulatoryOversight(claimData);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/regulatory-oversight/analyze", "regulatory oversight analysis");
    }
  });

  // Batch analyze multiple claims for regulatory oversight
  app.post("/api/fwa/regulatory-oversight/batch-analyze", async (req, res) => {
    try {
      const { claimIds } = req.body;
      if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
        return res.status(400).json({ message: "claimIds array required" });
      }
      
      const results = await runRegulatoryOversightBatch(claimIds.slice(0, 20));
      
      const summary = {
        analyzed: results.length,
        criticalCount: results.filter(r => r.overallRiskLevel === 'CRITICAL').length,
        highCount: results.filter(r => r.overallRiskLevel === 'HIGH').length,
        mediumCount: results.filter(r => r.overallRiskLevel === 'MEDIUM').length,
        lowCount: results.filter(r => r.overallRiskLevel === 'LOW').length,
        avgScore: results.length > 0 
          ? results.reduce((sum, r) => sum + r.aggregatedScore, 0) / results.length 
          : 0,
        totalViolations: results.reduce((sum, r) => sum + r.regulatoryViolations.length, 0),
        totalClinicalConcerns: results.reduce((sum, r) => sum + r.clinicalConcerns.length, 0)
      };
      
      res.json({ results, summary });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/regulatory-oversight/batch-analyze", "batch regulatory oversight");
    }
  });

  // Get patient claim history patterns for behavioral analysis
  app.get("/api/fwa/regulatory-oversight/patient-history/:patientId", async (req, res) => {
    try {
      const { patientId } = req.params;
      const lookbackDays = parseInt(req.query.lookbackDays as string) || 90;
      
      const patterns = await getClaimHistoryPatterns(patientId, lookbackDays);
      
      const allPatterns = await Promise.all(
        [7, 14, 30, 90, 180].map(days => getClaimHistoryPatterns(patientId, days))
      );
      
      res.json({
        patientId,
        requestedPattern: patterns,
        allPatterns: allPatterns.reduce((acc, p) => {
          acc[`${p.lookbackDays}days`] = p;
          return acc;
        }, {} as Record<string, any>)
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/regulatory-oversight/patient-history", "get patient history patterns");
    }
  });

  // Get regulatory oversight summary dashboard data
  app.get("/api/fwa/regulatory-oversight/dashboard", async (req, res) => {
    try {
      const [
        highRiskProviders,
        highRiskPatients,
        highRiskDoctors,
        recentDetections,
        complaintStats
      ] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*)::int as count, 
                 COALESCE(AVG(CAST(risk_score AS DECIMAL)), 0) as avg_risk_score
          FROM fwa_high_risk_providers
          WHERE risk_level IN ('high', 'critical')
        `),
        db.execute(sql`
          SELECT COUNT(*)::int as count,
                 COALESCE(AVG(CAST(risk_score AS DECIMAL)), 0) as avg_risk_score
          FROM fwa_high_risk_patients
          WHERE risk_level IN ('high', 'critical')
        `),
        db.execute(sql`
          SELECT COUNT(*)::int as count,
                 COALESCE(AVG(CAST(risk_score AS DECIMAL)), 0) as avg_risk_score
          FROM fwa_high_risk_doctors
          WHERE risk_level IN ('high', 'critical')
        `),
        db.execute(sql`
          SELECT composite_risk_level, COUNT(*)::int as count
          FROM fwa_detection_results
          WHERE analyzed_at >= NOW() - INTERVAL '30 days'
          GROUP BY composite_risk_level
        `),
        db.execute(sql`
          SELECT severity, COUNT(*)::int as count
          FROM provider_complaints
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY severity
        `)
      ]);
      
      res.json({
        highRiskEntities: {
          providers: highRiskProviders.rows[0],
          patients: highRiskPatients.rows[0],
          doctors: highRiskDoctors.rows[0]
        },
        recentDetections: recentDetections.rows.reduce((acc, row) => {
          acc[row.composite_risk_level as string] = row.count;
          return acc;
        }, {} as Record<string, number>),
        complaintsBysSeverity: complaintStats.rows.reduce((acc, row) => {
          acc[row.severity as string] = row.count;
          return acc;
        }, {} as Record<string, number>),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/regulatory-oversight/dashboard", "get regulatory dashboard");
    }
  });

  // Get phase-specific analysis for a claim
  app.get("/api/fwa/regulatory-oversight/phases/:claimId", async (req, res) => {
    try {
      const { claimId } = req.params;
      const phaseId = req.query.phase ? parseInt(req.query.phase as string) : undefined;
      
      const claimResult = await db.select().from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);
      
      if (claimResult.length === 0) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      const result = await runRegulatoryOversight(claimResult[0]);
      
      if (phaseId !== undefined) {
        const phase = result.phases.find(p => p.phaseId === phaseId);
        if (!phase) {
          return res.status(404).json({ message: `Phase ${phaseId} not found` });
        }
        res.json({ phase, claimId });
      } else {
        res.json({
          claimId,
          phases: result.phases,
          aggregatedScore: result.aggregatedScore,
          overallRiskLevel: result.overallRiskLevel
        });
      }
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/regulatory-oversight/phases", "get phase analysis");
    }
  });

  // Parallel processing helper - process items with bounded concurrency
  async function processWithConcurrency<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ results: R[]; errors: Error[] }> {
    const results: R[] = [];
    const errors: Error[] = [];
    let completed = 0;
    let index = 0;

    const workers = Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
      while (index < items.length) {
        const currentIndex = index++;
        const item = items[currentIndex];
        try {
          const result = await processor(item);
          results[currentIndex] = result;
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
        completed++;
        if (onProgress) onProgress(completed, items.length);
      }
    });

    await Promise.all(workers);
    return { results: results.filter(r => r !== undefined), errors };
  }

  // Run detection analysis on all claims in a FWA batch - with PARALLEL processing
  app.post("/api/fwa/batches/:id/run-analysis", async (req, res) => {
    try {
      const batchId = req.params.id;
      const batch = await storage.getFwaBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      if (batch.status === "processing") {
        return res.status(400).json({ error: "Batch is already being processed" });
      }

      // Update batch status to processing
      await storage.updateFwaBatch(batchId, {
        status: "processing",
        startedAt: new Date(),
        processedClaims: 0,
        flaggedClaims: 0,
      });

      // Get ALL claims for this batch - use high limit to avoid default 50-claim limit
      const { claims: allClaims } = await storage.getClaims({ limit: 100000 });
      const batchPrefix = `CLM-${batchId.slice(0, 8)}`;
      const batchClaims = allClaims.filter(c => c.id.startsWith(batchPrefix));
      
      const totalClaims = batchClaims.length;
      console.log(`[Batch Analysis] Starting PARALLEL processing of ${totalClaims} claims for batch ${batchId}`);

      // Get fast mode from query params (skips RAG/LLM for speed)
      const fastMode = req.query.fast === "true" || totalClaims > 1000;
      
      // High concurrency: 20 workers for fast mode, 10 for full analysis
      const CONCURRENCY = fastMode ? 20 : 10;

      // Return 202 Accepted immediately - processing happens in background
      res.status(202).json({
        message: "Batch analysis started in background",
        batchId,
        totalClaims,
        mode: fastMode ? "fast (Rule + Statistical + Unsupervised)" : "full (all 4 methods)",
        concurrency: CONCURRENCY,
        estimatedTime: `${Math.ceil(totalClaims / CONCURRENCY * 0.5)} seconds`,
      });

      // Background processing with parallel execution
      const engine = await loadDetectionEngine();
      let processedCount = 0;
      let flaggedCount = 0;
      let lastProgressUpdate = Date.now();

      const processClaim = async (claim: typeof batchClaims[0]) => {
        const claimData = {
          id: claim.id,
          claimNumber: claim.claimNumber,
          providerId: claim.providerId,
          patientId: claim.patientId,
          amount: parseFloat(claim.amount as string),
          diagnosisCode: claim.icd,
          procedureCode: claim.cptCodes?.[0],
          serviceDate: claim.serviceDate,
          description: claim.description,
          claimType: claim.claimType
        };

        // Fast mode: skip RAG/LLM (slowest method) for large batches
        const result = fastMode 
          ? await engine.runFastDetection(claimData)
          : await engine.runFullDetection(claimData);

        if (result.compositeRiskLevel === "high" || result.compositeRiskLevel === "critical") {
          flaggedCount++;
          await storage.updateClaim(claim.id, { flagged: true, flagReason: result.detectionSummary });
        }

        return result;
      };

      const onProgress = async (completed: number, total: number) => {
        processedCount = completed;
        const now = Date.now();
        // Update progress every 2 seconds to avoid too many DB writes
        if (now - lastProgressUpdate > 2000 || completed === total) {
          lastProgressUpdate = now;
          const progress = ((completed / total) * 100).toFixed(2);
          await storage.updateFwaBatch(batchId, {
            processedClaims: completed,
            flaggedClaims: flaggedCount,
            progress,
          });
          console.log(`[Batch Analysis] Progress: ${completed}/${total} (${progress}%) - Flagged: ${flaggedCount}`);
        }
      };

      // Run parallel processing
      const { results, errors } = await processWithConcurrency(
        batchClaims,
        processClaim,
        CONCURRENCY,
        onProgress
      );

      // Mark batch as completed
      await storage.updateFwaBatch(batchId, {
        status: errors.length > 0 && results.length === 0 ? "failed" : "completed",
        completedAt: new Date(),
        processedClaims: results.length,
        flaggedClaims: flaggedCount,
        failedClaims: errors.length,
        progress: "100",
        errorMessage: errors.length > 0 ? `${errors.length} claims failed to process` : null,
      });

      console.log(`[Batch Analysis] Completed: ${results.length} processed, ${flaggedCount} flagged, ${errors.length} errors`);

    } catch (error) {
      console.error("[Batch Analysis] Fatal error:", error);
      try {
        await storage.updateFwaBatch(req.params.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (updateError) {
        console.error("Failed to update batch status:", updateError);
      }
      // Note: Response already sent, so we can only log the error
    }
  });

  // Get detection results for a claim
  app.get("/api/fwa/detection-engine/results/:claimId", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaDetectionResults } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      
      const results = await db.select().from(fwaDetectionResults)
        .where(eq(fwaDetectionResults.claimId, req.params.claimId))
        .orderBy(desc(fwaDetectionResults.analyzedAt))
        .limit(10);
      
      res.json(results);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-engine/results/:claimId", "get detection results");
    }
  });

  // =============================================================================
  // PRODUCTION DETECTION ENGINE ROUTES (Real Data)
  // =============================================================================

  // Import claims from Excel file
  app.post("/api/fwa/claims-import", async (req, res) => {
    try {
      const { importClaimsFromExcel, computeFeatureStore, getClaimStats } = await import("../services/claims-import-service");
      const path = await import("path");
      
      const filePath = path.resolve("attached_assets/AiReview_GlobeMed_Medical_QA_11082025_(3)_1768281486318.xlsx");
      const result = await importClaimsFromExcel(filePath, "AiReview_GlobeMed_Medical_QA_11082025.xlsx");
      
      // Compute feature store after import
      const features = await computeFeatureStore();
      const stats = await getClaimStats();
      
      res.json({
        success: true,
        import: result,
        features,
        stats
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/claims-import", "import claims");
    }
  });

  // Get claims import stats
  app.get("/api/fwa/claims-stats", async (req, res) => {
    try {
      const { getClaimStats } = await import("../services/claims-import-service");
      const stats = await getClaimStats();
      res.json(stats);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/claims-stats", "get claims stats");
    }
  });

  // Compute/refresh feature store
  app.post("/api/fwa/feature-store/compute", async (req, res) => {
    try {
      const { computeFeatureStore } = await import("../services/claims-import-service");
      const result = await computeFeatureStore();
      res.json({ success: true, ...result });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/feature-store/compute", "compute features");
    }
  });

  // Get feature store data
  app.get("/api/fwa/feature-store", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaFeatureStore } = await import("@shared/schema");
      const { eq, desc, sql } = await import("drizzle-orm");
      
      const entityType = req.query.entityType as string || "provider";
      const limit = parseInt(req.query.limit as string) || 50;
      
      const features = await db.select().from(fwaFeatureStore)
        .where(eq(fwaFeatureStore.entityType, entityType))
        .orderBy(desc(sql`abs(${fwaFeatureStore.zScore})`))
        .limit(limit);
      
      res.json(features);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/feature-store", "get features");
    }
  });

  // Seed FWA rules library
  app.post("/api/fwa/rules-library/seed", async (req, res) => {
    try {
      const { seedFwaRulesLibrary } = await import("../services/seed-fwa-rules");
      const count = await seedFwaRulesLibrary();
      res.json({ success: true, rulesSeeded: count });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/seed", "seed rules");
    }
  });

  // Force reseed FWA rules library (clears existing and reseeds all)
  app.post("/api/fwa/rules-library/reseed", async (req, res) => {
    try {
      const { reseedFwaRulesLibrary } = await import("../services/seed-fwa-rules");
      const count = await reseedFwaRulesLibrary();
      res.json({ success: true, rulesReseeded: count, message: `Cleared and reseeded ${count} FWA detection rules` });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/reseed", "reseed rules");
    }
  });

  // Get rules library
  app.get("/api/fwa/rules-library", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      
      const activeOnly = req.query.active === "true";
      let query = db.select().from(fwaRulesLibrary);
      if (activeOnly) {
        query = query.where(eq(fwaRulesLibrary.isActive, true)) as any;
      }
      
      const rules = await query.orderBy(desc(fwaRulesLibrary.severity));
      res.json(rules);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library", "get rules");
    }
  });

  // Create new rule
  app.post("/api/fwa/rules-library", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary, insertFwaRulesLibrarySchema } = await import("@shared/schema");
      
      const parsed = insertFwaRulesLibrarySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      
      const [newRule] = await db.insert(fwaRulesLibrary).values({
        ...parsed.data,
        conditions: parsed.data.conditions || {},
      }).returning();
      
      res.status(201).json(newRule);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library", "create rule");
    }
  });

  // Toggle rule active status
  app.patch("/api/fwa/rules-library/:id/toggle", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const ruleId = req.params.id;
      if (!ruleId) {
        return res.status(400).json({ error: "Rule ID is required" });
      }
      
      // Get current rule
      const [currentRule] = await db.select().from(fwaRulesLibrary).where(eq(fwaRulesLibrary.id, ruleId));
      if (!currentRule) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      // Toggle isActive
      const [updatedRule] = await db.update(fwaRulesLibrary)
        .set({ isActive: !currentRule.isActive })
        .where(eq(fwaRulesLibrary.id, ruleId))
        .returning();
      
      res.json(updatedRule);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/:id/toggle", "toggle rule");
    }
  });

  // Bulk update rule active status
  app.patch("/api/fwa/rules-library/bulk-toggle", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary } = await import("@shared/schema");
      const { inArray } = await import("drizzle-orm");
      
      const { ruleIds, isActive } = req.body;
      if (!Array.isArray(ruleIds) || typeof isActive !== "boolean") {
        return res.status(400).json({ error: "ruleIds array and isActive boolean required" });
      }
      
      await db.update(fwaRulesLibrary)
        .set({ isActive })
        .where(inArray(fwaRulesLibrary.id, ruleIds));
      
      res.json({ success: true, updated: ruleIds.length, isActive });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/bulk-toggle", "bulk toggle rules");
    }
  });

  // Get canonical field registry for rules
  app.get("/api/fwa/rules-library/field-registry", async (_req, res) => {
    try {
      const { ruleFieldRegistry } = await import("../services/rule-field-registry");
      const registry = ruleFieldRegistry.getRegistryForAPI();
      res.json(registry);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/field-registry", "get field registry");
    }
  });

  // Validate rule conditions against field registry
  app.post("/api/fwa/rules-library/validate", async (req, res) => {
    try {
      const { validateRuleConditions } = await import("../services/rule-field-registry");
      const { conditions } = req.body;
      
      if (!conditions) {
        return res.status(400).json({ error: "conditions object required" });
      }
      
      const validation = validateRuleConditions(conditions);
      res.json(validation);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/validate", "validate conditions");
    }
  });

  // Bulk update field names across rules
  app.patch("/api/fwa/rules-library/bulk-update-field", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary } = await import("@shared/schema");
      const { ruleFieldRegistry, validateRuleConditions } = await import("../services/rule-field-registry");
      
      const { oldField, newField, ruleIds, categoryFilter } = req.body;
      
      if (!oldField || !newField) {
        return res.status(400).json({ error: "oldField and newField are required" });
      }
      
      // Validate new field exists in registry
      if (!ruleFieldRegistry.isValidField(newField)) {
        return res.status(400).json({ 
          error: `Invalid field: "${newField}" not found in canonical registry`,
          suggestion: ruleFieldRegistry.resolveField(newField) || "Check field registry for valid names"
        });
      }
      
      // Resolve to canonical name
      const canonicalNew = ruleFieldRegistry.resolveField(newField) || newField;
      
      // Build query conditions
      let rules = await db.select().from(fwaRulesLibrary);
      
      // Filter by IDs if provided
      if (Array.isArray(ruleIds) && ruleIds.length > 0) {
        rules = rules.filter(r => ruleIds.includes(r.id));
      }
      
      // Filter by category if provided
      if (categoryFilter) {
        rules = rules.filter(r => r.category === categoryFilter);
      }
      
      // Update field names in conditions
      let updateCount = 0;
      const updatedRules: any[] = [];
      
      const { eq } = await import("drizzle-orm");
      
      for (const rule of rules) {
        const conditions = rule.conditions as any;
        let modified = false;
        
        const updateConditions = (cond: any): any => {
          if (!cond) return cond;
          
          if (cond.and) {
            return { and: cond.and.map(updateConditions) };
          }
          if (cond.or) {
            return { or: cond.or.map(updateConditions) };
          }
          
          if (cond.field === oldField) {
            modified = true;
            updateCount++;
            return { ...cond, field: canonicalNew };
          }
          return cond;
        };
        
        const newConditions = updateConditions(conditions);
        
        if (modified) {
          await db.update(fwaRulesLibrary)
            .set({ conditions: newConditions })
            .where(eq(fwaRulesLibrary.id, rule.id));
          
          updatedRules.push({
            id: rule.id,
            ruleCode: rule.ruleCode,
            name: rule.name
          });
        }
      }
      
      res.json({
        success: true,
        oldField,
        newField: canonicalNew,
        rulesUpdated: updatedRules.length,
        conditionsUpdated: updateCount,
        updatedRules
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/bulk-update-field", "bulk update field");
    }
  });

  // Bulk update values across rules
  app.patch("/api/fwa/rules-library/bulk-update-value", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const { field, oldValue, newValue, operator, ruleIds, categoryFilter } = req.body;
      
      if (field === undefined || newValue === undefined) {
        return res.status(400).json({ error: "field and newValue are required" });
      }
      
      // Build query conditions
      let rules = await db.select().from(fwaRulesLibrary);
      
      // Filter by IDs if provided
      if (Array.isArray(ruleIds) && ruleIds.length > 0) {
        rules = rules.filter(r => ruleIds.includes(r.id));
      }
      
      // Filter by category if provided
      if (categoryFilter) {
        rules = rules.filter(r => r.category === categoryFilter);
      }
      
      let updateCount = 0;
      const updatedRules: any[] = [];
      
      for (const rule of rules) {
        const conditions = rule.conditions as any;
        let modified = false;
        
        const updateConditions = (cond: any): any => {
          if (!cond) return cond;
          
          if (cond.and) {
            return { and: cond.and.map(updateConditions) };
          }
          if (cond.or) {
            return { or: cond.or.map(updateConditions) };
          }
          
          // Match field and optionally old value
          if (cond.field === field) {
            const matchesValue = oldValue === undefined || cond.value === oldValue;
            const matchesOperator = !operator || cond.operator === operator;
            
            if (matchesValue && matchesOperator) {
              modified = true;
              updateCount++;
              return { ...cond, value: newValue };
            }
          }
          return cond;
        };
        
        const newConditions = updateConditions(conditions);
        
        if (modified) {
          await db.update(fwaRulesLibrary)
            .set({ conditions: newConditions })
            .where(eq(fwaRulesLibrary.id, rule.id));
          
          updatedRules.push({
            id: rule.id,
            ruleCode: rule.ruleCode,
            name: rule.name
          });
        }
      }
      
      res.json({
        success: true,
        field,
        oldValue,
        newValue,
        rulesUpdated: updatedRules.length,
        conditionsUpdated: updateCount,
        updatedRules
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/bulk-update-value", "bulk update value");
    }
  });

  // Bulk update operators across rules
  app.patch("/api/fwa/rules-library/bulk-update-operator", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const { VALID_OPERATORS } = await import("../services/rule-field-registry");
      
      const { field, oldOperator, newOperator, ruleIds, categoryFilter } = req.body;
      
      if (!field || !newOperator) {
        return res.status(400).json({ error: "field and newOperator are required" });
      }
      
      // Validate new operator
      if (!VALID_OPERATORS.includes(newOperator)) {
        return res.status(400).json({ 
          error: `Invalid operator: "${newOperator}"`,
          validOperators: VALID_OPERATORS
        });
      }
      
      let rules = await db.select().from(fwaRulesLibrary);
      
      if (Array.isArray(ruleIds) && ruleIds.length > 0) {
        rules = rules.filter(r => ruleIds.includes(r.id));
      }
      
      if (categoryFilter) {
        rules = rules.filter(r => r.category === categoryFilter);
      }
      
      let updateCount = 0;
      const updatedRules: any[] = [];
      
      for (const rule of rules) {
        const conditions = rule.conditions as any;
        let modified = false;
        
        const updateConditions = (cond: any): any => {
          if (!cond) return cond;
          
          if (cond.and) {
            return { and: cond.and.map(updateConditions) };
          }
          if (cond.or) {
            return { or: cond.or.map(updateConditions) };
          }
          
          if (cond.field === field) {
            const matchesOperator = !oldOperator || cond.operator === oldOperator;
            
            if (matchesOperator) {
              modified = true;
              updateCount++;
              return { ...cond, operator: newOperator };
            }
          }
          return cond;
        };
        
        const newConditions = updateConditions(conditions);
        
        if (modified) {
          await db.update(fwaRulesLibrary)
            .set({ conditions: newConditions })
            .where(eq(fwaRulesLibrary.id, rule.id));
          
          updatedRules.push({
            id: rule.id,
            ruleCode: rule.ruleCode,
            name: rule.name
          });
        }
      }
      
      res.json({
        success: true,
        field,
        oldOperator,
        newOperator,
        rulesUpdated: updatedRules.length,
        conditionsUpdated: updateCount,
        updatedRules
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/bulk-update-operator", "bulk update operator");
    }
  });

  // Get field usage statistics across all rules
  app.get("/api/fwa/rules-library/field-stats", async (_req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaRulesLibrary } = await import("@shared/schema");
      const { ruleFieldRegistry } = await import("../services/rule-field-registry");
      
      const rules = await db.select().from(fwaRulesLibrary);
      
      const fieldUsage: Record<string, { count: number; rules: string[] }> = {};
      const operatorUsage: Record<string, number> = {};
      const invalidFields: { field: string; ruleCode: string }[] = [];
      
      const analyzeConditions = (cond: any, ruleCode: string): void => {
        if (!cond) return;
        
        if (cond.and) {
          cond.and.forEach((c: any) => analyzeConditions(c, ruleCode));
          return;
        }
        if (cond.or) {
          cond.or.forEach((c: any) => analyzeConditions(c, ruleCode));
          return;
        }
        
        if (cond.field) {
          if (!fieldUsage[cond.field]) {
            fieldUsage[cond.field] = { count: 0, rules: [] };
          }
          fieldUsage[cond.field].count++;
          if (!fieldUsage[cond.field].rules.includes(ruleCode)) {
            fieldUsage[cond.field].rules.push(ruleCode);
          }
          
          // Check if field is valid
          if (!ruleFieldRegistry.isValidField(cond.field)) {
            invalidFields.push({ field: cond.field, ruleCode });
          }
        }
        
        if (cond.operator) {
          operatorUsage[cond.operator] = (operatorUsage[cond.operator] || 0) + 1;
        }
      }
      
      for (const rule of rules) {
        analyzeConditions(rule.conditions, rule.ruleCode);
      }
      
      // Sort fields by usage
      const sortedFields = Object.entries(fieldUsage)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([field, data]) => ({
          field,
          count: data.count,
          rulesCount: data.rules.length,
          isValid: ruleFieldRegistry.isValidField(field),
          canonical: ruleFieldRegistry.resolveField(field)
        }));
      
      res.json({
        totalRules: rules.length,
        uniqueFields: Object.keys(fieldUsage).length,
        fieldUsage: sortedFields,
        operatorUsage,
        invalidFields,
        validationSummary: {
          fieldsValid: sortedFields.filter(f => f.isValid).length,
          fieldsInvalid: sortedFields.filter(f => !f.isValid).length,
          rulesWithInvalidFields: Array.from(new Set(invalidFields.map(f => f.ruleCode))).length
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules-library/field-stats", "get field stats");
    }
  });

  // ============================================================
  // RULE SANDBOX - Test rules against sample claims
  // ============================================================
  
  const ruleSandboxSchema = z.object({
    ruleId: z.string().optional(),
    rule: z.object({
      ruleCode: z.string(),
      name: z.string(),
      conditions: z.any(),
      severity: z.string().optional(),
      category: z.string().optional(),
    }).optional(),
    sampleSize: z.number().int().min(10).max(500).default(100),
    filters: z.object({
      claimType: z.string().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional(),
  }).refine(
    data => data.ruleId || data.rule,
    { message: "Either ruleId or rule definition is required" }
  );

  app.post("/api/fwa/rules/sandbox", async (req, res) => {
    try {
      const validated = ruleSandboxSchema.parse(req.body);
      const { ruleId, rule: customRule, sampleSize, filters } = validated;
      
      const { db } = await import("../db");
      const { fwaRulesLibrary, claims } = await import("@shared/schema");
      const { eq, desc, and, gte, lte, sql } = await import("drizzle-orm");
      
      // Get the rule to test
      let ruleToTest: any = customRule;
      if (ruleId) {
        const [foundRule] = await db.select().from(fwaRulesLibrary).where(eq(fwaRulesLibrary.id, ruleId));
        if (!foundRule) {
          return res.status(404).json({ error: "Rule not found" });
        }
        ruleToTest = foundRule;
      }
      
      if (!ruleToTest || !ruleToTest.conditions) {
        return res.status(400).json({ error: "Rule must have conditions defined" });
      }
      
      // Build query for sample claims with filters
      let query = db.select().from(claims);
      const whereConditions: any[] = [];
      
      if (filters?.claimType) {
        whereConditions.push(eq(claims.claimType, filters.claimType));
      }
      // Use SQL cast for proper numeric comparison since amount is stored as string
      if (filters?.minAmount) {
        whereConditions.push(sql`CAST(${claims.amount} AS NUMERIC) >= ${filters.minAmount}`);
      }
      if (filters?.maxAmount) {
        whereConditions.push(sql`CAST(${claims.amount} AS NUMERIC) <= ${filters.maxAmount}`);
      }
      
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions)) as any;
      }
      
      // Get sample claims (use registrationDate instead of createdAt)
      const sampleClaims = await query
        .orderBy(desc(claims.registrationDate))
        .limit(sampleSize);
      
      // Helper function to evaluate conditions
      const evaluateCondition = (value: any, operator: string, expected: any): boolean => {
        if (operator === "not_null") {
          return value !== null && value !== undefined && value !== "";
        }
        if (value === null || value === undefined) return false;
        
        switch (operator) {
          case "equals": return String(value).toLowerCase() === String(expected).toLowerCase();
          case "not_equals": return String(value).toLowerCase() !== String(expected).toLowerCase();
          case "greater_than": return Number(value) > Number(expected);
          case "less_than": return Number(value) < Number(expected);
          case "greater_than_or_equals": 
          case "greater_equal": return Number(value) >= Number(expected);
          case "less_than_or_equals": 
          case "less_equal": return Number(value) <= Number(expected);
          case "contains": return String(value).toLowerCase().includes(String(expected).toLowerCase());
          case "not_contains": return !String(value).toLowerCase().includes(String(expected).toLowerCase());
          case "starts_with": 
            if (Array.isArray(expected)) {
              return expected.some(v => String(value).toLowerCase().startsWith(String(v).toLowerCase()));
            }
            return String(value).toLowerCase().startsWith(String(expected).toLowerCase());
          case "in": 
            return Array.isArray(expected) && expected.some(v => 
              String(value).toLowerCase() === String(v).toLowerCase()
            );
          case "not_in": 
            return Array.isArray(expected) && !expected.some(v => 
              String(value).toLowerCase() === String(v).toLowerCase()
            );
          case "between": 
            return Array.isArray(expected) && expected.length === 2 && 
              Number(value) >= expected[0] && Number(value) <= expected[1];
          default: return false;
        }
      };
      
      // Get claim field value
      const getFieldValue = (claim: any, field: string): any => {
        const fieldMap: Record<string, string> = {
          "totalAmount": "amount",
          "claimAmount": "amount",
          "procedureCode": "principalDiagnosisCode",
          "diagnosisCode": "principalDiagnosisCode",
          "icd": "principalDiagnosisCode",
          "provider": "providerId",
          "patient": "patientId",
          "member": "patientId",
          "type": "claimType",
        };
        const normalizedField = fieldMap[field] || field;
        return claim[normalizedField];
      };
      
      // Recursive rule condition evaluator supporting nested AND/OR structures
      const evaluateRuleConditions = (claim: any, conditions: any): { matched: boolean; matchedFields: Record<string, any>; reason: string } => {
        const matchedFields: Record<string, any> = {};
        const reasons: string[] = [];
        
        // Recursive helper for nested conditions
        const evaluateNode = (node: any): boolean => {
          // Simple condition (leaf node)
          if (node.field && node.operator) {
            const value = getFieldValue(claim, node.field);
            const matched = evaluateCondition(value, node.operator, node.value);
            if (matched) {
              matchedFields[node.field] = value;
              reasons.push(`${node.field} ${node.operator} ${node.value} (actual: ${value})`);
            }
            return matched;
          }
          
          // AND conditions (all must match) - supports nested conditions
          if (node.and && Array.isArray(node.and)) {
            return node.and.every((subNode: any) => evaluateNode(subNode));
          }
          
          // OR conditions (any must match) - supports nested conditions
          if (node.or && Array.isArray(node.or)) {
            return node.or.some((subNode: any) => evaluateNode(subNode));
          }
          
          return false;
        };
        
        const matched = evaluateNode(conditions);
        return { matched, matchedFields, reason: reasons.join("; ") || "Rule conditions evaluated" };
      };
      
      // Run rule against all sample claims
      const hits: any[] = [];
      const misses: any[] = [];
      
      for (const claim of sampleClaims) {
        const result = evaluateRuleConditions(claim, ruleToTest.conditions);
        if (result.matched) {
          hits.push({
            claimId: claim.id,
            claimNumber: claim.claimNumber,
            patientId: claim.patientId,
            providerId: claim.providerId,
            providerName: claim.providerName,
            amount: claim.amount,
            claimType: claim.claimType,
            serviceDate: claim.serviceDate,
            matchedFields: result.matchedFields,
            reason: result.reason,
          });
        } else {
          misses.push({
            claimId: claim.id,
            claimNumber: claim.claimNumber,
            amount: claim.amount,
          });
        }
      }
      
      // Calculate impact metrics
      const hitRate = sampleClaims.length > 0 ? (hits.length / sampleClaims.length) * 100 : 0;
      const totalExposure = hits.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
      
      res.json({
        rule: {
          id: ruleId || "custom",
          ruleCode: ruleToTest.ruleCode,
          name: ruleToTest.name,
          severity: ruleToTest.severity,
          category: ruleToTest.category,
        },
        summary: {
          totalSampleClaims: sampleClaims.length,
          flaggedClaims: hits.length,
          passedClaims: misses.length,
          hitRate: Math.round(hitRate * 10) / 10,
          totalExposure: Math.round(totalExposure * 100) / 100,
        },
        hits,
        sampleFilters: filters || {},
      });
      
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules/sandbox", "run rule sandbox");
    }
  });

  // Search analyzed claims
  app.get("/api/fwa/analyzed-claims/search", async (req, res) => {
    try {
      const { searchClaimsForAnalysis } = await import("../services/production-detection-engine");
      const query = req.query.q as string || "";
      const limit = parseInt(req.query.limit as string) || 20;
      
      const claims = await searchClaimsForAnalysis(query, limit);
      res.json(claims);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/analyzed-claims/search", "search claims");
    }
  });

  // Get single analyzed claim
  app.get("/api/fwa/analyzed-claims/:id", async (req, res) => {
    try {
      const { getClaimForAnalysis } = await import("../services/production-detection-engine");
      const claim = await getClaimForAnalysis(req.params.id);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/analyzed-claims/:id", "get claim");
    }
  });

  // Get detection result for a specific claim
  app.get("/api/fwa/detection-results/:claimId", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // First try direct claim_id lookup
      let result = await db.execute(sql`
        SELECT 
          claim_id,
          composite_score::numeric as composite_score,
          composite_risk_level,
          rule_engine_score::numeric as rule_engine_score,
          statistical_score::numeric as statistical_score,
          unsupervised_score::numeric as unsupervised_score,
          rag_llm_score::numeric as rag_llm_score,
          semantic_score::numeric as semantic_score,
          rule_engine_findings,
          statistical_findings,
          unsupervised_findings,
          rag_llm_findings,
          semantic_evidence,
          analyzed_at
        FROM fwa_detection_results
        WHERE claim_id = ${req.params.claimId}
        ORDER BY analyzed_at DESC
        LIMIT 1
      `);
      
      // If not found, try looking up via claim_reference (aggregated claim-level view)
      if (result.rows.length === 0) {
        const claimRef = await db.execute(sql`
          SELECT claim_reference FROM fwa_analyzed_claims WHERE id = ${req.params.claimId} LIMIT 1
        `);
        
        if (claimRef.rows.length > 0) {
          const reference = (claimRef.rows[0] as any).claim_reference;
          // Get aggregated detection results for all service lines under this claim
          result = await db.execute(sql`
            SELECT 
              ${req.params.claimId} as claim_id,
              MAX(dr.composite_score::numeric) as composite_score,
              MAX(dr.composite_risk_level) as composite_risk_level,
              MAX(dr.rule_engine_score::numeric) as rule_engine_score,
              MAX(dr.statistical_score::numeric) as statistical_score,
              MAX(dr.unsupervised_score::numeric) as unsupervised_score,
              MAX(dr.rag_llm_score::numeric) as rag_llm_score,
              MAX(dr.semantic_score::numeric) as semantic_score,
              (SELECT rule_engine_findings FROM fwa_detection_results dr2 
               JOIN fwa_analyzed_claims ac2 ON dr2.claim_id = ac2.id 
               WHERE ac2.claim_reference = ${reference}
               ORDER BY dr2.composite_score::numeric DESC LIMIT 1) as rule_engine_findings,
              (SELECT statistical_findings FROM fwa_detection_results dr2 
               JOIN fwa_analyzed_claims ac2 ON dr2.claim_id = ac2.id 
               WHERE ac2.claim_reference = ${reference}
               ORDER BY dr2.composite_score::numeric DESC LIMIT 1) as statistical_findings,
              (SELECT unsupervised_findings FROM fwa_detection_results dr2 
               JOIN fwa_analyzed_claims ac2 ON dr2.claim_id = ac2.id 
               WHERE ac2.claim_reference = ${reference}
               ORDER BY dr2.composite_score::numeric DESC LIMIT 1) as unsupervised_findings,
              (SELECT rag_llm_findings FROM fwa_detection_results dr2 
               JOIN fwa_analyzed_claims ac2 ON dr2.claim_id = ac2.id 
               WHERE ac2.claim_reference = ${reference}
               ORDER BY dr2.composite_score::numeric DESC LIMIT 1) as rag_llm_findings,
              (SELECT semantic_evidence FROM fwa_detection_results dr2 
               JOIN fwa_analyzed_claims ac2 ON dr2.claim_id = ac2.id 
               WHERE ac2.claim_reference = ${reference}
               ORDER BY dr2.composite_score::numeric DESC LIMIT 1) as semantic_evidence,
              MAX(dr.analyzed_at) as analyzed_at
            FROM fwa_detection_results dr
            JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.id
            WHERE ac.claim_reference = ${reference}
          `);
        }
      }
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Detection result not found" });
      }
      
      const row: any = result.rows[0];
      res.json({
        claimId: row.claim_id,
        compositeScore: parseFloat(row.composite_score) || 0,
        compositeRiskLevel: row.composite_risk_level,
        ruleEngineScore: parseFloat(row.rule_engine_score) || 0,
        statisticalScore: parseFloat(row.statistical_score) || 0,
        unsupervisedScore: parseFloat(row.unsupervised_score) || 0,
        ragLlmScore: parseFloat(row.rag_llm_score) || 0,
        semanticScore: parseFloat(row.semantic_score) || 0,
        ruleEngineFindings: row.rule_engine_findings || [],
        statisticalFindings: row.statistical_findings || {},
        unsupervisedFindings: row.unsupervised_findings || {},
        ragLlmFindings: row.rag_llm_findings || {},
        semanticEvidence: row.semantic_evidence || null,
        analyzedAt: row.analyzed_at
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-results/:claimId", "get detection result");
    }
  });

  // Production detection - analyze single claim
  app.post("/api/fwa/production-detection/analyze", async (req, res) => {
    try {
      const { runProductionDetection, getClaimForAnalysis } = await import("../services/production-detection-engine");
      
      const { claimId, skipRagLlm = false, weights } = req.body;
      
      if (!claimId) {
        return res.status(400).json({ message: "claimId is required" });
      }
      
      const claim = await getClaimForAnalysis(claimId);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      const result = await runProductionDetection(claim, weights, skipRagLlm);
      
      // Save result to database
      const { db } = await import("../db");
      const { fwaDetectionResults } = await import("@shared/schema");
      
      await db.insert(fwaDetectionResults).values({
        claimId: result.claimId,
        providerId: claim.providerId,
        patientId: claim.patientId,
        compositeScore: String(result.compositeScore),
        compositeRiskLevel: result.compositeRiskLevel as any,
        ruleEngineScore: String(result.ruleEngineScore),
        statisticalScore: String(result.statisticalScore),
        unsupervisedScore: String(result.unsupervisedScore),
        ragLlmScore: String(result.ragLlmScore),
        ruleEngineFindings: result.ruleEngineFindings as any,
        statisticalFindings: result.statisticalFindings as any,
        unsupervisedFindings: result.unsupervisedFindings as any,
        ragLlmFindings: result.ragLlmFindings as any,
        primaryDetectionMethod: result.primaryDetectionMethod as any,
        detectionSummary: result.detectionSummary,
        recommendedAction: result.recommendedAction,
        processingTimeMs: result.processingTimeMs
      });
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/production-detection/analyze", "production detection");
    }
  });

  // Production detection - batch analyze
  app.post("/api/fwa/production-detection/batch-analyze", async (req, res) => {
    try {
      const { runProductionDetection, getClaimForAnalysis } = await import("../services/production-detection-engine");
      const { db } = await import("../db");
      const { fwaAnalyzedClaims, fwaDetectionRuns, fwaDetectionResults } = await import("@shared/schema");
      const { sql, desc } = await import("drizzle-orm");
      
      const { limit = 10, skipRagLlm = true, weights } = req.body;
      
      // Create detection run record
      const [run] = await db.insert(fwaDetectionRuns).values({
        runName: `Batch Analysis ${new Date().toISOString()}`,
        runType: "batch",
        status: "running",
        startedAt: new Date()
      }).returning();
      
      // Get random sample of claims
      const claims = await db.select().from(fwaAnalyzedClaims)
        .orderBy(sql`RANDOM()`)
        .limit(Math.min(limit, 50));
      
      const results: any[] = [];
      let flagged = 0;
      let highRisk = 0;
      let critical = 0;
      
      for (const dbClaim of claims) {
        try {
          const claim = {
            id: dbClaim.id,
            claimReference: dbClaim.claimReference,
            providerId: dbClaim.providerId,
            patientId: dbClaim.patientId,
            practitionerLicense: dbClaim.practitionerLicense,
            specialtyCode: dbClaim.specialtyCode,
            city: dbClaim.city,
            providerType: dbClaim.providerType,
            unitPrice: dbClaim.unitPrice ? parseFloat(dbClaim.unitPrice) : null,
            totalAmount: dbClaim.totalAmount ? parseFloat(dbClaim.totalAmount) : null,
            quantity: dbClaim.quantity,
            principalDiagnosisCode: dbClaim.principalDiagnosisCode,
            serviceCode: dbClaim.serviceCode,
            serviceDescription: dbClaim.serviceDescription,
            claimType: dbClaim.claimType,
            lengthOfStay: dbClaim.lengthOfStay,
            originalStatus: dbClaim.originalStatus,
            isPreAuthorized: dbClaim.isPreAuthorized || false
          };
          
          const result = await runProductionDetection(claim, weights, skipRagLlm);
          results.push(result);
          
          if (result.compositeScore >= 40) flagged++;
          if (result.compositeRiskLevel === "high") highRisk++;
          if (result.compositeRiskLevel === "critical") critical++;
          
          // Save result
          await db.insert(fwaDetectionResults).values({
            claimId: result.claimId,
            caseId: run.id,
            providerId: claim.providerId,
            patientId: claim.patientId,
            compositeScore: String(result.compositeScore),
            compositeRiskLevel: result.compositeRiskLevel as any,
            ruleEngineScore: String(result.ruleEngineScore),
            statisticalScore: String(result.statisticalScore),
            unsupervisedScore: String(result.unsupervisedScore),
            ragLlmScore: String(result.ragLlmScore),
            ruleEngineFindings: result.ruleEngineFindings as any,
            statisticalFindings: result.statisticalFindings as any,
            unsupervisedFindings: result.unsupervisedFindings as any,
            ragLlmFindings: result.ragLlmFindings as any,
            primaryDetectionMethod: result.primaryDetectionMethod as any,
            detectionSummary: result.detectionSummary,
            recommendedAction: result.recommendedAction,
            processingTimeMs: result.processingTimeMs
          });
        } catch (e) {
          console.error("Error analyzing claim:", e);
        }
      }
      
      // Update run record
      const avgScore = results.length > 0 
        ? results.reduce((sum, r) => sum + r.compositeScore, 0) / results.length 
        : 0;
      
      await db.execute(sql`
        UPDATE fwa_detection_runs 
        SET status = 'completed',
            completed_at = NOW(),
            total_claims = ${results.length},
            processed_claims = ${results.length},
            flagged_claims = ${flagged},
            high_risk_count = ${highRisk},
            critical_risk_count = ${critical},
            avg_composite_score = ${avgScore},
            processing_time_ms = ${Date.now() - run.startedAt!.getTime()}
        WHERE id = ${run.id}
      `);
      
      res.json({
        runId: run.id,
        analyzed: results.length,
        summary: {
          avgCompositeScore: avgScore,
          flaggedCount: flagged,
          criticalCount: critical,
          highCount: highRisk,
          mediumCount: results.filter(r => r.compositeRiskLevel === 'medium').length,
          lowCount: results.filter(r => r.compositeRiskLevel === 'low').length
        },
        results
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/production-detection/batch-analyze", "batch detection");
    }
  });

  // Get detection runs
  app.get("/api/fwa/detection-runs", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { fwaDetectionRuns } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      
      const runs = await db.select().from(fwaDetectionRuns)
        .orderBy(desc(fwaDetectionRuns.createdAt))
        .limit(20);
      
      res.json(runs);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/detection-runs", "get detection runs");
    }
  });

  // POST /api/fwa/cases/from-detection - Create FWA case from detection result
  app.post("/api/fwa/cases/from-detection", async (req, res) => {
    try {
      const { detectionResultId, assignedTo } = req.body;
      
      if (!detectionResultId) {
        return res.status(400).json({ error: "detectionResultId is required" });
      }
      
      const { db } = await import("../db");
      const { fwaDetectionResults, fwaAnalyzedClaims, fwaCases } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      // Get detection result
      const [detection] = await db.select().from(fwaDetectionResults)
        .where(eq(fwaDetectionResults.id, detectionResultId))
        .limit(1);
      
      if (!detection) {
        return res.status(404).json({ error: "Detection result not found" });
      }
      
      // Get claim details
      const [claim] = await db.select().from(fwaAnalyzedClaims)
        .where(eq(fwaAnalyzedClaims.id, detection.claimId))
        .limit(1);
      
      // Create FWA case
      const caseData = {
        caseNumber: `FWA-${Date.now().toString(36).toUpperCase()}`,
        claimId: detection.claimId,
        providerId: detection.providerId || claim?.providerId || null,
        patientId: detection.patientId || claim?.patientId || null,
        status: "draft" as const,
        priority: detection.compositeRiskLevel === "critical" ? "critical" as const : 
                  detection.compositeRiskLevel === "high" ? "high" as const : "medium" as const,
        riskScore: detection.compositeScore,
        assignedTo: assignedTo || null,
        summary: detection.detectionSummary || `FWA case created from automated detection with score ${detection.compositeScore}`,
        findings: {
          compositeScore: detection.compositeScore,
          riskLevel: detection.compositeRiskLevel,
          primaryMethod: detection.primaryDetectionMethod,
          ruleEngineScore: detection.ruleEngineScore,
          statisticalScore: detection.statisticalScore,
          unsupervisedScore: detection.unsupervisedScore,
          ragLlmScore: detection.ragLlmScore,
          ruleEngineFindings: detection.ruleEngineFindings,
          statisticalFindings: detection.statisticalFindings,
          unsupervisedFindings: detection.unsupervisedFindings,
          ragLlmFindings: detection.ragLlmFindings
        } as any,
        flagType: detection.primaryDetectionMethod || "multi-method",
        claimAmount: String(claim?.totalAmount || 0),
        estimatedRecovery: null,
        actualRecovery: null,
        sourceType: "automated_detection" as const,
        sourceReference: detection.id,
      };
      
      const newCase = await storage.createFwaCase(caseData);
      
      res.status(201).json(newCase);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/from-detection", "create case from detection");
    }
  });

  // POST /api/fwa/cases/bulk-from-detection - Create multiple FWA cases from detection results
  app.post("/api/fwa/cases/bulk-from-detection", async (req, res) => {
    try {
      const { minScore = 40, limit = 20 } = req.body;
      
      const { db } = await import("../db");
      const { fwaDetectionResults, fwaAnalyzedClaims, fwaCases } = await import("@shared/schema");
      const { sql, desc, gte, notInArray } = await import("drizzle-orm");
      
      // Get existing case claim IDs
      const existingCases = await db.select({ claimId: fwaCases.claimId }).from(fwaCases);
      const existingClaimIds = existingCases.map(c => c.claimId).filter(Boolean) as string[];
      
      // Get high-scoring detection results that don't already have cases
      const detections = await db.execute(sql`
        SELECT 
          dr.id,
          dr.claim_id,
          dr.provider_id,
          dr.patient_id,
          dr.composite_score,
          dr.composite_risk_level,
          dr.primary_detection_method,
          dr.detection_summary
        FROM fwa_detection_results dr
        WHERE CAST(dr.composite_score AS decimal) >= ${minScore}
        ${existingClaimIds.length > 0 ? sql`AND dr.claim_id NOT IN (${sql.join(existingClaimIds.map(id => sql`${id}`), sql`, `)})` : sql``}
        ORDER BY CAST(dr.composite_score AS decimal) DESC
        LIMIT ${limit}
      `);
      
      const casesCreated: any[] = [];
      
      for (const detection of detections.rows as any[]) {
        const caseData = {
          caseNumber: `FWA-${Date.now().toString(36).toUpperCase()}-${casesCreated.length}`,
          claimId: detection.claim_id,
          providerId: detection.provider_id,
          patientId: detection.patient_id,
          status: "draft" as const,
          priority: detection.composite_risk_level === "critical" ? "critical" as const : 
                    detection.composite_risk_level === "high" ? "high" as const : "medium" as const,
          riskScore: detection.composite_score,
          summary: detection.detection_summary || `Automated FWA detection - Score: ${detection.composite_score}`,
          flagType: detection.primary_detection_method || "multi-method",
          sourceType: "automated_detection" as const,
          sourceReference: detection.id,
        };
        
        try {
          const newCase = await storage.createFwaCase(caseData);
          casesCreated.push(newCase);
        } catch (e) {
          console.error("Error creating case:", e);
        }
      }
      
      res.json({
        success: true,
        casesCreated: casesCreated.length,
        cases: casesCreated
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cases/bulk-from-detection", "bulk create cases");
    }
  });

  // GET /api/fwa/pipeline-stats - Comprehensive pipeline statistics
  app.get("/api/fwa/pipeline-stats", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      const stats = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM fwa_analyzed_claims) as total_claims,
          (SELECT COUNT(DISTINCT provider_id) FROM fwa_analyzed_claims) as unique_providers,
          (SELECT COUNT(DISTINCT patient_id) FROM fwa_analyzed_claims) as unique_patients,
          (SELECT COUNT(*) FROM fwa_rules_library WHERE is_active = true) as active_rules,
          (SELECT COUNT(*) FROM fwa_feature_store) as feature_records,
          (SELECT COUNT(*) FROM fwa_detection_runs) as detection_runs,
          (SELECT COUNT(*) FROM fwa_detection_results) as detection_results,
          (SELECT COUNT(*) FROM fwa_detection_results WHERE composite_risk_level IN ('critical', 'high')) as high_risk_detections,
          (SELECT COUNT(*) FROM fwa_cases) as total_cases,
          (SELECT AVG(CAST(composite_score AS decimal)) FROM fwa_detection_results) as avg_risk_score
      `);
      
      const row = stats.rows[0] as any;
      
      res.json({
        claims: {
          total: parseInt(row.total_claims) || 0,
          uniqueProviders: parseInt(row.unique_providers) || 0,
          uniquePatients: parseInt(row.unique_patients) || 0
        },
        rules: {
          active: parseInt(row.active_rules) || 0
        },
        features: {
          records: parseInt(row.feature_records) || 0
        },
        detection: {
          runs: parseInt(row.detection_runs) || 0,
          results: parseInt(row.detection_results) || 0,
          highRisk: parseInt(row.high_risk_detections) || 0,
          avgScore: parseFloat(row.avg_risk_score) || 0
        },
        cases: {
          total: parseInt(row.total_cases) || 0
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/pipeline-stats", "get pipeline stats");
    }
  });

  // POST /api/fwa/test/generate-claims - Generate test claims with FWA patterns
  app.post("/api/fwa/test/generate-claims", async (req, res) => {
    try {
      const { count = 500 } = req.body;
      const { generateTestClaims } = await import("../services/generate-test-claims");
      
      const result = await generateTestClaims(Math.min(count, 1000));
      res.json({
        success: true,
        message: `Generated ${result.generated} test claims with ${result.fraudulent} fraudulent patterns`,
        ...result
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/test/generate-claims", "generate test claims");
    }
  });

  // POST /api/fwa/test/run-full-pipeline - Run complete pipeline test
  app.post("/api/fwa/test/run-full-pipeline", async (req, res) => {
    try {
      const { claimsCount = 300, batchSize = 50, skipRagLlm = true } = req.body;
      const results: any = { steps: [], success: true, startTime: Date.now() };
      
      // Step 1: Generate test claims
      console.log("[Pipeline] Step 1: Generating test claims...");
      const { generateTestClaims } = await import("../services/generate-test-claims");
      const genResult = await generateTestClaims(claimsCount);
      results.steps.push({
        step: 1,
        name: "Generate Test Claims",
        status: "completed",
        details: genResult
      });
      
      // Step 2: Seed rules library
      console.log("[Pipeline] Step 2: Seeding rules library...");
      const { seedFwaRulesLibrary } = await import("../services/seed-fwa-rules");
      const seededRules = await seedFwaRulesLibrary();
      results.steps.push({
        step: 2,
        name: "Seed Rules Library",
        status: "completed",
        details: { rulesSeeded: seededRules }
      });
      
      // Step 3: Compute feature store
      console.log("[Pipeline] Step 3: Computing feature store...");
      const { computeFeatureStore } = await import("../services/claims-import-service");
      const featureResult = await computeFeatureStore();
      results.steps.push({
        step: 3,
        name: "Compute Feature Store",
        status: "completed",
        details: featureResult
      });
      
      // Step 4: Run batch detection
      console.log("[Pipeline] Step 4: Running batch detection...");
      const { runProductionDetection } = await import("../services/production-detection-engine");
      const { db } = await import("../db");
      const { fwaAnalyzedClaims, fwaDetectionRuns, fwaDetectionResults } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      
      // Create detection run
      const [run] = await db.insert(fwaDetectionRuns).values({
        runName: `Pipeline Test ${new Date().toISOString()}`,
        runType: "pipeline_test",
        status: "running",
        startedAt: new Date()
      }).returning();
      
      // Get sample of claims
      const claimsForAnalysis = await db.select().from(fwaAnalyzedClaims)
        .orderBy(sql`RANDOM()`)
        .limit(Math.min(batchSize, 100));
      
      let analyzed = 0, critical = 0, high = 0, medium = 0, low = 0;
      
      for (const dbClaim of claimsForAnalysis) {
        try {
          const claim = {
            id: dbClaim.id,
            claimReference: dbClaim.claimReference || `REF-${dbClaim.id.substring(0, 8)}`,
            providerId: dbClaim.providerId || "UNKNOWN",
            patientId: dbClaim.patientId || "UNKNOWN",
            practitionerLicense: dbClaim.doctorId,
            specialtyCode: dbClaim.providerSpecialty,
            city: null,
            providerType: dbClaim.facilityType,
            unitPrice: null,
            totalAmount: parseFloat(String(dbClaim.totalAmount || 0)),
            quantity: null,
            principalDiagnosisCode: dbClaim.diagnosisCode,
            serviceCode: dbClaim.procedureCode,
            serviceDescription: dbClaim.serviceDescription,
            claimType: dbClaim.claimType,
            lengthOfStay: null,
            originalStatus: dbClaim.status,
            isPreAuthorized: false
          };
          
          const result = await runProductionDetection(claim, { skipRagLlm });
          
          // Save result
          await db.insert(fwaDetectionResults).values({
            runId: run.id,
            claimId: dbClaim.id,
            providerId: claim.providerId,
            patientId: claim.patientId,
            compositeScore: String(result.compositeScore),
            compositeRiskLevel: result.compositeRiskLevel,
            ruleEngineScore: String(result.ruleEngineScore),
            statisticalScore: String(result.statisticalScore),
            unsupervisedScore: String(result.unsupervisedScore),
            ragLlmScore: String(result.ragLlmScore),
            ruleEngineFindings: result.ruleEngineFindings as any,
            statisticalFindings: result.statisticalFindings as any,
            unsupervisedFindings: result.unsupervisedFindings as any,
            ragLlmFindings: result.ragLlmFindings as any,
            detectionSummary: result.detectionSummary,
            recommendedAction: result.recommendedAction,
            primaryDetectionMethod: result.primaryDetectionMethod
          });
          
          analyzed++;
          if (result.compositeRiskLevel === "critical") critical++;
          else if (result.compositeRiskLevel === "high") high++;
          else if (result.compositeRiskLevel === "medium") medium++;
          else low++;
        } catch (e) {
          console.error("Error processing claim:", e);
        }
      }
      
      // Update run status
      await db.execute(sql`
        UPDATE fwa_detection_runs 
        SET status = 'completed', completed_at = NOW(), 
            claims_analyzed = ${analyzed}, flagged_claims = ${critical + high}
        WHERE id = ${run.id}
      `);
      
      results.steps.push({
        step: 4,
        name: "Batch Detection",
        status: "completed",
        details: {
          analyzed,
          runId: run.id,
          riskDistribution: { critical, high, medium, low }
        }
      });
      
      // Step 5: Create cases from high-risk detections
      console.log("[Pipeline] Step 5: Creating cases from high-risk detections...");
      
      const highRiskDetections = await db.execute(sql`
        SELECT id, claim_id, composite_score, composite_risk_level
        FROM fwa_detection_results
        WHERE composite_risk_level IN ('critical', 'high')
        ORDER BY CAST(composite_score AS decimal) DESC
        LIMIT 20
      `);
      
      let casesCreated = 0;
      for (const detection of highRiskDetections.rows as any[]) {
        try {
          const caseData = {
            caseNumber: `FWA-PIPE-${Date.now().toString(36).toUpperCase()}-${casesCreated}`,
            claimId: detection.claim_id,
            status: "draft" as const,
            priority: detection.composite_risk_level === "critical" ? "critical" as const : "high" as const,
            riskScore: detection.composite_score,
            summary: `Pipeline-generated case from ${detection.composite_risk_level} risk detection (score: ${detection.composite_score})`,
            flagType: "automated_pipeline",
            sourceType: "automated_detection" as const,
            sourceReference: detection.id,
          };
          await storage.createFwaCase(caseData);
          casesCreated++;
        } catch (e) {
          console.error("Error creating case:", e);
        }
      }
      
      results.steps.push({
        step: 5,
        name: "Create FWA Cases",
        status: "completed",
        details: {
          highRiskDetections: highRiskDetections.rows.length,
          casesCreated
        }
      });
      
      // Step 6: Final stats
      console.log("[Pipeline] Step 6: Collecting final statistics...");
      const finalStats = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM fwa_analyzed_claims) as total_claims,
          (SELECT COUNT(DISTINCT provider_id) FROM fwa_analyzed_claims) as unique_providers,
          (SELECT COUNT(DISTINCT patient_id) FROM fwa_analyzed_claims) as unique_patients,
          (SELECT COUNT(*) FROM fwa_rules_library WHERE is_active = true) as active_rules,
          (SELECT COUNT(*) FROM fwa_feature_store) as feature_records,
          (SELECT COUNT(*) FROM fwa_detection_runs) as detection_runs,
          (SELECT COUNT(*) FROM fwa_detection_results) as detection_results,
          (SELECT COUNT(*) FROM fwa_detection_results WHERE composite_risk_level = 'critical') as critical_detections,
          (SELECT COUNT(*) FROM fwa_detection_results WHERE composite_risk_level = 'high') as high_detections,
          (SELECT COUNT(*) FROM fwa_detection_results WHERE composite_risk_level = 'medium') as medium_detections,
          (SELECT COUNT(*) FROM fwa_detection_results WHERE composite_risk_level = 'low') as low_detections,
          (SELECT COUNT(*) FROM fwa_cases) as total_cases,
          (SELECT AVG(CAST(composite_score AS decimal)) FROM fwa_detection_results) as avg_risk_score,
          (SELECT MAX(CAST(composite_score AS decimal)) FROM fwa_detection_results) as max_risk_score
      `);
      
      const stats = finalStats.rows[0] as any;
      results.steps.push({
        step: 6,
        name: "Final Statistics",
        status: "completed",
        details: {
          totalClaims: parseInt(stats.total_claims),
          uniqueProviders: parseInt(stats.unique_providers),
          uniquePatients: parseInt(stats.unique_patients),
          activeRules: parseInt(stats.active_rules),
          featureRecords: parseInt(stats.feature_records),
          detectionRuns: parseInt(stats.detection_runs),
          detectionResults: parseInt(stats.detection_results),
          riskDistribution: {
            critical: parseInt(stats.critical_detections),
            high: parseInt(stats.high_detections),
            medium: parseInt(stats.medium_detections),
            low: parseInt(stats.low_detections)
          },
          totalCases: parseInt(stats.total_cases),
          avgRiskScore: parseFloat(stats.avg_risk_score) || 0,
          maxRiskScore: parseFloat(stats.max_risk_score) || 0
        }
      });
      
      results.endTime = Date.now();
      results.durationMs = results.endTime - results.startTime;
      results.durationSec = Math.round(results.durationMs / 1000);
      
      console.log(`[Pipeline] Complete! Duration: ${results.durationSec}s`);
      res.json(results);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/test/run-full-pipeline", "run full pipeline");
    }
  });

  // POST /api/fwa/generate-batch - Generate mass FWA claims with diverse violations
  app.post("/api/fwa/generate-batch", async (req, res) => {
    try {
      const { batchSize = 100 } = req.body;
      const size = Math.min(Math.max(parseInt(batchSize) || 100, 10), 500);
      
      const { generateFwaBatch } = await import("../services/generate-fwa-batch");
      const result = await generateFwaBatch(size);
      
      res.json({
        success: true,
        message: `Generated ${result.generated} claims with ${result.withViolations} containing violations`,
        ...result
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/generate-batch", "generate FWA batch");
    }
  });

  // GET /api/fwa/random-claim - Get a random claim with services for analysis
  app.get("/api/fwa/random-claim", async (req, res) => {
    try {
      const claimsResult = await db.select().from(claims).limit(100);
      
      if (claimsResult.length === 0) {
        return res.status(404).json({ error: "No claims found in database" });
      }
      
      const randomClaim = claimsResult[Math.floor(Math.random() * claimsResult.length)];
      
      const servicesResult = await db.select()
        .from(fwaClaimServices)
        .where(eq(fwaClaimServices.claimId, randomClaim.id));
      
      res.json({
        ...randomClaim,
        claimServices: servicesResult.length > 0 ? servicesResult : generateMockServices(randomClaim)
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/random-claim", "get random claim");
    }
  });

  // ============================================
  // ML UNSUPERVISED LEARNING ENDPOINTS
  // ============================================

  // POST /api/fwa/ml/analyze - Run full ML inference on a claim
  app.post("/api/fwa/ml/analyze", async (req, res) => {
    try {
      const claim = req.body;
      
      if (!claim.id && !claim.claimId) {
        return res.status(400).json({ error: "Claim ID is required" });
      }
      
      // Run ML inference
      const result = await mlEngine.runInference(claim);
      
      // Save result to database
      await mlEngine.saveInferenceResult(result);
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/analyze", "ML claim analysis");
    }
  });

  // POST /api/fwa/ml/analyze-by-id/:claimId - Analyze a claim by ID
  app.post("/api/fwa/ml/analyze-by-id/:claimId", async (req, res) => {
    try {
      const { claimId } = req.params;
      
      // Get claim from database
      const claimResult = await db.select()
        .from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);
      
      if (claimResult.length === 0) {
        return res.status(404).json({ error: "Claim not found" });
      }
      
      const claim = claimResult[0];
      
      // Run ML inference
      const result = await mlEngine.runInference(claim);
      
      // Save result to database
      await mlEngine.saveInferenceResult(result);
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/analyze-by-id", "ML claim analysis by ID");
    }
  });

  // GET /api/fwa/ml/features/:claimId - Get feature vector for a claim
  app.get("/api/fwa/ml/features/:claimId", async (req, res) => {
    try {
      const { claimId } = req.params;
      
      // Get claim from database
      const claimResult = await db.select()
        .from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);
      
      if (claimResult.length === 0) {
        return res.status(404).json({ error: "Claim not found" });
      }
      
      const featureService = new FeatureEngineeringService();
      const featureVector = await featureService.buildFeatureVector(claimResult[0]);
      
      res.json({
        claimId,
        featureCount: Object.keys(featureVector).length,
        features: featureVector
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/features", "get claim features");
    }
  });

  // GET /api/fwa/ml/inference/:claimId - Get stored inference results
  app.get("/api/fwa/ml/inference/:claimId", async (req, res) => {
    try {
      const { claimId } = req.params;
      
      const result = await db.select()
        .from(mlClaimInference)
        .where(eq(mlClaimInference.claimId, claimId))
        .orderBy(eq(mlClaimInference.inferredAt, mlClaimInference.inferredAt))
        .limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "No inference results found for this claim" });
      }
      
      res.json(result[0]);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/inference", "get inference results");
    }
  });

  // GET /api/fwa/ml/provider-profile/:providerId - Get provider feature store profile
  app.get("/api/fwa/ml/provider-profile/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;
      
      const result = await db.select()
        .from(providerFeatureStore)
        .where(eq(providerFeatureStore.providerId, providerId))
        .limit(1);
      
      if (result.length === 0) {
        // Calculate fresh if not in store
        const featureService = new FeatureEngineeringService();
        const features = await featureService.calculateProviderFeaturesFresh(providerId);
        return res.json({ providerId, ...features, cached: false });
      }
      
      res.json({ ...result[0], cached: true });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/provider-profile", "get provider profile");
    }
  });

  // GET /api/fwa/ml/member-profile/:memberId - Get member feature store profile
  app.get("/api/fwa/ml/member-profile/:memberId", async (req, res) => {
    try {
      const { memberId } = req.params;
      
      const result = await db.select()
        .from(memberFeatureStore)
        .where(eq(memberFeatureStore.memberId, memberId))
        .limit(1);
      
      if (result.length === 0) {
        // Calculate fresh if not in store
        const featureService = new FeatureEngineeringService();
        const features = await featureService.calculateMemberFeaturesFresh(memberId);
        return res.json({ memberId, ...features, cached: false });
      }
      
      res.json({ ...result[0], cached: true });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/member-profile", "get member profile");
    }
  });

  // GET /api/fwa/ml/peer-baselines - Get all peer group baselines
  app.get("/api/fwa/ml/peer-baselines", async (req, res) => {
    try {
      const result = await db.select().from(peerGroupBaselines);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/peer-baselines", "get peer baselines");
    }
  });

  // GET /api/fwa/ml/learned-patterns - Get learned fraud patterns
  app.get("/api/fwa/ml/learned-patterns", async (req, res) => {
    try {
      const result = await db.select()
        .from(mlLearnedPatterns)
        .where(eq(mlLearnedPatterns.isActive, true));
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/learned-patterns", "get learned patterns");
    }
  });

  // POST /api/fwa/ml/train - Trigger model training (background)
  app.post("/api/fwa/ml/train", async (req, res) => {
    try {
      // Start training in background
      mlEngine.trainModels().catch(err => {
        console.error('[ML Training Error]', err);
      });
      
      res.json({ 
        status: "training_started",
        message: "ML model training initiated in background"
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/train", "trigger ML training");
    }
  });

  // POST /api/fwa/ml/aggregate-features - Trigger feature store aggregation
  app.post("/api/fwa/ml/aggregate-features", async (req, res) => {
    try {
      const featureService = new FeatureEngineeringService();
      
      // Get unique providers
      const providers = await db.selectDistinct({ providerId: claims.providerId })
        .from(claims)
        .limit(100);
      
      let providerCount = 0;
      for (const p of providers) {
        if (p.providerId) {
          const features = await featureService.calculateProviderFeaturesFresh(p.providerId);
          
          // Upsert into feature store
          await db.insert(providerFeatureStore)
            .values({
              providerId: p.providerId,
              claimCount7d: features.claimCount7d,
              claimCount30d: features.claimCount30d,
              claimCount90d: features.claimCount90d,
              avgAmount30d: features.avgAmount30d.toString(),
              stdAmount30d: features.stdAmount30d.toString(),
              uniquePatients30d: features.uniquePatients30d,
              uniqueDiagnoses30d: features.uniqueDiagnoses30d,
              denialRate90d: features.denialRate90d.toString(),
              flagRate90d: features.flagRate90d.toString(),
              weekendRatio30d: features.weekendRatio.toString(),
              surgeryRate30d: features.surgeryRate.toString(),
              avgLos30d: features.avgLos.toString(),
              claimTrend7dVs30d: features.trend7dVs30d.toString(),
              amountTrend7dVs30d: features.amountTrend.toString(),
              lastCalculatedAt: new Date()
            })
            .onConflictDoUpdate({
              target: providerFeatureStore.providerId,
              set: {
                claimCount7d: features.claimCount7d,
                claimCount30d: features.claimCount30d,
                claimCount90d: features.claimCount90d,
                avgAmount30d: features.avgAmount30d.toString(),
                stdAmount30d: features.stdAmount30d.toString(),
                uniquePatients30d: features.uniquePatients30d,
                uniqueDiagnoses30d: features.uniqueDiagnoses30d,
                denialRate90d: features.denialRate90d.toString(),
                flagRate90d: features.flagRate90d.toString(),
                weekendRatio30d: features.weekendRatio.toString(),
                surgeryRate30d: features.surgeryRate.toString(),
                avgLos30d: features.avgLos.toString(),
                claimTrend7dVs30d: features.trend7dVs30d.toString(),
                amountTrend7dVs30d: features.amountTrend.toString(),
                lastCalculatedAt: new Date(),
                updatedAt: new Date()
              }
            });
          
          providerCount++;
        }
      }
      
      // Get unique members
      const members = await db.selectDistinct({ patientId: claims.patientId })
        .from(claims)
        .limit(100);
      
      let memberCount = 0;
      for (const m of members) {
        if (m.patientId) {
          const features = await featureService.calculateMemberFeaturesFresh(m.patientId);
          
          await db.insert(memberFeatureStore)
            .values({
              memberId: m.patientId,
              claimCount30d: features.claimCount30d,
              claimCount90d: features.claimCount90d,
              uniqueProviders30d: features.uniqueProviders30d,
              uniqueProviders90d: features.uniqueProviders90d,
              totalAmount30d: features.totalAmount30d.toString(),
              avgAmount30d: features.avgAmount30d.toString(),
              uniqueDiagnoses30d: features.uniqueDiagnoses30d,
              surgeryCount90d: features.surgeryCount90d,
              icuCount90d: features.icuCount90d,
              highUtilizerFlag: features.highUtilizer,
              daysSinceLastClaim: features.daysSinceLastClaim,
              claimFrequencyTrend: features.frequencyAcceleration.toString(),
              lastCalculatedAt: new Date()
            })
            .onConflictDoUpdate({
              target: memberFeatureStore.memberId,
              set: {
                claimCount30d: features.claimCount30d,
                claimCount90d: features.claimCount90d,
                uniqueProviders30d: features.uniqueProviders30d,
                uniqueProviders90d: features.uniqueProviders90d,
                totalAmount30d: features.totalAmount30d.toString(),
                avgAmount30d: features.avgAmount30d.toString(),
                uniqueDiagnoses30d: features.uniqueDiagnoses30d,
                surgeryCount90d: features.surgeryCount90d,
                icuCount90d: features.icuCount90d,
                highUtilizerFlag: features.highUtilizer,
                daysSinceLastClaim: features.daysSinceLastClaim,
                claimFrequencyTrend: features.frequencyAcceleration.toString(),
                lastCalculatedAt: new Date(),
                updatedAt: new Date()
              }
            });
          
          memberCount++;
        }
      }
      
      res.json({
        status: "aggregation_complete",
        providersProcessed: providerCount,
        membersProcessed: memberCount
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/aggregate-features", "aggregate features");
    }
  });

  // GET /api/fwa/ml/stats - Get ML system statistics
  app.get("/api/fwa/ml/stats", async (req, res) => {
    try {
      const providerStoreCount = await db.select({ count: eq(providerFeatureStore.id, providerFeatureStore.id) })
        .from(providerFeatureStore);
      
      const memberStoreCount = await db.select({ count: eq(memberFeatureStore.id, memberFeatureStore.id) })
        .from(memberFeatureStore);
      
      const inferenceCount = await db.select({ count: eq(mlClaimInference.id, mlClaimInference.id) })
        .from(mlClaimInference);
      
      const patternCount = await db.select({ count: eq(mlLearnedPatterns.id, mlLearnedPatterns.id) })
        .from(mlLearnedPatterns);
      
      res.json({
        featureStore: {
          providers: providerStoreCount.length,
          members: memberStoreCount.length
        },
        inference: {
          totalAnalyzed: inferenceCount.length
        },
        patterns: {
          learned: patternCount.length
        },
        algorithms: [
          { name: "Isolation Forest", status: "active", weight: 0.25 },
          { name: "Local Outlier Factor", status: "active", weight: 0.20 },
          { name: "DBSCAN Clustering", status: "active", weight: 0.20 },
          { name: "Autoencoder", status: "active", weight: 0.15 },
          { name: "Deep Learning", status: "active", weight: 0.20 }
        ],
        featureCount: 62
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/ml/stats", "get ML stats");
    }
  });

  // =============================================================================
  // STATISTICAL LEARNING - POPULATION STATISTICS & FEATURE WEIGHTS API
  // =============================================================================

  // GET /api/fwa/statistical/population-stats - Get all population statistics
  app.get("/api/fwa/statistical/population-stats", async (req, res) => {
    try {
      const stats = await populationStatsService.getAll();
      res.json({
        success: true,
        count: stats.length,
        statistics: stats
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/population-stats", "get population stats");
    }
  });

  // POST /api/fwa/statistical/population-stats/recalculate - Recalculate all statistics from claim population
  app.post("/api/fwa/statistical/population-stats/recalculate", async (req, res) => {
    try {
      const result = await populationStatsService.recalculateAll();
      res.json({
        success: true,
        message: "Population statistics recalculated from claim population",
        featuresProcessed: result.featuresProcessed,
        claimsAnalyzed: result.claimsAnalyzed,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/population-stats/recalculate", "recalculate stats");
    }
  });

  // GET /api/fwa/statistical/population-stats/:featureName - Get statistics for specific feature
  app.get("/api/fwa/statistical/population-stats/:featureName", async (req, res) => {
    try {
      const { featureName } = req.params;
      const stats = await populationStatsService.getByFeature(featureName);
      if (!stats) {
        return res.status(404).json({ 
          success: false, 
          error: `No statistics found for feature: ${featureName}` 
        });
      }
      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/population-stats/:featureName", "get feature stats");
    }
  });

  // GET /api/fwa/statistical/feature-weights - Get all feature weights
  app.get("/api/fwa/statistical/feature-weights", async (req, res) => {
    try {
      const weights = await featureWeightsService.getAll();
      res.json({
        success: true,
        count: weights.length,
        weights: weights
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/feature-weights", "get feature weights");
    }
  });

  // PUT /api/fwa/statistical/feature-weights/:featureName - Update weight for specific feature
  app.put("/api/fwa/statistical/feature-weights/:featureName", async (req, res) => {
    try {
      const { featureName } = req.params;
      const { weight, direction, category } = req.body;
      
      const updated = await featureWeightsService.update(featureName, {
        weight: weight !== undefined ? weight : undefined,
        direction: direction || undefined,
        category: category || undefined
      });
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: `Feature weight not found: ${featureName}`
        });
      }
      
      res.json({
        success: true,
        message: `Feature weight updated for ${featureName}`,
        weight: updated
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/feature-weights/:featureName", "update feature weight");
    }
  });

  // POST /api/fwa/statistical/feature-weights/initialize - Initialize all feature weights to defaults
  app.post("/api/fwa/statistical/feature-weights/initialize", async (req, res) => {
    try {
      const result = await featureWeightsService.initializeDefaults();
      res.json({
        success: true,
        message: "Feature weights initialized to defaults",
        weightsCreated: result.weightsCreated
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/feature-weights/initialize", "initialize weights");
    }
  });

  // GET /api/fwa/statistical/engine-status - Get Statistical Learning engine status
  app.get("/api/fwa/statistical/engine-status", async (req, res) => {
    try {
      const [stats, weights] = await Promise.all([
        populationStatsService.getAll(),
        featureWeightsService.getAll()
      ]);
      
      // Get oldest statistics timestamp
      let oldestStats: Date | null = null;
      for (const stat of stats) {
        const timestamp = stat.calculatedAt ? new Date(stat.calculatedAt) : null;
        if (timestamp && (!oldestStats || timestamp < oldestStats)) {
          oldestStats = timestamp;
        }
      }
      
      // Calculate coverage percentages
      const totalFeatures = 62;
      const statsCount = stats.length;
      const weightsCount = weights.length;
      
      // Stats need recalculation if: empty, too old (>24h), or low coverage (<50%)
      const statsCoverage = (statsCount / totalFeatures) * 100;
      const needsRecalc = statsCount === 0 || !oldestStats || 
        (new Date().getTime() - oldestStats.getTime() > 24 * 60 * 60 * 1000);
      
      // Weights are considered configured if we have any weights (minimum 20 for core features)
      const weightsConfigured = weightsCount >= 20;
      const weightsCoverage = (weightsCount / totalFeatures) * 100;
      
      res.json({
        success: true,
        status: {
          engine: "Statistical Learning Engine v2.0",
          featureCount: totalFeatures,
          populationStats: {
            count: statsCount,
            coverage: statsCoverage.toFixed(1) + "%",
            oldestCalculation: oldestStats?.toISOString() || null,
            needsRecalculation: needsRecalc,
            missingFeatures: totalFeatures - statsCount
          },
          featureWeights: {
            count: weightsCount,
            coverage: weightsCoverage.toFixed(1) + "%",
            configured: weightsConfigured,
            note: weightsConfigured ? "Core weights active" : "Initialize weights to enable scoring"
          },
          systemReady: statsCount > 0 && weightsCount > 0,
          capabilities: [
            "Z-score calculation against population",
            "Percentile ranking per feature",
            "Peer group comparison",
            "62-feature unified analysis",
            "Bilingual explanations (EN/AR)",
            "Database-backed statistics (no hardcoded values)"
          ]
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/engine-status", "get engine status");
    }
  });

  // POST /api/fwa/statistical/analyze-claim - Run Statistical Learning analysis on a single claim
  app.post("/api/fwa/statistical/analyze-claim", async (req, res) => {
    try {
      const claim = req.body;
      if (!claim || !claim.id) {
        return res.status(400).json({
          success: false,
          error: "Claim data with id is required"
        });
      }
      
      const result = await statisticalLearningEngine.runStatisticalDetection(claim);
      
      res.json({
        success: true,
        claimId: claim.id,
        score: result.score,
        riskLevel: result.score >= 40 ? 'critical' : result.score >= 30 ? 'high' : 
                   result.score >= 20 ? 'medium' : 'low',
        findings: result.findings
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/statistical/analyze-claim", "analyze claim");
    }
  });

  // =============================================================================
  // BATCH EXCEL UPLOAD AND 4-METHOD FWA DETECTION
  // =============================================================================

  // POST /api/fwa/batch-upload-excel - Process an attached Excel file through 4-method detection
  app.post("/api/fwa/batch-upload-excel", async (req, res) => {
    try {
      const { processAttachedExcel } = await import("../services/excel-batch-service");
      const { fileName, batchName, maxClaims, skipDuplicates } = req.body;
      
      if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
      }
      
      console.log(`[Batch Upload] Starting processing of ${fileName}`);
      
      const result = await processAttachedExcel(
        fileName, 
        batchName,
        { 
          runDetection: true, 
          maxClaims: maxClaims || 10000,
          skipDuplicates: skipDuplicates !== false
        }
      );
      
      console.log(`[Batch Upload] Completed: ${result.claimsInserted} claims, ${result.claimsDetected} detected`);
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batch-upload-excel", "process batch upload");
    }
  });

  // GET /api/fwa/batch-progress/:batchId - Get progress of batch processing
  app.get("/api/fwa/batch-progress/:batchId", async (req, res) => {
    try {
      const { getBatchProgress } = await import("../services/excel-batch-service");
      const { batchId } = req.params;
      
      const progress = getBatchProgress(batchId);
      
      if (!progress) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      res.json(progress);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batch-progress", "get batch progress");
    }
  });

  // POST /api/fwa/run-detection-batch - Run 4-method detection on claims without detection results
  app.post("/api/fwa/run-detection-batch", async (req, res) => {
    try {
      const { runProductionDetection, AnalyzedClaimData } = await import("../services/production-detection-engine");
      const { limit = 100, claimReferences } = req.body;
      
      console.log(`[Detection Batch] Starting 4-method detection batch...`);
      
      // Default weights for 4-method detection
      const DEFAULT_WEIGHTS = {
        rule_engine: 0.35,
        statistical_learning: 0.25,
        unsupervised_learning: 0.20,
        rag_llm: 0.20
      };
      
      // Find claims without detection results
      let claimsToProcess;
      if (claimReferences && claimReferences.length > 0) {
        // Process specific claims by reference
        claimsToProcess = await db.execute(sql`
          SELECT ac.* FROM fwa_analyzed_claims ac
          LEFT JOIN fwa_detection_results dr ON dr.claim_id = ac.id
          WHERE ac.claim_reference = ANY(${claimReferences})
          AND dr.id IS NULL
          LIMIT ${limit}
        `);
      } else {
        // Process any claims without detection results
        claimsToProcess = await db.execute(sql`
          SELECT ac.* FROM fwa_analyzed_claims ac
          LEFT JOIN fwa_detection_results dr ON dr.claim_id = ac.id
          WHERE dr.id IS NULL
          LIMIT ${limit}
        `);
      }
      
      const claims = claimsToProcess.rows as any[];
      console.log(`[Detection Batch] Found ${claims.length} claims to process`);
      
      const results = {
        processed: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        errors: [] as string[]
      };
      
      for (const claim of claims) {
        try {
          const analyzedClaim = {
            id: claim.id,
            claimReference: claim.claim_reference,
            providerId: claim.provider_id,
            patientId: claim.patient_id,
            practitionerLicense: claim.practitioner_license,
            specialtyCode: claim.specialty_code,
            city: claim.city,
            providerType: claim.provider_type,
            unitPrice: claim.unit_price ? parseFloat(claim.unit_price) : 0,
            totalAmount: claim.total_amount ? parseFloat(claim.total_amount) : 0,
            quantity: claim.quantity || 1,
            principalDiagnosisCode: claim.principal_diagnosis_code,
            serviceCode: claim.service_code,
            serviceDescription: claim.service_description,
            claimType: claim.claim_type,
            lengthOfStay: claim.length_of_stay,
            originalStatus: claim.original_status,
            isPreAuthorized: claim.is_pre_authorized || false
          };
          
          const detection = await runProductionDetection(analyzedClaim, DEFAULT_WEIGHTS, true);
          
          await db.insert(fwaDetectionResults).values({
            claimId: claim.id,
            providerId: claim.provider_id,
            patientId: claim.patient_id,
            compositeScore: String(detection.compositeScore),
            compositeRiskLevel: detection.compositeRiskLevel,
            ruleEngineScore: String(detection.ruleEngineScore),
            statisticalScore: String(detection.statisticalScore),
            unsupervisedScore: String(detection.unsupervisedScore),
            ragLlmScore: String(detection.ragLlmScore),
            ruleEngineFindings: detection.ruleEngineFindings,
            statisticalFindings: detection.statisticalFindings,
            unsupervisedFindings: detection.unsupervisedFindings,
            ragLlmFindings: detection.ragLlmFindings,
            primaryDetectionMethod: detection.primaryDetectionMethod,
            detectionSummary: detection.detectionSummary,
            recommendedAction: detection.recommendedAction,
            riskFactors: detection.riskFactors,
            processingTimeMs: detection.processingTimeMs,
            analyzedAt: new Date()
          });
          
          results.processed++;
          
          switch (detection.compositeRiskLevel) {
            case 'critical': results.critical++; break;
            case 'high': results.high++; break;
            case 'medium': results.medium++; break;
            default: results.low++;
          }
          
          if (results.processed % 10 === 0) {
            console.log(`[Detection Batch] Processed ${results.processed}/${claims.length} claims...`);
          }
          
        } catch (err: any) {
          results.errors.push(`Claim ${claim.id}: ${err.message}`);
        }
      }
      
      console.log(`[Detection Batch] Completed: ${results.processed} claims, ${results.critical + results.high} high-risk`);
      
      res.json({
        success: true,
        totalFound: claims.length,
        ...results
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/run-detection-batch", "run detection batch");
    }
  });

  // POST /api/fwa/apply-360-perspectives - Apply 360 perspective enrichment to existing detection results
  app.post("/api/fwa/apply-360-perspectives", async (req, res) => {
    try {
      const { limit = 100 } = req.body;
      
      console.log(`[360 Enrichment] Starting 360 perspective enrichment batch...`);
      
      // Find detection results that need 360 enrichment
      const resultsToEnrich = await db.execute(sql`
        SELECT dr.id, dr.claim_id, dr.composite_score, dr.composite_risk_level,
               ac.provider_id, ac.patient_id, ac.practitioner_license
        FROM fwa_detection_results dr
        JOIN fwa_analyzed_claims ac ON dr.claim_id = ac.id
        WHERE dr.detection_summary NOT LIKE '%360 Perspective%'
        LIMIT ${limit}
      `);
      
      const results = resultsToEnrich.rows as any[];
      console.log(`[360 Enrichment] Found ${results.length} results to enrich`);
      
      const enrichmentResults = {
        processed: 0,
        upgraded: 0,
        errors: [] as string[]
      };
      
      for (const result of results) {
        try {
          // Fetch 360 perspective data
          const [providerData, patientData, doctorData] = await Promise.all([
            result.provider_id ? db.select().from(provider360).where(eq(provider360.providerId, result.provider_id)).limit(1) : Promise.resolve([]),
            result.patient_id ? db.select().from(patient360).where(eq(patient360.patientId, result.patient_id)).limit(1) : Promise.resolve([]),
            result.practitioner_license ? db.select().from(doctor360).where(eq(doctor360.doctorId, result.practitioner_license)).limit(1) : Promise.resolve([])
          ]);
          
          const provider = providerData[0];
          const patient = patientData[0];
          const doctor = doctorData[0];
          
          // Calculate context modifier
          const providerRiskScore = provider?.riskScore ? parseFloat(String(provider.riskScore)) : 0;
          const patientRiskScore = patient?.riskScore ? parseFloat(String(patient.riskScore)) : 0;
          const doctorRiskScore = doctor?.riskScore ? parseFloat(String(doctor.riskScore)) : 0;
          
          const weightedRiskScore = 
            (providerRiskScore * 0.40) +
            (patientRiskScore * 0.30) +
            (doctorRiskScore * 0.30);
          
          let contextModifier = 0;
          if (weightedRiskScore >= 70) contextModifier = 15;
          else if (weightedRiskScore >= 50) contextModifier = 10;
          else if (weightedRiskScore >= 30) contextModifier = 5;
          else if (weightedRiskScore >= 10) contextModifier = 0;
          else contextModifier = -5;
          
          // Calculate new composite score
          const originalScore = parseFloat(result.composite_score) || 0;
          const newCompositeScore = Math.max(0, Math.min(100, originalScore + contextModifier));
          
          // Determine new risk level
          let newRiskLevel = "low";
          if (newCompositeScore >= 80) newRiskLevel = "critical";
          else if (newCompositeScore >= 60) newRiskLevel = "high";
          else if (newCompositeScore >= 40) newRiskLevel = "medium";
          
          // Build context summary
          const summaryParts: string[] = [];
          if (provider) summaryParts.push(`Provider ${provider.riskLevel || 'unknown'} risk (${providerRiskScore})`);
          if (patient) summaryParts.push(`Patient ${patient.riskLevel || 'unknown'} risk (${patientRiskScore})`);
          if (doctor) summaryParts.push(`Doctor ${doctor.riskLevel || 'unknown'} risk (${doctorRiskScore})`);
          
          const contextSummary = summaryParts.length > 0
            ? ` 360 Perspective: ${summaryParts.join('; ')}. Context modifier: ${contextModifier >= 0 ? '+' : ''}${contextModifier}`
            : '';
          
          // Update the detection result
          await db.execute(sql`
            UPDATE fwa_detection_results
            SET composite_score = ${newCompositeScore.toFixed(2)},
                composite_risk_level = ${newRiskLevel},
                detection_summary = detection_summary || ${contextSummary}
            WHERE id = ${result.id}
          `);
          
          enrichmentResults.processed++;
          if (newRiskLevel !== result.composite_risk_level) {
            enrichmentResults.upgraded++;
          }
          
          if (enrichmentResults.processed % 50 === 0) {
            console.log(`[360 Enrichment] Processed ${enrichmentResults.processed}/${results.length}...`);
          }
          
        } catch (err: any) {
          enrichmentResults.errors.push(`Result ${result.id}: ${err.message}`);
        }
      }
      
      console.log(`[360 Enrichment] Completed: ${enrichmentResults.processed} enriched, ${enrichmentResults.upgraded} risk level changes`);
      
      res.json({
        success: true,
        totalFound: results.length,
        ...enrichmentResults
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/apply-360-perspectives", "apply 360 perspectives");
    }
  });

  // ============================================
  // Entity Detection Results Endpoints
  // ============================================

  // GET /api/fwa/entity-detection/provider/:providerId - Get entity-level detection results for a provider
  app.get("/api/fwa/entity-detection/provider/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;
      
      const result = await db.execute(sql`
        SELECT *
        FROM fwa_provider_detection_results
        WHERE provider_id = ${providerId}
        ORDER BY analyzed_at DESC
        LIMIT 1
      `);
      
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "No detection results found for provider" });
      }
      
      // Calculate risk level dynamically from composite score
      const row = result.rows[0] as any;
      const compositeScore = parseFloat(row.composite_score) || 0;
      const dynamicRiskLevel = compositeScore >= 40 ? "critical" :
                               compositeScore >= 30 ? "high" :
                               compositeScore >= 20 ? "medium" :
                               compositeScore >= 10 ? "low" : "minimal";
      
      res.json({ ...row, risk_level: dynamicRiskLevel });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/entity-detection/provider/:providerId", "fetch provider detection results");
    }
  });

  // POST /api/fwa/entity-detection/provider/:providerId/analyze - Aggregate claim-level detection to provider-level
  app.post("/api/fwa/entity-detection/provider/:providerId/analyze", async (req, res) => {
    try {
      const { providerId } = req.params;
      
      if (!providerId || providerId.trim() === '') {
        return res.status(400).json({ error: "Provider ID is required" });
      }
      
      const aggregationResult = await aggregateProviderDetection(providerId);
      
      if (!aggregationResult.success) {
        return res.status(404).json({ 
          error: aggregationResult.error || "Failed to aggregate provider detection results" 
        });
      }
      
      res.json(aggregationResult.result);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/entity-detection/provider/:providerId/analyze", "aggregate provider detection");
    }
  });

  // GET /api/fwa/entity-detection/doctor/:doctorId - Get entity-level detection results for a doctor
  app.get("/api/fwa/entity-detection/doctor/:doctorId", async (req, res) => {
    try {
      const { doctorId } = req.params;
      
      const result = await db.execute(sql`
        SELECT *
        FROM fwa_doctor_detection_results
        WHERE doctor_id = ${doctorId}
        ORDER BY analyzed_at DESC
        LIMIT 1
      `);
      
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "No detection results found for doctor" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/entity-detection/doctor/:doctorId", "fetch doctor detection results");
    }
  });

  // GET /api/fwa/entity-detection/patient/:patientId - Get entity-level detection results for a patient
  app.get("/api/fwa/entity-detection/patient/:patientId", async (req, res) => {
    try {
      const { patientId } = req.params;
      
      const result = await db.execute(sql`
        SELECT *
        FROM fwa_patient_detection_results
        WHERE patient_id = ${patientId}
        ORDER BY analyzed_at DESC
        LIMIT 1
      `);
      
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "No detection results found for patient" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/entity-detection/patient/:patientId", "fetch patient detection results");
    }
  });

  // ============================================
  // Entity Timeline Endpoints
  // ============================================

  // GET /api/fwa/timeline/provider/:providerId - Get timeline data for a provider
  app.get("/api/fwa/timeline/provider/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;
      
      const result = await db.execute(sql`
        SELECT *
        FROM fwa_provider_timeline
        WHERE provider_id = ${providerId}
        ORDER BY batch_date DESC
        LIMIT 20
      `);
      
      res.json(result.rows || []);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/timeline/provider/:providerId", "fetch provider timeline");
    }
  });

  // GET /api/fwa/timeline/doctor/:doctorId - Get timeline data for a doctor
  app.get("/api/fwa/timeline/doctor/:doctorId", async (req, res) => {
    try {
      const { doctorId } = req.params;
      
      const result = await db.execute(sql`
        SELECT *
        FROM fwa_doctor_timeline
        WHERE doctor_id = ${doctorId}
        ORDER BY batch_date DESC
        LIMIT 20
      `);
      
      res.json(result.rows || []);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/timeline/doctor/:doctorId", "fetch doctor timeline");
    }
  });

  // GET /api/fwa/timeline/patient/:patientId - Get timeline data for a patient
  app.get("/api/fwa/timeline/patient/:patientId", async (req, res) => {
    try {
      const { patientId } = req.params;
      
      const result = await db.execute(sql`
        SELECT *
        FROM fwa_patient_timeline
        WHERE patient_id = ${patientId}
        ORDER BY batch_date DESC
        LIMIT 20
      `);
      
      res.json(result.rows || []);
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/timeline/patient/:patientId", "fetch patient timeline");
    }
  });

  // GET /api/fwa/operations-summary - Aggregated cross-module data for Operations Center dashboard
  app.get("/api/fwa/operations-summary", async (req, res) => {
    try {
      // 1. Attention Required metrics - using COUNT queries for efficiency
      // Check entity-level tables first, fallback to claim-level detections if empty
      const highRiskEntitiesQuery = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM fwa_provider_detection_results WHERE risk_level IN ('critical', 'high')) +
          (SELECT COUNT(*) FROM fwa_doctor_detection_results WHERE risk_level IN ('critical', 'high')) +
          (SELECT COUNT(*) FROM fwa_patient_detection_results WHERE risk_level IN ('critical', 'high')) as entity_total,
          (SELECT COUNT(DISTINCT provider_id) FROM fwa_detection_results WHERE composite_risk_level IN ('critical', 'high')) as claim_providers,
          (SELECT COUNT(*) FROM fwa_detection_results WHERE composite_risk_level IN ('critical', 'high')) as claim_total
      `);
      const entityTotal = parseInt(String(highRiskEntitiesQuery.rows?.[0]?.entity_total || 0));
      const claimProviders = parseInt(String(highRiskEntitiesQuery.rows?.[0]?.claim_providers || 0));
      const claimTotal = parseInt(String(highRiskEntitiesQuery.rows?.[0]?.claim_total || 0));
      // Use entity-level if populated, otherwise use claim-level distinct providers
      const highRiskEntities = entityTotal > 0 ? entityTotal : (claimProviders > 0 ? claimProviders : claimTotal);

      const overdueEnforcementQuery = await db.execute(sql`
        SELECT COUNT(*) as count FROM enforcement_cases 
        WHERE status NOT IN ('resolved', 'closed') 
        AND (warning_due_date < NOW() OR corrective_action_due_date < NOW())
      `);
      const overdueEnforcement = parseInt(String(overdueEnforcementQuery.rows?.[0]?.count || 0));

      const pendingCasesQuery = await db.execute(sql`
        SELECT COUNT(*) as count FROM fwa_cases 
        WHERE status IN ('analyzing', 'action_pending')
      `);
      const pendingCases = parseInt(String(pendingCasesQuery.rows?.[0]?.count || 0));

      const pendingPreAuthQuery = await db.execute(sql`
        SELECT COUNT(*) as count FROM pre_auth_claims 
        WHERE status = 'pending_review'
      `);
      const pendingPreAuth = parseInt(String(pendingPreAuthQuery.rows?.[0]?.count || 0));

      // 2. Key Metrics
      const activeCasesQuery = await db.execute(sql`
        SELECT COUNT(*) as count FROM fwa_cases 
        WHERE status NOT IN ('resolved', 'escalated')
      `);
      const activeCases = parseInt(String(activeCasesQuery.rows?.[0]?.count || 0));

      const pendingActionsQuery = await db.execute(sql`
        SELECT COUNT(*) as count FROM fwa_cases 
        WHERE status = 'action_pending'
      `);
      const pendingActions = parseInt(String(pendingActionsQuery.rows?.[0]?.count || 0));

      // Total Impact = combined exposure from all high-risk provider detection results
      const totalImpactQuery = await db.execute(sql`
        SELECT COALESCE(SUM((aggregated_metrics->>'totalExposure')::numeric), 0) as total
        FROM fwa_provider_detection_results
        WHERE aggregated_metrics->>'totalExposure' IS NOT NULL
      `);
      const totalSavings = parseFloat(String(totalImpactQuery.rows?.[0]?.total || 0));

      // 3. Recent Activity - Last 10 items from across modules (fetch separately and combine)
      const [providerDetections, doctorDetections, patientDetections, enforcementUpdates, caseUpdates] = await Promise.all([
        db.execute(sql`
          SELECT id, provider_id as entity_id, risk_level::text as status, created_at as timestamp
          FROM fwa_provider_detection_results ORDER BY created_at DESC LIMIT 4
        `),
        db.execute(sql`
          SELECT id, doctor_id as entity_id, risk_level::text as status, created_at as timestamp
          FROM fwa_doctor_detection_results ORDER BY created_at DESC LIMIT 3
        `),
        db.execute(sql`
          SELECT id, patient_id as entity_id, risk_level::text as status, created_at as timestamp
          FROM fwa_patient_detection_results ORDER BY created_at DESC LIMIT 3
        `),
        db.execute(sql`
          SELECT id, case_number, status::text as status, updated_at as timestamp
          FROM enforcement_cases ORDER BY updated_at DESC LIMIT 5
        `),
        db.execute(sql`
          SELECT id, case_id, status::text as status, updated_at as timestamp
          FROM fwa_cases ORDER BY updated_at DESC LIMIT 5
        `)
      ]);

      // Combine and format recent activity
      const activityItems: Array<{id: string; type: string; title: string; timestamp: Date | null; status: string; entityType: string}> = [];
      
      (providerDetections.rows || []).forEach((row: any) => {
        activityItems.push({
          id: row.id,
          type: 'detection',
          title: `Provider Detection: ${row.entity_id}`,
          timestamp: row.timestamp,
          status: row.status || 'unknown',
          entityType: 'provider'
        });
      });
      
      (doctorDetections.rows || []).forEach((row: any) => {
        activityItems.push({
          id: row.id,
          type: 'detection',
          title: `Doctor Detection: ${row.entity_id}`,
          timestamp: row.timestamp,
          status: row.status || 'unknown',
          entityType: 'doctor'
        });
      });
      
      (patientDetections.rows || []).forEach((row: any) => {
        activityItems.push({
          id: row.id,
          type: 'detection',
          title: `Patient Detection: ${row.entity_id}`,
          timestamp: row.timestamp,
          status: row.status || 'unknown',
          entityType: 'patient'
        });
      });
      
      (enforcementUpdates.rows || []).forEach((row: any) => {
        activityItems.push({
          id: row.id,
          type: 'enforcement',
          title: `Enforcement: ${row.case_number}`,
          timestamp: row.timestamp,
          status: row.status || 'unknown',
          entityType: 'provider'
        });
      });
      
      (caseUpdates.rows || []).forEach((row: any) => {
        activityItems.push({
          id: row.id,
          type: 'case',
          title: `FWA Case: ${row.case_id}`,
          timestamp: row.timestamp,
          status: row.status || 'unknown',
          entityType: 'case'
        });
      });

      // Sort by timestamp descending and take top 10
      const recentActivity = activityItems
        .sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 10);

      // 4. System Health - Static agent metrics for now
      const systemHealth = {
        agentMetrics: {
          analysisAgent: { status: 'active', lastRun: new Date().toISOString(), successRate: 0.95 },
          categorizationAgent: { status: 'active', lastRun: new Date().toISOString(), successRate: 0.92 },
          actionAgent: { status: 'active', lastRun: new Date().toISOString(), successRate: 0.98 },
          historyAgent: { status: 'active', lastRun: new Date().toISOString(), successRate: 0.97 }
        },
        systemStatus: 'healthy',
        lastUpdated: new Date().toISOString()
      };

      res.json({
        attentionRequired: {
          highRiskEntities,
          overdueEnforcement,
          pendingCases,
          pendingPreAuth
        },
        keyMetrics: {
          activeCases,
          highRiskCount: highRiskEntities,
          pendingActions,
          totalSavings
        },
        recentActivity,
        systemHealth
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/operations-summary", "fetch operations summary");
    }
  });

  // ============================================================
  // AI-POWERED RULE GENERATION
  // ============================================================
  
  const aiRuleGenerationSchema = z.object({
    prompt: z.string().min(10, "Please provide a more detailed description of the rule you want to create"),
  });

  app.post("/api/fwa/rules/ai-generate", async (req, res) => {
    try {
      const { prompt } = aiRuleGenerationSchema.parse(req.body);
      const sanitizedPrompt = sanitizeForAI(prompt);

      const systemPrompt = `You are an expert healthcare fraud, waste, and abuse (FWA) detection specialist for the Saudi Arabia Council of Health Insurance (CHI). Your task is to generate a detection rule based on the user's description.

Generate a rule in JSON format with the following structure:
{
  "ruleCode": "FWA-XXX-NNN" (e.g., FWA-UPC-001 for upcoding, FWA-UNB-001 for unbundling),
  "name": "Clear rule name in English",
  "description": "Detailed description of what the rule detects",
  "category": one of ["upcoding", "unbundling", "phantom_billing", "duplicate_claims", "impossible_combinations", "credential_mismatch", "temporal_anomaly", "geographic_anomaly", "frequency_abuse", "cost_outlier", "service_mismatch", "documentation_gap", "network_violation", "preauth_bypass", "drug_abuse", "lab_abuse", "clinical_plausibility", "provider_pattern", "kickback", "custom"],
  "severity": one of ["low", "medium", "high", "critical"],
  "ruleType": one of ["pattern", "threshold", "combination", "temporal", "ml_assisted"],
  "conditions": {
    "field": "claim field name (e.g., amount, procedureCode, diagnosisCode, providerId)",
    "operator": one of ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equals", "less_than_or_equals", "between", "contains", "not_contains", "starts_with", "ends_with", "in", "not_in", "regex", "not_null", "is_null"],
    "value": the comparison value
  },
  "weight": decimal between 0.5 and 5.0 indicating rule importance,
  "regulatoryReference": "Reference to CHI regulations or NPHIES guidelines if applicable",
  "applicableClaimTypes": array of claim types this applies to ["inpatient", "outpatient", "emergency", "pharmacy", "dental"],
  "confidence": number 0-100 indicating how confident you are in this rule generation
}

For complex rules, use "and" or "or" arrays in conditions:
{
  "and": [
    {"field": "amount", "operator": "greater_than", "value": 10000},
    {"field": "claimType", "operator": "equals", "value": "outpatient"}
  ]
}

Available claim fields: amount, procedureCode, diagnosisCode, providerId, patientId, claimType, serviceDate, quantity, unitPrice, networkStatus, specialtyCode, benefitCode, isPreAuthorized, providerType, city

Respond ONLY with valid JSON, no markdown or explanations.`;

      const response = await withRetry(async () => {
        return openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: sanitizedPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });
      }, 3, 1000);

      const content = response.choices[0]?.message?.content || "{}";
      let generatedRule;
      
      try {
        generatedRule = JSON.parse(content);
      } catch {
        return res.status(422).json({ 
          error: "Failed to parse AI response",
          rawContent: content 
        });
      }

      // Add default fields if missing
      generatedRule.isActive = true;
      generatedRule.confidence = generatedRule.confidence || 75;

      res.json({
        success: true,
        rule: generatedRule,
        originalPrompt: prompt
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/rules/ai-generate", "generate rule with AI");
    }
  });

  // ============================================================
  // AI-POWERED BATCH FILE FIELD MAPPING
  // ============================================================

  const aiBatchMappingSchema = z.object({
    columns: z.array(z.string()),
    sampleData: z.array(z.record(z.any())).optional(),
    fileName: z.string().optional()
  });

  // Required schema fields for FWA batch upload
  const REQUIRED_SCHEMA_FIELDS = [
    { field: "claimId", description: "Unique claim identifier", required: true, aliases: ["claim_id", "claim_number", "claim_no", "id"] },
    { field: "claimReference", description: "Claim reference number", required: false, aliases: ["reference", "ref", "claim_ref"] },
    { field: "patientId", description: "Patient identifier", required: true, aliases: ["patient_id", "member_id", "beneficiary_id", "patient"] },
    { field: "providerId", description: "Provider/facility identifier", required: true, aliases: ["provider_id", "facility_id", "hospital_id", "provider"] },
    { field: "amount", description: "Total claim amount", required: true, aliases: ["total_amount", "claim_amount", "billed_amount", "total", "charge"] },
    { field: "procedureCode", description: "CPT/HCPCS procedure code", required: true, aliases: ["procedure", "cpt_code", "cpt", "service_code", "hcpcs"] },
    { field: "diagnosisCode", description: "ICD-10 diagnosis code", required: true, aliases: ["diagnosis", "icd_code", "icd10", "primary_diagnosis", "dx_code"] },
    { field: "serviceDate", description: "Date of service", required: true, aliases: ["service_date", "date_of_service", "dos", "claim_date", "treatment_date"] },
    { field: "claimType", description: "Type of claim (inpatient/outpatient)", required: false, aliases: ["claim_type", "type", "visit_type"] },
    { field: "payer", description: "Insurance payer name", required: false, aliases: ["payer_name", "insurance", "insurer", "carrier"] },
    { field: "specialtyCode", description: "Medical specialty code", required: false, aliases: ["specialty", "spec_code", "department"] },
    { field: "quantity", description: "Service quantity/units", required: false, aliases: ["qty", "units", "count"] },
    { field: "unitPrice", description: "Price per unit", required: false, aliases: ["unit_price", "unit_cost", "price"] },
    { field: "networkStatus", description: "In-network or out-of-network", required: false, aliases: ["network", "in_network", "network_type"] },
    { field: "city", description: "City/location of service", required: false, aliases: ["location", "facility_city", "service_location"] },
    { field: "providerType", description: "Type of provider", required: false, aliases: ["provider_type", "facility_type"] }
  ];

  app.post("/api/fwa/batch/ai-mapping", async (req, res) => {
    try {
      const { columns, sampleData, fileName } = aiBatchMappingSchema.parse(req.body);

      // Build sample data preview for AI
      const samplePreview = sampleData?.slice(0, 3).map(row => {
        const preview: Record<string, any> = {};
        columns.forEach(col => {
          preview[col] = row[col];
        });
        return preview;
      }) || [];

      const systemPrompt = `You are a data mapping expert for healthcare claims data. Your task is to map uploaded file columns to the required FWA (Fraud, Waste, Abuse) detection schema fields.

Required Schema Fields:
${REQUIRED_SCHEMA_FIELDS.map(f => `- ${f.field}: ${f.description} (${f.required ? 'REQUIRED' : 'optional'}) - common names: ${f.aliases.join(', ')}`).join('\n')}

User's File Columns: ${columns.join(', ')}

Sample Data (first 3 rows):
${JSON.stringify(samplePreview, null, 2)}

For each schema field, determine:
1. Which uploaded column best matches (if any)
2. Confidence level (0-100): 
   - 90-100: Exact or very close match
   - 70-89: Likely match based on data/name similarity
   - 50-69: Possible match, needs user confirmation
   - 0-49: Low confidence, user should verify

Respond with JSON:
{
  "mappings": [
    {
      "schemaField": "field name from required schema",
      "sourceColumn": "matched column from user's file or null",
      "confidence": number 0-100,
      "reason": "brief explanation of why this mapping was chosen",
      "required": boolean,
      "needsConfirmation": boolean (true if confidence < 70)
    }
  ],
  "unmappedColumns": ["list of user columns that don't map to any schema field"],
  "overallConfidence": number 0-100,
  "warnings": ["any data quality issues or concerns"]
}`;

      const response = await withRetry(async () => {
        return openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Map these columns to the FWA claims schema: ${columns.join(', ')}` }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });
      }, 3, 1000);

      const content = response.choices[0]?.message?.content || "{}";
      let mappingResult;
      
      try {
        mappingResult = JSON.parse(content);
      } catch {
        return res.status(422).json({ 
          error: "Failed to parse AI mapping response",
          rawContent: content 
        });
      }

      // Ensure all required fields are in the response
      const missingRequired = REQUIRED_SCHEMA_FIELDS
        .filter(f => f.required)
        .filter(f => !mappingResult.mappings?.find((m: any) => m.schemaField === f.field && m.sourceColumn));

      if (missingRequired.length > 0) {
        mappingResult.warnings = mappingResult.warnings || [];
        mappingResult.warnings.push(`Missing required fields: ${missingRequired.map(f => f.field).join(', ')}`);
      }

      res.json({
        success: true,
        ...mappingResult,
        fileName,
        totalColumns: columns.length,
        schemaFields: REQUIRED_SCHEMA_FIELDS
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/batch/ai-mapping", "generate AI field mapping");
    }
  });

  // ── Flagged Claims (DB-backed Saudi healthcare claims) ──
  app.get("/api/fwa/flagged-claims", async (_req, res) => {
    try {
      const flaggedClaims = await db
        .select()
        .from(claims)
        .where(eq(claims.flagged, true))
        .orderBy(desc(claims.registrationDate))
        .limit(100);

      const summary = {
        totalFlagged: flaggedClaims.length,
        totalExposure: flaggedClaims.reduce((sum, c) => sum + Number(c.amount || 0), 0),
        confirmedFraud: flaggedClaims.filter(c => c.status === "confirmed_fraud").length,
        underReview: flaggedClaims.filter(c => c.status === "under_review").length,
      };

      res.json({ claims: flaggedClaims, summary });
    } catch (error) {
      console.error("[FWA] Error fetching flagged claims:", error);
      res.status(500).json({ error: "Failed to fetch flagged claims" });
    }
  });

  // ========== CPOE Medical Coding Intelligence Endpoints ==========

  // GET /api/fwa/cpoe/rejection-trends — Monthly acceptance/rejection data
  app.get("/api/fwa/cpoe/rejection-trends", async (_req, res) => {
    try {
      const trends = [
        { month: "Mar 2025", total: 14200, accepted: 12100, rejected: 2100, acceptanceRate: 85.2 },
        { month: "Apr 2025", total: 14800, accepted: 12700, rejected: 2100, acceptanceRate: 85.8 },
        { month: "May 2025", total: 15100, accepted: 13000, rejected: 2100, acceptanceRate: 86.1 },
        { month: "Jun 2025", total: 14600, accepted: 12400, rejected: 2200, acceptanceRate: 84.9 },
        { month: "Jul 2025", total: 13900, accepted: 11800, rejected: 2100, acceptanceRate: 84.9 },
        { month: "Aug 2025", total: 14300, accepted: 12200, rejected: 2100, acceptanceRate: 85.3 },
        { month: "Sep 2025", total: 15200, accepted: 13100, rejected: 2100, acceptanceRate: 86.2 },
        { month: "Oct 2025", total: 15800, accepted: 13600, rejected: 2200, acceptanceRate: 86.1 },
        { month: "Nov 2025", total: 15400, accepted: 13200, rejected: 2200, acceptanceRate: 85.7 },
        { month: "Dec 2025", total: 14100, accepted: 11900, rejected: 2200, acceptanceRate: 84.4 },
        { month: "Jan 2026", total: 16200, accepted: 13800, rejected: 2400, acceptanceRate: 85.2 },
        { month: "Feb 2026", total: 16800, accepted: 14300, rejected: 2500, acceptanceRate: 85.1 },
      ];
      res.json({ trends });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/rejection-trends", "get rejection trends");
    }
  });

  // GET /api/fwa/cpoe/frequency-table — Top ICD-CPT pairs by volume with acceptance rates
  app.get("/api/fwa/cpoe/frequency-table", async (_req, res) => {
    try {
      const pairs = [
        { icdCode: "Z23", icdDescription: "Encounter for immunization", cptCode: "90686", cptDescription: "Influenza vaccine, quadrivalent", total: 9840, accepted: 9640, rejected: 200, acceptanceRate: 98.0 },
        { icdCode: "E11.9", icdDescription: "Type 2 diabetes mellitus without complications", cptCode: "99213", cptDescription: "Office visit, established patient (low complexity)", total: 8720, accepted: 8110, rejected: 610, acceptanceRate: 93.0 },
        { icdCode: "I10", icdDescription: "Essential hypertension", cptCode: "99214", cptDescription: "Office visit, established patient (moderate complexity)", total: 7950, accepted: 7473, rejected: 477, acceptanceRate: 94.0 },
        { icdCode: "J06.9", icdDescription: "Acute upper respiratory infection", cptCode: "99215", cptDescription: "Office visit, established patient (high complexity)", total: 7200, accepted: 4320, rejected: 2880, acceptanceRate: 60.0 },
        { icdCode: "O82", icdDescription: "Encounter for cesarean delivery", cptCode: "59510", cptDescription: "Cesarean delivery with postpartum care", total: 6450, accepted: 5805, rejected: 645, acceptanceRate: 90.0 },
        { icdCode: "O80", icdDescription: "Encounter for full-term uncomplicated delivery", cptCode: "59400", cptDescription: "Routine obstetric care, vaginal delivery", total: 6100, accepted: 5795, rejected: 305, acceptanceRate: 95.0 },
        { icdCode: "K04.7", icdDescription: "Periapical abscess without sinus", cptCode: "D2740", cptDescription: "Crown - porcelain/ceramic substrate", total: 5800, accepted: 3770, rejected: 2030, acceptanceRate: 65.0 },
        { icdCode: "M54.5", icdDescription: "Low back pain", cptCode: "99213", cptDescription: "Office visit, established patient (low complexity)", total: 5400, accepted: 4860, rejected: 540, acceptanceRate: 90.0 },
        { icdCode: "K02.1", icdDescription: "Dental caries on pit and fissure surface", cptCode: "D2150", cptDescription: "Amalgam filling - two surfaces", total: 5100, accepted: 4743, rejected: 357, acceptanceRate: 93.0 },
        { icdCode: "Z34.0", icdDescription: "Encounter for supervision of normal first pregnancy", cptCode: "99213", cptDescription: "Office visit, established patient (low complexity)", total: 4800, accepted: 4560, rejected: 240, acceptanceRate: 95.0 },
        { icdCode: "K08.1", icdDescription: "Complete loss of teeth due to trauma", cptCode: "D7210", cptDescription: "Surgical removal of erupted tooth", total: 4200, accepted: 3780, rejected: 420, acceptanceRate: 90.0 },
        { icdCode: "J18.9", icdDescription: "Pneumonia, unspecified organism", cptCode: "71046", cptDescription: "Chest X-ray, 2 views", total: 3950, accepted: 3831, rejected: 119, acceptanceRate: 97.0 },
        { icdCode: "N39.0", icdDescription: "Urinary tract infection, site not specified", cptCode: "81001", cptDescription: "Urinalysis with microscopy", total: 3600, accepted: 3528, rejected: 72, acceptanceRate: 98.0 },
        { icdCode: "O80", icdDescription: "Encounter for full-term uncomplicated delivery", cptCode: "59510", cptDescription: "Cesarean delivery with postpartum care", total: 3200, accepted: 576, rejected: 2624, acceptanceRate: 18.0 },
        { icdCode: "K21.0", icdDescription: "GERD with esophagitis", cptCode: "43239", cptDescription: "Upper GI endoscopy with biopsy", total: 2900, accepted: 2610, rejected: 290, acceptanceRate: 90.0 },
      ];
      res.json({ pairs });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/frequency-table", "get frequency table");
    }
  });

  // POST /api/fwa/cpoe/validate-pair — Validate ICD + CPT code pair
  app.post("/api/fwa/cpoe/validate-pair", async (req, res) => {
    try {
      const { icdCode, cptCode } = req.body;

      if (!icdCode || !cptCode) {
        return res.status(400).json({ error: "Both icdCode and cptCode are required" });
      }

      const upperIcd = String(icdCode).toUpperCase().trim();
      const upperCpt = String(cptCode).toUpperCase().trim();

      // Hard-coded known rejections — Saudi case-study-relevant pairs
      const knownRejections: Record<string, { reason: string; confidence: number; historicalRate: number }> = {
        "O80+59510": {
          reason: "Spontaneous vaginal delivery (O80) billed as cesarean delivery (59510). These are mutually exclusive procedures — a delivery cannot be both spontaneous vaginal and cesarean. SBS V3.0 explicitly flags this combination.",
          confidence: 98.5,
          historicalRate: 18.0,
        },
        "K04.7+D2740": {
          reason: "Periapical abscess (K04.7) paired with crown placement (D2740) is clinically implausible. An active periapical infection contraindicates permanent crown restoration — the infection must be resolved first via root canal or extraction.",
          confidence: 96.3,
          historicalRate: 65.0,
        },
        "J06.9+99215": {
          reason: "Acute upper respiratory infection (J06.9) paired with high-complexity office visit (99215). URI is a straightforward diagnosis that does not support the medical necessity for a level 5 E/M visit. This is a common upcoding pattern flagged by SBS V3.0.",
          confidence: 95.2,
          historicalRate: 60.0,
        },
        "K02.1+D7210": {
          reason: "Dental caries on pit and fissure surface (K02.1) paired with surgical tooth extraction (D7210). Caries should be treated with a filling (D2150), not extraction. Extraction is only warranted when the tooth is non-restorable.",
          confidence: 93.7,
          historicalRate: 22.4,
        },
        "Z34.0+59510": {
          reason: "Supervision of normal first pregnancy (Z34.0) billed with cesarean delivery (59510). Z34.0 is a prenatal supervision code and cannot be used as the primary diagnosis for a delivery procedure — a delivery diagnosis (O80-O82) is required.",
          confidence: 97.1,
          historicalRate: 8.5,
        },
        "O80+99215": {
          reason: "Full-term uncomplicated delivery (O80) billed as a high-complexity office visit (99215). Delivery services require obstetric procedure codes (59400-59622), not evaluation and management codes. Wrong code category.",
          confidence: 96.8,
          historicalRate: 5.2,
        },
        "K02.9+D2740": {
          reason: "Dental caries (K02.9) billed directly with crown placement (D2740) without prior comprehensive exam or restoration attempt. Crown placement requires documented prior treatment steps per SBS V3.0 dental coding standards.",
          confidence: 92.8,
          historicalRate: 31.5,
        },
        "E11.9+90686": {
          reason: "Type 2 diabetes (E11.9) paired with influenza vaccine administration (90686). The diagnosis code must reflect the reason for the immunization (Z23), not the patient's chronic condition. Incorrect primary diagnosis for preventive service.",
          confidence: 91.4,
          historicalRate: 35.8,
        },
      };

      const key = `${upperIcd}+${upperCpt}`;
      const rejection = knownRejections[key];

      if (rejection) {
        return res.json({
          decision: "REJECT",
          icdCode: upperIcd,
          cptCode: upperCpt,
          confidence: rejection.confidence,
          historicalAcceptanceRate: rejection.historicalRate,
          reason: rejection.reason,
        });
      }

      return res.json({
        decision: "ACCEPT",
        icdCode: upperIcd,
        cptCode: upperCpt,
        confidence: 87.5,
        historicalAcceptanceRate: 94.2,
        reason: `The ICD-10 code ${upperIcd} and CPT code ${upperCpt} represent a clinically valid pairing. No known coding conflicts or medical necessity issues detected.`,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/validate-pair", "validate code pair");
    }
  });

  // GET /api/fwa/cpoe/processing-metrics — Processing metrics and common rejection reasons
  app.get("/api/fwa/cpoe/processing-metrics", async (_req, res) => {
    try {
      res.json({
        avgProcessingTimeMs: 1247,
        totalProcessed: 183150,
        commonRejectionReasons: [
          { reason: "SBS V3.0 Coding Standard Mismatch", count: 8420, percentage: 33.7 },
          { reason: "ICD-CPT Clinical Implausibility", count: 5630, percentage: 22.5 },
          { reason: "Duplicate Service Within Window", count: 3780, percentage: 15.1 },
          { reason: "Upcoding — Complexity Level Exceeded", count: 2950, percentage: 11.8 },
          { reason: "Pre-Authorization Required but Missing", count: 2340, percentage: 9.4 },
          { reason: "Provider Not Authorized for Service", count: 1880, percentage: 7.5 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/processing-metrics", "get processing metrics");
    }
  });
}

function generateMockServices(claim: any): any[] {
  const serviceCodes = [
    { code: "99215", desc: "Office visit, high complexity", price: 150 },
    { code: "99214", desc: "Office visit, moderate complexity", price: 95 },
    { code: "85025", desc: "Complete blood count", price: 45 },
    { code: "80053", desc: "Comprehensive metabolic panel", price: 65 },
    { code: "93000", desc: "Electrocardiogram", price: 120 },
    { code: "71046", desc: "Chest X-ray", price: 180 },
  ];
  
  const violations = claim.flagged ? [
    { label: "Upcoding suspected", severity: "high" },
    { label: "Frequency exceeded", severity: "medium" },
    { label: "Unbundling detected", severity: "high" },
  ] : [];
  
  const count = Math.floor(Math.random() * 4) + 2;
  const services = [];
  const usedCodes = new Set();
  
  for (let i = 0; i < count && usedCodes.size < serviceCodes.length; i++) {
    let svc = serviceCodes[Math.floor(Math.random() * serviceCodes.length)];
    while (usedCodes.has(svc.code)) {
      svc = serviceCodes[Math.floor(Math.random() * serviceCodes.length)];
    }
    usedCodes.add(svc.code);
    
    const qty = Math.floor(Math.random() * 3) + 1;
    const hasViolation = claim.flagged && Math.random() > 0.5;
    const violation = hasViolation ? violations[Math.floor(Math.random() * violations.length)] : null;
    
    services.push({
      id: `svc-${Date.now()}-${i}`,
      claimId: claim.id,
      serviceCode: svc.code,
      serviceDescription: svc.desc,
      quantity: qty,
      unitPrice: String(svc.price * (hasViolation ? 1.3 : 1)),
      totalAmount: String(svc.price * qty * (hasViolation ? 1.3 : 1)),
      adjudicationStatus: hasViolation ? "denied" : "approved",
      approvalStatus: hasViolation ? "rejected" : "approved",
      violations: violation ? [violation.label] : [],
    });
  }
  
  return services;
}
