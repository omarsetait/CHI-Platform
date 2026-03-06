import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, pgEnum, serial, vector, index, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum for RBAC
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "claims_reviewer",
  "fwa_analyst",
  "provider_manager",
  "auditor",
  "viewer"
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Stores bcrypt hash
  role: userRoleEnum("role").default("viewer").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Audit log for HIPAA compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // e.g., "VIEW_CLAIM", "UPDATE_CASE", "EXPORT_DATA"
  resourceType: text("resource_type").notNull(), // e.g., "claim", "patient", "provider"
  resourceId: text("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"), // Additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================
// Pre-Authorization Module Schema
// ============================================

// Pre-Auth Enums
export const preAuthClaimStatusEnum = pgEnum("pre_auth_claim_status", [
  "ingested",
  "analyzing",
  "aggregated",
  "pending_review",
  "approved",
  "rejected",
  "request_info"
]);

export const preAuthSeverityEnum = pgEnum("pre_auth_severity", ["HIGH", "MEDIUM", "LOW"]);

export const preAuthPriorityEnum = pgEnum("pre_auth_priority", ["HIGH", "NORMAL", "LOW"]);

export const preAuthBatchStatusEnum = pgEnum("pre_auth_batch_status", ["pending", "processing", "completed", "failed"]);

export const preAuthDocumentTypeEnum = pgEnum("pre_auth_document_type", [
  "regulatory",
  "policy",
  "medical_guidelines",
  "patient_history",
  "declaration"
]);

export const preAuthDocumentStatusEnum = pgEnum("pre_auth_document_status", [
  "pending",
  "processing",
  "ready",
  "failed"
]);

export const preAuthSignalTypeEnum = pgEnum("pre_auth_signal_type", [
  "regulatory_compliance",
  "coverage_eligibility",
  "clinical_necessity",
  "past_patterns",
  "disclosure_check"
]);

export const preAuthRecommendationEnum = pgEnum("pre_auth_recommendation", [
  "APPROVE",
  "REJECT",
  "PEND_REVIEW",
  "REQUEST_INFO"
]);

// Pre-Auth Batches table
export const preAuthBatches = pgTable("pre_auth_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: preAuthBatchStatusEnum("status").default("pending"),
  priority: preAuthPriorityEnum("priority").default("NORMAL"),
  totalClaims: integer("total_claims").default(0),
  processedClaims: integer("processed_claims").default(0),
  failedClaims: integer("failed_claims").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPreAuthBatchSchema = createInsertSchema(preAuthBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPreAuthBatch = z.infer<typeof insertPreAuthBatchSchema>;
export type PreAuthBatch = typeof preAuthBatches.$inferSelect;

// Pre-Auth Claims table
export const preAuthClaims = pgTable("pre_auth_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull().unique(),
  payerId: text("payer_id").notNull(),
  memberId: text("member_id").notNull(),
  memberDob: text("member_dob"),
  memberGender: text("member_gender"),
  policyPlanId: text("policy_plan_id"),
  providerId: text("provider_id"),
  specialty: text("specialty"),
  networkStatus: text("network_status"),
  encounterType: text("encounter_type"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  diagnoses: jsonb("diagnoses").$type<Array<{
    code_system: string;
    code: string;
    desc: string;
    type?: string;
  }>>().default([]),
  lineItems: jsonb("line_items").$type<Array<{
    line_id: string;
    code_type: string;
    code: string;
    code_system?: string;
    desc: string;
    units: number;
    net_amount: number;
    service_date?: string;
    prior_auth?: string;
    ndc?: string;
    gtin?: string;
    days_supply?: number;
    prescription_number?: string;
    prescriber_id?: string;
  }>>().default([]),
  clinicalDocuments: jsonb("clinical_documents").$type<Array<{
    doc_id: string;
    type: string;
    mime: string;
    text?: string;
    uri?: string;
    fileName?: string;
    confidence?: number;
    sections?: Array<{ title: string; content: string }>;
    documentCategory?: string;
  }>>().default([]),
  status: preAuthClaimStatusEnum("status").default("ingested"),
  processingPhase: integer("processing_phase").default(1),
  priority: preAuthPriorityEnum("priority").default("NORMAL"),
  batchId: varchar("batch_id").references(() => preAuthBatches.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPreAuthClaimSchema = createInsertSchema(preAuthClaims).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPreAuthClaim = z.infer<typeof insertPreAuthClaimSchema>;
export type PreAuthClaim = typeof preAuthClaims.$inferSelect;

// Pre-Auth Signals table
export const preAuthSignals = pgTable("pre_auth_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => preAuthClaims.id).notNull(),
  detector: preAuthSignalTypeEnum("detector").notNull(),
  signalId: text("signal_id").notNull(),
  riskFlag: boolean("risk_flag").default(false),
  severity: preAuthSeverityEnum("severity"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  recommendation: preAuthRecommendationEnum("recommendation"),
  rationale: text("rationale"),
  evidence: jsonb("evidence").$type<Array<{
    source: string;
    span_start?: number;
    span_end?: number;
    quote: string;
    clause_id?: string;
  }>>().default([]),
  missingInfo: text("missing_info").array(),
  isHardStop: boolean("is_hard_stop").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPreAuthSignalSchema = createInsertSchema(preAuthSignals).omit({
  id: true,
  createdAt: true
});
export type InsertPreAuthSignal = z.infer<typeof insertPreAuthSignalSchema>;
export type PreAuthSignal = typeof preAuthSignals.$inferSelect;

// Pre-Auth Decisions table
export const preAuthDecisions = pgTable("pre_auth_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => preAuthClaims.id).notNull(),
  aggregatedScore: decimal("aggregated_score", { precision: 5, scale: 4 }),
  riskLevel: preAuthSeverityEnum("risk_level"),
  hasHardStop: boolean("has_hard_stop").default(false),
  candidates: jsonb("candidates").$type<Array<{
    rank: number;
    recommendation: string;
    score: number;
    rationale: string;
  }>>().default([]),
  topRecommendation: preAuthRecommendationEnum("top_recommendation"),
  safetyCheckPassed: boolean("safety_check_passed").default(false),
  conflictingSignals: jsonb("conflicting_signals").$type<Array<{
    type: string;
    severity: string;
    description: string;
    conflictingLayers: string[];
    resolution: string;
  }>>().default([]),
  isFinal: boolean("is_final").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPreAuthDecisionSchema = createInsertSchema(preAuthDecisions).omit({
  id: true,
  createdAt: true
});
export type InsertPreAuthDecision = z.infer<typeof insertPreAuthDecisionSchema>;
export type PreAuthDecision = typeof preAuthDecisions.$inferSelect;

// Pre-Auth Adjudicator Actions table
export const preAuthAdjudicatorActions = pgTable("pre_auth_adjudicator_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => preAuthClaims.id).notNull(),
  decisionId: varchar("decision_id").references(() => preAuthDecisions.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  originalRecommendation: preAuthRecommendationEnum("original_recommendation"),
  finalVerdict: preAuthRecommendationEnum("final_verdict").notNull(),
  overrideReason: text("override_reason"),
  timestamp: timestamp("timestamp").defaultNow()
});

export const insertPreAuthAdjudicatorActionSchema = createInsertSchema(preAuthAdjudicatorActions).omit({
  id: true,
  timestamp: true
});
export type InsertPreAuthAdjudicatorAction = z.infer<typeof insertPreAuthAdjudicatorActionSchema>;
export type PreAuthAdjudicatorAction = typeof preAuthAdjudicatorActions.$inferSelect;

// Pre-Auth RLHF Feedback table
export const preAuthRlhfFeedback = pgTable("pre_auth_rlhf_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => preAuthClaims.id).notNull(),
  actionId: varchar("action_id").references(() => preAuthAdjudicatorActions.id),
  feedbackType: text("feedback_type").notNull(),
  agentId: text("agent_id"),
  wasAccepted: boolean("was_accepted"),
  preferenceScore: integer("preference_score"),
  curatedForTraining: boolean("curated_for_training").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPreAuthRlhfFeedbackSchema = createInsertSchema(preAuthRlhfFeedback).omit({
  id: true,
  createdAt: true
});
export type InsertPreAuthRlhfFeedback = z.infer<typeof insertPreAuthRlhfFeedbackSchema>;
export type PreAuthRlhfFeedback = typeof preAuthRlhfFeedback.$inferSelect;

// Pre-Auth Policy Rules table
export const preAuthPolicyRules = pgTable("pre_auth_policy_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: text("rule_id").notNull().unique(),
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(),
  layer: integer("layer").notNull(),
  condition: jsonb("condition").$type<{ field: string; operator: string; value: any }>(),
  action: text("action").notNull(),
  severity: preAuthSeverityEnum("severity"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPreAuthPolicyRuleSchema = createInsertSchema(preAuthPolicyRules).omit({
  id: true,
  createdAt: true
});
export type InsertPreAuthPolicyRule = z.infer<typeof insertPreAuthPolicyRuleSchema>;
export type PreAuthPolicyRule = typeof preAuthPolicyRules.$inferSelect;

// Pre-Auth Agent Configs table
export const preAuthAgentConfigs = pgTable("pre_auth_agent_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: text("agent_id").notNull().unique(),
  agentName: text("agent_name").notNull(),
  layer: integer("layer").notNull(),
  modelProvider: text("model_provider").default("OpenAI"),
  modelName: text("model_name").default("gpt-4o-mini"),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.2"),
  maxTokens: integer("max_tokens").default(4096),
  systemPrompt: text("system_prompt"),
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPreAuthAgentConfigSchema = createInsertSchema(preAuthAgentConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPreAuthAgentConfig = z.infer<typeof insertPreAuthAgentConfigSchema>;
export type PreAuthAgentConfig = typeof preAuthAgentConfigs.$inferSelect;

// Pre-Auth Documents table
export const preAuthDocuments = pgTable("pre_auth_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  documentType: preAuthDocumentTypeEnum("document_type").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  sourceUrl: text("source_url"),
  status: preAuthDocumentStatusEnum("status").default("pending"),
  totalChunks: integer("total_chunks").default(0),
  targetPhase: integer("target_phase"),
  policyPlanId: text("policy_plan_id"),
  memberId: text("member_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPreAuthDocumentSchema = createInsertSchema(preAuthDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPreAuthDocument = z.infer<typeof insertPreAuthDocumentSchema>;
export type PreAuthDocument = typeof preAuthDocuments.$inferSelect;

// Pre-Auth Document Chunks table
export const preAuthDocumentChunks = pgTable("pre_auth_document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => preAuthDocuments.id).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  pageNumber: integer("page_number"),
  sectionTitle: text("section_title"),
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPreAuthDocumentChunkSchema = createInsertSchema(preAuthDocumentChunks).omit({
  id: true,
  createdAt: true
});
export type InsertPreAuthDocumentChunk = z.infer<typeof insertPreAuthDocumentChunkSchema>;
export type PreAuthDocumentChunk = typeof preAuthDocumentChunks.$inferSelect;

// ============================================
// FWA (Fraud, Waste, Abuse) Detection Module Schema
// ============================================

// FWA Enums
export const fwaCaseStatusEnum = pgEnum("fwa_case_status", [
  "draft",
  "analyzing",
  "categorized",
  "action_pending",
  "resolved",
  "escalated"
]);

export const fwaCasePhaseEnum = pgEnum("fwa_case_phase", [
  "a1_analysis",
  "a2_categorization",
  "a3_action"
]);

export const fwaPriorityEnum = pgEnum("fwa_priority", [
  "critical",
  "high",
  "medium",
  "low"
]);

export const fwaFindingTypeEnum = pgEnum("fwa_finding_type", [
  "pattern",
  "correlation",
  "trend",
  "anomaly"
]);

export const fwaFindingSourceEnum = pgEnum("fwa_finding_source", [
  "explainability_report",
  "denial_data",
  "claims_data"
]);

export const fwaCategoryTypeEnum = pgEnum("fwa_category_type", [
  "coding",
  "management",
  "physician",
  "patient"
]);

export const fwaActionTypeEnum = pgEnum("fwa_action_type", [
  "preventive",
  "recovery"
]);

export const fwaActionTrackEnum = pgEnum("fwa_action_track", [
  "live_claims",
  "historical_claims"
]);

export const fwaActionStatusEnum = pgEnum("fwa_action_status", [
  "pending",
  "in_progress",
  "completed",
  "rejected"
]);

export const fwaRegulatoryDocCategoryEnum = pgEnum("fwa_regulatory_doc_category", [
  "nphies",
  "cchi",
  "moh",
  "insurance_authority",
  "other"
]);

export const fwaMedicalGuidelineCategoryEnum = pgEnum("fwa_medical_guideline_category", [
  "clinical_practice",
  "treatment_pathway",
  "medical_necessity",
  "diagnosis_procedure"
]);

export const fwaAgentTypeEnum = pgEnum("fwa_agent_type", [
  "analysis",
  "categorization",
  "action",
  "history_retrieval"
]);

// FWA Cases Table
export const fwaCases = pgTable("fwa_cases", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: text("case_id").notNull().unique(),
  claimId: text("claim_id").notNull(),
  providerId: text("provider_id").notNull(),
  patientId: text("patient_id").notNull(),
  category: text("category").default("coding"),
  status: fwaCaseStatusEnum("status").default("draft"),
  phase: fwaCasePhaseEnum("phase").default("a1_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  priority: fwaPriorityEnum("priority").default("medium"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  recoveryAmount: decimal("recovery_amount", { precision: 12, scale: 2 }),
  assignedTo: text("assigned_to")
});

export const insertFwaCaseSchema = createInsertSchema(fwaCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaCase = z.infer<typeof insertFwaCaseSchema>;
export type FwaCase = typeof fwaCases.$inferSelect;

// FWA Analysis Findings Table - Phase A1 outputs
export const fwaAnalysisFindings = pgTable("fwa_analysis_findings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: text("case_id").notNull().references(() => fwaCases.id),
  findingType: fwaFindingTypeEnum("finding_type").notNull(),
  source: fwaFindingSourceEnum("source").notNull(),
  description: text("description").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  severity: fwaPriorityEnum("severity").notNull(),
  evidence: jsonb("evidence").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaAnalysisFindingSchema = createInsertSchema(fwaAnalysisFindings).omit({
  id: true,
  createdAt: true
});
export type InsertFwaAnalysisFinding = z.infer<typeof insertFwaAnalysisFindingSchema>;
export type FwaAnalysisFinding = typeof fwaAnalysisFindings.$inferSelect;

// FWA Categories Table - Phase A2 outputs
export const fwaCategories = pgTable("fwa_categories", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: text("case_id").notNull().references(() => fwaCases.id),
  categoryType: fwaCategoryTypeEnum("category_type").notNull(),
  subCategory: text("sub_category").notNull(),
  evidenceChain: jsonb("evidence_chain").$type<Record<string, any>>().default({}),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  severityScore: decimal("severity_score", { precision: 5, scale: 2 }).notNull(),
  recommendedActions: text("recommended_actions").array().default([]),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaCategorySchema = createInsertSchema(fwaCategories).omit({
  id: true,
  createdAt: true
});
export type InsertFwaCategory = z.infer<typeof insertFwaCategorySchema>;
export type FwaCategory = typeof fwaCategories.$inferSelect;

// FWA Actions Table - Phase A3 outputs
export const fwaActions = pgTable("fwa_actions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: text("case_id").notNull().references(() => fwaCases.id),
  actionType: fwaActionTypeEnum("action_type").notNull(),
  actionTrack: fwaActionTrackEnum("action_track").notNull(),
  status: fwaActionStatusEnum("status").default("pending"),
  targetClaimId: text("target_claim_id"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  rejectionCode: text("rejection_code"),
  justification: text("justification").notNull(),
  auditTrail: jsonb("audit_trail").$type<Record<string, any>>().default({}),
  executedBy: text("executed_by").notNull(),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaActionSchema = createInsertSchema(fwaActions).omit({
  id: true,
  createdAt: true
});
export type InsertFwaAction = z.infer<typeof insertFwaActionSchema>;
export type FwaAction = typeof fwaActions.$inferSelect;

// FWA Regulatory Documents Table - B1 Knowledge Base
export const fwaRegulatoryDocs = pgTable("fwa_regulatory_docs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: fwaRegulatoryDocCategoryEnum("category").notNull(),
  content: text("content").notNull(),
  regulationId: text("regulation_id").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaRegulatoryDocSchema = createInsertSchema(fwaRegulatoryDocs).omit({
  id: true,
  createdAt: true
});
export type InsertFwaRegulatoryDoc = z.infer<typeof insertFwaRegulatoryDocSchema>;
export type FwaRegulatoryDoc = typeof fwaRegulatoryDocs.$inferSelect;

// FWA Medical Guidelines Table - B2 Knowledge Base
export const fwaMedicalGuidelines = pgTable("fwa_medical_guidelines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: fwaMedicalGuidelineCategoryEnum("category").notNull(),
  content: text("content").notNull(),
  sourceAuthority: text("source_authority").notNull(),
  specialtyArea: text("specialty_area").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaMedicalGuidelineSchema = createInsertSchema(fwaMedicalGuidelines).omit({
  id: true,
  createdAt: true
});
export type InsertFwaMedicalGuideline = z.infer<typeof insertFwaMedicalGuidelineSchema>;
export type FwaMedicalGuideline = typeof fwaMedicalGuidelines.$inferSelect;

// ============================================
// Knowledge Base Document Storage with Vector Embeddings
// ============================================

// Document type enum
export const knowledgeDocumentTypeEnum = pgEnum("knowledge_document_type", [
  "pdf",
  "word",
  "image",
  "text",
  "html",
  "excel"
]);

// Document category enum
export const knowledgeDocumentCategoryEnum = pgEnum("knowledge_document_category", [
  "law_regulation",
  "resolution_circular",
  "chi_mandatory_policy",
  "clinical_manual",
  "drug_formulary",
  "training_material",
  "other"
]);

// Processing status enum
export const documentProcessingStatusEnum = pgEnum("document_processing_status", [
  "pending",
  "extracting_text",
  "chunking",
  "generating_embeddings",
  "completed",
  "failed"
]);

export const knowledgeUploadJobStatusEnum = pgEnum("knowledge_upload_job_status", [
  "queued",
  "in_progress",
  "completed",
  "completed_with_errors",
  "failed"
]);

export const knowledgeUploadJobItemStatusEnum = pgEnum("knowledge_upload_job_item_status", [
  "queued",
  "in_progress",
  "completed",
  "failed"
]);

// Knowledge Documents Table - Stores uploaded documents
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileType: knowledgeDocumentTypeEnum("file_type").notNull(),
  category: knowledgeDocumentCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  sourceAuthority: text("source_authority"), // e.g., "CHI", "MOH", "SCFHS"
  effectiveDate: timestamp("effective_date"),
  expiryDate: timestamp("expiry_date"),
  filePath: text("file_path").notNull(), // Path to stored file
  fileSize: integer("file_size").notNull(), // Bytes
  mimeType: text("mime_type").notNull(),
  extractedText: text("extracted_text"), // Full extracted text
  pageCount: integer("page_count"),
  language: text("language").default("ar"), // Primary language
  processingStatus: documentProcessingStatusEnum("processing_status").default("pending"),
  processingError: text("processing_error"),
  chunkCount: integer("chunk_count").default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertKnowledgeDocument = z.infer<typeof insertKnowledgeDocumentSchema>;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;

// Knowledge Chunks Table - Document chunks with vector embeddings
// Note: The embedding column uses pgvector type (1536 dimensions for OpenAI ada-002)
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: text("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(), // Chunk text content
  contentAr: text("content_ar"), // Arabic translation if needed
  tokenCount: integer("token_count"),
  pageNumber: integer("page_number"), // Which page this chunk is from
  sectionTitle: text("section_title"), // Section/heading this belongs to
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("knowledge_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))
]);

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({
  id: true,
  embedding: true,
  createdAt: true
});
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;

export const knowledgeUploadJobs = pgTable("knowledge_upload_jobs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  status: knowledgeUploadJobStatusEnum("status").default("queued").notNull(),
  createdBy: text("created_by"),
  totalFiles: integer("total_files").default(0).notNull(),
  queuedFiles: integer("queued_files").default(0).notNull(),
  inProgressFiles: integer("in_progress_files").default(0).notNull(),
  completedFiles: integer("completed_files").default(0).notNull(),
  failedFiles: integer("failed_files").default(0).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("knowledge_upload_jobs_status_created_at_idx").on(table.status, table.createdAt),
]);

export const insertKnowledgeUploadJobSchema = createInsertSchema(knowledgeUploadJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertKnowledgeUploadJob = z.infer<typeof insertKnowledgeUploadJobSchema>;
export type KnowledgeUploadJob = typeof knowledgeUploadJobs.$inferSelect;

export const knowledgeUploadJobItems = pgTable("knowledge_upload_job_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: text("job_id").notNull().references(() => knowledgeUploadJobs.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  title: text("title").notNull(),
  category: knowledgeDocumentCategoryEnum("category").notNull(),
  sourceAuthority: text("source_authority"),
  status: knowledgeUploadJobItemStatusEnum("status").default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  nextRunAt: timestamp("next_run_at").defaultNow().notNull(),
  lastError: text("last_error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("knowledge_upload_job_items_status_next_run_created_idx").on(table.status, table.nextRunAt, table.createdAt),
  index("knowledge_upload_job_items_job_status_idx").on(table.jobId, table.status),
]);

export const insertKnowledgeUploadJobItemSchema = createInsertSchema(knowledgeUploadJobItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertKnowledgeUploadJobItem = z.infer<typeof insertKnowledgeUploadJobItemSchema>;
export type KnowledgeUploadJobItem = typeof knowledgeUploadJobItems.$inferSelect;

// ============================================
// CHI Regulatory Knowledge Base Extensions
// ============================================

// Policy Violation Severity Enum
export const policyViolationSeverityEnum = pgEnum("policy_violation_severity", [
  "minor",
  "moderate",
  "major",
  "critical"
]);

// Policy Violation Sanction Type Enum
export const policyViolationSanctionEnum = pgEnum("policy_violation_sanction", [
  "warning",
  "fine",
  "suspension",
  "exclusion",
  "license_revocation"
]);

// Policy Violation Status Enum
export const policyViolationStatusEnum = pgEnum("policy_violation_status", [
  "active",
  "draft",
  "deprecated"
]);

// Policy Violation Catalogue Table - B3 Knowledge Base
export const policyViolationCatalogue = pgTable("policy_violation_catalogue", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  violationCode: text("violation_code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g., "billing", "documentation", "clinical", "administrative"
  severity: policyViolationSeverityEnum("severity").notNull(),
  defaultSanction: policyViolationSanctionEnum("default_sanction").notNull(),
  fineRangeMin: decimal("fine_range_min", { precision: 12, scale: 2 }),
  fineRangeMax: decimal("fine_range_max", { precision: 12, scale: 2 }),
  suspensionDaysMin: integer("suspension_days_min"),
  suspensionDaysMax: integer("suspension_days_max"),
  escalationPath: text("escalation_path").array().default([]), // ["warning", "fine", "suspension"]
  regulatoryBasis: text("regulatory_basis"), // Reference to CHI circular or regulation
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  status: policyViolationStatusEnum("status").default("active"),
  repeatOffenseMultiplier: decimal("repeat_offense_multiplier", { precision: 3, scale: 2 }).default("1.5"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPolicyViolationCatalogueSchema = createInsertSchema(policyViolationCatalogue).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPolicyViolationCatalogue = z.infer<typeof insertPolicyViolationCatalogueSchema>;
export type PolicyViolationCatalogue = typeof policyViolationCatalogue.$inferSelect;

// Clinical Pathway Rules Table - B4 Knowledge Base
export const clinicalPathwayCategoryEnum = pgEnum("clinical_pathway_category", [
  "care_level_mismatch",
  "procedure_setting",
  "length_of_stay",
  "readmission",
  "step_therapy",
  "prior_auth_required"
]);

export const clinicalPathwayRules = pgTable("clinical_pathway_rules", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleCode: text("rule_code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: clinicalPathwayCategoryEnum("category").notNull(),
  specialty: text("specialty"), // e.g., "cardiology", "orthopedics", "general"
  procedureCodes: text("procedure_codes").array().default([]), // CPT/HCPCS codes
  diagnosisCodes: text("diagnosis_codes").array().default([]), // ICD codes
  allowedSettings: text("allowed_settings").array().default([]), // ["outpatient", "ambulatory"]
  prohibitedSettings: text("prohibited_settings").array().default([]), // ["inpatient"]
  maxLengthOfStay: integer("max_length_of_stay"),
  minDaysBetweenVisits: integer("min_days_between_visits"),
  requiresPriorAuth: boolean("requires_prior_auth").default(false),
  clinicalEvidence: text("clinical_evidence"), // Reference to clinical guideline
  violationId: text("violation_id").references(() => policyViolationCatalogue.id),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertClinicalPathwayRuleSchema = createInsertSchema(clinicalPathwayRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertClinicalPathwayRule = z.infer<typeof insertClinicalPathwayRuleSchema>;
export type ClinicalPathwayRule = typeof clinicalPathwayRules.$inferSelect;

// Provider Complaints Table - External complaints data ingestion
export const providerComplaintSourceEnum = pgEnum("provider_complaint_source", [
  "chi_portal",
  "nphies",
  "patient_hotline",
  "insurance_company",
  "ministry_of_health",
  "social_media",
  "other"
]);

export const providerComplaintStatusEnum = pgEnum("provider_complaint_status", [
  "received",
  "under_review",
  "investigated",
  "resolved",
  "dismissed",
  "escalated"
]);

export const providerComplaints = pgTable("provider_complaints", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  complaintNumber: text("complaint_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  source: providerComplaintSourceEnum("source").notNull(),
  category: text("category").notNull(), // e.g., "billing_dispute", "quality_of_care", "access_issue"
  subcategory: text("subcategory"),
  description: text("description").notNull(),
  complainantType: text("complainant_type"), // "patient", "insurer", "regulator"
  severity: policyViolationSeverityEnum("severity"),
  status: providerComplaintStatusEnum("status").default("received"),
  receivedDate: timestamp("received_date").notNull(),
  dueDate: timestamp("due_date"),
  resolvedDate: timestamp("resolved_date"),
  resolution: text("resolution"),
  linkedViolationId: text("linked_violation_id").references(() => policyViolationCatalogue.id),
  linkedEnforcementId: text("linked_enforcement_id"),
  investigatorId: text("investigator_id"),
  aiSentimentScore: decimal("ai_sentiment_score", { precision: 5, scale: 4 }),
  aiRiskScore: decimal("ai_risk_score", { precision: 5, scale: 4 }),
  externalReferenceId: text("external_reference_id"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderComplaintSchema = createInsertSchema(providerComplaints).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderComplaint = z.infer<typeof insertProviderComplaintSchema>;
export type ProviderComplaint = typeof providerComplaints.$inferSelect;

// Online Listening / Sentiment Analysis Table
export const onlineListeningSourceEnum = pgEnum("online_listening_source", [
  "twitter",
  "alriyadh",
  "almadina",
  "alsharq_alawsat",
  "okaz",
  "sabq",
  "news_article",
  "medical_journal",
  "blog",
  "forum",
  "other"
]);

export const onlineListeningSentimentEnum = pgEnum("online_listening_sentiment", [
  "very_negative",
  "negative",
  "neutral",
  "positive",
  "very_positive"
]);

export const onlineListeningMentions = pgTable("online_listening_mentions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id"),
  providerName: text("provider_name"),
  source: onlineListeningSourceEnum("source").notNull(),
  sourceUrl: text("source_url"),
  authorHandle: text("author_handle"),
  content: text("content").notNull(),
  sentiment: onlineListeningSentimentEnum("sentiment"),
  sentimentScore: decimal("sentiment_score", { precision: 5, scale: 4 }),
  topics: text("topics").array().default([]), // ["quality", "wait_times", "billing"]
  engagementCount: integer("engagement_count").default(0),
  reachEstimate: integer("reach_estimate"),
  isVerified: boolean("is_verified").default(false),
  requiresAction: boolean("requires_action").default(false),
  publishedAt: timestamp("published_at"),
  capturedAt: timestamp("captured_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertOnlineListeningMentionSchema = createInsertSchema(onlineListeningMentions).omit({
  id: true,
  createdAt: true
});
export type InsertOnlineListeningMention = z.infer<typeof insertOnlineListeningMentionSchema>;
export type OnlineListeningMention = typeof onlineListeningMentions.$inferSelect;

// FWA Agent Configs Table
export const fwaAgentConfigs = pgTable("fwa_agent_configs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: text("agent_name").notNull(),
  agentType: fwaAgentTypeEnum("agent_type").notNull(),
  enabled: boolean("enabled").default(true),
  threshold: decimal("threshold", { precision: 5, scale: 2 }).default("0.5"),
  parameters: jsonb("parameters").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaAgentConfigSchema = createInsertSchema(fwaAgentConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaAgentConfig = z.infer<typeof insertFwaAgentConfigSchema>;
export type FwaAgentConfig = typeof fwaAgentConfigs.$inferSelect;

// FWA Behaviors Table - Rule catalog for FWA detection
export const fwaBehaviorCategoryEnum = pgEnum("fwa_behavior_category", [
  "impossible_procedures",
  "duplicate_claims",
  "lab_unbundling",
  "coding_fraud",
  "billing_fraud",
  "identity_fraud",
  "documentation_fraud",
  "provider_pattern",
  "patient_pattern"
]);

export const fwaBehaviorSeverityEnum = pgEnum("fwa_behavior_severity", [
  "fraud",
  "waste",
  "abuse"
]);

export const fwaBehaviorStatusEnum = pgEnum("fwa_behavior_status", [
  "active",
  "draft",
  "deprecated"
]);

export const fwaBehaviorDecisionEnum = pgEnum("fwa_behavior_decision", [
  "auto_reject",
  "manual_review"
]);

export const fwaBehaviors = pgTable("fwa_behaviors", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  behaviorCode: text("behavior_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: fwaBehaviorCategoryEnum("category").notNull(),
  severity: fwaBehaviorSeverityEnum("severity").notNull(),
  priority: fwaPriorityEnum("priority").default("medium"),
  status: fwaBehaviorStatusEnum("status").default("draft"),
  decision: fwaBehaviorDecisionEnum("decision").default("manual_review"),
  rejectionMessage: text("rejection_message"),
  technicalLogic: text("technical_logic"),
  dataRequired: text("data_required").array(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaBehaviorSchema = createInsertSchema(fwaBehaviors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaBehavior = z.infer<typeof insertFwaBehaviorSchema>;
export type FwaBehavior = typeof fwaBehaviors.$inferSelect;

// ============================================
// Reconciliation Module Schema (Cross-Module)
// ============================================

// Reconciliation Enums
export const reconciliationEntityTypeEnum = pgEnum("reconciliation_entity_type", [
  "provider",
  "patient",
  "doctor"
]);

export const reconciliationModuleSourceEnum = pgEnum("reconciliation_module_source", [
  "pre_auth",
  "claims",
  "audit"
]);

export const reconciliationRiskLevelEnum = pgEnum("reconciliation_risk_level", [
  "critical",
  "high",
  "medium",
  "low"
]);

// Reconciliation Entities Table
export const reconciliationEntities = pgTable("reconciliation_entities", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(),
  entityType: reconciliationEntityTypeEnum("entity_type").notNull(),
  displayName: text("display_name").notNull(),
  specialty: text("specialty"),
  organization: text("organization"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).default("0"),
  riskLevel: reconciliationRiskLevelEnum("risk_level").default("low"),
  totalClaims: integer("total_claims").default(0),
  flaggedClaims: integer("flagged_claims").default(0),
  totalExposure: decimal("total_exposure", { precision: 12, scale: 2 }).default("0"),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertReconciliationEntitySchema = createInsertSchema(reconciliationEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertReconciliationEntity = z.infer<typeof insertReconciliationEntitySchema>;
export type ReconciliationEntity = typeof reconciliationEntities.$inferSelect;

// Reconciliation Findings Table
export const reconciliationFindings = pgTable("reconciliation_findings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull().references(() => reconciliationEntities.id),
  moduleSource: reconciliationModuleSourceEnum("module_source").notNull(),
  findingType: text("finding_type").notNull(),
  description: text("description").notNull(),
  severity: reconciliationRiskLevelEnum("severity").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  financialExposure: decimal("financial_exposure", { precision: 12, scale: 2 }),
  recommendedAction: text("recommended_action"),
  evidence: jsonb("evidence").$type<Record<string, any>>().default({}),
  relatedClaimIds: text("related_claim_ids").array().default([]),
  fwaCategory: fwaCategoryTypeEnum("fwa_category"),
  status: text("status").default("open"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertReconciliationFindingSchema = createInsertSchema(reconciliationFindings).omit({
  id: true,
  createdAt: true
});
export type InsertReconciliationFinding = z.infer<typeof insertReconciliationFindingSchema>;
export type ReconciliationFinding = typeof reconciliationFindings.$inferSelect;

// FWA High-Risk Providers View
export const fwaHighRiskProviders = pgTable("fwa_high_risk_providers", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull().unique(),
  providerName: text("provider_name").notNull(),
  providerType: text("provider_type"),
  specialty: text("specialty"),
  organization: text("organization"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: reconciliationRiskLevelEnum("risk_level").default("medium"),
  totalClaims: integer("total_claims").default(0),
  flaggedClaims: integer("flagged_claims").default(0),
  denialRate: decimal("denial_rate", { precision: 5, scale: 2 }),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 12, scale: 2 }),
  totalExposure: decimal("total_exposure", { precision: 12, scale: 2 }),
  claimsPerMonth: decimal("claims_per_month", { precision: 10, scale: 2 }),
  cpmTrend: decimal("cpm_trend", { precision: 5, scale: 2 }),
  cpmPeerAverage: decimal("cpm_peer_average", { precision: 10, scale: 2 }),
  fwaCaseCount: integer("fwa_case_count").default(0),
  reasons: text("reasons").array().default([]),
  lastFlaggedDate: timestamp("last_flagged_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaHighRiskProviderSchema = createInsertSchema(fwaHighRiskProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaHighRiskProvider = z.infer<typeof insertFwaHighRiskProviderSchema>;
export type FwaHighRiskProvider = typeof fwaHighRiskProviders.$inferSelect;

// FWA High-Risk Patients
export const fwaHighRiskPatients = pgTable("fwa_high_risk_patients", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: text("patient_id").notNull().unique(),
  patientName: text("patient_name").notNull(),
  memberId: text("member_id"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: reconciliationRiskLevelEnum("risk_level").default("medium"),
  totalClaims: integer("total_claims").default(0),
  flaggedClaims: integer("flagged_claims").default(0),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  fwaCaseCount: integer("fwa_case_count").default(0),
  primaryDiagnosis: text("primary_diagnosis"),
  reasons: text("reasons").array().default([]),
  lastClaimDate: timestamp("last_claim_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaHighRiskPatientSchema = createInsertSchema(fwaHighRiskPatients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaHighRiskPatient = z.infer<typeof insertFwaHighRiskPatientSchema>;
export type FwaHighRiskPatient = typeof fwaHighRiskPatients.$inferSelect;

// FWA High-Risk Doctors
export const fwaHighRiskDoctors = pgTable("fwa_high_risk_doctors", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: text("doctor_id").notNull().unique(),
  doctorName: text("doctor_name").notNull(),
  specialty: text("specialty"),
  licenseNumber: text("license_number"),
  organization: text("organization"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: reconciliationRiskLevelEnum("risk_level").default("medium"),
  totalClaims: integer("total_claims").default(0),
  flaggedClaims: integer("flagged_claims").default(0),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 12, scale: 2 }),
  totalExposure: decimal("total_exposure", { precision: 12, scale: 2 }),
  fwaCaseCount: integer("fwa_case_count").default(0),
  reasons: text("reasons").array().default([]),
  lastFlaggedDate: timestamp("last_flagged_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaHighRiskDoctorSchema = createInsertSchema(fwaHighRiskDoctors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaHighRiskDoctor = z.infer<typeof insertFwaHighRiskDoctorSchema>;
export type FwaHighRiskDoctor = typeof fwaHighRiskDoctors.$inferSelect;

// FWA Work Queue Claims
export const fwaWorkQueueClaims = pgTable("fwa_work_queue_claims", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull(),
  claimNumber: text("claim_number").notNull(),
  providerId: text("provider_id"),
  providerName: text("provider_name"),
  patientId: text("patient_id"),
  patientName: text("patient_name"),
  claimAmount: decimal("claim_amount", { precision: 12, scale: 2 }).notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: reconciliationRiskLevelEnum("risk_level").default("medium"),
  queueStatus: text("queue_status").default("pending"),
  assignedTo: text("assigned_to"),
  priority: fwaPriorityEnum("priority").default("medium"),
  flagReason: text("flag_reason"),
  claimType: text("claim_type"),
  serviceDate: timestamp("service_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaWorkQueueClaimSchema = createInsertSchema(fwaWorkQueueClaims).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaWorkQueueClaim = z.infer<typeof insertFwaWorkQueueClaimSchema>;
export type FwaWorkQueueClaim = typeof fwaWorkQueueClaims.$inferSelect;

// ============================================
// FWA Batch Uploads Schema
// ============================================

export const fwaBatchStatusEnum = pgEnum("fwa_batch_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled"
]);

export const fwaBatches = pgTable("fwa_batches", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  batchName: text("batch_name").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  status: fwaBatchStatusEnum("status").default("pending"),
  totalClaims: integer("total_claims").default(0),
  processedClaims: integer("processed_claims").default(0),
  flaggedClaims: integer("flagged_claims").default(0),
  failedClaims: integer("failed_claims").default(0),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  uploadedBy: text("uploaded_by").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaBatchSchema = createInsertSchema(fwaBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaBatch = z.infer<typeof insertFwaBatchSchema>;
export type FwaBatch = typeof fwaBatches.$inferSelect;

// ============================================
// Claim Services (Line Items) Schema
// ============================================

export const claimServiceAdjudicationStatusEnum = pgEnum("claim_service_adjudication_status", [
  "pending",
  "approved",
  "denied",
  "partial"
]);

export const claimServiceApprovalStatusEnum = pgEnum("claim_service_approval_status", [
  "pending",
  "approved",
  "rejected",
  "modified"
]);

export const fwaClaimServices = pgTable("fwa_claim_services", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull(),
  lineNumber: integer("line_number").notNull(),
  serviceCode: text("service_code").notNull(),
  serviceCodeSystem: text("service_code_system"),
  serviceDescription: text("service_description").notNull(),
  serviceDate: timestamp("service_date"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  adjudicationStatus: claimServiceAdjudicationStatusEnum("adjudication_status").default("pending"),
  approvalStatus: claimServiceApprovalStatusEnum("approval_status").default("pending"),
  violations: text("violations").array().default([]),
  denialReason: text("denial_reason"),
  modifiers: text("modifiers").array().default([]),
  diagnosisPointers: text("diagnosis_pointers").array().default([]),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaClaimServiceSchema = createInsertSchema(fwaClaimServices).omit({
  id: true,
  createdAt: true
});
export type InsertFwaClaimService = z.infer<typeof insertFwaClaimServiceSchema>;
export type FwaClaimService = typeof fwaClaimServices.$inferSelect;

// ============================================
// Clinical Documentation Schema
// ============================================

export const fwaClinicalDocumentation = pgTable("fwa_clinical_documentation", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull(),
  chiefComplaint: text("chief_complaint"),
  historyOfPresentIllness: text("history_of_present_illness"),
  vitalSigns: jsonb("vital_signs").$type<{
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
  }>(),
  labResults: jsonb("lab_results").$type<Array<{
    testName: string;
    result: string;
    normalRange?: string;
    unit?: string;
    isAbnormal?: boolean;
    testDate?: string;
  }>>().default([]),
  diagnoses: jsonb("diagnoses").$type<Array<{
    code: string;
    codeSystem: string;
    description: string;
    type: string;
  }>>().default([]),
  treatmentPlan: text("treatment_plan"),
  physicianNotes: text("physician_notes"),
  attachments: jsonb("attachments").$type<Array<{
    fileName: string;
    fileType: string;
    fileSize?: number;
    url?: string;
    uploadedAt?: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaClinicalDocumentationSchema = createInsertSchema(fwaClinicalDocumentation).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaClinicalDocumentation = z.infer<typeof insertFwaClinicalDocumentationSchema>;
export type FwaClinicalDocumentation = typeof fwaClinicalDocumentation.$inferSelect;

// ============================================
// Agent Reports Schema
// ============================================

export const agentReportTypeEnum = pgEnum("agent_report_type", [
  "analysis",
  "categorization",
  "recovery",
  "compliance",
  "pattern_detection",
  "network_analysis"
]);

export const agentReportStatusEnum = pgEnum("agent_report_status", [
  "pending",
  "generating",
  "completed",
  "failed"
]);

export const agentReports = pgTable("agent_reports", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityName: text("entity_name").notNull(),
  agentType: agentReportTypeEnum("agent_type").notNull(),
  reportTitle: text("report_title").notNull(),
  status: agentReportStatusEnum("status").default("pending"),
  executiveSummary: text("executive_summary"),
  findings: jsonb("findings").$type<Array<{
    title: string;
    description: string;
    severity: string;
    confidence: number;
    evidence?: string[];
  }>>().default([]),
  recommendations: jsonb("recommendations").$type<Array<{
    action: string;
    priority: string;
    estimatedImpact?: string;
    timeline?: string;
  }>>().default([]),
  metrics: jsonb("metrics").$type<{
    totalClaims?: number;
    flaggedClaims?: number;
    totalExposure?: number;
    recoveryPotential?: number;
    riskScore?: number;
    complianceScore?: number;
  }>(),
  charts: jsonb("charts").$type<Array<{
    type: string;
    title: string;
    data: any[];
  }>>().default([]),
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertAgentReportSchema = createInsertSchema(agentReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertAgentReport = z.infer<typeof insertAgentReportSchema>;
export type AgentReport = typeof agentReports.$inferSelect;

// ============================================
// RLHF Feedback Schema for FWA and Claims
// ============================================

export const feedbackActionTypeEnum = pgEnum("feedback_action_type", [
  "initiate_recovery",
  "apply_penalty",
  "enhanced_monitoring",
  "compliance_training",
  "contract_review",
  "escalate",
  "approve",
  "reject",
  "request_info",
  "flag_for_review",
  "close_case",
  "defer"
]);

export const feedbackOutcomeEnum = pgEnum("feedback_outcome", [
  "successful",
  "partial",
  "unsuccessful",
  "pending",
  "cancelled"
]);

// FWA Feedback Events Table - Records human actions on FWA cases
export const fwaFeedbackEvents = pgTable("fwa_feedback_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: text("case_id").notNull(),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  agentId: text("agent_id"),
  phase: text("phase").notNull(),
  aiRecommendation: jsonb("ai_recommendation").$type<{
    action: string;
    priority: string;
    confidence: number;
    rationale: string;
    estimatedImpact?: string;
  }>(),
  humanAction: feedbackActionTypeEnum("human_action").notNull(),
  wasAccepted: boolean("was_accepted").default(false),
  overrideReason: text("override_reason"),
  reviewerNotes: text("reviewer_notes"),
  reviewerId: text("reviewer_id"),
  outcome: feedbackOutcomeEnum("outcome").default("pending"),
  outcomeAmount: decimal("outcome_amount", { precision: 12, scale: 2 }),
  outcomeNotes: text("outcome_notes"),
  preferenceScore: integer("preference_score"),
  curatedForTraining: boolean("curated_for_training").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaFeedbackEventSchema = createInsertSchema(fwaFeedbackEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaFeedbackEvent = z.infer<typeof insertFwaFeedbackEventSchema>;
export type FwaFeedbackEvent = typeof fwaFeedbackEvents.$inferSelect;

// Claims Feedback Events Table - Records human actions on claims
export const claimsFeedbackEvents = pgTable("claims_feedback_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull(),
  providerId: text("provider_id"),
  patientId: text("patient_id"),
  agentId: text("agent_id"),
  adjudicationPhase: integer("adjudication_phase"),
  aiRecommendation: jsonb("ai_recommendation").$type<{
    action: string;
    priority: string;
    confidence: number;
    rationale: string;
    ruleViolations?: string[];
  }>(),
  humanAction: feedbackActionTypeEnum("human_action").notNull(),
  wasAccepted: boolean("was_accepted").default(false),
  overrideReason: text("override_reason"),
  reviewerNotes: text("reviewer_notes"),
  reviewerId: text("reviewer_id"),
  outcome: feedbackOutcomeEnum("outcome").default("pending"),
  adjustedAmount: decimal("adjusted_amount", { precision: 12, scale: 2 }),
  outcomeNotes: text("outcome_notes"),
  preferenceScore: integer("preference_score"),
  curatedForTraining: boolean("curated_for_training").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertClaimsFeedbackEventSchema = createInsertSchema(claimsFeedbackEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertClaimsFeedbackEvent = z.infer<typeof insertClaimsFeedbackEventSchema>;
export type ClaimsFeedbackEvent = typeof claimsFeedbackEvents.$inferSelect;

// Agent Performance Metrics - Tracks RLHF signals per agent
export const agentPerformanceMetrics = pgTable("agent_performance_metrics", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: text("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  module: text("module").notNull(),
  totalRecommendations: integer("total_recommendations").default(0),
  acceptedRecommendations: integer("accepted_recommendations").default(0),
  overriddenRecommendations: integer("overridden_recommendations").default(0),
  escalatedRecommendations: integer("escalated_recommendations").default(0),
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }),
  confidenceAccuracy: decimal("confidence_accuracy", { precision: 5, scale: 2 }),
  avgRewardScore: decimal("avg_reward_score", { precision: 5, scale: 2 }),
  lastUpdated: timestamp("last_updated").defaultNow()
});

export const insertAgentPerformanceMetricsSchema = createInsertSchema(agentPerformanceMetrics).omit({
  id: true
});
export type InsertAgentPerformanceMetrics = z.infer<typeof insertAgentPerformanceMetricsSchema>;
export type AgentPerformanceMetrics = typeof agentPerformanceMetrics.$inferSelect;

// ============================================
// CLAIMS INGESTION DEMO TABLES
// ============================================

// Pipeline Stage Enum
export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "intake",
  "validation",
  "risk_scoring",
  "pattern_matching",
  "decision_routing",
  "completed"
]);

// Pipeline Status Enum
export const pipelineStatusEnum = pgEnum("pipeline_status", [
  "pending",
  "processing",
  "completed",
  "failed"
]);

// Pipeline Decision Enum (outcome types)
export const pipelineDecisionEnum = pgEnum("pipeline_decision", [
  "approved",
  "fwa_flagged",
  "preauth_required",
  "escalated"
]);

// Claim Ingest Batches - Tracks file uploads and batch submissions
export const claimIngestBatches = pgTable("claim_ingest_batches", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  batchName: text("batch_name").notNull(),
  sourceType: text("source_type").notNull(), // "file_upload" | "manual_entry"
  fileName: text("file_name"),
  fileType: text("file_type"), // "csv" | "json"
  totalClaims: integer("total_claims").default(0),
  processedClaims: integer("processed_claims").default(0),
  status: pipelineStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});

export const insertClaimIngestBatchSchema = createInsertSchema(claimIngestBatches).omit({
  id: true,
  createdAt: true,
  completedAt: true
});
export type InsertClaimIngestBatch = z.infer<typeof insertClaimIngestBatchSchema>;
export type ClaimIngestBatch = typeof claimIngestBatches.$inferSelect;

// Claim Ingest Items - Individual claims being processed
export const claimIngestItems = pgTable("claim_ingest_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: text("batch_id").references(() => claimIngestBatches.id),
  claimNumber: text("claim_number").notNull(),
  patientId: text("patient_id").notNull(),
  providerId: text("provider_id").notNull(),
  serviceDate: text("service_date"),
  procedureCode: text("procedure_code"),
  diagnosisCode: text("diagnosis_code"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  rawData: jsonb("raw_data").$type<Record<string, any>>(),
  currentStage: pipelineStageEnum("current_stage").default("intake"),
  status: pipelineStatusEnum("status").default("pending"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  decision: pipelineDecisionEnum("decision"),
  decisionReason: text("decision_reason"),
  createdEntityId: text("created_entity_id"), // ID of created FWA case or pre-auth claim
  createdEntityType: text("created_entity_type"), // "fwa_case" | "preauth_claim" | null
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertClaimIngestItemSchema = createInsertSchema(claimIngestItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertClaimIngestItem = z.infer<typeof insertClaimIngestItemSchema>;
export type ClaimIngestItem = typeof claimIngestItems.$inferSelect;

// Claim Pipeline Events - Step-by-step processing log
export const claimPipelineEvents = pgTable("claim_pipeline_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: text("item_id").references(() => claimIngestItems.id),
  batchId: text("batch_id").references(() => claimIngestBatches.id),
  stage: pipelineStageEnum("stage").notNull(),
  status: pipelineStatusEnum("status").default("completed"),
  message: text("message").notNull(),
  details: jsonb("details").$type<{
    riskScore?: number;
    patternMatches?: string[];
    validationErrors?: string[];
    decision?: string;
    confidence?: number;
  }>(),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertClaimPipelineEventSchema = createInsertSchema(claimPipelineEvents).omit({
  id: true,
  createdAt: true
});
export type InsertClaimPipelineEvent = z.infer<typeof insertClaimPipelineEventSchema>;
export type ClaimPipelineEvent = typeof claimPipelineEvents.$inferSelect;

// ============================================
// PROVIDER RELATIONS MODULE SCHEMA
// ============================================

// Evidence Pack Status Enum
export const evidencePackStatusEnum = pgEnum("evidence_pack_status", [
  "draft",
  "locked",
  "presented",
  "archived"
]);

// Settlement Status Enum (Two-Ledger Architecture)
export const settlementStatusEnum = pgEnum("settlement_status", [
  "proposed",
  "negotiating",
  "agreed",
  "signed",
  "finance_approved",
  "rejected"
]);

// Reconciliation Session Status Enum
export const reconciliationSessionStatusEnum = pgEnum("reconciliation_session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "follow_up_required"
]);

// Finding Status Enum (Operational Findings Ledger)
export const findingStatusEnum = pgEnum("finding_status", [
  "detected",
  "under_review",
  "validated",
  "invalid",
  "disputed"
]);

// Peer Groups Table - Benchmark matching criteria
export const peerGroups = pgTable("peer_groups", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  groupName: text("group_name").notNull(),
  region: text("region").notNull(),
  city: text("city"),
  providerType: text("provider_type").notNull(),
  networkTier: text("network_tier").notNull(),
  serviceTypes: text("service_types").array().default([]),
  volumeRangeMin: decimal("volume_range_min", { precision: 12, scale: 2 }),
  volumeRangeMax: decimal("volume_range_max", { precision: 12, scale: 2 }),
  policyMixThreshold: decimal("policy_mix_threshold", { precision: 5, scale: 2 }).default("0.50"),
  memberCount: integer("member_count").default(0),
  providerIds: text("provider_ids").array().default([]),
  avgCostPerMember: decimal("avg_cost_per_member", { precision: 12, scale: 2 }),
  avgClaimsPerMember: decimal("avg_claims_per_member", { precision: 8, scale: 2 }),
  avgBillingAmount: decimal("avg_billing_amount", { precision: 12, scale: 2 }),
  stdDevCpm: decimal("std_dev_cpm", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPeerGroupSchema = createInsertSchema(peerGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPeerGroup = z.infer<typeof insertPeerGroupSchema>;
export type PeerGroup = typeof peerGroups.$inferSelect;

// Provider Benchmarks Table - Individual provider benchmark data
export const providerBenchmarks = pgTable("provider_benchmarks", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  peerGroupId: text("peer_group_id").references(() => peerGroups.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalClaims: integer("total_claims").default(0),
  totalBilledAmount: decimal("total_billed_amount", { precision: 14, scale: 2 }),
  totalPaidAmount: decimal("total_paid_amount", { precision: 14, scale: 2 }),
  memberCount: integer("member_count").default(0),
  costPerMember: decimal("cost_per_member", { precision: 12, scale: 2 }),
  claimsPerMember: decimal("claims_per_member", { precision: 8, scale: 2 }),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 12, scale: 2 }),
  peerPercentile: decimal("peer_percentile", { precision: 5, scale: 2 }),
  deviationFromPeer: decimal("deviation_from_peer", { precision: 8, scale: 2 }),
  standardDeviations: decimal("standard_deviations", { precision: 5, scale: 2 }),
  anomalyScore: decimal("anomaly_score", { precision: 5, scale: 2 }),
  anomalyFlags: jsonb("anomaly_flags").$type<Array<{
    category: string;
    description: string;
    severity: string;
    value: number;
    threshold: number;
  }>>().default([]),
  serviceBreakdown: jsonb("service_breakdown").$type<Record<string, {
    claims: number;
    amount: number;
    percentOfTotal: number;
    peerAvg: number;
    deviation: number;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderBenchmarkSchema = createInsertSchema(providerBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderBenchmark = z.infer<typeof insertProviderBenchmarkSchema>;
export type ProviderBenchmark = typeof providerBenchmarks.$inferSelect;

// Provider CPM Metrics Table - Quarterly CPM tracking
export const providerCpmMetrics = pgTable("provider_cpm_metrics", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  region: text("region"),
  networkTier: text("network_tier"),
  specialty: text("specialty"),
  quarter: text("quarter").notNull(),
  year: integer("year").notNull(),
  memberCount: integer("member_count").default(0),
  totalCost: decimal("total_cost", { precision: 14, scale: 2 }),
  cpm: decimal("cpm", { precision: 12, scale: 2 }),
  peerAvgCpm: decimal("peer_avg_cpm", { precision: 12, scale: 2 }),
  percentile: decimal("percentile", { precision: 5, scale: 2 }),
  deviation: decimal("deviation", { precision: 8, scale: 2 }),
  trend: text("trend"),
  benchmarkCpm: decimal("benchmark_cpm", { precision: 12, scale: 2 }),
  claimsCount: integer("claims_count").default(0),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 12, scale: 2 }),
  rejectionRate: decimal("rejection_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderCpmMetricSchema = createInsertSchema(providerCpmMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderCpmMetric = z.infer<typeof insertProviderCpmMetricSchema>;
export type ProviderCpmMetric = typeof providerCpmMetrics.$inferSelect;

// Operational Findings Ledger - Pre-settlement potential issues
export const operationalFindingsLedger = pgTable("operational_findings_ledger", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  findingType: text("finding_type").notNull(),
  category: text("category").notNull(),
  subCategory: text("sub_category"),
  status: findingStatusEnum("status").default("detected"),
  potentialAmount: decimal("potential_amount", { precision: 14, scale: 2 }).notNull(),
  claimCount: integer("claim_count").default(0),
  claimIds: text("claim_ids").array().default([]),
  description: text("description").notNull(),
  evidencePackId: text("evidence_pack_id"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  dataCompleteness: decimal("data_completeness", { precision: 5, scale: 2 }),
  ruleStrength: text("rule_strength"),
  attachmentAvailability: boolean("attachment_availability").default(false),
  weaknessFlags: text("weakness_flags").array().default([]),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  detectedBy: text("detected_by"),
  validatedBy: text("validated_by"),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertOperationalFindingSchema = createInsertSchema(operationalFindingsLedger).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertOperationalFinding = z.infer<typeof insertOperationalFindingSchema>;
export type OperationalFinding = typeof operationalFindingsLedger.$inferSelect;

// Evidence Packs Table - Collection of claims supporting a finding
export const evidencePacks = pgTable("evidence_packs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  packNumber: text("pack_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: evidencePackStatusEnum("status").default("draft"),
  findingIds: text("finding_ids").array().default([]),
  claimIds: text("claim_ids").array().default([]),
  totalClaimCount: integer("total_claim_count").default(0),
  targetAmount: decimal("target_amount", { precision: 14, scale: 2 }).notNull(),
  categories: jsonb("categories").$type<Array<{
    name: string;
    claimCount: number;
    amount: number;
    confidence: string;
    sampleSize: number;
  }>>().default([]),
  attachments: jsonb("attachments").$type<Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    claimId?: string;
  }>>().default([]),
  notes: text("notes"),
  preparedBy: text("prepared_by"),
  lockedAt: timestamp("locked_at"),
  lockedBy: text("locked_by"),
  presentedAt: timestamp("presented_at"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertEvidencePackSchema = createInsertSchema(evidencePacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertEvidencePack = z.infer<typeof insertEvidencePackSchema>;
export type EvidencePack = typeof evidencePacks.$inferSelect;

// Reconciliation Sessions Table - Track negotiation meetings
export const reconciliationSessions = pgTable("reconciliation_sessions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionNumber: text("session_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  status: reconciliationSessionStatusEnum("status").default("scheduled"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  meetingType: text("meeting_type").default("in_person"),
  attendees: jsonb("attendees").$type<Array<{
    name: string;
    role: string;
    organization: string;
    email?: string;
  }>>().default([]),
  agenda: text("agenda").array().default([]),
  evidencePackIds: text("evidence_pack_ids").array().default([]),
  proposedAmount: decimal("proposed_amount", { precision: 14, scale: 2 }),
  negotiatedAmount: decimal("negotiated_amount", { precision: 14, scale: 2 }),
  outcomes: jsonb("outcomes").$type<Array<{
    category: string;
    proposedAmount: number;
    agreedAmount: number;
    status: string;
    notes?: string;
  }>>().default([]),
  actionItems: jsonb("action_items").$type<Array<{
    description: string;
    assignee: string;
    dueDate: string;
    status: string;
  }>>().default([]),
  minutes: text("minutes"),
  followUpDate: timestamp("follow_up_date"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertReconciliationSessionSchema = createInsertSchema(reconciliationSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertReconciliationSession = z.infer<typeof insertReconciliationSessionSchema>;
export type ReconciliationSession = typeof reconciliationSessions.$inferSelect;

// Settlement Ledger Table - Agreed outcomes (Two-Ledger: Realized Savings)
export const settlementLedger = pgTable("settlement_ledger", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  settlementNumber: text("settlement_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  status: settlementStatusEnum("status").default("proposed"),
  sessionId: text("session_id").references(() => reconciliationSessions.id),
  evidencePackIds: text("evidence_pack_ids").array().default([]),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  proposedAmount: decimal("proposed_amount", { precision: 14, scale: 2 }).notNull(),
  negotiatedAmount: decimal("negotiated_amount", { precision: 14, scale: 2 }),
  agreedAmount: decimal("agreed_amount", { precision: 14, scale: 2 }),
  realizedSavings: decimal("realized_savings", { precision: 14, scale: 2 }),
  categories: jsonb("categories").$type<Array<{
    name: string;
    proposedAmount: number;
    agreedAmount: number;
    claimCount: number;
  }>>().default([]),
  providerAcceptance: boolean("provider_acceptance"),
  providerSignatory: text("provider_signatory"),
  providerSignedAt: timestamp("provider_signed_at"),
  tawuniyaSignatory: text("tawuniya_signatory"),
  tawuniyaSignedAt: timestamp("tawuniya_signed_at"),
  financeApprovedBy: text("finance_approved_by"),
  financeApprovedAt: timestamp("finance_approved_at"),
  settlementDate: timestamp("settlement_date"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  auditTrail: jsonb("audit_trail").$type<Array<{
    action: string;
    performedBy: string;
    timestamp: string;
    details?: string;
  }>>().default([]),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertSettlementLedgerSchema = createInsertSchema(settlementLedger).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertSettlementLedger = z.infer<typeof insertSettlementLedgerSchema>;
export type SettlementLedger = typeof settlementLedger.$inferSelect;

// ============================================
// CHI Regulatory Enforcement Module
// ============================================

// Enforcement Case Status Enum
export const enforcementCaseStatusEnum = pgEnum("enforcement_case_status", [
  "finding",
  "warning_issued",
  "corrective_action",
  "penalty_proposed",
  "penalty_applied",
  "appeal_submitted",
  "appeal_review",
  "resolved",
  "closed"
]);

// Enforcement Case Table - Regulatory action workflow
export const enforcementCases = pgTable("enforcement_cases", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: text("case_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  status: enforcementCaseStatusEnum("status").default("finding"),
  violationId: text("violation_id").references(() => policyViolationCatalogue.id),
  violationCode: text("violation_code"),
  violationTitle: text("violation_title"),
  severity: policyViolationSeverityEnum("severity"),
  description: text("description").notNull(),
  evidenceSummary: text("evidence_summary"),
  findingDate: timestamp("finding_date").notNull(),
  warningIssuedDate: timestamp("warning_issued_date"),
  warningDueDate: timestamp("warning_due_date"),
  correctiveActionDescription: text("corrective_action_description"),
  correctiveActionDueDate: timestamp("corrective_action_due_date"),
  correctiveActionCompletedDate: timestamp("corrective_action_completed_date"),
  penaltyType: policyViolationSanctionEnum("penalty_type"),
  fineAmount: decimal("fine_amount", { precision: 14, scale: 2 }),
  suspensionStartDate: timestamp("suspension_start_date"),
  suspensionEndDate: timestamp("suspension_end_date"),
  penaltyAppliedDate: timestamp("penalty_applied_date"),
  appealSubmittedDate: timestamp("appeal_submitted_date"),
  appealReason: text("appeal_reason"),
  appealDecision: text("appeal_decision"),
  appealDecisionDate: timestamp("appeal_decision_date"),
  resolutionDate: timestamp("resolution_date"),
  resolutionNotes: text("resolution_notes"),
  linkedComplaintIds: text("linked_complaint_ids").array().default([]),
  linkedFwaCaseIds: text("linked_fwa_case_ids").array().default([]),
  assignedInvestigator: text("assigned_investigator"),
  assignedReviewer: text("assigned_reviewer"),
  circularReference: text("circular_reference"),
  auditTrail: jsonb("audit_trail").$type<Array<{
    action: string;
    performedBy: string;
    timestamp: string;
    details?: string;
    previousStatus?: string;
    newStatus?: string;
  }>>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertEnforcementCaseSchema = createInsertSchema(enforcementCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertEnforcementCase = z.infer<typeof insertEnforcementCaseSchema>;
export type EnforcementCase = typeof enforcementCases.$inferSelect;

// Enforcement Dossiers Table - Agentic workflow case dossiers
export const enforcementDossiers = pgTable("enforcement_dossiers", {
  id: serial("id").primaryKey(),
  caseId: text("case_id").notNull(),
  enforcementCaseId: text("enforcement_case_id").notNull(),
  claimIds: jsonb("claim_ids").notNull().default([]),
  entities: jsonb("entities").notNull().default({}),
  currentStage: text("current_stage").notNull().default('finding'),
  stageHistory: jsonb("stage_history").notNull().default([]),
  evidence: jsonb("evidence").notNull().default({ engineResults: {}, agentFindings: {} }),
  stageDecisions: jsonb("stage_decisions").notNull().default({}),
  financialImpact: jsonb("financial_impact").notNull().default({ estimatedLoss: 0, recoveryAmount: 0 }),
  regulatoryCitations: jsonb("regulatory_citations").notNull().default([]),
  violationCodes: jsonb("violation_codes").notNull().default([]),
  humanReviews: jsonb("human_reviews").notNull().default([]),
  decisionPackage: jsonb("decision_package"),
  status: text("status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEnforcementDossierSchema = createInsertSchema(enforcementDossiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertEnforcementDossier = z.infer<typeof insertEnforcementDossierSchema>;
export type EnforcementDossier = typeof enforcementDossiers.$inferSelect;

// Regulatory Circulars Table - Official regulatory communications
export const regulatoryCircularStatusEnum = pgEnum("regulatory_circular_status", [
  "draft",
  "review",
  "approved",
  "published",
  "superseded",
  "archived"
]);

export const regulatoryCircularTypeEnum = pgEnum("regulatory_circular_type", [
  "policy_update",
  "enforcement_notice",
  "guidance",
  "compliance_bulletin",
  "market_alert",
  "technical_bulletin"
]);

export const regulatoryCirculars = pgTable("regulatory_circulars", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  circularNumber: text("circular_number").notNull().unique(),
  title: text("title").notNull(),
  type: regulatoryCircularTypeEnum("type").notNull(),
  status: regulatoryCircularStatusEnum("status").default("draft"),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  effectiveDate: timestamp("effective_date"),
  expiryDate: timestamp("expiry_date"),
  targetAudience: text("target_audience").array().default([]), // ["all_providers", "hospitals", "pharmacies"]
  applicableRegions: text("applicable_regions").array().default([]), // ["all", "central", "eastern"]
  relatedViolationIds: text("related_violation_ids").array().default([]),
  relatedCircularIds: text("related_circular_ids").array().default([]),
  supersededCircularId: text("superseded_circular_id"),
  attachments: jsonb("attachments").$type<Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
  }>>().default([]),
  distributionList: jsonb("distribution_list").$type<Array<{
    providerId: string;
    providerName: string;
    sentAt?: string;
    acknowledgedAt?: string;
  }>>().default([]),
  acknowledgmentRequired: boolean("acknowledgment_required").default(false),
  acknowledgmentDeadline: timestamp("acknowledgment_deadline"),
  totalRecipients: integer("total_recipients").default(0),
  acknowledgedCount: integer("acknowledged_count").default(0),
  draftedBy: text("drafted_by"),
  reviewedBy: text("reviewed_by"),
  approvedBy: text("approved_by"),
  publishedAt: timestamp("published_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertRegulatoryCircularSchema = createInsertSchema(regulatoryCirculars).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertRegulatoryCircular = z.infer<typeof insertRegulatoryCircularSchema>;
export type RegulatoryCircular = typeof regulatoryCirculars.$inferSelect;

// Audit Sessions Table - Site visits and regulatory audits
export const auditSessionTypeEnum = pgEnum("audit_session_type", [
  "routine_inspection",
  "complaint_investigation",
  "follow_up_audit",
  "risk_based_audit",
  "desk_review",
  "site_visit"
]);

export const auditSessionStatusEnum = pgEnum("audit_session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "follow_up_required",
  "report_pending"
]);

export const auditSessions = pgTable("audit_sessions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  auditNumber: text("audit_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  type: auditSessionTypeEnum("type").notNull(),
  status: auditSessionStatusEnum("status").default("scheduled"),
  riskScore: decimal("risk_score", { precision: 5, scale: 4 }),
  riskFactors: text("risk_factors").array().default([]),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  location: text("location"),
  auditScope: text("audit_scope").array().default([]), // ["billing", "clinical", "documentation"]
  auditTeam: jsonb("audit_team").$type<Array<{
    name: string;
    role: string;
    department: string;
    email?: string;
  }>>().default([]),
  linkedEnforcementIds: text("linked_enforcement_ids").array().default([]),
  linkedComplaintIds: text("linked_complaint_ids").array().default([]),
  findings: jsonb("findings").$type<Array<{
    category: string;
    severity: string;
    description: string;
    evidence?: string;
    recommendation?: string;
  }>>().default([]),
  auditReport: text("audit_report"),
  recommendations: text("recommendations").array().default([]),
  followUpActions: jsonb("follow_up_actions").$type<Array<{
    description: string;
    assignee: string;
    dueDate: string;
    status: string;
  }>>().default([]),
  nextAuditDate: timestamp("next_audit_date"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertAuditSessionSchema = createInsertSchema(auditSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertAuditSession = z.infer<typeof insertAuditSessionSchema>;
export type AuditSession = typeof auditSessions.$inferSelect;

// Audit Finding Severity Enum
export const auditFindingSeverityEnum = pgEnum("audit_finding_severity", [
  "low",
  "medium",
  "high",
  "critical"
]);

// Audit Finding Status Enum
export const auditFindingStatusEnum = pgEnum("audit_finding_status", [
  "draft",
  "confirmed",
  "disputed",
  "resolved",
  "referred_to_enforcement"
]);

// Audit Findings Table - Detailed findings with claims linkage
export const auditFindings = pgTable("audit_findings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  auditSessionId: text("audit_session_id").notNull().references(() => auditSessions.id),
  findingNumber: text("finding_number").notNull(),
  category: text("category").notNull(), // billing, clinical, documentation, administrative, compliance
  severity: auditFindingSeverityEnum("severity").notNull(),
  status: auditFindingStatusEnum("status").default("draft"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"),
  recommendation: text("recommendation"),
  linkedClaimIds: text("linked_claim_ids").array().default([]),
  linkedDetectionIds: text("linked_detection_ids").array().default([]),
  potentialAmount: decimal("potential_amount", { precision: 14, scale: 2 }),
  regulatoryReference: text("regulatory_reference"),
  providerResponse: text("provider_response"),
  auditorNotes: text("auditor_notes"),
  enforcementCaseId: text("enforcement_case_id"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertAuditFindingSchema = createInsertSchema(auditFindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertAuditFinding = z.infer<typeof insertAuditFindingSchema>;
export type AuditFinding = typeof auditFindings.$inferSelect;

// Audit Checklist Item Status Enum
export const auditChecklistStatusEnum = pgEnum("audit_checklist_status", [
  "pending",
  "in_progress",
  "completed",
  "not_applicable",
  "failed"
]);

// Audit Checklists Table - Standard audit verification items
export const auditChecklists = pgTable("audit_checklists", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  auditSessionId: text("audit_session_id").notNull().references(() => auditSessions.id),
  category: text("category").notNull(), // billing, clinical, documentation, compliance
  itemCode: text("item_code").notNull(),
  description: text("description").notNull(),
  requirement: text("requirement"),
  status: auditChecklistStatusEnum("status").default("pending"),
  result: text("result"), // pass, fail, partial, n/a
  notes: text("notes"),
  evidenceRequired: boolean("evidence_required").default(false),
  evidenceProvided: boolean("evidence_provided").default(false),
  assignedTo: text("assigned_to"),
  completedBy: text("completed_by"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertAuditChecklistSchema = createInsertSchema(auditChecklists).omit({
  id: true,
  createdAt: true
});
export type InsertAuditChecklist = z.infer<typeof insertAuditChecklistSchema>;
export type AuditChecklist = typeof auditChecklists.$inferSelect;

// Dream Reports Table - One-click bulletproof provider reports
export const dreamReports = pgTable("dream_reports", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  reportNumber: text("report_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  status: text("status").default("generating"),
  peerGroupId: text("peer_group_id").references(() => peerGroups.id),
  executiveSummary: text("executive_summary"),
  benchmarkAnalysis: jsonb("benchmark_analysis").$type<{
    costPerMember: number;
    peerAvgCpm: number;
    deviation: number;
    percentile: number;
    anomalyScore: number;
    keyDrivers: Array<{
      category: string;
      impact: number;
      description: string;
    }>;
  }>(),
  findings: jsonb("findings").$type<Array<{
    id: string;
    category: string;
    subCategory: string;
    amount: number;
    claimCount: number;
    confidence: string;
    severity: string;
    description: string;
    evidence: string[];
  }>>().default([]),
  totalPotentialAmount: decimal("total_potential_amount", { precision: 14, scale: 2 }),
  categoryBreakdown: jsonb("category_breakdown").$type<Array<{
    category: string;
    amount: number;
    percentage: number;
    claimCount: number;
    riskLevel: string;
  }>>().default([]),
  claimSamples: jsonb("claim_samples").$type<Array<{
    claimId: string;
    category: string;
    amount: number;
    description: string;
    attachmentAvailable: boolean;
  }>>().default([]),
  recommendations: jsonb("recommendations").$type<Array<{
    priority: string;
    action: string;
    expectedImpact: string;
    timeline: string;
  }>>().default([]),
  aiInsights: text("ai_insights"),
  generatedBy: text("generated_by"),
  generatedAt: timestamp("generated_at"),
  exportedAt: timestamp("exported_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertDreamReportSchema = createInsertSchema(dreamReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertDreamReport = z.infer<typeof insertDreamReportSchema>;
export type DreamReport = typeof dreamReports.$inferSelect;

// ============================================
// Context Enrichment - 360 Views
// ============================================

// Patient 360 - Comprehensive patient context for claims intelligence
export const patient360 = pgTable("patient_360", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: text("patient_id").notNull().unique(),
  patientName: text("patient_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  policyNumber: text("policy_number"),
  memberSince: timestamp("member_since"),
  riskLevel: text("risk_level").default("low"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  chronicConditions: jsonb("chronic_conditions").$type<Array<{
    condition: string;
    icdCode: string;
    diagnosedDate: string;
    status: string;
    managingProvider: string;
  }>>().default([]),
  visitHistory: jsonb("visit_history").$type<Array<{
    date: string;
    providerId: string;
    providerName: string;
    visitType: string;
    diagnosis: string;
    claimAmount: number;
    claimId: string;
  }>>().default([]),
  riskFactors: jsonb("risk_factors").$type<Array<{
    factor: string;
    severity: string;
    confidence: number;
    detectedDate: string;
    description: string;
  }>>().default([]),
  claimsSummary: jsonb("claims_summary").$type<{
    totalClaims: number;
    totalAmount: number;
    avgClaimAmount: number;
    claimsByYear: Record<string, number>;
    claimsByCategory: Record<string, number>;
    uniqueProviders: number;
    uniqueDoctors: number;
    flaggedClaimsCount: number;
  }>(),
  fwaAlerts: jsonb("fwa_alerts").$type<Array<{
    alertId: string;
    alertType: string;
    severity: string;
    description: string;
    detectedDate: string;
    status: string;
    linkedCaseId?: string;
  }>>().default([]),
  behavioralPatterns: jsonb("behavioral_patterns").$type<{
    providerSwitchingRate: number;
    avgTimeBetweenVisits: number;
    peakVisitDays: string[];
    prescriptionPatterns: {
      controlledSubstanceRatio: number;
      avgPrescriptionsPerMonth: number;
    };
    erUtilizationRate: number;
  }>(),
  aiSummary: text("ai_summary"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPatient360Schema = createInsertSchema(patient360).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPatient360 = z.infer<typeof insertPatient360Schema>;
export type Patient360 = typeof patient360.$inferSelect;

// Provider 360 - Comprehensive provider context for claims intelligence
export const provider360 = pgTable("provider_360", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull().unique(),
  providerName: text("provider_name").notNull(),
  providerType: text("provider_type"),
  specialty: text("specialty"),
  region: text("region"),
  city: text("city"),
  networkTier: text("network_tier"),
  licenseNumber: text("license_number"),
  contractStatus: text("contract_status").default("active"),
  riskLevel: text("risk_level").default("low"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  peerGroupId: text("peer_group_id"),
  specialtyBenchmarks: jsonb("specialty_benchmarks").$type<{
    avgClaimAmount: number;
    peerAvgClaimAmount: number;
    avgClaimsPerPatient: number;
    peerAvgClaimsPerPatient: number;
    costPerMember: number;
    peerAvgCostPerMember: number;
    approvalRate: number;
    peerApprovalRate: number;
    avgLengthOfStay: number;
    peerAvgLengthOfStay: number;
  }>(),
  peerRanking: jsonb("peer_ranking").$type<{
    overallRank: number;
    totalPeers: number;
    percentile: number;
    rankingFactors: Array<{
      factor: string;
      rank: number;
      score: number;
    }>;
  }>(),
  billingPatterns: jsonb("billing_patterns").$type<{
    topCptCodes: Array<{
      code: string;
      description: string;
      frequency: number;
      avgAmount: number;
      peerAvgAmount: number;
      deviation: number;
    }>;
    topIcdCodes: Array<{
      code: string;
      description: string;
      frequency: number;
    }>;
    billingByMonth: Record<string, number>;
    billingTrend: string;
    anomalyScore: number;
  }>(),
  flags: jsonb("flags").$type<Array<{
    flagId: string;
    flagType: string;
    severity: string;
    description: string;
    raisedDate: string;
    status: string;
    resolvedDate?: string;
    linkedCaseId?: string;
  }>>().default([]),
  claimsSummary: jsonb("claims_summary").$type<{
    totalClaims: number;
    totalAmount: number;
    avgClaimAmount: number;
    claimsByYear: Record<string, number>;
    claimsByCategory: Record<string, number>;
    uniquePatients: number;
    denialRate: number;
    flaggedClaimsCount: number;
  }>(),
  complianceHistory: jsonb("compliance_history").$type<Array<{
    auditId: string;
    auditDate: string;
    auditType: string;
    result: string;
    findings: number;
    resolvedFindings: number;
  }>>().default([]),
  contractPerformance: jsonb("contract_performance").$type<{
    currentContractId: string;
    contractStartDate: string;
    contractEndDate: string;
    negotiatedRates: Record<string, number>;
    performanceMetrics: {
      qualityScore: number;
      timelinessScore: number;
      complianceScore: number;
    };
  }>(),
  aiAssessment: text("ai_assessment"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProvider360Schema = createInsertSchema(provider360).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProvider360 = z.infer<typeof insertProvider360Schema>;
export type Provider360 = typeof provider360.$inferSelect;

// Doctor 360 - Comprehensive doctor context (individual practitioners)
export const doctor360 = pgTable("doctor_360", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: text("doctor_id").notNull().unique(),
  doctorName: text("doctor_name").notNull(),
  specialty: text("specialty"),
  credentials: text("credentials"),
  licenseNumber: text("license_number"),
  primaryFacilityId: text("primary_facility_id"),
  primaryFacilityName: text("primary_facility_name"),
  affiliatedFacilities: text("affiliated_facilities").array().default([]),
  riskLevel: text("risk_level").default("low"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  practicePatterns: jsonb("practice_patterns").$type<{
    avgPatientsPerDay: number;
    avgClaimPerPatient: number;
    topProcedures: Array<{
      code: string;
      description: string;
      frequency: number;
    }>;
    prescribingHabits: {
      avgPrescriptionsPerVisit: number;
      controlledSubstanceRatio: number;
      topMedications: string[];
    };
    referralPatterns: {
      referralRate: number;
      topReferralDestinations: string[];
    };
  }>(),
  peerComparison: jsonb("peer_comparison").$type<{
    specialtyAvgClaim: number;
    doctorAvgClaim: number;
    deviation: number;
    percentile: number;
    peerGroupSize: number;
  }>(),
  flags: jsonb("flags").$type<Array<{
    flagId: string;
    flagType: string;
    severity: string;
    description: string;
    raisedDate: string;
    status: string;
  }>>().default([]),
  claimsSummary: jsonb("claims_summary").$type<{
    totalClaims: number;
    totalAmount: number;
    uniquePatients: number;
    claimsByYear: Record<string, number>;
    denialRate: number;
  }>(),
  aiAssessment: text("ai_assessment"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertDoctor360Schema = createInsertSchema(doctor360).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertDoctor360 = z.infer<typeof insertDoctor360Schema>;
export type Doctor360 = typeof doctor360.$inferSelect;

// ============================================
// PHASE 0 SIMULATION LAB TABLES
// ============================================

// Digital Twins - Clone cases/claims for safe testing
export const digitalTwins = pgTable("digital_twins", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  twinId: text("twin_id").notNull().unique(),
  sourceType: text("source_type").notNull(), // 'fwa_case', 'claim', 'pre_auth'
  sourceId: text("source_id").notNull(),
  twinData: jsonb("twin_data").$type<Record<string, unknown>>(),
  status: text("status").default("active"), // 'active', 'archived', 'expired'
  expiresAt: timestamp("expires_at"),
  createdBy: text("created_by"),
  purpose: text("purpose"), // 'testing', 'training', 'validation'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertDigitalTwinSchema = createInsertSchema(digitalTwins).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertDigitalTwin = z.infer<typeof insertDigitalTwinSchema>;
export type DigitalTwin = typeof digitalTwins.$inferSelect;

// Shadow Rules - Test rule configurations in isolation
export const shadowRules = pgTable("shadow_rules", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleSetId: text("rule_set_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  baseRuleId: text("base_rule_id"), // Original rule being shadowed
  ruleConfig: jsonb("rule_config").$type<{
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    thresholds: Record<string, number>;
    actions: string[];
    priority: number;
  }>(),
  testCases: jsonb("test_cases").$type<Array<{
    testId: string;
    input: Record<string, unknown>;
    expectedOutput: Record<string, unknown>;
    actualOutput?: Record<string, unknown>;
    passed?: boolean;
    executedAt?: string;
  }>>().default([]),
  status: text("status").default("draft"), // 'draft', 'testing', 'validated', 'promoted', 'rejected'
  validationResults: jsonb("validation_results").$type<{
    totalTests: number;
    passed: number;
    failed: number;
    accuracy: number;
    lastValidatedAt: string;
  }>(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertShadowRuleSchema = createInsertSchema(shadowRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertShadowRule = z.infer<typeof insertShadowRuleSchema>;
export type ShadowRule = typeof shadowRules.$inferSelect;

// Ghost Runs - Execute AI agents in simulation mode
export const ghostRuns = pgTable("ghost_runs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: text("run_id").notNull().unique(),
  agentType: text("agent_type").notNull(), // e.g., 'A1-provider-claims-analyzer'
  phase: text("phase"), // 'A1', 'A2', 'A3'
  entityType: text("entity_type"), // 'provider', 'patient', 'doctor'
  targetId: text("target_id").notNull(), // Case/claim being analyzed
  targetType: text("target_type").notNull(), // 'fwa_case', 'claim', 'pre_auth'
  inputData: jsonb("input_data").$type<Record<string, unknown>>(),
  ghostOutput: jsonb("ghost_output").$type<{
    recommendation: string;
    riskScore: number;
    findings: Array<{
      type: string;
      description: string;
      severity: string;
    }>;
    suggestedActions: string[];
  }>(),
  productionOutput: jsonb("production_output").$type<{
    recommendation: string;
    riskScore: number;
    findings: Array<{
      type: string;
      description: string;
      severity: string;
    }>;
    suggestedActions: string[];
  }>(),
  comparison: jsonb("comparison").$type<{
    matchScore: number;
    discrepancies: Array<{
      field: string;
      ghostValue: unknown;
      productionValue: unknown;
      impact: string;
    }>;
    overallAssessment: string;
  }>(),
  status: text("status").default("pending"), // 'pending', 'running', 'completed', 'failed'
  executionTimeMs: integer("execution_time_ms"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});

export const insertGhostRunSchema = createInsertSchema(ghostRuns).omit({
  id: true,
  createdAt: true,
  completedAt: true
});
export type InsertGhostRun = z.infer<typeof insertGhostRunSchema>;
export type GhostRun = typeof ghostRuns.$inferSelect;

// ============================================
// GRAPH & COLLUSION ANALYSIS TABLES
// ============================================

// Relationship Graphs - Entity relationships for network analysis
export const relationshipGraphs = pgTable("relationship_graphs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  graphId: text("graph_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  graphType: text("graph_type").notNull(), // 'provider_patient', 'referral_network', 'billing_pattern', 'full_network'
  nodes: jsonb("nodes").$type<Array<{
    nodeId: string;
    entityType: string; // 'provider', 'patient', 'doctor', 'facility'
    entityId: string;
    entityName: string;
    riskScore: number;
    riskLevel: string;
    metadata: Record<string, unknown>;
  }>>().default([]),
  edges: jsonb("edges").$type<Array<{
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string; // 'treated_by', 'referred_to', 'billed_for', 'employed_by'
    weight: number;
    transactionCount: number;
    totalAmount: number;
    flags: string[];
    metadata: Record<string, unknown>;
  }>>().default([]),
  metrics: jsonb("metrics").$type<{
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    density: number;
    clusteringCoefficient: number;
    connectedComponents: number;
    riskHotspots: string[];
  }>(),
  analysisResults: jsonb("analysis_results").$type<{
    anomalyScore: number;
    suspiciousPatterns: Array<{
      patternType: string;
      description: string;
      involvedNodes: string[];
      severity: string;
    }>;
    recommendations: string[];
    lastAnalyzedAt: string;
  }>(),
  status: text("status").default("active"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertRelationshipGraphSchema = createInsertSchema(relationshipGraphs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertRelationshipGraph = z.infer<typeof insertRelationshipGraphSchema>;
export type RelationshipGraph = typeof relationshipGraphs.$inferSelect;

// Collusion Rings - Detected collusion patterns
export const collusionRings = pgTable("collusion_rings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  ringId: text("ring_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ringType: text("ring_type").notNull(), // 'billing_fraud', 'kickback', 'phantom_billing', 'upcoding_ring', 'patient_steering'
  detectionMethod: text("detection_method"), // 'ai_analysis', 'pattern_matching', 'manual_investigation', 'whistleblower'
  members: jsonb("members").$type<Array<{
    memberId: string;
    entityType: string;
    entityId: string;
    entityName: string;
    role: string; // 'leader', 'participant', 'facilitator', 'beneficiary'
    riskScore: number;
    involvement: string;
    evidenceStrength: string; // 'strong', 'moderate', 'circumstantial'
  }>>().default([]),
  evidence: jsonb("evidence").$type<Array<{
    evidenceId: string;
    type: string; // 'claim_pattern', 'financial_flow', 'timing_anomaly', 'document', 'testimony'
    description: string;
    sourceType: string;
    sourceId: string;
    weight: number;
    attachments: string[];
  }>>().default([]),
  financialImpact: jsonb("financial_impact").$type<{
    totalExposure: number;
    confirmedLosses: number;
    potentialRecovery: number;
    affectedClaimsCount: number;
    timeframeStart: string;
    timeframeEnd: string;
  }>(),
  riskAssessment: jsonb("risk_assessment").$type<{
    overallRiskScore: number;
    riskLevel: string;
    confidenceScore: number;
    factors: Array<{
      factor: string;
      weight: number;
      score: number;
    }>;
  }>(),
  status: text("status").default("detected"), // 'detected', 'investigating', 'confirmed', 'referred', 'closed'
  investigationStatus: text("investigation_status"), // 'pending', 'in_progress', 'completed'
  assignedTo: text("assigned_to"),
  referredTo: text("referred_to"), // External agency if referred
  aiSummary: text("ai_summary"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertCollusionRingSchema = createInsertSchema(collusionRings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertCollusionRing = z.infer<typeof insertCollusionRingSchema>;
export type CollusionRing = typeof collusionRings.$inferSelect;

// ============================================
// PROVIDER DIRECTORY TABLE
// ============================================

export const providerDirectory = pgTable("provider_directory", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  npi: text("npi").notNull().unique(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  organization: text("organization"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  region: text("region"),
  contractStatus: text("contract_status").default("Pending"),
  networkTier: text("network_tier").default("Tier 2"),
  licenseNumber: text("license_number"),
  licenseExpiry: timestamp("license_expiry"),
  memberCount: integer("member_count").default(0),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderDirectorySchema = createInsertSchema(providerDirectory).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderDirectory = z.infer<typeof insertProviderDirectorySchema>;
export type ProviderDirectory = typeof providerDirectory.$inferSelect;

// ============================================
// PROVIDER COMMUNICATIONS TABLE
// ============================================

export const providerCommunications = pgTable("provider_communications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  type: text("type").notNull(),
  direction: text("direction").default("outbound"),
  subject: text("subject").notNull(),
  body: text("body"),
  status: text("status").default("Pending"),
  outcome: text("outcome"),
  assignee: text("assignee"),
  nextActionDate: timestamp("next_action_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderCommunicationSchema = createInsertSchema(providerCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderCommunication = z.infer<typeof insertProviderCommunicationSchema>;
export type ProviderCommunication = typeof providerCommunications.$inferSelect;

// ============================================
// PROVIDER CONTRACTS TABLE
// ============================================

export const providerContracts = pgTable("provider_contracts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  contractNumber: text("contract_number").notNull().unique(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  contractType: text("contract_type").notNull(),
  status: text("status").default("Draft"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  value: decimal("value", { precision: 14, scale: 2 }),
  terms: jsonb("terms").$type<Record<string, any>>().default({}),
  feeSchedule: text("fee_schedule"),
  autoRenewal: boolean("auto_renewal").default(false),
  signedBy: text("signed_by"),
  signedDate: timestamp("signed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderContractSchema = createInsertSchema(providerContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderContract = z.infer<typeof insertProviderContractSchema>;
export type ProviderContract = typeof providerContracts.$inferSelect;

// ============================================
// MODULAR KPI DEFINITIONS SYSTEM
// ============================================

// KPI Category Enum
export const kpiCategoryEnum = pgEnum("kpi_category", [
  "financial",
  "medical",
  "operational",
  "utilization", 
  "fwa",
  "claims_adjudication",
  "reconciliation",
  "benchmarking",
  "quality"
]);

// KPI Data Source Enum
export const kpiDataSourceEnum = pgEnum("kpi_data_source", [
  "claims",
  "fwa_findings",
  "adjudication",
  "settlements",
  "sessions",
  "membership",
  "providers",
  "contracts",
  "manual"
]);

// KPI Status Enum
export const kpiStatusEnum = pgEnum("kpi_status", [
  "active",
  "draft",
  "archived"
]);

// KPI Definitions - The modular metric definitions
export const kpiDefinitions = pgTable("kpi_definitions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic Info
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // e.g., "CPM", "DENIAL_RATE"
  description: text("description"),
  category: kpiCategoryEnum("category").notNull(),
  status: kpiStatusEnum("status").default("active").notNull(),
  
  // Calculation Definition
  numeratorLabel: text("numerator_label").notNull(), // "Adjudicated paid + member liability"
  numeratorFormula: text("numerator_formula").notNull(), // SQL or field reference
  numeratorSource: kpiDataSourceEnum("numerator_source").notNull(),
  
  denominatorLabel: text("denominator_label").notNull(), // "Unique covered members"
  denominatorFormula: text("denominator_formula").notNull(), // SQL or field reference
  denominatorSource: kpiDataSourceEnum("denominator_source").notNull(),
  
  // Inclusions/Exclusions
  inclusions: jsonb("inclusions").$type<string[]>().default([]), // ["Finalized claims", "Paid amounts"]
  exclusions: jsonb("exclusions").$type<string[]>().default([]), // ["Denied claims", "Voided", "Duplicates"]
  
  // Display & Formatting
  unit: text("unit").default("number"), // "number", "currency", "percentage", "ratio", "days"
  decimalPlaces: integer("decimal_places").default(2),
  displayFormat: text("display_format"), // e.g., "${value}", "{value}%"
  
  // Benchmarking Config
  enableBenchmarking: boolean("enable_benchmarking").default(false),
  peerGroupDimensions: jsonb("peer_group_dimensions").$type<string[]>().default([]), // ["region", "specialty", "tier"]
  
  // Thresholds for alerting
  warningThreshold: decimal("warning_threshold", { precision: 12, scale: 4 }),
  criticalThreshold: decimal("critical_threshold", { precision: 12, scale: 4 }),
  thresholdDirection: text("threshold_direction").default("above"), // "above" or "below"
  
  // Weighting for Composite Scoring
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.0"), // Weight for composite score calculation
  categoryWeight: decimal("category_weight", { precision: 5, scale: 2 }), // Category-level weight override
  
  // Best Practice Documentation
  rationale: text("rationale"), // Why this KPI matters for provider evaluation
  industryStandard: text("industry_standard"), // Reference to best practice source (e.g., HEDIS, CMS, NCQA)
  calculationMethodology: text("calculation_methodology"), // Detailed calculation methodology
  targetValue: decimal("target_value", { precision: 18, scale: 4 }), // Industry benchmark target
  targetDirection: text("target_direction").default("lower"), // "lower" = lower is better, "higher" = higher is better
  
  // Metadata
  sortOrder: integer("sort_order").default(0),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertKpiDefinitionSchema = createInsertSchema(kpiDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertKpiDefinition = z.infer<typeof insertKpiDefinitionSchema>;
export type KpiDefinition = typeof kpiDefinitions.$inferSelect;

// KPI Calculated Results - Stores computed values per provider/period
export const kpiResults = pgTable("kpi_results", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  kpiDefinitionId: text("kpi_definition_id").notNull().references(() => kpiDefinitions.id),
  kpiCode: text("kpi_code").notNull(), // Denormalized for quick access
  
  // Scope
  providerId: text("provider_id"),
  providerName: text("provider_name"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  periodLabel: text("period_label"), // "2024-Q1", "2024-01"
  
  // Calculated Values with full transparency
  numeratorValue: decimal("numerator_value", { precision: 18, scale: 4 }),
  denominatorValue: decimal("denominator_value", { precision: 18, scale: 4 }),
  calculatedValue: decimal("calculated_value", { precision: 18, scale: 4 }),
  
  // Benchmarking Stats
  peerGroupId: text("peer_group_id"),
  peerMean: decimal("peer_mean", { precision: 18, scale: 4 }),
  peerMedian: decimal("peer_median", { precision: 18, scale: 4 }),
  peerStdDev: decimal("peer_std_dev", { precision: 18, scale: 4 }),
  zScore: decimal("z_score", { precision: 8, scale: 4 }),
  percentileRank: integer("percentile_rank"),
  
  // Trend
  priorPeriodValue: decimal("prior_period_value", { precision: 18, scale: 4 }),
  trendDirection: text("trend_direction"), // "up", "down", "stable"
  trendPercentage: decimal("trend_percentage", { precision: 8, scale: 2 }),
  
  // Alert Status
  alertLevel: text("alert_level"), // "normal", "warning", "critical"
  
  // Audit
  calculatedAt: timestamp("calculated_at").defaultNow(),
  dataQualityScore: decimal("data_quality_score", { precision: 5, scale: 2 }),
  recordCount: integer("record_count"), // Number of records used in calculation
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertKpiResultSchema = createInsertSchema(kpiResults).omit({
  id: true,
  createdAt: true
});
export type InsertKpiResult = z.infer<typeof insertKpiResultSchema>;
export type KpiResult = typeof kpiResults.$inferSelect;

// =============================================================================
// FWA Detection Engine - 5 Detection Methods
// =============================================================================

// Detection Method Types
export const fwaDetectionMethodEnum = pgEnum("fwa_detection_method", [
  "rule_engine",
  "statistical_learning",
  "unsupervised_learning",
  "rag_llm",
  "semantic_validation"
]);

// Detection Method Configuration
export const fwaDetectionConfigs = pgTable("fwa_detection_configs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  method: fwaDetectionMethodEnum("method").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00"), // Weight in composite score
  threshold: decimal("threshold", { precision: 5, scale: 2 }).default("0.70"), // Minimum score to flag
  config: jsonb("config").$type<{
    // Rule Engine specific
    ruleCategories?: string[];
    severityMultipliers?: Record<string, number>;
    // Statistical Learning specific
    modelId?: string;
    features?: string[];
    // Unsupervised Learning specific  
    algorithm?: string; // "isolation_forest", "kmeans", "dbscan"
    anomalyThreshold?: number;
    clusteringParams?: Record<string, number>;
    // RAG/LLM specific
    embeddingModel?: string;
    similarityThreshold?: number;
    maxContextDocs?: number;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaDetectionConfigSchema = createInsertSchema(fwaDetectionConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaDetectionConfig = z.infer<typeof insertFwaDetectionConfigSchema>;
export type FwaDetectionConfig = typeof fwaDetectionConfigs.$inferSelect;

// Detection Results - Stores scores from each detection method per claim
export const fwaDetectionResults = pgTable("fwa_detection_results", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull(),
  caseId: text("case_id"),
  providerId: text("provider_id"),
  patientId: text("patient_id"),
  
  // Composite Score (weighted combination of all methods)
  compositeScore: decimal("composite_score", { precision: 5, scale: 2 }).notNull(),
  compositeRiskLevel: reconciliationRiskLevelEnum("composite_risk_level").default("low"),
  
  // Individual Method Scores (0-100 scale)
  ruleEngineScore: decimal("rule_engine_score", { precision: 5, scale: 2 }),
  statisticalScore: decimal("statistical_score", { precision: 5, scale: 2 }),
  unsupervisedScore: decimal("unsupervised_score", { precision: 5, scale: 2 }),
  ragLlmScore: decimal("rag_llm_score", { precision: 5, scale: 2 }),
  
  // Method-specific evidence and findings
  ruleEngineFindings: jsonb("rule_engine_findings").$type<{
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      category: string;
      severity: string;
      confidence: number;
      description: string;
    }>;
    totalRulesChecked: number;
    violationCount: number;
  }>().default({ matchedRules: [], totalRulesChecked: 0, violationCount: 0 }),
  
  statisticalFindings: jsonb("statistical_findings").$type<{
    modelPrediction: number;
    featureImportance: Array<{ feature: string; importance: number; value: number }>;
    peerComparison: { mean: number; stdDev: number; zScore: number };
    historicalTrend: string;
  }>().default({ modelPrediction: 0, featureImportance: [], peerComparison: { mean: 0, stdDev: 0, zScore: 0 }, historicalTrend: "stable" }),
  
  unsupervisedFindings: jsonb("unsupervised_findings").$type<{
    anomalyScore: number;
    clusterAssignment: number;
    clusterSize: number;
    outlierReason: string[];
    isolationForestScore: number;
    nearestClusterDistance: number;
  }>().default({ anomalyScore: 0, clusterAssignment: 0, clusterSize: 0, outlierReason: [], isolationForestScore: 0, nearestClusterDistance: 0 }),
  
  ragLlmFindings: jsonb("rag_llm_findings").$type<{
    contextualAnalysis: string;
    similarCases: Array<{ caseId: string; similarity: number; outcome: string }>;
    knowledgeBaseMatches: Array<{ docId: string; title: string; relevance: number }>;
    recommendation: string;
    confidence: number;
  }>().default({ contextualAnalysis: "", similarCases: [], knowledgeBaseMatches: [], recommendation: "", confidence: 0 }),
  
  // Overall assessment
  primaryDetectionMethod: fwaDetectionMethodEnum("primary_detection_method"), // Which method contributed most
  detectionSummary: text("detection_summary"),
  recommendedAction: text("recommended_action"),
  
  // Audit trail
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  analyzedBy: text("analyzed_by").default("system"),
  processingTimeMs: integer("processing_time_ms"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaDetectionResultSchema = createInsertSchema(fwaDetectionResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaDetectionResult = z.infer<typeof insertFwaDetectionResultSchema>;
export type FwaDetectionResult = typeof fwaDetectionResults.$inferSelect;

// =============================================================================
// FWA Detection Engine - Production Grade Extensions
// =============================================================================

// Rule Library - Configurable/importable FWA detection rules
export const fwaRuleSeverityEnum = pgEnum("fwa_rule_severity", ["low", "medium", "high", "critical"]);
export const fwaRuleCategoryEnum = pgEnum("fwa_rule_category", [
  "upcoding",
  "unbundling", 
  "phantom_billing",
  "duplicate_claims",
  "impossible_combinations",
  "credential_mismatch",
  "temporal_anomaly",
  "geographic_anomaly",
  "frequency_abuse",
  "cost_outlier",
  "service_mismatch",
  "documentation_gap",
  "network_violation",
  "preauth_bypass",
  "drug_abuse",
  "lab_abuse",
  "clinical_plausibility",
  "provider_pattern",
  "kickback",
  "custom"
]);

export const fwaRulesLibrary = pgTable("fwa_rules_library", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleCode: text("rule_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: fwaRuleCategoryEnum("category").notNull(),
  severity: fwaRuleSeverityEnum("severity").notNull(),
  
  // Rule logic
  ruleType: text("rule_type").notNull().default("pattern"), // "pattern", "threshold", "combination", "temporal", "ml_assisted"
  conditions: jsonb("conditions").$type<{
    field?: string;
    operator?: string; // "equals", "contains", "greater_than", "less_than", "in", "not_in", "regex", "between"
    value?: any;
    and?: any[];
    or?: any[];
  }>().notNull(),
  
  // Thresholds and scoring
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00"),
  confidenceThreshold: decimal("confidence_threshold", { precision: 5, scale: 2 }).default("0.70"),
  minOccurrences: integer("min_occurrences").default(1),
  
  // Scope
  applicableClaimTypes: text("applicable_claim_types").array(), // ["inpatient", "outpatient", "emergency"]
  applicableSpecialties: text("applicable_specialties").array(),
  applicableProviderTypes: text("applicable_provider_types").array(),
  
  // Reference
  regulatoryReference: text("regulatory_reference"), // CHI circular, NPHIES guideline
  evidenceRequirements: text("evidence_requirements").array(),
  
  // Metadata
  isActive: boolean("is_active").default(true),
  isSystemRule: boolean("is_system_rule").default(false), // System rules cannot be deleted
  version: integer("version").default(1),
  importedFrom: text("imported_from"), // Source file for imported rules
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaRulesLibrarySchema = createInsertSchema(fwaRulesLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaRulesLibrary = z.infer<typeof insertFwaRulesLibrarySchema>;
export type FwaRulesLibrary = typeof fwaRulesLibrary.$inferSelect;

// Rule Hits - Records when rules are triggered
export const fwaRuleHits = pgTable("fwa_rule_hits", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: text("rule_id").notNull().references(() => fwaRulesLibrary.id),
  claimId: text("claim_id").notNull(),
  detectionResultId: text("detection_result_id").references(() => fwaDetectionResults.id),
  
  // Match details
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  matchedFields: jsonb("matched_fields").$type<Record<string, any>>(),
  explanation: text("explanation"),
  
  // Evidence
  evidenceData: jsonb("evidence_data").$type<{
    claimValue?: any;
    expectedValue?: any;
    peerAverage?: number;
    deviation?: number;
    matchedPattern?: string;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaRuleHitSchema = createInsertSchema(fwaRuleHits).omit({
  id: true,
  createdAt: true
});
export type InsertFwaRuleHit = z.infer<typeof insertFwaRuleHitSchema>;
export type FwaRuleHit = typeof fwaRuleHits.$inferSelect;

// =============================================================================
// BRD-Aligned Master Data Tables (iHop Master Data Schema V2)
// =============================================================================

export const policies = pgTable("policies", {
  id: text("id").primaryKey(),
  planName: text("plan_name").notNull(),
  payerId: text("payer_id").notNull(),
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  coverageLimits: jsonb("coverage_limits"),
  exclusions: text("exclusions").array(),
  copaySchedule: jsonb("copay_schedule"),
  waitingPeriods: jsonb("waiting_periods"),
  preAuthRequiredServices: text("pre_auth_required_services").array(),
  networkRequirements: text("network_requirements"),
  annualMaximum: decimal("annual_maximum", { precision: 12, scale: 2 }),
  lifetimeMaximum: decimal("lifetime_maximum", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPolicySchema = createInsertSchema(policies).omit({ createdAt: true });
export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policies.$inferSelect;

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => policies.id),
  payerId: text("payer_id").notNull(),
  name: text("name"),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  nationality: text("nationality"),
  region: text("region"),
  groupNumber: text("group_number"),
  coverageRelationship: text("coverage_relationship"),
  chronicConditions: text("chronic_conditions").array(),
  preExistingFlag: boolean("pre_existing_flag").default(false),
  maritalStatus: text("marital_status"),
  networkTier: text("network_tier"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).omit({ createdAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  npi: text("npi"),
  name: text("name").notNull(),
  providerType: text("provider_type").notNull(),
  specialty: text("specialty"),
  region: text("region"),
  city: text("city"),
  networkTier: text("network_tier"),
  address: text("address"),
  organization: text("organization"),
  email: text("email"),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  licenseExpiry: date("license_expiry"),
  contractStatus: text("contract_status"),
  hcpCode: text("hcp_code"),
  memberCount: integer("member_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProviderSchema = createInsertSchema(providers).omit({ createdAt: true });
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;

export const practitioners = pgTable("practitioners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  specialtyCode: text("specialty_code"),
  credentials: text("credentials"),
  licenseNumber: text("license_number"),
  primaryFacilityId: text("primary_facility_id").references(() => providers.id),
  primaryFacilityName: text("primary_facility_name"),
  affiliatedFacilities: text("affiliated_facilities").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPractitionerSchema = createInsertSchema(practitioners).omit({ createdAt: true });
export type InsertPractitioner = z.infer<typeof insertPractitionerSchema>;
export type Practitioner = typeof practitioners.$inferSelect;

export const claims = pgTable("claims_v2", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimNumber: text("claim_number").notNull().unique(),
  policyId: text("policy_id").references(() => policies.id),
  memberId: text("member_id").references(() => members.id).notNull(),
  providerId: text("provider_id").references(() => providers.id).notNull(),
  practitionerId: text("practitioner_id").references(() => practitioners.id),
  claimType: text("claim_type").notNull(),
  registrationDate: timestamp("registration_date").notNull(),
  serviceDate: timestamp("service_date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  denialReason: text("denial_reason"),
  status: text("status").notNull().default("pending"),
  primaryDiagnosis: text("primary_diagnosis").notNull(),
  icdCodes: text("icd_codes").array(),
  cptCodes: text("cpt_codes").array(),
  description: text("description"),
  specialty: text("specialty"),
  hospital: text("hospital"),
  hasSurgery: boolean("has_surgery"),
  surgeryFee: decimal("surgery_fee", { precision: 12, scale: 2 }),
  hasIcu: boolean("has_icu"),
  lengthOfStay: integer("length_of_stay"),
  preAuthRef: text("pre_auth_ref"),
  category: text("category"),
  insurerId: text("insurer_id"),
  facilityId: text("facility_id"),
  isNewborn: boolean("is_newborn").default(false),
  isChronic: boolean("is_chronic").default(false),
  isPreExisting: boolean("is_pre_existing").default(false),
  isPreAuthorized: boolean("is_pre_authorized").default(false),
  isMaternity: boolean("is_maternity").default(false),
  groupNo: text("group_no"),
  city: text("city"),
  providerType: text("provider_type"),
  coverageRelationship: text("coverage_relationship"),
  providerShare: decimal("provider_share", { precision: 12, scale: 2 }),
  onAdmissionDiagnosis: text("on_admission_diagnosis").array(),
  dischargeDiagnosis: text("discharge_diagnosis").array(),
  policyEffectiveDate: date("policy_effective_date"),
  policyExpiryDate: date("policy_expiry_date"),
  mdgfClaimNumber: text("mdgf_claim_number"),
  hcpCode: text("hcp_code"),
  occurrenceDate: timestamp("occurrence_date"),
  source: text("source"),
  resubmission: boolean("resubmission").default(false),
  dischargeDisposition: text("discharge_disposition"),
  admissionDate: timestamp("admission_date"),
  dischargeDate: timestamp("discharge_date"),
  preAuthStatus: text("pre_auth_status"),
  preAuthIcd10s: text("pre_auth_icd10s").array(),
  netPayableAmount: decimal("net_payable_amount", { precision: 12, scale: 2 }),
  patientShare: decimal("patient_share", { precision: 12, scale: 2 }),
  aiStatus: text("ai_status"),
  validationResults: jsonb("validation_results"),
  flagged: boolean("flagged").default(false),
  flagReason: text("flag_reason"),
  outlierScore: decimal("outlier_score", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;

export const serviceLines = pgTable("service_lines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").references(() => claims.id).notNull(),
  lineNumber: integer("line_number").notNull(),
  serviceCode: text("service_code").notNull(),
  serviceDescription: text("service_description").notNull(),
  serviceCodeSystem: text("service_code_system"),
  serviceType: text("service_type"),
  quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  serviceDate: timestamp("service_date"),
  modifiers: text("modifiers").array(),
  diagnosisPointers: text("diagnosis_pointers").array(),
  ndc: text("ndc"),
  gtin: text("gtin"),
  sbsCode: text("sbs_code"),
  sfdaCode: text("sfda_code"),
  daysSupply: integer("days_supply"),
  prescriptionNumber: text("prescription_number"),
  prescriberId: text("prescriber_id"),
  patientShare: decimal("patient_share", { precision: 12, scale: 2 }),
  internalServiceCode: text("internal_service_code"),
  providerServiceDescription: text("provider_service_description"),
  toothNumber: text("tooth_number"),
  dosageInstruction: jsonb("dosage_instruction"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceLineSchema = createInsertSchema(serviceLines).omit({ id: true, createdAt: true });
export type InsertServiceLine = z.infer<typeof insertServiceLineSchema>;
export type ServiceLine = typeof serviceLines.$inferSelect;

// Feature Store - Pre-computed features for statistical/ML analysis
export const fwaFeatureStore = pgTable("fwa_feature_store", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entity reference (can be provider, patient, or doctor)
  entityType: text("entity_type").notNull(), // "provider", "patient", "doctor"
  entityId: text("entity_id").notNull(),
  
  // Time period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Volume metrics
  claimCount: integer("claim_count").default(0),
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 12, scale: 2 }),
  maxClaimAmount: decimal("max_claim_amount", { precision: 12, scale: 2 }),
  
  // Utilization patterns
  uniquePatients: integer("unique_patients"),
  uniqueProviders: integer("unique_providers"),
  uniqueDoctors: integer("unique_doctors"),
  uniqueDiagnoses: integer("unique_diagnoses"),
  uniqueServices: integer("unique_services"),
  
  // Temporal patterns
  avgClaimsPerDay: decimal("avg_claims_per_day", { precision: 8, scale: 2 }),
  weekendClaimRatio: decimal("weekend_claim_ratio", { precision: 5, scale: 4 }),
  afterHoursRatio: decimal("after_hours_ratio", { precision: 5, scale: 4 }),
  
  // Cost patterns
  avgLengthOfStay: decimal("avg_length_of_stay", { precision: 6, scale: 2 }),
  inpatientRatio: decimal("inpatient_ratio", { precision: 5, scale: 4 }),
  emergencyRatio: decimal("emergency_ratio", { precision: 5, scale: 4 }),
  preAuthRatio: decimal("preauth_ratio", { precision: 5, scale: 4 }),
  
  // Peer comparison
  peerGroupId: text("peer_group_id"), // Specialty + City + Provider Type
  peerMean: decimal("peer_mean", { precision: 12, scale: 2 }),
  peerStdDev: decimal("peer_std_dev", { precision: 12, scale: 2 }),
  zScore: decimal("z_score", { precision: 8, scale: 4 }),
  percentileRank: integer("percentile_rank"),
  
  // Rejection/flag patterns
  rejectionRate: decimal("rejection_rate", { precision: 5, scale: 4 }),
  flagRate: decimal("flag_rate", { precision: 5, scale: 4 }),
  priorFwaCount: integer("prior_fwa_count"),
  
  // Derived risk indicators
  velocityScore: decimal("velocity_score", { precision: 5, scale: 2 }), // Rapid claim submission
  diversityScore: decimal("diversity_score", { precision: 5, scale: 2 }), // Service/diagnosis diversity
  consistencyScore: decimal("consistency_score", { precision: 5, scale: 2 }), // Temporal consistency
  
  computedAt: timestamp("computed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaFeatureStoreSchema = createInsertSchema(fwaFeatureStore).omit({
  id: true,
  createdAt: true,
  computedAt: true
});
export type InsertFwaFeatureStore = z.infer<typeof insertFwaFeatureStoreSchema>;
export type FwaFeatureStore = typeof fwaFeatureStore.$inferSelect;

// Detection Runs - Track batch detection jobs
export const fwaDetectionRunStatusEnum = pgEnum("fwa_detection_run_status", ["pending", "running", "completed", "failed"]);

export const fwaDetectionRuns = pgTable("fwa_detection_runs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  runName: text("run_name").notNull(),
  
  // Scope
  runType: text("run_type").notNull(), // "single_claim", "batch", "full_scan", "entity_focused"
  targetEntityType: text("target_entity_type"), // "provider", "patient", "doctor", "claim"
  targetEntityId: text("target_entity_id"),
  batchId: text("batch_id"),
  
  // Configuration
  enabledMethods: text("enabled_methods").array().default(["rule_engine", "statistical_learning", "unsupervised_learning", "rag_llm"]),
  methodWeights: jsonb("method_weights").$type<Record<string, number>>().default({
    rule_engine: 0.35,
    statistical_learning: 0.25,
    unsupervised_learning: 0.20,
    rag_llm: 0.20
  }),
  
  // Progress
  status: fwaDetectionRunStatusEnum("status").default("pending"),
  totalClaims: integer("total_claims").default(0),
  processedClaims: integer("processed_claims").default(0),
  flaggedClaims: integer("flagged_claims").default(0),
  
  // Results summary
  avgCompositeScore: decimal("avg_composite_score", { precision: 5, scale: 2 }),
  highRiskCount: integer("high_risk_count").default(0),
  criticalRiskCount: integer("critical_risk_count").default(0),
  
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  processingTimeMs: integer("processing_time_ms"),
  
  // Error tracking
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").default("system")
});

export const insertFwaDetectionRunSchema = createInsertSchema(fwaDetectionRuns).omit({
  id: true,
  createdAt: true
});
export type InsertFwaDetectionRun = z.infer<typeof insertFwaDetectionRunSchema>;
export type FwaDetectionRun = typeof fwaDetectionRuns.$inferSelect;

// Anomaly Clusters - Results from unsupervised learning
export const fwaAnomalyClusters = pgTable("fwa_anomaly_clusters", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: text("run_id").references(() => fwaDetectionRuns.id),
  
  // Cluster info
  clusterId: integer("cluster_id").notNull(),
  clusterType: text("cluster_type").notNull(), // "normal", "outlier", "suspicious", "collusion_ring"
  algorithm: text("algorithm").notNull(), // "isolation_forest", "dbscan", "kmeans", "autoencoder"
  
  // Cluster characteristics
  memberCount: integer("member_count").notNull(),
  centroid: jsonb("centroid").$type<Record<string, number>>(),
  avgAnomalyScore: decimal("avg_anomaly_score", { precision: 5, scale: 2 }),
  
  // Key features
  dominantFeatures: jsonb("dominant_features").$type<Array<{
    feature: string;
    value: number;
    importance: number;
  }>>(),
  
  // Entities in cluster
  entityType: text("entity_type").notNull(), // "provider", "patient", "doctor", "claim"
  entityIds: text("entity_ids").array(),
  
  // Interpretation
  interpretation: text("interpretation"),
  riskLevel: text("risk_level"), // "low", "medium", "high", "critical"
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaAnomalyClusterSchema = createInsertSchema(fwaAnomalyClusters).omit({
  id: true,
  createdAt: true
});
export type InsertFwaAnomalyCluster = z.infer<typeof insertFwaAnomalyClusterSchema>;
export type FwaAnomalyCluster = typeof fwaAnomalyClusters.$inferSelect;

// Detection Engine Configuration - Stores method settings and algorithm descriptions
export const detectionEngineConfig = pgTable("detection_engine_config", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: text("config_key").notNull().unique(), // "method_weights", "thresholds", "enabled_methods"
  
  // Method Configuration
  methodId: text("method_id"), // "rule_engine", "statistical_learning", "unsupervised_learning", "rag_llm"
  methodName: text("method_name"),
  methodDescription: text("method_description"),
  algorithmName: text("algorithm_name"), // e.g., "Pattern Matching", "Z-Score Analysis", "Isolation Forest", "GPT-4o"
  algorithmDescription: text("algorithm_description"),
  
  // Settings
  weight: decimal("weight", { precision: 4, scale: 3 }).default("0.25"),
  threshold: decimal("threshold", { precision: 4, scale: 2 }).default("0.50"),
  isEnabled: boolean("is_enabled").default(true),
  
  // Extended configuration
  parameters: jsonb("parameters").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: text("updated_by").default("system")
});

export const insertDetectionEngineConfigSchema = createInsertSchema(detectionEngineConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertDetectionEngineConfig = z.infer<typeof insertDetectionEngineConfigSchema>;
export type DetectionEngineConfig = typeof detectionEngineConfig.$inferSelect;

// ============================================
// RLHF Feedback - Persistent Storage for FWA & Claims Feedback
// ============================================

export const rlhfFeedbackModuleEnum = pgEnum("rlhf_feedback_module", ["fwa", "claims"]);

export const rlhfFeedback = pgTable("rlhf_feedback", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  module: rlhfFeedbackModuleEnum("module").notNull(),
  
  caseId: text("case_id"),
  claimId: text("claim_id"),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  
  agentId: text("agent_id"),
  phase: text("phase"),
  adjudicationPhase: integer("adjudication_phase"),
  
  aiRecommendation: jsonb("ai_recommendation"),
  humanAction: text("human_action").notNull(),
  wasAccepted: boolean("was_accepted").default(false),
  overrideReason: text("override_reason"),
  reviewerNotes: text("reviewer_notes"),
  reviewerId: text("reviewer_id"),
  
  outcome: text("outcome").default("pending"),
  preferenceScore: integer("preference_score").default(0),
  curatedForTraining: boolean("curated_for_training").default(false),
  
  detectionMethod: text("detection_method"),
  originalScore: decimal("original_score", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertRlhfFeedbackSchema = createInsertSchema(rlhfFeedback).omit({
  id: true,
  createdAt: true
});
export type InsertRlhfFeedback = z.infer<typeof insertRlhfFeedbackSchema>;
export type RlhfFeedback = typeof rlhfFeedback.$inferSelect;

// ============================================
// Claim Documents - OCR-extracted medical records
// ============================================

export const claimDocumentTypeEnum = pgEnum("claim_document_type", [
  "discharge_summary",
  "lab_report",
  "radiology_report",
  "prescription",
  "invoice",
  "medical_record",
  "referral_letter",
  "prior_authorization",
  "other"
]);

export const claimDocuments = pgTable("claim_documents", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id"),
  claimReference: text("claim_reference"),
  
  documentType: claimDocumentTypeEnum("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  
  ocrText: text("ocr_text"),
  ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }),
  ocrProcessedAt: timestamp("ocr_processed_at"),
  
  extractedDiagnoses: text("extracted_diagnoses").array(),
  extractedProcedures: text("extracted_procedures").array(),
  extractedDates: jsonb("extracted_dates").$type<Array<{label: string; date: string}>>(),
  extractedAmounts: jsonb("extracted_amounts").$type<Array<{label: string; amount: number}>>(),
  
  aiComparisonResult: jsonb("ai_comparison_result").$type<{
    discrepancies: Array<{
      field: string;
      claimValue: string;
      documentValue: string;
      severity: string;
      explanation: string;
    }>;
    matchScore: number;
    riskIndicators: string[];
    recommendation: string;
  }>(),
  
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertClaimDocumentSchema = createInsertSchema(claimDocuments).omit({
  id: true,
  createdAt: true
});
export type InsertClaimDocument = z.infer<typeof insertClaimDocumentSchema>;
export type ClaimDocument = typeof claimDocuments.$inferSelect;

// ============================================
// Weight Update Proposals - RLHF-driven weight adjustments
// ============================================

export const weightProposalStatusEnum = pgEnum("weight_proposal_status", [
  "pending",
  "approved",
  "rejected",
  "applied"
]);

export const weightUpdateProposals = pgTable("weight_update_proposals", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  detectionMethod: text("detection_method").notNull(),
  currentWeight: decimal("current_weight", { precision: 4, scale: 3 }).notNull(),
  proposedWeight: decimal("proposed_weight", { precision: 4, scale: 3 }).notNull(),
  weightDelta: decimal("weight_delta", { precision: 4, scale: 3 }).notNull(),
  
  feedbackCount: integer("feedback_count").notNull(),
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }).notNull(),
  overrideRate: decimal("override_rate", { precision: 5, scale: 2 }).notNull(),
  
  rationale: text("rationale").notNull(),
  evidence: jsonb("evidence").$type<{
    totalFeedback: number;
    accepted: number;
    overridden: number;
    falsePositives: number;
    falseNegatives: number;
    avgScoreDelta: number;
  }>(),
  
  status: weightProposalStatusEnum("status").default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  appliedAt: timestamp("applied_at"),
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertWeightUpdateProposalSchema = createInsertSchema(weightUpdateProposals).omit({
  id: true,
  createdAt: true
});
export type InsertWeightUpdateProposal = z.infer<typeof insertWeightUpdateProposalSchema>;
export type WeightUpdateProposal = typeof weightUpdateProposals.$inferSelect;

// ============================================
// Online Listening Source Configurations
// ============================================

export const listeningSourceConfigs = pgTable("listening_source_configs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  sourceId: text("source_id").notNull(),
  sourceName: text("source_name").notNull(),
  sourceNameAr: text("source_name_ar"),
  
  enabled: boolean("enabled").default(true),
  
  keywords: text("keywords").array().default(sql`ARRAY[]::text[]`),
  keywordsAr: text("keywords_ar").array().default(sql`ARRAY[]::text[]`),
  
  providerNames: text("provider_names").array().default(sql`ARRAY[]::text[]`),
  providerNamesAr: text("provider_names_ar").array().default(sql`ARRAY[]::text[]`),
  
  apiEndpoint: text("api_endpoint"),
  apiSupported: boolean("api_supported").default(false),
  
  lastFetchedAt: timestamp("last_fetched_at"),
  fetchFrequencyMinutes: integer("fetch_frequency_minutes").default(60),
  
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertListeningSourceConfigSchema = createInsertSchema(listeningSourceConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertListeningSourceConfig = z.infer<typeof insertListeningSourceConfigSchema>;
export type ListeningSourceConfig = typeof listeningSourceConfigs.$inferSelect;

// ============================================
// ML FEATURE STORE - PROVIDER FEATURES
// ============================================

export const providerFeatureStore = pgTable("provider_feature_store", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name"),
  specialty: text("specialty"),
  region: text("region"),
  
  // Claim volume metrics (temporal windows)
  claimCount7d: integer("claim_count_7d").default(0),
  claimCount30d: integer("claim_count_30d").default(0),
  claimCount60d: integer("claim_count_60d").default(0),
  claimCount90d: integer("claim_count_90d").default(0),
  
  // Amount metrics
  totalAmount30d: decimal("total_amount_30d", { precision: 14, scale: 2 }).default("0"),
  avgAmount30d: decimal("avg_amount_30d", { precision: 14, scale: 2 }).default("0"),
  stdAmount30d: decimal("std_amount_30d", { precision: 14, scale: 2 }).default("0"),
  medianAmount30d: decimal("median_amount_30d", { precision: 14, scale: 2 }).default("0"),
  maxAmount30d: decimal("max_amount_30d", { precision: 14, scale: 2 }).default("0"),
  
  // Unique counts
  uniquePatients30d: integer("unique_patients_30d").default(0),
  uniqueDiagnoses30d: integer("unique_diagnoses_30d").default(0),
  uniqueProcedures30d: integer("unique_procedures_30d").default(0),
  
  // Rate metrics
  denialRate90d: decimal("denial_rate_90d", { precision: 5, scale: 4 }).default("0"),
  flagRate90d: decimal("flag_rate_90d", { precision: 5, scale: 4 }).default("0"),
  weekendRatio30d: decimal("weekend_ratio_30d", { precision: 5, scale: 4 }).default("0"),
  surgeryRate30d: decimal("surgery_rate_30d", { precision: 5, scale: 4 }).default("0"),
  icuRate30d: decimal("icu_rate_30d", { precision: 5, scale: 4 }).default("0"),
  
  // Clinical metrics
  avgLos30d: decimal("avg_los_30d", { precision: 6, scale: 2 }).default("0"),
  avgProceduresPerClaim: decimal("avg_procedures_per_claim", { precision: 6, scale: 2 }).default("0"),
  avgDiagnosesPerClaim: decimal("avg_diagnoses_per_claim", { precision: 6, scale: 2 }).default("0"),
  
  // Trend metrics
  claimTrend7dVs30d: decimal("claim_trend_7d_vs_30d", { precision: 6, scale: 4 }).default("0"),
  amountTrend7dVs30d: decimal("amount_trend_7d_vs_30d", { precision: 6, scale: 4 }).default("0"),
  
  // Peer group metrics
  peerGroupId: text("peer_group_id"),
  peerPercentileAmount: decimal("peer_percentile_amount", { precision: 5, scale: 2 }).default("50"),
  peerPercentileVolume: decimal("peer_percentile_volume", { precision: 5, scale: 2 }).default("50"),
  peerPercentileDenial: decimal("peer_percentile_denial", { precision: 5, scale: 2 }).default("50"),
  
  // Risk scores from ML models
  isolationForestScore: decimal("isolation_forest_score", { precision: 5, scale: 4 }),
  lofScore: decimal("lof_score", { precision: 6, scale: 4 }),
  autoencoderError: decimal("autoencoder_error", { precision: 8, scale: 6 }),
  compositeRiskScore: decimal("composite_risk_score", { precision: 5, scale: 2 }),
  
  // Metadata
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderFeatureStoreSchema = createInsertSchema(providerFeatureStore).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertProviderFeatureStore = z.infer<typeof insertProviderFeatureStoreSchema>;
export type ProviderFeatureStore = typeof providerFeatureStore.$inferSelect;

// ============================================
// ML FEATURE STORE - MEMBER/PATIENT FEATURES
// ============================================

export const memberFeatureStore = pgTable("member_feature_store", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: text("member_id").notNull(),
  memberName: text("member_name"),
  policyNumber: text("policy_number"),
  
  // Claim volume metrics
  claimCount7d: integer("claim_count_7d").default(0),
  claimCount30d: integer("claim_count_30d").default(0),
  claimCount60d: integer("claim_count_60d").default(0),
  claimCount90d: integer("claim_count_90d").default(0),
  
  // Amount metrics
  totalAmount30d: decimal("total_amount_30d", { precision: 14, scale: 2 }).default("0"),
  avgAmount30d: decimal("avg_amount_30d", { precision: 14, scale: 2 }).default("0"),
  maxAmount30d: decimal("max_amount_30d", { precision: 14, scale: 2 }).default("0"),
  totalAmount90d: decimal("total_amount_90d", { precision: 14, scale: 2 }).default("0"),
  
  // Utilization patterns
  uniqueProviders30d: integer("unique_providers_30d").default(0),
  uniqueProviders90d: integer("unique_providers_90d").default(0),
  uniqueHospitals30d: integer("unique_hospitals_30d").default(0),
  uniqueDiagnoses30d: integer("unique_diagnoses_30d").default(0),
  
  // Clinical metrics
  surgeryCount90d: integer("surgery_count_90d").default(0),
  icuCount90d: integer("icu_count_90d").default(0),
  totalLos90d: integer("total_los_90d").default(0),
  avgLos30d: decimal("avg_los_30d", { precision: 6, scale: 2 }).default("0"),
  
  // Behavioral flags
  highUtilizerFlag: boolean("high_utilizer_flag").default(false),
  doctorShoppingFlag: boolean("doctor_shopping_flag").default(false),
  frequentClaimantFlag: boolean("frequent_claimant_flag").default(false),
  
  // Temporal patterns
  daysSinceLastClaim: integer("days_since_last_claim"),
  avgDaysBetweenClaims: decimal("avg_days_between_claims", { precision: 6, scale: 2 }),
  claimFrequencyTrend: decimal("claim_frequency_trend", { precision: 6, scale: 4 }).default("0"),
  
  // Risk scores
  isolationForestScore: decimal("isolation_forest_score", { precision: 5, scale: 4 }),
  lofScore: decimal("lof_score", { precision: 6, scale: 4 }),
  autoencoderError: decimal("autoencoder_error", { precision: 8, scale: 6 }),
  compositeRiskScore: decimal("composite_risk_score", { precision: 5, scale: 2 }),
  
  // Metadata
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertMemberFeatureStoreSchema = createInsertSchema(memberFeatureStore).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertMemberFeatureStore = z.infer<typeof insertMemberFeatureStoreSchema>;
export type MemberFeatureStore = typeof memberFeatureStore.$inferSelect;

// ============================================
// ML PEER GROUP BASELINES
// ============================================

export const peerGroupBaselines = pgTable("peer_group_baselines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Peer group definition
  groupType: text("group_type").notNull(), // specialty, region, size, specialty_region
  groupKey: text("group_key").notNull(), // e.g., "Cardiology", "Riyadh", "Large"
  groupName: text("group_name"),
  groupNameAr: text("group_name_ar"),
  
  // Member counts
  providerCount: integer("provider_count").default(0),
  totalClaimsCount: integer("total_claims_count").default(0),
  
  // Amount baselines
  avgClaimAmount: decimal("avg_claim_amount", { precision: 14, scale: 2 }).default("0"),
  medianClaimAmount: decimal("median_claim_amount", { precision: 14, scale: 2 }).default("0"),
  stdClaimAmount: decimal("std_claim_amount", { precision: 14, scale: 2 }).default("0"),
  p25ClaimAmount: decimal("p25_claim_amount", { precision: 14, scale: 2 }).default("0"),
  p75ClaimAmount: decimal("p75_claim_amount", { precision: 14, scale: 2 }).default("0"),
  p95ClaimAmount: decimal("p95_claim_amount", { precision: 14, scale: 2 }).default("0"),
  
  // Volume baselines
  avgClaimsPerMonth: decimal("avg_claims_per_month", { precision: 10, scale: 2 }).default("0"),
  medianClaimsPerMonth: decimal("median_claims_per_month", { precision: 10, scale: 2 }).default("0"),
  
  // Rate baselines
  avgDenialRate: decimal("avg_denial_rate", { precision: 5, scale: 4 }).default("0"),
  avgFlagRate: decimal("avg_flag_rate", { precision: 5, scale: 4 }).default("0"),
  avgWeekendRatio: decimal("avg_weekend_ratio", { precision: 5, scale: 4 }).default("0"),
  
  // Clinical baselines
  avgLos: decimal("avg_los", { precision: 6, scale: 2 }).default("0"),
  avgSurgeryRate: decimal("avg_surgery_rate", { precision: 5, scale: 4 }).default("0"),
  
  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPeerGroupBaselineSchema = createInsertSchema(peerGroupBaselines).omit({
  id: true,
  createdAt: true
});
export type InsertPeerGroupBaseline = z.infer<typeof insertPeerGroupBaselineSchema>;
export type PeerGroupBaseline = typeof peerGroupBaselines.$inferSelect;

// ============================================
// ML MODEL REGISTRY
// ============================================

export const mlModelRegistry = pgTable("ml_model_registry", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  modelName: text("model_name").notNull(), // isolation_forest, lof, dbscan, autoencoder, deep_learning
  modelVersion: text("model_version").notNull(),
  modelType: text("model_type").notNull(), // unsupervised, supervised, deep_learning
  
  // Model configuration
  hyperparameters: jsonb("hyperparameters").$type<Record<string, any>>().default({}),
  featureList: text("feature_list").array().default(sql`ARRAY[]::text[]`),
  featureCount: integer("feature_count").default(0),
  
  // Training metadata
  trainedAt: timestamp("trained_at"),
  trainingDataSize: integer("training_data_size"),
  trainingDurationMs: integer("training_duration_ms"),
  
  // Performance metrics
  validationScore: decimal("validation_score", { precision: 6, scale: 4 }),
  silhouetteScore: decimal("silhouette_score", { precision: 6, scale: 4 }),
  reconstructionError: decimal("reconstruction_error", { precision: 8, scale: 6 }),
  
  // Model artifacts
  modelArtifacts: jsonb("model_artifacts").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").default(false),
  
  // Metadata
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertMlModelRegistrySchema = createInsertSchema(mlModelRegistry).omit({
  id: true,
  createdAt: true
});
export type InsertMlModelRegistry = z.infer<typeof insertMlModelRegistrySchema>;
export type MlModelRegistry = typeof mlModelRegistry.$inferSelect;

// ============================================
// ML CLAIM INFERENCE RESULTS
// ============================================

export const mlClaimInference = pgTable("ml_claim_inference", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  claimId: text("claim_id").notNull(),
  claimNumber: text("claim_number"),
  
  // Full feature vector (62 features)
  featureVector: jsonb("feature_vector").$type<Record<string, number>>().default({}),
  
  // Individual algorithm scores
  isolationForestScore: decimal("isolation_forest_score", { precision: 5, scale: 4 }),
  isolationForestDepth: decimal("isolation_forest_depth", { precision: 6, scale: 2 }),
  lofScore: decimal("lof_score", { precision: 6, scale: 4 }),
  lofNeighborhood: integer("lof_neighborhood"),
  dbscanCluster: integer("dbscan_cluster"), // -1 = noise/outlier
  dbscanIsNoise: boolean("dbscan_is_noise").default(false),
  autoencoderError: decimal("autoencoder_error", { precision: 8, scale: 6 }),
  autoencoderReconstructed: jsonb("autoencoder_reconstructed").$type<number[]>(),
  deepLearningScore: decimal("deep_learning_score", { precision: 5, scale: 4 }),
  
  // Composite scores
  compositeAnomalyScore: decimal("composite_anomaly_score", { precision: 5, scale: 2 }),
  riskLevel: text("risk_level"), // low, medium, high, critical
  
  // Feature contributions (which features drove the score)
  topContributingFeatures: jsonb("top_contributing_features").$type<Array<{
    feature: string;
    value: number;
    contribution: number;
    zScore: number;
  }>>().default([]),
  
  // Peer comparison
  peerGroupId: text("peer_group_id"),
  peerPercentile: decimal("peer_percentile", { precision: 5, scale: 2 }),
  
  // Entity context
  providerRiskScore: decimal("provider_risk_score", { precision: 5, scale: 2 }),
  memberRiskScore: decimal("member_risk_score", { precision: 5, scale: 2 }),
  
  // Explainability
  anomalyReasons: text("anomaly_reasons").array().default(sql`ARRAY[]::text[]`),
  humanExplanation: text("human_explanation"),
  humanExplanationAr: text("human_explanation_ar"),
  
  // Model versions used
  modelVersions: jsonb("model_versions").$type<Record<string, string>>().default({}),
  
  // Processing metadata
  processingTimeMs: integer("processing_time_ms"),
  inferredAt: timestamp("inferred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertMlClaimInferenceSchema = createInsertSchema(mlClaimInference).omit({
  id: true,
  createdAt: true
});
export type InsertMlClaimInference = z.infer<typeof insertMlClaimInferenceSchema>;
export type MlClaimInference = typeof mlClaimInference.$inferSelect;

// ============================================
// ML LEARNED PATTERNS
// ============================================

export const mlLearnedPatterns = pgTable("ml_learned_patterns", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  patternName: text("pattern_name").notNull(),
  patternNameAr: text("pattern_name_ar"),
  patternType: text("pattern_type").notNull(), // cluster, ring, anomaly_group, temporal_pattern
  
  // Pattern definition
  patternDefinition: jsonb("pattern_definition").$type<{
    algorithm: string;
    features: string[];
    thresholds: Record<string, number>;
    conditions: Array<{ field: string; operator: string; value: any }>;
  }>(),
  
  // Pattern statistics
  claimCount: integer("claim_count").default(0),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).default("0"),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),
  confirmationRate: decimal("confirmation_rate", { precision: 5, scale: 4 }),
  
  // Example claims
  exampleClaimIds: text("example_claim_ids").array().default(sql`ARRAY[]::text[]`),
  
  // Status
  isActive: boolean("is_active").default(true),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow()
});

export const insertMlLearnedPatternSchema = createInsertSchema(mlLearnedPatterns).omit({
  id: true,
  createdAt: true
});
export type InsertMlLearnedPattern = z.infer<typeof insertMlLearnedPatternSchema>;
export type MlLearnedPattern = typeof mlLearnedPatterns.$inferSelect;

// ============================================
// POPULATION STATISTICS (Enterprise Statistical Learning)
// ============================================
// Stores calculated statistics for each feature across the claim population
// Used by Statistical Learning for z-score calculations and peer comparisons

export const populationStatistics = pgTable("population_statistics", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Feature identification
  featureName: text("feature_name").notNull(), // e.g., "claim_amount", "provider_claim_count_30d"
  featureCategory: text("feature_category").notNull(), // raw, provider, member, derived, temporal
  
  // Central tendency
  mean: decimal("mean", { precision: 20, scale: 6 }).notNull(),
  median: decimal("median", { precision: 20, scale: 6 }),
  mode: decimal("mode", { precision: 20, scale: 6 }),
  
  // Dispersion
  stdDev: decimal("std_dev", { precision: 20, scale: 6 }).notNull(),
  variance: decimal("variance", { precision: 24, scale: 6 }),
  iqr: decimal("iqr", { precision: 20, scale: 6 }), // Interquartile range
  mad: decimal("mad", { precision: 20, scale: 6 }), // Median absolute deviation
  
  // Percentiles (for robust statistics)
  p1: decimal("p1", { precision: 20, scale: 6 }),
  p5: decimal("p5", { precision: 20, scale: 6 }),
  p10: decimal("p10", { precision: 20, scale: 6 }),
  p25: decimal("p25", { precision: 20, scale: 6 }),
  p50: decimal("p50", { precision: 20, scale: 6 }),
  p75: decimal("p75", { precision: 20, scale: 6 }),
  p90: decimal("p90", { precision: 20, scale: 6 }),
  p95: decimal("p95", { precision: 20, scale: 6 }),
  p99: decimal("p99", { precision: 20, scale: 6 }),
  
  // Bounds
  minValue: decimal("min_value", { precision: 20, scale: 6 }),
  maxValue: decimal("max_value", { precision: 20, scale: 6 }),
  
  // Distribution characteristics
  skewness: decimal("skewness", { precision: 10, scale: 6 }),
  kurtosis: decimal("kurtosis", { precision: 10, scale: 6 }),
  
  // Sample metadata
  sampleSize: integer("sample_size").notNull(),
  nullCount: integer("null_count").default(0),
  zeroCount: integer("zero_count").default(0),
  
  // Time window for calculation
  windowDays: integer("window_days").default(365), // e.g., last 365 days
  windowStart: timestamp("window_start"),
  windowEnd: timestamp("window_end"),
  
  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPopulationStatisticsSchema = createInsertSchema(populationStatistics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPopulationStatistics = z.infer<typeof insertPopulationStatisticsSchema>;
export type PopulationStatistics = typeof populationStatistics.$inferSelect;

// ============================================
// STATISTICAL LEARNING FEATURE WEIGHTS
// ============================================
// Stores supervised learning weights (importance) for each feature
// These weights are learned from labeled data or set by domain experts

export const statisticalLearningWeights = pgTable("statistical_learning_weights", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Model identification
  modelVersion: text("model_version").notNull().default("v1.0"),
  modelName: text("model_name").notNull().default("statistical_learning_v1"),
  
  // Feature identification
  featureName: text("feature_name").notNull(),
  featureCategory: text("feature_category").notNull(),
  
  // Weight values
  weight: decimal("weight", { precision: 10, scale: 6 }).notNull(), // Importance weight (0-1)
  normalizedWeight: decimal("normalized_weight", { precision: 10, scale: 6 }), // Sum to 1.0
  
  // Scoring thresholds
  lowThreshold: decimal("low_threshold", { precision: 20, scale: 6 }), // Below this = low risk
  mediumThreshold: decimal("medium_threshold", { precision: 20, scale: 6 }), // Above this = medium risk
  highThreshold: decimal("high_threshold", { precision: 20, scale: 6 }), // Above this = high risk
  criticalThreshold: decimal("critical_threshold", { precision: 20, scale: 6 }), // Above this = critical
  
  // Direction
  direction: text("direction").default("positive"), // positive: higher value = higher risk, negative: lower = higher risk
  
  // Training metadata
  trainedOn: text("trained_on"), // Description of training data
  validationScore: decimal("validation_score", { precision: 6, scale: 4 }),
  featureImportanceRank: integer("feature_importance_rank"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertStatisticalLearningWeightsSchema = createInsertSchema(statisticalLearningWeights).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertStatisticalLearningWeights = z.infer<typeof insertStatisticalLearningWeightsSchema>;
export type StatisticalLearningWeights = typeof statisticalLearningWeights.$inferSelect;

// =============================================================================
// ENTITY-LEVEL 4-METHOD DETECTION RESULTS
// Applies fraud detection at Provider, Doctor, Patient levels (not just claims)
// =============================================================================

// Entity Risk Level Enum for entity-level detection
export const entityRiskLevelEnum = pgEnum("entity_risk_level", ["critical", "high", "medium", "low", "minimal"]);

// Provider Entity Detection Results
export const fwaProviderDetectionResults = pgTable("fwa_provider_detection_results", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  batchId: text("batch_id"),
  runId: text("run_id"),
  
  // Composite Score (weighted combination of all methods)
  compositeScore: decimal("composite_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: entityRiskLevelEnum("risk_level").default("low"),
  
  // Individual Method Scores (0-100 scale) - 5 methods
  ruleEngineScore: decimal("rule_engine_score", { precision: 5, scale: 2 }),
  statisticalScore: decimal("statistical_score", { precision: 5, scale: 2 }),
  unsupervisedScore: decimal("unsupervised_score", { precision: 5, scale: 2 }),
  ragLlmScore: decimal("rag_llm_score", { precision: 5, scale: 2 }),
  semanticScore: decimal("semantic_score", { precision: 5, scale: 2 }),
  
  // Provider-specific findings from each method
  ruleEngineFindings: jsonb("rule_engine_findings").$type<{
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      category: string;
      severity: string;
      confidence: number;
      description: string;
    }>;
    patterns: Array<{
      patternType: string;
      description: string;
      evidenceCount: number;
    }>;
    violationCount: number;
  }>().default({ matchedRules: [], patterns: [], violationCount: 0 }),
  
  statisticalFindings: jsonb("statistical_findings").$type<{
    peerComparison: {
      peerGroupId: string;
      peerCount: number;
      avgClaimAmount: number;
      peerAvgClaimAmount: number;
      zScore: number;
      percentile: number;
    };
    billingPatternAnomalies: Array<{
      metric: string;
      value: number;
      peerAvg: number;
      deviation: number;
    }>;
    trendAnalysis: {
      direction: string;
      changePercent: number;
      significance: number;
    };
  }>(),
  
  unsupervisedFindings: jsonb("unsupervised_findings").$type<{
    anomalyScore: number;
    clusterAssignment: number;
    clusterLabel: string;
    outlierReasons: string[];
    isolationForestScore: number;
    distanceFromCentroid: number;
  }>(),
  
  ragLlmFindings: jsonb("rag_llm_findings").$type<{
    contextualAnalysis: string;
    similarProviders: Array<{ providerId: string; similarity: number; outcome: string }>;
    knowledgeBaseMatches: Array<{ docId: string; title: string; relevance: number }>;
    recommendation: string;
    confidence: number;
  }>(),
  
  semanticFindings: jsonb("semantic_findings").$type<{
    procedureDiagnosisPairs: Array<{
      icdCode: string;
      cptCode: string;
      icdDescription: string;
      cptDescription: string;
      similarity: number;
      confidencePercent: number;
      riskLevel: "low" | "medium" | "high" | "critical";
      clinicalInterpretation: string;
    }>;
    avgSimilarity: number;
    mismatchCount: number;
    criticalMismatches: number;
    overallAssessment: string;
  }>(),
  
  // Aggregated metrics used for detection
  aggregatedMetrics: jsonb("aggregated_metrics").$type<{
    totalClaims: number;
    totalAmount: number;
    avgClaimAmount: number;
    uniquePatients: number;
    uniqueDoctors: number;
    flaggedClaimsCount: number;
    flaggedClaimsPercent: number;
    highRiskClaimsCount: number;
    topProcedureCodes: Array<{ code: string; count: number; amount: number }>;
    topDiagnosisCodes: Array<{ code: string; count: number }>;
  }>(),
  
  // Detection metadata
  primaryDetectionMethod: fwaDetectionMethodEnum("primary_detection_method"),
  detectionSummary: text("detection_summary"),
  recommendedAction: text("recommended_action"),
  
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaProviderDetectionResultSchema = createInsertSchema(fwaProviderDetectionResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaProviderDetectionResult = z.infer<typeof insertFwaProviderDetectionResultSchema>;
export type FwaProviderDetectionResult = typeof fwaProviderDetectionResults.$inferSelect;

// Doctor Entity Detection Results
export const fwaDoctorDetectionResults = pgTable("fwa_doctor_detection_results", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: text("doctor_id").notNull(), // practitioner_license
  batchId: text("batch_id"),
  runId: text("run_id"),
  
  // Composite Score
  compositeScore: decimal("composite_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: entityRiskLevelEnum("risk_level").default("low"),
  
  // Individual Method Scores - 5 methods
  ruleEngineScore: decimal("rule_engine_score", { precision: 5, scale: 2 }),
  statisticalScore: decimal("statistical_score", { precision: 5, scale: 2 }),
  unsupervisedScore: decimal("unsupervised_score", { precision: 5, scale: 2 }),
  ragLlmScore: decimal("rag_llm_score", { precision: 5, scale: 2 }),
  semanticScore: decimal("semantic_score", { precision: 5, scale: 2 }),
  
  // Doctor-specific findings
  ruleEngineFindings: jsonb("rule_engine_findings").$type<{
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      category: string;
      severity: string;
      confidence: number;
      description: string;
    }>;
    prescribingPatterns: Array<{
      patternType: string;
      description: string;
      evidenceCount: number;
    }>;
    violationCount: number;
  }>().default({ matchedRules: [], prescribingPatterns: [], violationCount: 0 }),
  
  statisticalFindings: jsonb("statistical_findings").$type<{
    specialtyComparison: {
      specialtyCode: string;
      peerCount: number;
      avgClaimAmount: number;
      peerAvgClaimAmount: number;
      zScore: number;
      percentile: number;
    };
    procedureAnomalies: Array<{
      procedureCode: string;
      frequency: number;
      peerAvgFrequency: number;
      deviation: number;
    }>;
    patientVolumeAnalysis: {
      totalPatients: number;
      peerAvgPatients: number;
      deviation: number;
    };
  }>(),
  
  unsupervisedFindings: jsonb("unsupervised_findings").$type<{
    anomalyScore: number;
    clusterAssignment: number;
    clusterLabel: string;
    outlierReasons: string[];
    isolationForestScore: number;
  }>(),
  
  ragLlmFindings: jsonb("rag_llm_findings").$type<{
    contextualAnalysis: string;
    similarDoctors: Array<{ doctorId: string; similarity: number; outcome: string }>;
    recommendation: string;
    confidence: number;
  }>(),
  
  semanticFindings: jsonb("semantic_findings").$type<{
    procedureDiagnosisPairs: Array<{
      icdCode: string;
      cptCode: string;
      icdDescription: string;
      cptDescription: string;
      similarity: number;
      confidencePercent: number;
      riskLevel: "low" | "medium" | "high" | "critical";
      clinicalInterpretation: string;
    }>;
    avgSimilarity: number;
    mismatchCount: number;
    criticalMismatches: number;
    overallAssessment: string;
  }>(),
  
  // Aggregated metrics
  aggregatedMetrics: jsonb("aggregated_metrics").$type<{
    totalClaims: number;
    totalAmount: number;
    avgClaimAmount: number;
    uniquePatients: number;
    uniqueProviders: number;
    flaggedClaimsCount: number;
    flaggedClaimsPercent: number;
    topProcedureCodes: Array<{ code: string; count: number; amount: number }>;
    topDiagnosisCodes: Array<{ code: string; count: number }>;
    specialtyCode: string;
  }>(),
  
  primaryDetectionMethod: fwaDetectionMethodEnum("primary_detection_method"),
  detectionSummary: text("detection_summary"),
  recommendedAction: text("recommended_action"),
  
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaDoctorDetectionResultSchema = createInsertSchema(fwaDoctorDetectionResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaDoctorDetectionResult = z.infer<typeof insertFwaDoctorDetectionResultSchema>;
export type FwaDoctorDetectionResult = typeof fwaDoctorDetectionResults.$inferSelect;

// Patient Entity Detection Results
export const fwaPatientDetectionResults = pgTable("fwa_patient_detection_results", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: text("patient_id").notNull(), // member_id
  batchId: text("batch_id"),
  runId: text("run_id"),
  
  // Composite Score
  compositeScore: decimal("composite_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: entityRiskLevelEnum("risk_level").default("low"),
  
  // Individual Method Scores - 5 methods
  ruleEngineScore: decimal("rule_engine_score", { precision: 5, scale: 2 }),
  statisticalScore: decimal("statistical_score", { precision: 5, scale: 2 }),
  unsupervisedScore: decimal("unsupervised_score", { precision: 5, scale: 2 }),
  ragLlmScore: decimal("rag_llm_score", { precision: 5, scale: 2 }),
  semanticScore: decimal("semantic_score", { precision: 5, scale: 2 }),
  
  // Patient-specific findings
  ruleEngineFindings: jsonb("rule_engine_findings").$type<{
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      category: string;
      severity: string;
      confidence: number;
      description: string;
    }>;
    utilizationPatterns: Array<{
      patternType: string;
      description: string;
      evidenceCount: number;
    }>;
    violationCount: number;
  }>().default({ matchedRules: [], utilizationPatterns: [], violationCount: 0 }),
  
  statisticalFindings: jsonb("statistical_findings").$type<{
    utilizationComparison: {
      cohortId: string;
      cohortSize: number;
      avgClaimsPerYear: number;
      peerAvgClaimsPerYear: number;
      zScore: number;
      percentile: number;
    };
    providerDiversityAnalysis: {
      uniqueProviders: number;
      peerAvgProviders: number;
      deviation: number;
    };
    geographicAnalysis: {
      primaryCity: string;
      claimCities: string[];
      geographicSpread: number;
    };
  }>(),
  
  unsupervisedFindings: jsonb("unsupervised_findings").$type<{
    anomalyScore: number;
    clusterAssignment: number;
    clusterLabel: string;
    outlierReasons: string[];
    isolationForestScore: number;
  }>(),
  
  ragLlmFindings: jsonb("rag_llm_findings").$type<{
    contextualAnalysis: string;
    similarPatients: Array<{ patientId: string; similarity: number; outcome: string }>;
    doctorShoppingIndicators: Array<{ indicator: string; confidence: number }>;
    recommendation: string;
    confidence: number;
  }>(),
  
  semanticFindings: jsonb("semantic_findings").$type<{
    procedureDiagnosisPairs: Array<{
      icdCode: string;
      cptCode: string;
      icdDescription: string;
      cptDescription: string;
      similarity: number;
      confidencePercent: number;
      riskLevel: "low" | "medium" | "high" | "critical";
      clinicalInterpretation: string;
    }>;
    avgSimilarity: number;
    mismatchCount: number;
    criticalMismatches: number;
    overallAssessment: string;
  }>(),
  
  // Aggregated metrics
  aggregatedMetrics: jsonb("aggregated_metrics").$type<{
    totalClaims: number;
    totalAmount: number;
    avgClaimAmount: number;
    uniqueProviders: number;
    uniqueDoctors: number;
    flaggedClaimsCount: number;
    flaggedClaimsPercent: number;
    topDiagnosisCodes: Array<{ code: string; count: number }>;
    claimsByCity: Record<string, number>;
  }>(),
  
  primaryDetectionMethod: fwaDetectionMethodEnum("primary_detection_method"),
  detectionSummary: text("detection_summary"),
  recommendedAction: text("recommended_action"),
  
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertFwaPatientDetectionResultSchema = createInsertSchema(fwaPatientDetectionResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertFwaPatientDetectionResult = z.infer<typeof insertFwaPatientDetectionResultSchema>;
export type FwaPatientDetectionResult = typeof fwaPatientDetectionResults.$inferSelect;

// =============================================================================
// ENTITY TIMELINE TABLES
// Tracks entity behavior metrics across batches over time
// =============================================================================

// Provider Timeline - tracks provider metrics per batch
export const fwaProviderTimeline = pgTable("fwa_provider_timeline", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  batchId: text("batch_id").notNull(),
  batchDate: timestamp("batch_date"),
  
  // Batch-specific metrics
  claimCount: integer("claim_count").default(0),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0"),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 10, scale: 2 }),
  uniquePatients: integer("unique_patients").default(0),
  uniqueDoctors: integer("unique_doctors").default(0),
  
  // Risk metrics for this batch
  flaggedClaimsCount: integer("flagged_claims_count").default(0),
  highRiskClaimsCount: integer("high_risk_claims_count").default(0),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),
  
  // Trend indicators (compared to previous batch)
  claimCountChange: decimal("claim_count_change", { precision: 8, scale: 2 }), // % change
  amountChange: decimal("amount_change", { precision: 8, scale: 2 }), // % change
  riskScoreChange: decimal("risk_score_change", { precision: 5, scale: 2 }), // absolute change
  trendDirection: text("trend_direction"), // "increasing", "stable", "decreasing"
  
  // Top procedures/diagnoses for this batch
  topProcedures: jsonb("top_procedures").$type<Array<{ code: string; count: number; amount: number }>>().default([]),
  topDiagnoses: jsonb("top_diagnoses").$type<Array<{ code: string; count: number }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaProviderTimelineSchema = createInsertSchema(fwaProviderTimeline).omit({
  id: true,
  createdAt: true
});
export type InsertFwaProviderTimeline = z.infer<typeof insertFwaProviderTimelineSchema>;
export type FwaProviderTimeline = typeof fwaProviderTimeline.$inferSelect;

// Doctor Timeline
export const fwaDoctorTimeline = pgTable("fwa_doctor_timeline", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: text("doctor_id").notNull(),
  batchId: text("batch_id").notNull(),
  batchDate: timestamp("batch_date"),
  
  claimCount: integer("claim_count").default(0),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0"),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 10, scale: 2 }),
  uniquePatients: integer("unique_patients").default(0),
  uniqueProviders: integer("unique_providers").default(0),
  
  flaggedClaimsCount: integer("flagged_claims_count").default(0),
  highRiskClaimsCount: integer("high_risk_claims_count").default(0),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),
  
  claimCountChange: decimal("claim_count_change", { precision: 8, scale: 2 }),
  amountChange: decimal("amount_change", { precision: 8, scale: 2 }),
  riskScoreChange: decimal("risk_score_change", { precision: 5, scale: 2 }),
  trendDirection: text("trend_direction"),
  
  topProcedures: jsonb("top_procedures").$type<Array<{ code: string; count: number; amount: number }>>().default([]),
  topDiagnoses: jsonb("top_diagnoses").$type<Array<{ code: string; count: number }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaDoctorTimelineSchema = createInsertSchema(fwaDoctorTimeline).omit({
  id: true,
  createdAt: true
});
export type InsertFwaDoctorTimeline = z.infer<typeof insertFwaDoctorTimelineSchema>;
export type FwaDoctorTimeline = typeof fwaDoctorTimeline.$inferSelect;

// Patient Timeline
export const fwaPatientTimeline = pgTable("fwa_patient_timeline", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: text("patient_id").notNull(),
  batchId: text("batch_id").notNull(),
  batchDate: timestamp("batch_date"),
  
  claimCount: integer("claim_count").default(0),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0"),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 10, scale: 2 }),
  uniqueProviders: integer("unique_providers").default(0),
  uniqueDoctors: integer("unique_doctors").default(0),
  
  flaggedClaimsCount: integer("flagged_claims_count").default(0),
  highRiskClaimsCount: integer("high_risk_claims_count").default(0),
  avgRiskScore: decimal("avg_risk_score", { precision: 5, scale: 2 }),
  
  claimCountChange: decimal("claim_count_change", { precision: 8, scale: 2 }),
  amountChange: decimal("amount_change", { precision: 8, scale: 2 }),
  riskScoreChange: decimal("risk_score_change", { precision: 5, scale: 2 }),
  trendDirection: text("trend_direction"),
  
  topDiagnoses: jsonb("top_diagnoses").$type<Array<{ code: string; count: number }>>().default([]),
  providerList: jsonb("provider_list").$type<Array<{ providerId: string; claimCount: number }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertFwaPatientTimelineSchema = createInsertSchema(fwaPatientTimeline).omit({
  id: true,
  createdAt: true
});
export type InsertFwaPatientTimeline = z.infer<typeof insertFwaPatientTimelineSchema>;
export type FwaPatientTimeline = typeof fwaPatientTimeline.$inferSelect;

// Detection Thresholds Configuration
// Stores configurable thresholds for the 4-method detection engine
export const detectionThresholds = pgTable("detection_thresholds", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Threshold identification
  thresholdKey: text("threshold_key").notNull().unique(), // e.g., "provider_deviation_warning", "zscore_anomaly"
  category: text("category").notNull(), // "rule_engine", "statistical", "unsupervised", "rag_llm"
  entityType: text("entity_type"), // "provider", "doctor", "patient", or null for global
  
  // Threshold values
  warningThreshold: decimal("warning_threshold", { precision: 10, scale: 4 }),
  criticalThreshold: decimal("critical_threshold", { precision: 10, scale: 4 }),
  
  // Metadata
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar"), // Arabic translation
  description: text("description"),
  descriptionAr: text("description_ar"),
  unit: text("unit"), // "percentage", "zscore", "ratio", "count"
  
  // Configuration
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(100),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertDetectionThresholdSchema = createInsertSchema(detectionThresholds).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertDetectionThreshold = z.infer<typeof insertDetectionThresholdSchema>;
export type DetectionThreshold = typeof detectionThresholds.$inferSelect;

// CPT Code Embeddings for Semantic Similarity
export const cptEmbeddings = pgTable("cpt_embeddings", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  cptLongDescriptor: text("cpt_long_descriptor"),
  primaryTerm: text("primary_term"),
  keywords: text("keywords"),
  explainerJson: jsonb("explainer_json"),
  embeddingText: text("embedding_text"),
  enrichedText: text("enriched_text"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("cpt_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))
]);

export const insertCptEmbeddingSchema = createInsertSchema(cptEmbeddings).omit({
  id: true,
  embedding: true,
  createdAt: true,
  updatedAt: true
});
export type InsertCptEmbedding = z.infer<typeof insertCptEmbeddingSchema>;
export type CptEmbedding = typeof cptEmbeddings.$inferSelect;

// ICD-10 Code Embeddings for Semantic Similarity
export const icd10Embeddings = pgTable("icd10_embeddings", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description"),
  chapter: integer("chapter"),
  chapterDescription: text("chapter_description"),
  section: text("section"),
  sectionDescription: text("section_description"),
  parentCode: varchar("parent_code", { length: 20 }),
  depth: integer("depth"),
  includes: text("includes"),
  inclusionTerms: text("inclusion_terms"),
  excludes1: text("excludes1"),
  excludes2: text("excludes2"),
  embeddingText: text("embedding_text"),
  enrichedText: text("enriched_text"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("icd10_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))
]);

export const insertIcd10EmbeddingSchema = createInsertSchema(icd10Embeddings).omit({
  id: true,
  embedding: true,
  createdAt: true,
  updatedAt: true
});
export type InsertIcd10Embedding = z.infer<typeof insertIcd10EmbeddingSchema>;
export type Icd10Embedding = typeof icd10Embeddings.$inferSelect;

// Embedding Import Jobs for tracking batch imports
export const embeddingImportJobs = pgTable("embedding_import_jobs", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 20 }).notNull(), // 'cpt' or 'icd10'
  status: varchar("status", { length: 20 }).default("pending"), // pending, in_progress, completed, failed
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  embeddedRecords: integer("embedded_records").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertEmbeddingImportJobSchema = createInsertSchema(embeddingImportJobs).omit({
  id: true,
  createdAt: true
});
export type InsertEmbeddingImportJob = z.infer<typeof insertEmbeddingImportJobSchema>;
export type EmbeddingImportJob = typeof embeddingImportJobs.$inferSelect;

// ── Chat / Daman AI ─────────────────────────────────────────────────
export const chatConversations = pgTable("chat_conversations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  pillarContext: jsonb("pillar_context").$type<{
    pillarId: string;
    pagePath: string;
  }>(),
  title: text("title").default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  ragChunkIds: jsonb("rag_chunk_ids").$type<string[]>().default([]),
  retrievalMetadata: jsonb("retrieval_metadata").$type<{
    usedGrounding?: boolean;
    retrievalCount?: number;
    sources?: Array<{
      chunkId: string;
      documentId: string;
      documentTitle: string | null;
      similarity: number;
      chunkIndex: number;
    }>;
    ragStatus?: string | null;
    metrics?: {
      totalMs: number;
      embeddingMs: number;
      retrievalMs: number;
      generationMs: number;
    };
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatConversationSchema = createInsertSchema(chatConversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ── Pillar Portal: Shared Tables ────────────────────────────────────

export const providerTypeEnum = pgEnum("provider_type", [
  "tertiary_hospital",
  "secondary_hospital",
  "primary_care_center",
  "specialist_clinic",
  "dental_clinic",
  "rehabilitation_center",
  "polyclinic",
  "medical_tower",
]);

export const accreditationStatusEnum = pgEnum("accreditation_status", [
  "accredited",
  "conditional",
  "pending",
  "expired",
  "revoked",
]);

export const portalProviders = pgTable("portal_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  licenseNo: varchar("license_no", { length: 30 }).notNull(),
  region: text("region").notNull(),
  city: text("city").notNull(),
  type: providerTypeEnum("type").notNull(),
  bedCount: integer("bed_count"),
  specialties: text("specialties").array().default([]),
  accreditationStatus: accreditationStatusEnum("accreditation_status").default("accredited"),
  phone: varchar("phone", { length: 20 }),
  email: text("email"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  acceptedInsurers: text("accepted_insurers").array().default([]),
  languages: text("languages").array().default([]),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  avgWaitMinutes: integer("avg_wait_minutes"),
  workingHours: text("working_hours"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalProvider = typeof portalProviders.$inferSelect;
export type InsertPortalProvider = typeof portalProviders.$inferInsert;

export const portalInsurers = pgTable("portal_insurers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  licenseNo: varchar("license_no", { length: 30 }),
  marketShare: decimal("market_share", { precision: 5, scale: 2 }),
  lossRatio: decimal("loss_ratio", { precision: 5, scale: 2 }),
  capitalAdequacy: decimal("capital_adequacy", { precision: 5, scale: 2 }),
  healthStatus: text("health_status"),
  premiumVolumeSar: decimal("premium_volume_sar", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalInsurer = typeof portalInsurers.$inferSelect;
export type InsertPortalInsurer = typeof portalInsurers.$inferInsert;

export const portalRegions = pgTable("portal_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  population: integer("population"),
  insuredCount: integer("insured_count"),
  providerCount: integer("provider_count"),
  coverageRate: decimal("coverage_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalRegion = typeof portalRegions.$inferSelect;
export type InsertPortalRegion = typeof portalRegions.$inferInsert;

// ── Pillar Portal: Intelligence Tables ──────────────────────────────

export const drgReadinessStatusEnum = pgEnum("drg_readiness_status", [
  "complete",
  "in_progress",
  "not_started",
]);

export const providerScorecards = pgTable("provider_scorecards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerCode: varchar("provider_code", { length: 20 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
  codingAccuracy: decimal("coding_accuracy", { precision: 5, scale: 2 }),
  rejectionRate: decimal("rejection_rate", { precision: 5, scale: 2 }),
  sbsCompliance: decimal("sbs_compliance", { precision: 5, scale: 2 }),
  drgReadiness: decimal("drg_readiness", { precision: 5, scale: 2 }),
  documentationQuality: decimal("documentation_quality", { precision: 5, scale: 2 }),
  fwaRisk: decimal("fwa_risk", { precision: 5, scale: 2 }),
  peerRankPercentile: integer("peer_rank_percentile"),
  trend: text("trend"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProviderScorecard = typeof providerScorecards.$inferSelect;
export type InsertProviderScorecard = typeof providerScorecards.$inferInsert;

export const providerRejections = pgTable("provider_rejections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerCode: varchar("provider_code", { length: 20 }).notNull(),
  claimRef: varchar("claim_ref", { length: 30 }).notNull(),
  patientMrn: varchar("patient_mrn", { length: 20 }),
  icdCode: varchar("icd_code", { length: 15 }).notNull(),
  icdDescription: text("icd_description"),
  cptCode: varchar("cpt_code", { length: 15 }),
  cptDescription: text("cpt_description"),
  denialReason: text("denial_reason").notNull(),
  denialCategory: text("denial_category").notNull(),
  amountSar: decimal("amount_sar", { precision: 12, scale: 2 }).notNull(),
  recommendation: text("recommendation"),
  claimDate: timestamp("claim_date").notNull(),
  denialDate: timestamp("denial_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProviderRejection = typeof providerRejections.$inferSelect;
export type InsertProviderRejection = typeof providerRejections.$inferInsert;

export const providerDrgAssessments = pgTable("provider_drg_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerCode: varchar("provider_code", { length: 20 }).notNull(),
  criteriaName: text("criteria_name").notNull(),
  criteriaDescription: text("criteria_description"),
  status: drgReadinessStatusEnum("status").notNull(),
  gapDescription: text("gap_description"),
  recommendedAction: text("recommended_action"),
  targetDate: timestamp("target_date"),
  peerCompletionRate: decimal("peer_completion_rate", { precision: 5, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProviderDrgAssessment = typeof providerDrgAssessments.$inferSelect;
export type InsertProviderDrgAssessment = typeof providerDrgAssessments.$inferInsert;

// ── Pillar Portal: Business Tables ──────────────────────────────────

export const employerSectorEnum = pgEnum("employer_sector", [
  "construction",
  "technology",
  "hospitality",
  "oil_gas",
  "retail",
  "healthcare",
  "manufacturing",
  "education",
  "financial_services",
  "transportation",
]);

export const complianceStatusEnum = pgEnum("compliance_status", [
  "compliant",
  "action_required",
  "suspended",
  "under_review",
]);

export const portalEmployers = pgTable("portal_employers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  crNumber: varchar("cr_number", { length: 20 }).notNull(),
  sector: employerSectorEnum("sector").notNull(),
  sizeBand: text("size_band"),
  employeeCount: integer("employee_count").notNull(),
  insuredCount: integer("insured_count").notNull(),
  pendingEnrollment: integer("pending_enrollment").default(0),
  city: text("city").notNull(),
  region: text("region").notNull(),
  complianceStatus: complianceStatusEnum("compliance_status").default("compliant"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalEmployer = typeof portalEmployers.$inferSelect;
export type InsertPortalEmployer = typeof portalEmployers.$inferInsert;

export const employerPolicies = pgTable("employer_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employerCode: varchar("employer_code", { length: 20 }).notNull(),
  insurerCode: varchar("insurer_code", { length: 20 }).notNull(),
  insurerName: text("insurer_name").notNull(),
  planTier: text("plan_tier").notNull(),
  premiumPerEmployee: decimal("premium_per_employee", { precision: 10, scale: 2 }).notNull(),
  totalAnnualPremium: decimal("total_annual_premium", { precision: 14, scale: 2 }),
  coverageStart: timestamp("coverage_start").notNull(),
  coverageEnd: timestamp("coverage_end").notNull(),
  dependentsCount: integer("dependents_count").default(0),
  renewalDaysRemaining: integer("renewal_days_remaining"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmployerPolicy = typeof employerPolicies.$inferSelect;
export type InsertEmployerPolicy = typeof employerPolicies.$inferInsert;

export const workforceHealthProfiles = pgTable("workforce_health_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employerCode: varchar("employer_code", { length: 20 }).unique().notNull(),
  avgAge: decimal("avg_age", { precision: 4, scale: 1 }),
  malePercent: decimal("male_percent", { precision: 5, scale: 2 }),
  chronicConditions: jsonb("chronic_conditions"),
  topSpecialties: jsonb("top_specialties"),
  visitsPerEmployee: decimal("visits_per_employee", { precision: 5, scale: 2 }),
  erUtilizationPercent: decimal("er_utilization_percent", { precision: 5, scale: 2 }),
  erBenchmarkPercent: decimal("er_benchmark_percent", { precision: 5, scale: 2 }),
  totalAnnualSpendSar: decimal("total_annual_spend_sar", { precision: 14, scale: 2 }),
  costPerEmployee: decimal("cost_per_employee", { precision: 10, scale: 2 }),
  costTrendPercent: decimal("cost_trend_percent", { precision: 5, scale: 2 }),
  absenteeismDays: decimal("absenteeism_days", { precision: 5, scale: 2 }),
  absenteeismBenchmark: decimal("absenteeism_benchmark", { precision: 5, scale: 2 }),
  wellnessScore: integer("wellness_score"),
  wellnessBreakdown: jsonb("wellness_breakdown"),
  insights: jsonb("insights"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkforceHealthProfile = typeof workforceHealthProfiles.$inferSelect;
export type InsertWorkforceHealthProfile = typeof workforceHealthProfiles.$inferInsert;

export const employerViolations = pgTable("employer_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employerCode: varchar("employer_code", { length: 20 }).notNull(),
  violationType: text("violation_type").notNull(),
  description: text("description"),
  fineAmountSar: decimal("fine_amount_sar", { precision: 10, scale: 2 }),
  status: text("status"),
  issuedDate: timestamp("issued_date").notNull(),
  resolvedDate: timestamp("resolved_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmployerViolation = typeof employerViolations.$inferSelect;
export type InsertEmployerViolation = typeof employerViolations.$inferInsert;

// ── Pillar Portal: Members Tables ───────────────────────────────────

export const planTierEnum = pgEnum("plan_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
]);

export const coverageStatusEnum = pgEnum("coverage_status", [
  "covered",
  "partial",
  "not_covered",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "submitted",
  "under_review",
  "investigation",
  "resolution",
  "closed",
]);

export const portalMembers = pgTable("portal_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  iqamaNo: varchar("iqama_no", { length: 15 }).notNull(),
  policyNumber: varchar("policy_number", { length: 25 }).notNull(),
  employerCode: varchar("employer_code", { length: 20 }),
  employerName: text("employer_name"),
  insurerCode: varchar("insurer_code", { length: 20 }),
  insurerName: text("insurer_name"),
  planTier: planTierEnum("plan_tier").notNull(),
  nationality: text("nationality"),
  age: integer("age"),
  gender: text("gender"),
  city: text("city").notNull(),
  region: text("region").notNull(),
  dependentsCount: integer("dependents_count").default(0),
  policyValidUntil: timestamp("policy_valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalMember = typeof portalMembers.$inferSelect;
export type InsertPortalMember = typeof portalMembers.$inferInsert;

export const memberCoverage = pgTable("member_coverage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberCode: varchar("member_code", { length: 20 }).notNull(),
  benefitCategory: text("benefit_category").notNull(),
  benefitCategoryAr: text("benefit_category_ar"),
  icon: text("icon"),
  status: coverageStatusEnum("status").notNull(),
  limitSar: decimal("limit_sar", { precision: 10, scale: 2 }),
  usedSar: decimal("used_sar", { precision: 10, scale: 2 }).default("0"),
  limitUnits: integer("limit_units"),
  usedUnits: integer("used_units").default(0),
  copayPercent: integer("copay_percent").default(0),
  note: text("note"),
  noteAr: text("note_ar"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MemberCoverage = typeof memberCoverage.$inferSelect;
export type InsertMemberCoverage = typeof memberCoverage.$inferInsert;

export const memberComplaints = pgTable("member_complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number", { length: 20 }).unique().notNull(),
  memberCode: varchar("member_code", { length: 20 }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  status: complaintStatusEnum("status").default("submitted"),
  assignedTo: text("assigned_to"),
  estimatedResolution: text("estimated_resolution"),
  timeline: jsonb("timeline"),
  messages: jsonb("messages"),
  outcome: text("outcome"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MemberComplaint = typeof memberComplaints.$inferSelect;
export type InsertMemberComplaint = typeof memberComplaints.$inferInsert;

export const coverageLookups = pgTable("coverage_lookups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  questionAr: text("question_ar"),
  answer: text("answer").notNull(),
  answerAr: text("answer_ar"),
  planTiers: text("plan_tiers").array().default([]),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CoverageLookup = typeof coverageLookups.$inferSelect;
export type InsertCoverageLookup = typeof coverageLookups.$inferInsert;

// ---------- FWA Investigation Notes ----------

export const fwaEntityInvestigationNotes = pgTable("fwa_entity_investigation_notes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // "provider" | "doctor" | "patient"
  entityId: text("entity_id").notNull(),
  investigationStatus: text("investigation_status").notNull().default("open"), // "open" | "under_review" | "escalated" | "cleared" | "closed"
  assignedInvestigator: text("assigned_investigator"),
  noteType: text("note_type").notNull().default("general"), // "general" | "status_change" | "assignment" | "escalation"
  content: text("content").notNull(),
  author: text("author").notNull(),
  linkedEnforcementCaseId: text("linked_enforcement_case_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FwaEntityInvestigationNote = typeof fwaEntityInvestigationNotes.$inferSelect;
export type InsertFwaEntityInvestigationNote = typeof fwaEntityInvestigationNotes.$inferInsert;
export const insertFwaEntityInvestigationNoteSchema = createInsertSchema(fwaEntityInvestigationNotes);
