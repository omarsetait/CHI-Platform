import {
  type User,
  type InsertUser,
  type AuditLog,
  type InsertAuditLog,
  type PreAuthClaim,
  type InsertPreAuthClaim,
  type PreAuthSignal,
  type InsertPreAuthSignal,
  type PreAuthDecision,
  type InsertPreAuthDecision,
  type PreAuthAdjudicatorAction,
  type InsertPreAuthAdjudicatorAction,
  type PreAuthRlhfFeedback,
  type InsertPreAuthRlhfFeedback,
  type PreAuthDocument,
  type InsertPreAuthDocument,
  type PreAuthDocumentChunk,
  type InsertPreAuthDocumentChunk,
  type PreAuthPolicyRule,
  type InsertPreAuthPolicyRule,
  type PreAuthAgentConfig,
  type InsertPreAuthAgentConfig,
  type PreAuthBatch,
  type InsertPreAuthBatch,
  type FwaCase,
  type InsertFwaCase,
  type FwaAnalysisFinding,
  type InsertFwaAnalysisFinding,
  type FwaCategory,
  type InsertFwaCategory,
  type FwaAction,
  type InsertFwaAction,
  type FwaRegulatoryDoc,
  type InsertFwaRegulatoryDoc,
  type FwaMedicalGuideline,
  type InsertFwaMedicalGuideline,
  type FwaAgentConfig,
  type InsertFwaAgentConfig,
  type FwaBehavior,
  type InsertFwaBehavior,
  type FwaBatch,
  type InsertFwaBatch,
  type AgentReport,
  type InsertAgentReport,
  type DreamReport,
  type InsertDreamReport,
  type EvidencePack,
  type InsertEvidencePack,
  type ReconciliationSession,
  type InsertReconciliationSession,
  type SettlementLedger,
  type InsertSettlementLedger,
  type PeerGroup,
  type InsertPeerGroup,
  type Patient360,
  type InsertPatient360,
  type Provider360,
  type InsertProvider360,
  type Doctor360,
  type InsertDoctor360,
  type DigitalTwin,
  type InsertDigitalTwin,
  type ShadowRule,
  type InsertShadowRule,
  type GhostRun,
  type InsertGhostRun,
  type RelationshipGraph,
  type InsertRelationshipGraph,
  type CollusionRing,
  type InsertCollusionRing,
  type ProviderCommunication,
  type InsertProviderCommunication,
  type ProviderDirectory,
  type InsertProviderDirectory,
  type ProviderContract,
  type InsertProviderContract,
  type ProviderBenchmark,
  type InsertProviderBenchmark,
  type ProviderCpmMetric,
  type InsertProviderCpmMetric,
  type OperationalFinding,
  type InsertOperationalFinding,
  type KpiDefinition,
  type InsertKpiDefinition,
  type KpiResult,
  type InsertKpiResult,
  type Claim,
  type InsertClaim,
  type FwaClaimService,
  type PolicyViolationCatalogue,
  type InsertPolicyViolationCatalogue,
  type ClinicalPathwayRule,
  type InsertClinicalPathwayRule,
  type ProviderComplaint,
  type InsertProviderComplaint,
  type OnlineListeningMention,
  type InsertOnlineListeningMention,
  type EnforcementCase,
  type InsertEnforcementCase,
  type EnforcementDossier,
  type InsertEnforcementDossier,
  type FwaDetectionResult,
  // FwaAnalyzedClaim replaced by Claim
  type RegulatoryCircular,
  type InsertRegulatoryCircular,
  type AuditSession,
  type InsertAuditSession,
  type RlhfFeedback,
  type InsertRlhfFeedback,
  type ClaimDocument,
  type InsertClaimDocument,
  type WeightUpdateProposal,
  type InsertWeightUpdateProposal,
  type ListeningSourceConfig,
  type InsertListeningSourceConfig,
  type AuditFinding,
  type InsertAuditFinding,
  type AuditChecklist,
  type InsertAuditChecklist,
  type AgentPerformanceMetrics,
  users,
  preAuthClaims,
  preAuthSignals,
  preAuthDecisions,
  preAuthAdjudicatorActions,
  preAuthRlhfFeedback,
  preAuthDocuments,
  preAuthDocumentChunks,
  preAuthPolicyRules,
  preAuthAgentConfigs,
  preAuthBatches,
  agentPerformanceMetrics,
  fwaCases,
  fwaAnalysisFindings,
  fwaCategories,
  fwaActions,
  fwaRegulatoryDocs,
  fwaMedicalGuidelines,
  fwaAgentConfigs,
  fwaBehaviors,
  fwaBatches,
  agentReports,
  dreamReports,
  evidencePacks,
  reconciliationSessions,
  settlementLedger,
  peerGroups,
  patient360,
  provider360,
  doctor360,
  digitalTwins,
  shadowRules,
  ghostRuns,
  relationshipGraphs,
  collusionRings,
  providerCommunications,
  providerDirectory,
  providerContracts,
  providerBenchmarks,
  providerCpmMetrics,
  operationalFindingsLedger,
  auditLogs,
  kpiDefinitions,
  kpiResults,
  claims,
  fwaClaimServices,
  policyViolationCatalogue,
  clinicalPathwayRules,
  providerComplaints,
  onlineListeningMentions,
  enforcementCases,
  enforcementDossiers,
  fwaDetectionResults,
  regulatoryCirculars,
  auditSessions,
  rlhfFeedback,
  claimDocuments,
  weightUpdateProposals,
  listeningSourceConfigs,
  auditFindings,
  auditChecklists,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, or, desc, inArray, ilike, sql, SQL } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: string; resourceType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]>;

  getPreAuthClaims(): Promise<PreAuthClaim[]>;
  getPreAuthClaim(id: string): Promise<PreAuthClaim | undefined>;
  getPreAuthClaimByClaimId(claimId: string): Promise<PreAuthClaim | undefined>;
  createPreAuthClaim(claim: InsertPreAuthClaim): Promise<PreAuthClaim>;
  updatePreAuthClaim(id: string, updates: Partial<InsertPreAuthClaim>): Promise<PreAuthClaim | undefined>;
  deletePreAuthClaim(id: string): Promise<boolean>;

  getPreAuthSignalsByClaimId(claimId: string): Promise<PreAuthSignal[]>;
  createPreAuthSignal(signal: InsertPreAuthSignal): Promise<PreAuthSignal>;

  getPreAuthDecisionByClaimId(claimId: string): Promise<PreAuthDecision | undefined>;
  createPreAuthDecision(decision: InsertPreAuthDecision): Promise<PreAuthDecision>;

  createPreAuthAdjudicatorAction(action: InsertPreAuthAdjudicatorAction): Promise<PreAuthAdjudicatorAction>;

  createPreAuthRlhfFeedback(feedback: InsertPreAuthRlhfFeedback): Promise<PreAuthRlhfFeedback>;
  getPreAuthRlhfFeedback(): Promise<PreAuthRlhfFeedback[]>;
  updatePreAuthRlhfFeedback(id: string, updates: Partial<InsertPreAuthRlhfFeedback>): Promise<PreAuthRlhfFeedback | undefined>;

  getPreAuthDocuments(type?: string): Promise<PreAuthDocument[]>;
  getPreAuthDocument(id: string): Promise<PreAuthDocument | undefined>;
  createPreAuthDocument(doc: InsertPreAuthDocument): Promise<PreAuthDocument>;
  deletePreAuthDocument(id: string): Promise<boolean>;

  getPreAuthDocumentChunks(documentId: string): Promise<PreAuthDocumentChunk[]>;
  createPreAuthDocumentChunk(chunk: InsertPreAuthDocumentChunk): Promise<PreAuthDocumentChunk>;

  getPreAuthPolicyRules(): Promise<PreAuthPolicyRule[]>;
  createPreAuthPolicyRule(rule: InsertPreAuthPolicyRule): Promise<PreAuthPolicyRule>;
  updatePreAuthPolicyRule(id: string, updates: Partial<InsertPreAuthPolicyRule>): Promise<PreAuthPolicyRule | undefined>;
  deletePreAuthPolicyRule(id: string): Promise<boolean>;

  getPreAuthAgentConfigs(): Promise<PreAuthAgentConfig[]>;
  getPreAuthAgentConfig(agentId: string): Promise<PreAuthAgentConfig | undefined>;
  createPreAuthAgentConfig(config: InsertPreAuthAgentConfig): Promise<PreAuthAgentConfig>;
  updatePreAuthAgentConfig(agentId: string, updates: Partial<InsertPreAuthAgentConfig>): Promise<PreAuthAgentConfig | undefined>;

  getPreAuthAllSignals(): Promise<PreAuthSignal[]>;
  getPreAuthAllActions(): Promise<PreAuthAdjudicatorAction[]>;
  getAgentPerformanceMetricsByModule(module: string): Promise<AgentPerformanceMetrics[]>;

  getPreAuthBatches(): Promise<PreAuthBatch[]>;
  getPreAuthBatch(id: string): Promise<PreAuthBatch | undefined>;
  createPreAuthBatch(batch: InsertPreAuthBatch): Promise<PreAuthBatch>;
  updatePreAuthBatch(id: string, updates: Partial<InsertPreAuthBatch>): Promise<PreAuthBatch | undefined>;

  getFwaCases(): Promise<FwaCase[]>;
  getFwaCaseById(id: string): Promise<FwaCase | undefined>;
  getFwaCaseByClaimId(claimId: string): Promise<FwaCase | undefined>;
  createFwaCase(data: InsertFwaCase): Promise<FwaCase>;
  updateFwaCase(id: string, data: Partial<InsertFwaCase>): Promise<FwaCase | undefined>;

  getFwaFindingsByCaseId(caseId: string): Promise<FwaAnalysisFinding[]>;
  createFwaFinding(data: InsertFwaAnalysisFinding): Promise<FwaAnalysisFinding>;

  getFwaCategoriesByCaseId(caseId: string): Promise<FwaCategory[]>;
  createFwaCategory(data: InsertFwaCategory): Promise<FwaCategory>;

  getFwaActionsByCaseId(caseId: string): Promise<FwaAction[]>;
  createFwaAction(data: InsertFwaAction): Promise<FwaAction>;
  updateFwaAction(id: string, data: Partial<InsertFwaAction>): Promise<FwaAction | undefined>;

  getFwaRegulatoryDocs(): Promise<FwaRegulatoryDoc[]>;
  createFwaRegulatoryDoc(data: InsertFwaRegulatoryDoc): Promise<FwaRegulatoryDoc>;

  getFwaMedicalGuidelines(): Promise<FwaMedicalGuideline[]>;
  createFwaMedicalGuideline(data: InsertFwaMedicalGuideline): Promise<FwaMedicalGuideline>;

  getFwaAgentConfigs(): Promise<FwaAgentConfig[]>;
  getFwaAgentConfigByType(agentType: string): Promise<FwaAgentConfig | undefined>;
  createFwaAgentConfig(data: InsertFwaAgentConfig): Promise<FwaAgentConfig>;
  updateFwaAgentConfig(id: string, data: Partial<InsertFwaAgentConfig>): Promise<FwaAgentConfig | undefined>;
  updateFwaAgentConfigByType(agentType: string, data: Partial<InsertFwaAgentConfig>): Promise<FwaAgentConfig | undefined>;

  getFwaBehaviors(): Promise<FwaBehavior[]>;
  getFwaBehavior(id: string): Promise<FwaBehavior | undefined>;
  createFwaBehavior(data: InsertFwaBehavior): Promise<FwaBehavior>;
  updateFwaBehavior(id: string, data: Partial<InsertFwaBehavior>): Promise<FwaBehavior | undefined>;
  deleteFwaBehavior(id: string): Promise<boolean>;

  getFwaBatches(): Promise<FwaBatch[]>;
  getFwaBatch(id: string): Promise<FwaBatch | undefined>;
  createFwaBatch(data: InsertFwaBatch): Promise<FwaBatch>;
  updateFwaBatch(id: string, data: Partial<InsertFwaBatch>): Promise<FwaBatch | undefined>;

  getAgentReports(): Promise<AgentReport[]>;
  getAgentReportById(id: string): Promise<AgentReport | undefined>;
  getAgentReportsByCaseId(caseId: string): Promise<AgentReport[]>;
  getAgentReportsByEntityId(entityId: string, entityType: string): Promise<AgentReport[]>;
  createAgentReport(data: InsertAgentReport): Promise<AgentReport>;
  updateAgentReport(id: string, data: Partial<InsertAgentReport>): Promise<AgentReport | undefined>;

  // Provider Relations - Dream Reports
  getAllDreamReports(): Promise<DreamReport[]>;
  getDreamReportById(id: string): Promise<DreamReport | undefined>;
  getDreamReportsByProviderId(providerId: string): Promise<DreamReport[]>;
  createDreamReport(data: InsertDreamReport): Promise<DreamReport>;
  updateDreamReport(id: string, data: Partial<InsertDreamReport>): Promise<DreamReport | undefined>;

  // Provider Relations - Evidence Packs
  getAllEvidencePacks(): Promise<EvidencePack[]>;
  getEvidencePackById(id: string): Promise<EvidencePack | undefined>;
  createEvidencePack(data: InsertEvidencePack): Promise<EvidencePack>;
  updateEvidencePack(id: string, data: Partial<InsertEvidencePack>): Promise<EvidencePack | undefined>;
  lockEvidencePack(id: string, lockedBy: string): Promise<EvidencePack | undefined>;

  // Provider Relations - Reconciliation Sessions
  getAllReconciliationSessions(): Promise<ReconciliationSession[]>;
  getReconciliationSessionById(id: string): Promise<ReconciliationSession | undefined>;
  createReconciliationSession(data: InsertReconciliationSession): Promise<ReconciliationSession>;
  updateReconciliationSession(id: string, data: Partial<InsertReconciliationSession>): Promise<ReconciliationSession | undefined>;

  // Provider Relations - Settlement Ledger
  getAllSettlements(): Promise<SettlementLedger[]>;
  getSettlementById(id: string): Promise<SettlementLedger | undefined>;
  createSettlement(data: InsertSettlementLedger): Promise<SettlementLedger>;
  updateSettlement(id: string, data: Partial<InsertSettlementLedger>): Promise<SettlementLedger | undefined>;

  // Provider Relations - Peer Groups
  getAllPeerGroups(): Promise<PeerGroup[]>;
  getPeerGroupById(id: string): Promise<PeerGroup | undefined>;
  createPeerGroup(data: InsertPeerGroup): Promise<PeerGroup>;

  // Context Enrichment - 360 Views
  getPatient360(patientId: string): Promise<Patient360 | undefined>;
  createPatient360(data: InsertPatient360): Promise<Patient360>;
  updatePatient360(patientId: string, data: Partial<InsertPatient360>): Promise<Patient360 | undefined>;
  listPatient360s(): Promise<Patient360[]>;

  getProvider360(providerId: string): Promise<Provider360 | undefined>;
  createProvider360(data: InsertProvider360): Promise<Provider360>;
  updateProvider360(providerId: string, data: Partial<InsertProvider360>): Promise<Provider360 | undefined>;
  listProvider360s(): Promise<Provider360[]>;

  getDoctor360(doctorId: string): Promise<Doctor360 | undefined>;
  createDoctor360(data: InsertDoctor360): Promise<Doctor360>;
  updateDoctor360(doctorId: string, data: Partial<InsertDoctor360>): Promise<Doctor360 | undefined>;
  listDoctor360s(): Promise<Doctor360[]>;

  // Simulation Lab - Digital Twins
  createDigitalTwin(data: InsertDigitalTwin): Promise<DigitalTwin>;
  getDigitalTwin(twinId: string): Promise<DigitalTwin | undefined>;
  listDigitalTwins(): Promise<DigitalTwin[]>;
  updateDigitalTwin(twinId: string, data: Partial<InsertDigitalTwin>): Promise<DigitalTwin | undefined>;
  deleteDigitalTwin(twinId: string): Promise<boolean>;

  // Simulation Lab - Shadow Rules
  createShadowRule(data: InsertShadowRule): Promise<ShadowRule>;
  getShadowRule(ruleSetId: string): Promise<ShadowRule | undefined>;
  listShadowRules(): Promise<ShadowRule[]>;
  updateShadowRule(ruleSetId: string, data: Partial<InsertShadowRule>): Promise<ShadowRule | undefined>;
  deleteShadowRule(ruleSetId: string): Promise<boolean>;

  // Simulation Lab - Ghost Runs
  createGhostRun(data: InsertGhostRun): Promise<GhostRun>;
  getGhostRun(runId: string): Promise<GhostRun | undefined>;
  listGhostRuns(): Promise<GhostRun[]>;
  updateGhostRun(runId: string, data: Partial<InsertGhostRun>): Promise<GhostRun | undefined>;

  // Graph Analysis - Relationship Graphs
  createRelationshipGraph(data: InsertRelationshipGraph): Promise<RelationshipGraph>;
  getRelationshipGraph(graphId: string): Promise<RelationshipGraph | undefined>;
  listRelationshipGraphs(): Promise<RelationshipGraph[]>;
  updateRelationshipGraph(graphId: string, data: Partial<InsertRelationshipGraph>): Promise<RelationshipGraph | undefined>;
  deleteRelationshipGraph(graphId: string): Promise<boolean>;

  // Graph Analysis - Collusion Rings
  createCollusionRing(data: InsertCollusionRing): Promise<CollusionRing>;
  getCollusionRing(ringId: string): Promise<CollusionRing | undefined>;
  listCollusionRings(): Promise<CollusionRing[]>;
  updateCollusionRing(ringId: string, data: Partial<InsertCollusionRing>): Promise<CollusionRing | undefined>;

  // Provider Communications
  getAllProviderCommunications(): Promise<ProviderCommunication[]>;
  getProviderCommunicationById(id: string): Promise<ProviderCommunication | undefined>;
  createProviderCommunication(data: InsertProviderCommunication): Promise<ProviderCommunication>;

  // Provider Directory
  getAllProviderDirectoryEntries(): Promise<ProviderDirectory[]>;
  getProviderDirectoryById(id: string): Promise<ProviderDirectory | undefined>;
  getProviderDirectoryByNpi(npi: string): Promise<ProviderDirectory | undefined>;
  createProviderDirectoryEntry(data: InsertProviderDirectory): Promise<ProviderDirectory>;

  // Provider Contracts
  getAllProviderContracts(): Promise<ProviderContract[]>;
  getProviderContractById(id: string): Promise<ProviderContract | undefined>;
  createProviderContract(data: InsertProviderContract): Promise<ProviderContract>;

  // Provider Benchmarks
  getAllProviderBenchmarks(): Promise<ProviderBenchmark[]>;
  getProviderBenchmarkById(providerId: string): Promise<ProviderBenchmark | undefined>;
  createProviderBenchmark(data: InsertProviderBenchmark): Promise<ProviderBenchmark>;
  updateProviderBenchmark(id: string, data: Partial<InsertProviderBenchmark>): Promise<ProviderBenchmark | undefined>;

  // CPM Metrics
  getAllProviderCpmMetrics(): Promise<ProviderCpmMetric[]>;
  getProviderCpmMetricsByProviderId(providerId: string): Promise<ProviderCpmMetric[]>;
  createProviderCpmMetric(data: InsertProviderCpmMetric): Promise<ProviderCpmMetric>;

  // Operational Findings
  getAllOperationalFindings(): Promise<OperationalFinding[]>;
  getOperationalFindingById(id: string): Promise<OperationalFinding | undefined>;
  getOperationalFindingsByProviderId(providerId: string): Promise<OperationalFinding[]>;
  createOperationalFinding(data: InsertOperationalFinding): Promise<OperationalFinding>;
  updateOperationalFinding(id: string, data: Partial<InsertOperationalFinding>): Promise<OperationalFinding | undefined>;

  // KPI Definitions
  getKpiDefinitions(): Promise<KpiDefinition[]>;
  getKpiDefinition(id: string): Promise<KpiDefinition | undefined>;
  createKpiDefinition(data: InsertKpiDefinition): Promise<KpiDefinition>;
  updateKpiDefinition(id: string, data: Partial<InsertKpiDefinition>): Promise<KpiDefinition | undefined>;
  deleteKpiDefinition(id: string): Promise<boolean>;

  // KPI Results
  getKpiResults(filters?: { kpiCode?: string; providerId?: string }): Promise<KpiResult[]>;
  createKpiResult(data: InsertKpiResult): Promise<KpiResult>;

  // Claims for Findings Feature
  getClaims(options?: { search?: string; limit?: number; offset?: number; status?: string }): Promise<{ claims: Claim[]; total: number }>;
  getClaimById(id: string): Promise<Claim | undefined>;
  getClaimsByIds(ids: string[]): Promise<Claim[]>;
  getClaimsByProviderId(providerId: string, options?: { limit?: number }): Promise<Claim[]>;
  getClaimServicesByClaimId(claimId: string): Promise<FwaClaimService[]>;
  getFwaAnalysisFindingsByCaseId(caseId: string): Promise<FwaAnalysisFinding[]>;
  createClaim(data: InsertClaim): Promise<Claim>;
  updateClaim(id: string, data: Partial<InsertClaim>): Promise<Claim | undefined>;

  // CHI Regulatory Extensions
  // Policy Violations
  getPolicyViolations(): Promise<PolicyViolationCatalogue[]>;
  getPolicyViolation(id: string): Promise<PolicyViolationCatalogue | undefined>;
  createPolicyViolation(data: InsertPolicyViolationCatalogue): Promise<PolicyViolationCatalogue>;
  updatePolicyViolation(id: string, data: Partial<InsertPolicyViolationCatalogue>): Promise<PolicyViolationCatalogue | undefined>;

  // Clinical Pathway Rules
  getClinicalPathwayRules(): Promise<ClinicalPathwayRule[]>;
  getClinicalPathwayRule(id: string): Promise<ClinicalPathwayRule | undefined>;
  createClinicalPathwayRule(data: InsertClinicalPathwayRule): Promise<ClinicalPathwayRule>;
  updateClinicalPathwayRule(id: string, data: Partial<InsertClinicalPathwayRule>): Promise<ClinicalPathwayRule | undefined>;

  // Provider Complaints
  getProviderComplaints(): Promise<ProviderComplaint[]>;
  getProviderComplaint(id: string): Promise<ProviderComplaint | undefined>;
  createProviderComplaint(data: InsertProviderComplaint): Promise<ProviderComplaint>;
  updateProviderComplaint(id: string, data: Partial<InsertProviderComplaint>): Promise<ProviderComplaint | undefined>;

  // Online Listening
  getOnlineListeningMentions(): Promise<OnlineListeningMention[]>;
  createOnlineListeningMention(data: InsertOnlineListeningMention): Promise<OnlineListeningMention>;

  // Online Listening Source Configs
  getListeningSourceConfigs(): Promise<ListeningSourceConfig[]>;
  getListeningSourceConfig(sourceId: string): Promise<ListeningSourceConfig | undefined>;
  createListeningSourceConfig(data: InsertListeningSourceConfig): Promise<ListeningSourceConfig>;
  updateListeningSourceConfig(id: string, data: Partial<InsertListeningSourceConfig>): Promise<ListeningSourceConfig | undefined>;

  // Enforcement Cases
  getEnforcementCases(): Promise<EnforcementCase[]>;
  getEnforcementCase(id: string): Promise<EnforcementCase | undefined>;
  createEnforcementCase(data: InsertEnforcementCase): Promise<EnforcementCase>;
  updateEnforcementCase(id: string, data: Partial<InsertEnforcementCase>): Promise<EnforcementCase | undefined>;

  // Enforcement Dossiers
  createEnforcementDossier(data: InsertEnforcementDossier): Promise<EnforcementDossier>;
  getEnforcementDossier(id: number): Promise<EnforcementDossier | undefined>;
  getEnforcementDossierByCaseId(caseId: string): Promise<EnforcementDossier | undefined>;
  updateEnforcementDossier(id: number, data: Partial<InsertEnforcementDossier>): Promise<EnforcementDossier | undefined>;
  listEnforcementDossiers(filters?: { status?: string; stage?: string }): Promise<EnforcementDossier[]>;

  // Detection results for enforcement workflow
  getDetectionResultsByClaimId(claimId: string): Promise<FwaDetectionResult | undefined>;
  getDetectionResultsByProvider(providerId: string): Promise<FwaDetectionResult[]>;
  getAnalyzedClaimsByProvider(providerId: string, limit?: number): Promise<Claim[]>;

  // Regulatory Circulars
  getRegulatoryCirculars(): Promise<RegulatoryCircular[]>;
  getRegulatoryCircular(id: string): Promise<RegulatoryCircular | undefined>;
  createRegulatoryCircular(data: InsertRegulatoryCircular): Promise<RegulatoryCircular>;
  updateRegulatoryCircular(id: string, data: Partial<InsertRegulatoryCircular>): Promise<RegulatoryCircular | undefined>;

  // Audit Sessions
  getAuditSessions(): Promise<AuditSession[]>;
  getAuditSession(id: string): Promise<AuditSession | undefined>;
  createAuditSession(data: InsertAuditSession): Promise<AuditSession>;
  updateAuditSession(id: string, data: Partial<InsertAuditSession>): Promise<AuditSession | undefined>;

  // Audit Findings
  getAuditFindings(auditSessionId?: string): Promise<AuditFinding[]>;
  getAuditFinding(id: string): Promise<AuditFinding | undefined>;
  createAuditFinding(data: InsertAuditFinding): Promise<AuditFinding>;
  updateAuditFinding(id: string, data: Partial<InsertAuditFinding>): Promise<AuditFinding | undefined>;
  deleteAuditFinding(id: string): Promise<boolean>;

  // Audit Checklists  
  getAuditChecklists(auditSessionId: string): Promise<AuditChecklist[]>;
  getAuditChecklist(id: string): Promise<AuditChecklist | undefined>;
  createAuditChecklist(data: InsertAuditChecklist): Promise<AuditChecklist>;
  updateAuditChecklist(id: string, data: Partial<InsertAuditChecklist>): Promise<AuditChecklist | undefined>;
  createDefaultChecklists(auditSessionId: string, category: string): Promise<AuditChecklist[]>;

  // RLHF Feedback (Phase 1)
  getRlhfFeedback(module?: string, filters?: { agentId?: string; phase?: string; limit?: number }): Promise<RlhfFeedback[]>;
  createRlhfFeedback(data: InsertRlhfFeedback): Promise<RlhfFeedback>;
  getRlhfMetrics(): Promise<{ fwa: { total: number; accepted: number }; claims: { total: number; accepted: number } }>;

  // Claim Documents (Phase 2)
  getClaimDocuments(claimId?: string): Promise<ClaimDocument[]>;
  getClaimDocument(id: string): Promise<ClaimDocument | undefined>;
  createClaimDocument(data: InsertClaimDocument): Promise<ClaimDocument>;
  updateClaimDocument(id: string, data: Partial<InsertClaimDocument>): Promise<ClaimDocument | undefined>;

  // Weight Update Proposals (Phase 4)
  getWeightUpdateProposals(status?: string): Promise<WeightUpdateProposal[]>;
  createWeightUpdateProposal(data: InsertWeightUpdateProposal): Promise<WeightUpdateProposal>;
  updateWeightUpdateProposal(id: string, data: Partial<InsertWeightUpdateProposal>): Promise<WeightUpdateProposal | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private preAuthClaims: Map<string, PreAuthClaim>;
  private preAuthSignals: Map<string, PreAuthSignal>;
  private preAuthDecisions: Map<string, PreAuthDecision>;
  private preAuthAdjudicatorActions: Map<string, PreAuthAdjudicatorAction>;
  private preAuthRlhfFeedback: Map<string, PreAuthRlhfFeedback>;
  private preAuthDocuments: Map<string, PreAuthDocument>;
  private preAuthDocumentChunks: Map<string, PreAuthDocumentChunk>;
  private preAuthPolicyRules: Map<string, PreAuthPolicyRule>;
  private preAuthAgentConfigs: Map<string, PreAuthAgentConfig>;
  private preAuthBatches: Map<string, PreAuthBatch>;
  private fwaCases: Map<string, FwaCase>;
  private fwaAnalysisFindings: Map<string, FwaAnalysisFinding>;
  private fwaCategories: Map<string, FwaCategory>;
  private fwaActions: Map<string, FwaAction>;
  private fwaRegulatoryDocs: Map<string, FwaRegulatoryDoc>;
  private fwaMedicalGuidelines: Map<string, FwaMedicalGuideline>;
  private fwaAgentConfigs: Map<string, FwaAgentConfig>;
  private fwaBehaviors: Map<string, FwaBehavior>;
  private fwaBatches: Map<string, FwaBatch>;
  private agentReports: Map<string, AgentReport>;
  private dreamReportsMap: Map<string, DreamReport>;
  private evidencePacksMap: Map<string, EvidencePack>;
  private reconciliationSessionsMap: Map<string, ReconciliationSession>;
  private settlementLedgerMap: Map<string, SettlementLedger>;
  private peerGroupsMap: Map<string, PeerGroup>;
  private digitalTwinsMap: Map<string, DigitalTwin>;
  private shadowRulesMap: Map<string, ShadowRule>;
  private ghostRunsMap: Map<string, GhostRun>;
  private relationshipGraphsMap: Map<string, RelationshipGraph>;
  private collusionRingsMap: Map<string, CollusionRing>;
  private providerCommunicationsMap: Map<string, ProviderCommunication>;
  private providerDirectoryMap: Map<string, ProviderDirectory>;
  private providerBenchmarksMap: Map<string, ProviderBenchmark>;
  private providerCpmMetricsMap: Map<string, ProviderCpmMetric>;
  private operationalFindingsMap: Map<string, OperationalFinding>;
  private kpiDefinitionsMap: Map<string, KpiDefinition>;
  private kpiResultsMap: Map<string, KpiResult>;
  private auditFindingsMap: Map<string, AuditFinding>;
  private auditChecklistsMap: Map<string, AuditChecklist>;

  constructor() {
    this.users = new Map();
    this.preAuthClaims = new Map();
    this.preAuthSignals = new Map();
    this.preAuthDecisions = new Map();
    this.preAuthAdjudicatorActions = new Map();
    this.preAuthRlhfFeedback = new Map();
    this.preAuthDocuments = new Map();
    this.preAuthDocumentChunks = new Map();
    this.preAuthPolicyRules = new Map();
    this.preAuthAgentConfigs = new Map();
    this.preAuthBatches = new Map();
    this.fwaCases = new Map();
    this.fwaAnalysisFindings = new Map();
    this.fwaCategories = new Map();
    this.fwaActions = new Map();
    this.fwaRegulatoryDocs = new Map();
    this.fwaMedicalGuidelines = new Map();
    this.fwaAgentConfigs = new Map();
    this.fwaBehaviors = new Map();
    this.fwaBatches = new Map();
    this.agentReports = new Map();
    this.dreamReportsMap = new Map();
    this.evidencePacksMap = new Map();
    this.reconciliationSessionsMap = new Map();
    this.settlementLedgerMap = new Map();
    this.peerGroupsMap = new Map();
    this.digitalTwinsMap = new Map();
    this.shadowRulesMap = new Map();
    this.ghostRunsMap = new Map();
    this.relationshipGraphsMap = new Map();
    this.collusionRingsMap = new Map();
    this.providerCommunicationsMap = new Map();
    this.providerDirectoryMap = new Map();
    this.providerBenchmarksMap = new Map();
    this.providerCpmMetricsMap = new Map();
    this.operationalFindingsMap = new Map();
    this.kpiDefinitionsMap = new Map();
    this.kpiResultsMap = new Map();
    this.auditFindingsMap = new Map();
    this.auditChecklistsMap = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role || "viewer",
      isActive: true,
      lastLogin: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
    }
  }

  private auditLogs: Map<string, AuditLog> = new Map();

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      id,
      userId: log.userId || null,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId || null,
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
      details: log.details || null,
      createdAt: new Date(),
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async getAuditLogs(filters?: { userId?: string; resourceType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());
    if (filters?.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    if (filters?.resourceType) {
      logs = logs.filter(l => l.resourceType === filters.resourceType);
    }
    return logs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPreAuthClaims(): Promise<PreAuthClaim[]> {
    return Array.from(this.preAuthClaims.values());
  }

  async getPreAuthClaim(id: string): Promise<PreAuthClaim | undefined> {
    return this.preAuthClaims.get(id);
  }

  async getPreAuthClaimByClaimId(claimId: string): Promise<PreAuthClaim | undefined> {
    return Array.from(this.preAuthClaims.values()).find(
      (claim) => claim.claimId === claimId,
    );
  }

  async createPreAuthClaim(claim: InsertPreAuthClaim): Promise<PreAuthClaim> {
    const id = randomUUID();
    const now = new Date();
    const newClaim: PreAuthClaim = {
      id,
      claimId: claim.claimId,
      payerId: claim.payerId,
      memberId: claim.memberId,
      memberDob: claim.memberDob ?? null,
      memberGender: claim.memberGender ?? null,
      policyPlanId: claim.policyPlanId ?? null,
      providerId: claim.providerId ?? null,
      specialty: claim.specialty ?? null,
      networkStatus: claim.networkStatus ?? null,
      encounterType: claim.encounterType ?? null,
      totalAmount: claim.totalAmount ?? null,
      diagnoses: (claim.diagnoses ?? []) as PreAuthClaim["diagnoses"],
      lineItems: (claim.lineItems ?? []) as PreAuthClaim["lineItems"],
      clinicalDocuments: (claim.clinicalDocuments ?? []) as PreAuthClaim["clinicalDocuments"],
      status: claim.status ?? "ingested",
      processingPhase: claim.processingPhase ?? 1,
      priority: claim.priority ?? "NORMAL",
      batchId: claim.batchId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.preAuthClaims.set(id, newClaim);
    return newClaim;
  }

  async updatePreAuthClaim(id: string, updates: Partial<InsertPreAuthClaim>): Promise<PreAuthClaim | undefined> {
    const existing = this.preAuthClaims.get(id);
    if (!existing) return undefined;
    const updated: PreAuthClaim = {
      ...existing,
      ...updates,
      diagnoses: updates.diagnoses !== undefined ? (updates.diagnoses as PreAuthClaim["diagnoses"]) : existing.diagnoses,
      lineItems: updates.lineItems !== undefined ? (updates.lineItems as PreAuthClaim["lineItems"]) : existing.lineItems,
      clinicalDocuments: updates.clinicalDocuments !== undefined ? (updates.clinicalDocuments as PreAuthClaim["clinicalDocuments"]) : existing.clinicalDocuments,
      updatedAt: new Date(),
    };
    this.preAuthClaims.set(id, updated);
    return updated;
  }

  async deletePreAuthClaim(id: string): Promise<boolean> {
    return this.preAuthClaims.delete(id);
  }

  async getPreAuthSignalsByClaimId(claimId: string): Promise<PreAuthSignal[]> {
    return Array.from(this.preAuthSignals.values()).filter(
      (signal) => signal.claimId === claimId,
    );
  }

  async createPreAuthSignal(signal: InsertPreAuthSignal): Promise<PreAuthSignal> {
    const id = randomUUID();
    const newSignal: PreAuthSignal = {
      id,
      claimId: signal.claimId,
      detector: signal.detector,
      signalId: signal.signalId,
      riskFlag: signal.riskFlag ?? false,
      severity: signal.severity ?? null,
      confidence: signal.confidence ?? null,
      recommendation: signal.recommendation ?? null,
      rationale: signal.rationale ?? null,
      evidence: (signal.evidence ?? []) as PreAuthSignal["evidence"],
      missingInfo: signal.missingInfo ?? null,
      isHardStop: signal.isHardStop ?? false,
      createdAt: new Date(),
    };
    this.preAuthSignals.set(id, newSignal);
    return newSignal;
  }

  async getPreAuthDecisionByClaimId(claimId: string): Promise<PreAuthDecision | undefined> {
    return Array.from(this.preAuthDecisions.values()).find(
      (decision) => decision.claimId === claimId,
    );
  }

  async createPreAuthDecision(decision: InsertPreAuthDecision): Promise<PreAuthDecision> {
    const id = randomUUID();
    const newDecision: PreAuthDecision = {
      id,
      claimId: decision.claimId,
      aggregatedScore: decision.aggregatedScore ?? null,
      riskLevel: decision.riskLevel ?? null,
      hasHardStop: decision.hasHardStop ?? false,
      candidates: (decision.candidates ?? []) as PreAuthDecision["candidates"],
      topRecommendation: decision.topRecommendation ?? null,
      safetyCheckPassed: decision.safetyCheckPassed ?? false,
      conflictingSignals: (decision.conflictingSignals ?? []) as PreAuthDecision["conflictingSignals"],
      isFinal: decision.isFinal ?? false,
      createdAt: new Date(),
    };
    this.preAuthDecisions.set(id, newDecision);
    return newDecision;
  }

  async createPreAuthAdjudicatorAction(action: InsertPreAuthAdjudicatorAction): Promise<PreAuthAdjudicatorAction> {
    const id = randomUUID();
    const newAction: PreAuthAdjudicatorAction = {
      id,
      claimId: action.claimId,
      decisionId: action.decisionId ?? null,
      userId: action.userId ?? null,
      action: action.action,
      originalRecommendation: action.originalRecommendation ?? null,
      finalVerdict: action.finalVerdict,
      overrideReason: action.overrideReason ?? null,
      timestamp: new Date(),
    };
    this.preAuthAdjudicatorActions.set(id, newAction);
    return newAction;
  }

  async getPreAuthAllSignals(): Promise<PreAuthSignal[]> {
    return Array.from(this.preAuthSignals.values());
  }

  async getPreAuthAllActions(): Promise<PreAuthAdjudicatorAction[]> {
    return Array.from(this.preAuthAdjudicatorActions.values());
  }

  async getAgentPerformanceMetricsByModule(module: string): Promise<AgentPerformanceMetrics[]> {
    return [];
  }

  async createPreAuthRlhfFeedback(feedback: InsertPreAuthRlhfFeedback): Promise<PreAuthRlhfFeedback> {
    const id = randomUUID();
    const newFeedback: PreAuthRlhfFeedback = {
      id,
      claimId: feedback.claimId,
      actionId: feedback.actionId ?? null,
      feedbackType: feedback.feedbackType,
      agentId: feedback.agentId ?? null,
      wasAccepted: feedback.wasAccepted ?? null,
      preferenceScore: feedback.preferenceScore ?? null,
      curatedForTraining: feedback.curatedForTraining ?? false,
      createdAt: new Date(),
    };
    this.preAuthRlhfFeedback.set(id, newFeedback);
    return newFeedback;
  }

  async getPreAuthRlhfFeedback(): Promise<PreAuthRlhfFeedback[]> {
    return Array.from(this.preAuthRlhfFeedback.values());
  }

  async updatePreAuthRlhfFeedback(id: string, updates: Partial<InsertPreAuthRlhfFeedback>): Promise<PreAuthRlhfFeedback | undefined> {
    const existing = this.preAuthRlhfFeedback.get(id);
    if (!existing) return undefined;
    const updated: PreAuthRlhfFeedback = {
      ...existing,
      curatedForTraining: updates.curatedForTraining !== undefined ? (updates.curatedForTraining ?? false) : existing.curatedForTraining,
    };
    this.preAuthRlhfFeedback.set(id, updated);
    return updated;
  }

  async getPreAuthDocuments(type?: string): Promise<PreAuthDocument[]> {
    const docs = Array.from(this.preAuthDocuments.values());
    if (type) {
      return docs.filter((doc) => doc.documentType === type);
    }
    return docs;
  }

  async getPreAuthDocument(id: string): Promise<PreAuthDocument | undefined> {
    return this.preAuthDocuments.get(id);
  }

  async createPreAuthDocument(doc: InsertPreAuthDocument): Promise<PreAuthDocument> {
    const id = randomUUID();
    const now = new Date();
    const newDoc: PreAuthDocument = {
      id,
      name: doc.name,
      description: doc.description ?? null,
      documentType: doc.documentType,
      fileName: doc.fileName ?? null,
      fileSize: doc.fileSize ?? null,
      mimeType: doc.mimeType ?? null,
      sourceUrl: doc.sourceUrl ?? null,
      status: doc.status ?? "pending",
      totalChunks: doc.totalChunks ?? 0,
      targetPhase: doc.targetPhase ?? null,
      policyPlanId: doc.policyPlanId ?? null,
      memberId: doc.memberId ?? null,
      isActive: doc.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.preAuthDocuments.set(id, newDoc);
    return newDoc;
  }

  async deletePreAuthDocument(id: string): Promise<boolean> {
    return this.preAuthDocuments.delete(id);
  }

  async getPreAuthDocumentChunks(documentId: string): Promise<PreAuthDocumentChunk[]> {
    return Array.from(this.preAuthDocumentChunks.values()).filter(
      (chunk) => chunk.documentId === documentId,
    );
  }

  async createPreAuthDocumentChunk(chunk: InsertPreAuthDocumentChunk): Promise<PreAuthDocumentChunk> {
    const id = randomUUID();
    const newChunk: PreAuthDocumentChunk = {
      id,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      pageNumber: chunk.pageNumber ?? null,
      sectionTitle: chunk.sectionTitle ?? null,
      tokenCount: chunk.tokenCount ?? null,
      createdAt: new Date(),
    };
    this.preAuthDocumentChunks.set(id, newChunk);
    return newChunk;
  }

  async getPreAuthPolicyRules(): Promise<PreAuthPolicyRule[]> {
    return Array.from(this.preAuthPolicyRules.values());
  }

  async createPreAuthPolicyRule(rule: InsertPreAuthPolicyRule): Promise<PreAuthPolicyRule> {
    const id = randomUUID();
    const newRule: PreAuthPolicyRule = {
      id,
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      layer: rule.layer,
      condition: rule.condition ?? null,
      action: rule.action,
      severity: rule.severity ?? null,
      isActive: rule.isActive ?? true,
      createdAt: new Date(),
    };
    this.preAuthPolicyRules.set(id, newRule);
    return newRule;
  }

  async updatePreAuthPolicyRule(id: string, updates: Partial<InsertPreAuthPolicyRule>): Promise<PreAuthPolicyRule | undefined> {
    const existing = this.preAuthPolicyRules.get(id);
    if (!existing) return undefined;
    const updated: PreAuthPolicyRule = {
      ...existing,
      ruleId: updates.ruleId ?? existing.ruleId,
      ruleName: updates.ruleName ?? existing.ruleName,
      ruleType: updates.ruleType ?? existing.ruleType,
      layer: updates.layer ?? existing.layer,
      condition: updates.condition !== undefined ? (updates.condition ?? null) : existing.condition,
      action: updates.action ?? existing.action,
      severity: updates.severity !== undefined ? (updates.severity ?? null) : existing.severity,
      isActive: updates.isActive !== undefined ? (updates.isActive ?? true) : existing.isActive,
    };
    this.preAuthPolicyRules.set(id, updated);
    return updated;
  }

  async deletePreAuthPolicyRule(id: string): Promise<boolean> {
    return this.preAuthPolicyRules.delete(id);
  }

  async getPreAuthAgentConfigs(): Promise<PreAuthAgentConfig[]> {
    return Array.from(this.preAuthAgentConfigs.values());
  }

  async getPreAuthAgentConfig(agentId: string): Promise<PreAuthAgentConfig | undefined> {
    return Array.from(this.preAuthAgentConfigs.values()).find(
      (config) => config.agentId === agentId,
    );
  }

  async createPreAuthAgentConfig(config: InsertPreAuthAgentConfig): Promise<PreAuthAgentConfig> {
    const id = randomUUID();
    const now = new Date();
    const newConfig: PreAuthAgentConfig = {
      id,
      agentId: config.agentId,
      agentName: config.agentName,
      layer: config.layer,
      modelProvider: config.modelProvider ?? "OpenAI",
      modelName: config.modelName ?? "gpt-4o-mini",
      temperature: config.temperature ?? "0.2",
      maxTokens: config.maxTokens ?? 4096,
      systemPrompt: config.systemPrompt ?? null,
      weight: config.weight ?? "1.0",
      isActive: config.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.preAuthAgentConfigs.set(id, newConfig);
    return newConfig;
  }

  async updatePreAuthAgentConfig(agentId: string, updates: Partial<InsertPreAuthAgentConfig>): Promise<PreAuthAgentConfig | undefined> {
    const existing = Array.from(this.preAuthAgentConfigs.values()).find(
      (config) => config.agentId === agentId,
    );
    if (!existing) return undefined;
    const updated: PreAuthAgentConfig = {
      ...existing,
      agentName: updates.agentName ?? existing.agentName,
      layer: updates.layer ?? existing.layer,
      modelProvider: updates.modelProvider !== undefined ? (updates.modelProvider ?? "OpenAI") : existing.modelProvider,
      modelName: updates.modelName !== undefined ? (updates.modelName ?? "gpt-4o-mini") : existing.modelName,
      temperature: updates.temperature !== undefined ? (updates.temperature ?? "0.2") : existing.temperature,
      maxTokens: updates.maxTokens !== undefined ? (updates.maxTokens ?? 4096) : existing.maxTokens,
      systemPrompt: updates.systemPrompt !== undefined ? (updates.systemPrompt ?? null) : existing.systemPrompt,
      weight: updates.weight !== undefined ? (updates.weight ?? "1.0") : existing.weight,
      isActive: updates.isActive !== undefined ? (updates.isActive ?? true) : existing.isActive,
      updatedAt: new Date(),
    };
    this.preAuthAgentConfigs.set(existing.id, updated);
    return updated;
  }

  async getPreAuthBatches(): Promise<PreAuthBatch[]> {
    return Array.from(this.preAuthBatches.values());
  }

  async getPreAuthBatch(id: string): Promise<PreAuthBatch | undefined> {
    return this.preAuthBatches.get(id);
  }

  async createPreAuthBatch(batch: InsertPreAuthBatch): Promise<PreAuthBatch> {
    const id = randomUUID();
    const now = new Date();
    const newBatch: PreAuthBatch = {
      id,
      name: batch.name,
      status: batch.status ?? "pending",
      priority: batch.priority ?? "NORMAL",
      totalClaims: batch.totalClaims ?? 0,
      processedClaims: batch.processedClaims ?? 0,
      failedClaims: batch.failedClaims ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    this.preAuthBatches.set(id, newBatch);
    return newBatch;
  }

  async updatePreAuthBatch(id: string, updates: Partial<InsertPreAuthBatch>): Promise<PreAuthBatch | undefined> {
    const existing = this.preAuthBatches.get(id);
    if (!existing) return undefined;
    const updated: PreAuthBatch = {
      ...existing,
      name: updates.name ?? existing.name,
      status: updates.status !== undefined ? (updates.status ?? "pending") : existing.status,
      priority: updates.priority !== undefined ? (updates.priority ?? "NORMAL") : existing.priority,
      totalClaims: updates.totalClaims !== undefined ? (updates.totalClaims ?? 0) : existing.totalClaims,
      processedClaims: updates.processedClaims !== undefined ? (updates.processedClaims ?? 0) : existing.processedClaims,
      failedClaims: updates.failedClaims !== undefined ? (updates.failedClaims ?? 0) : existing.failedClaims,
      updatedAt: new Date(),
    };
    this.preAuthBatches.set(id, updated);
    return updated;
  }

  async getFwaCases(): Promise<FwaCase[]> {
    return Array.from(this.fwaCases.values());
  }

  async getFwaCaseById(id: string): Promise<FwaCase | undefined> {
    const direct = this.fwaCases.get(id);
    if (direct) return direct;
    return Array.from(this.fwaCases.values()).find(
      (c) => c.caseId === id || c.id === id
    );
  }

  async getFwaCaseByClaimId(claimId: string): Promise<FwaCase | undefined> {
    return Array.from(this.fwaCases.values()).find(
      (c) => c.claimId === claimId || c.caseId === claimId
    );
  }

  async createFwaCase(data: InsertFwaCase): Promise<FwaCase> {
    const id = randomUUID();
    const now = new Date();
    const newCase: FwaCase = {
      id,
      caseId: data.caseId,
      claimId: data.claimId,
      providerId: data.providerId,
      patientId: data.patientId,
      category: data.category ?? "coding",
      status: data.status ?? "draft",
      phase: data.phase ?? "a1_analysis",
      createdAt: now,
      updatedAt: now,
      priority: data.priority ?? "medium",
      totalAmount: data.totalAmount,
      recoveryAmount: data.recoveryAmount ?? null,
      assignedTo: data.assignedTo ?? null,
    };
    this.fwaCases.set(id, newCase);
    return newCase;
  }

  async updateFwaCase(id: string, data: Partial<InsertFwaCase>): Promise<FwaCase | undefined> {
    let existing = this.fwaCases.get(id);
    let storageKey = id;
    if (!existing) {
      const found = Array.from(this.fwaCases.entries()).find(
        ([, c]) => c.caseId === id || c.id === id
      );
      if (found) {
        [storageKey, existing] = found;
      }
    }
    if (!existing) return undefined;
    const updated: FwaCase = {
      ...existing,
      caseId: data.caseId ?? existing.caseId,
      claimId: data.claimId ?? existing.claimId,
      providerId: data.providerId ?? existing.providerId,
      patientId: data.patientId ?? existing.patientId,
      status: data.status !== undefined ? (data.status ?? "draft") : existing.status,
      phase: data.phase !== undefined ? (data.phase ?? "a1_analysis") : existing.phase,
      priority: data.priority !== undefined ? (data.priority ?? "medium") : existing.priority,
      totalAmount: data.totalAmount ?? existing.totalAmount,
      recoveryAmount: data.recoveryAmount !== undefined ? (data.recoveryAmount ?? null) : existing.recoveryAmount,
      assignedTo: data.assignedTo !== undefined ? (data.assignedTo ?? null) : existing.assignedTo,
      updatedAt: new Date(),
    };
    this.fwaCases.set(storageKey, updated);
    return updated;
  }

  async getFwaFindingsByCaseId(caseId: string): Promise<FwaAnalysisFinding[]> {
    return Array.from(this.fwaAnalysisFindings.values()).filter(
      (finding) => finding.caseId === caseId,
    );
  }

  async createFwaFinding(data: InsertFwaAnalysisFinding): Promise<FwaAnalysisFinding> {
    const id = randomUUID();
    const newFinding: FwaAnalysisFinding = {
      id,
      caseId: data.caseId,
      findingType: data.findingType,
      source: data.source,
      description: data.description,
      confidence: data.confidence,
      severity: data.severity,
      evidence: (data.evidence ?? {}) as FwaAnalysisFinding["evidence"],
      createdAt: new Date(),
    };
    this.fwaAnalysisFindings.set(id, newFinding);
    return newFinding;
  }

  async getFwaCategoriesByCaseId(caseId: string): Promise<FwaCategory[]> {
    return Array.from(this.fwaCategories.values()).filter(
      (category) => category.caseId === caseId,
    );
  }

  async createFwaCategory(data: InsertFwaCategory): Promise<FwaCategory> {
    const id = randomUUID();
    const newCategory: FwaCategory = {
      id,
      caseId: data.caseId,
      categoryType: data.categoryType,
      subCategory: data.subCategory,
      evidenceChain: (data.evidenceChain ?? {}) as FwaCategory["evidenceChain"],
      confidenceScore: data.confidenceScore,
      severityScore: data.severityScore,
      recommendedActions: (data.recommendedActions ?? []) as FwaCategory["recommendedActions"],
      createdAt: new Date(),
    };
    this.fwaCategories.set(id, newCategory);
    return newCategory;
  }

  async getFwaActionsByCaseId(caseId: string): Promise<FwaAction[]> {
    return Array.from(this.fwaActions.values()).filter(
      (action) => action.caseId === caseId,
    );
  }

  async createFwaAction(data: InsertFwaAction): Promise<FwaAction> {
    const id = randomUUID();
    const newAction: FwaAction = {
      id,
      caseId: data.caseId,
      actionType: data.actionType,
      actionTrack: data.actionTrack,
      status: data.status ?? "pending",
      targetClaimId: data.targetClaimId ?? null,
      amount: data.amount ?? null,
      rejectionCode: data.rejectionCode ?? null,
      justification: data.justification,
      auditTrail: (data.auditTrail ?? {}) as FwaAction["auditTrail"],
      executedBy: data.executedBy,
      executedAt: data.executedAt ?? null,
      createdAt: new Date(),
    };
    this.fwaActions.set(id, newAction);
    return newAction;
  }

  async updateFwaAction(id: string, data: Partial<InsertFwaAction>): Promise<FwaAction | undefined> {
    const existing = this.fwaActions.get(id);
    if (!existing) return undefined;
    const updated: FwaAction = {
      ...existing,
      caseId: data.caseId ?? existing.caseId,
      actionType: data.actionType ?? existing.actionType,
      actionTrack: data.actionTrack ?? existing.actionTrack,
      status: data.status !== undefined ? (data.status ?? "pending") : existing.status,
      targetClaimId: data.targetClaimId !== undefined ? (data.targetClaimId ?? null) : existing.targetClaimId,
      amount: data.amount !== undefined ? (data.amount ?? null) : existing.amount,
      rejectionCode: data.rejectionCode !== undefined ? (data.rejectionCode ?? null) : existing.rejectionCode,
      justification: data.justification ?? existing.justification,
      auditTrail: data.auditTrail !== undefined ? ((data.auditTrail ?? {}) as FwaAction["auditTrail"]) : existing.auditTrail,
      executedBy: data.executedBy ?? existing.executedBy,
      executedAt: data.executedAt !== undefined ? (data.executedAt ?? null) : existing.executedAt,
    };
    this.fwaActions.set(id, updated);
    return updated;
  }

  async getFwaRegulatoryDocs(): Promise<FwaRegulatoryDoc[]> {
    return Array.from(this.fwaRegulatoryDocs.values());
  }

  async createFwaRegulatoryDoc(data: InsertFwaRegulatoryDoc): Promise<FwaRegulatoryDoc> {
    const id = randomUUID();
    const newDoc: FwaRegulatoryDoc = {
      id,
      title: data.title,
      category: data.category,
      content: data.content,
      regulationId: data.regulationId,
      effectiveDate: data.effectiveDate,
      jurisdiction: data.jurisdiction,
      metadata: (data.metadata ?? {}) as FwaRegulatoryDoc["metadata"],
      createdAt: new Date(),
    };
    this.fwaRegulatoryDocs.set(id, newDoc);
    return newDoc;
  }

  async getFwaMedicalGuidelines(): Promise<FwaMedicalGuideline[]> {
    return Array.from(this.fwaMedicalGuidelines.values());
  }

  async createFwaMedicalGuideline(data: InsertFwaMedicalGuideline): Promise<FwaMedicalGuideline> {
    const id = randomUUID();
    const newGuideline: FwaMedicalGuideline = {
      id,
      title: data.title,
      category: data.category,
      content: data.content,
      sourceAuthority: data.sourceAuthority,
      specialtyArea: data.specialtyArea,
      metadata: (data.metadata ?? {}) as FwaMedicalGuideline["metadata"],
      createdAt: new Date(),
    };
    this.fwaMedicalGuidelines.set(id, newGuideline);
    return newGuideline;
  }

  async getFwaAgentConfigs(): Promise<FwaAgentConfig[]> {
    return Array.from(this.fwaAgentConfigs.values());
  }

  async getFwaAgentConfigByType(agentType: string): Promise<FwaAgentConfig | undefined> {
    return Array.from(this.fwaAgentConfigs.values()).find(c => c.agentType === agentType);
  }

  async createFwaAgentConfig(data: InsertFwaAgentConfig): Promise<FwaAgentConfig> {
    const id = `fwa-agent-${Date.now()}`;
    const config: FwaAgentConfig = {
      id,
      agentName: data.agentName,
      agentType: data.agentType,
      enabled: data.enabled ?? true,
      threshold: data.threshold ?? "0.5",
      parameters: (data.parameters ?? {}) as FwaAgentConfig["parameters"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.fwaAgentConfigs.set(id, config);
    return config;
  }

  async updateFwaAgentConfig(id: string, data: Partial<InsertFwaAgentConfig>): Promise<FwaAgentConfig | undefined> {
    const existing = this.fwaAgentConfigs.get(id);
    if (!existing) return undefined;
    const updated: FwaAgentConfig = {
      ...existing,
      agentName: data.agentName ?? existing.agentName,
      agentType: data.agentType ?? existing.agentType,
      enabled: data.enabled !== undefined ? (data.enabled ?? true) : existing.enabled,
      threshold: data.threshold !== undefined ? (data.threshold ?? "0.5") : existing.threshold,
      parameters: data.parameters !== undefined ? ((data.parameters ?? {}) as FwaAgentConfig["parameters"]) : existing.parameters,
      updatedAt: new Date(),
    };
    this.fwaAgentConfigs.set(id, updated);
    return updated;
  }

  async updateFwaAgentConfigByType(agentType: string, data: Partial<InsertFwaAgentConfig>): Promise<FwaAgentConfig | undefined> {
    const existing = Array.from(this.fwaAgentConfigs.values()).find(c => c.agentType === agentType);
    if (!existing) return undefined;
    return this.updateFwaAgentConfig(existing.id, data);
  }

  async getFwaBehaviors(): Promise<FwaBehavior[]> {
    return Array.from(this.fwaBehaviors.values());
  }

  async getFwaBehavior(id: string): Promise<FwaBehavior | undefined> {
    return this.fwaBehaviors.get(id);
  }

  async createFwaBehavior(data: InsertFwaBehavior): Promise<FwaBehavior> {
    const id = randomUUID();
    const now = new Date();
    const newBehavior: FwaBehavior = {
      id,
      behaviorCode: data.behaviorCode,
      name: data.name,
      description: data.description,
      category: data.category,
      severity: data.severity,
      priority: data.priority ?? "medium",
      status: data.status ?? "draft",
      decision: data.decision ?? "manual_review",
      rejectionMessage: data.rejectionMessage ?? null,
      technicalLogic: data.technicalLogic ?? null,
      dataRequired: data.dataRequired ?? null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.fwaBehaviors.set(id, newBehavior);
    return newBehavior;
  }

  async updateFwaBehavior(id: string, data: Partial<InsertFwaBehavior>): Promise<FwaBehavior | undefined> {
    const existing = this.fwaBehaviors.get(id);
    if (!existing) return undefined;
    const updated: FwaBehavior = {
      ...existing,
      behaviorCode: data.behaviorCode ?? existing.behaviorCode,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      category: data.category ?? existing.category,
      severity: data.severity ?? existing.severity,
      priority: data.priority !== undefined ? (data.priority ?? "medium") : existing.priority,
      status: data.status !== undefined ? (data.status ?? "draft") : existing.status,
      decision: data.decision !== undefined ? (data.decision ?? "manual_review") : existing.decision,
      rejectionMessage: data.rejectionMessage !== undefined ? (data.rejectionMessage ?? null) : existing.rejectionMessage,
      technicalLogic: data.technicalLogic !== undefined ? (data.technicalLogic ?? null) : existing.technicalLogic,
      dataRequired: data.dataRequired !== undefined ? (data.dataRequired ?? null) : existing.dataRequired,
      createdBy: data.createdBy ?? existing.createdBy,
      updatedAt: new Date(),
    };
    this.fwaBehaviors.set(id, updated);
    return updated;
  }

  async deleteFwaBehavior(id: string): Promise<boolean> {
    return this.fwaBehaviors.delete(id);
  }

  async getFwaBatches(): Promise<FwaBatch[]> {
    return Array.from(this.fwaBatches.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getFwaBatch(id: string): Promise<FwaBatch | undefined> {
    return this.fwaBatches.get(id);
  }

  async createFwaBatch(data: InsertFwaBatch): Promise<FwaBatch> {
    const id = randomUUID();
    const now = new Date();
    const newBatch: FwaBatch = {
      id,
      batchName: data.batchName,
      fileName: data.fileName ?? null,
      fileSize: data.fileSize ?? null,
      status: data.status ?? "pending",
      totalClaims: data.totalClaims ?? 0,
      processedClaims: data.processedClaims ?? 0,
      flaggedClaims: data.flaggedClaims ?? 0,
      failedClaims: data.failedClaims ?? 0,
      progress: data.progress ?? "0",
      uploadedBy: data.uploadedBy,
      startedAt: data.startedAt ?? null,
      completedAt: data.completedAt ?? null,
      errorMessage: data.errorMessage ?? null,
      metadata: data.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.fwaBatches.set(id, newBatch);
    return newBatch;
  }

  async updateFwaBatch(id: string, data: Partial<InsertFwaBatch>): Promise<FwaBatch | undefined> {
    const existing = this.fwaBatches.get(id);
    if (!existing) return undefined;
    const updated: FwaBatch = {
      ...existing,
      batchName: data.batchName ?? existing.batchName,
      fileName: data.fileName !== undefined ? (data.fileName ?? null) : existing.fileName,
      fileSize: data.fileSize !== undefined ? (data.fileSize ?? null) : existing.fileSize,
      status: data.status ?? existing.status,
      totalClaims: data.totalClaims !== undefined ? (data.totalClaims ?? 0) : existing.totalClaims,
      processedClaims: data.processedClaims !== undefined ? (data.processedClaims ?? 0) : existing.processedClaims,
      flaggedClaims: data.flaggedClaims !== undefined ? (data.flaggedClaims ?? 0) : existing.flaggedClaims,
      failedClaims: data.failedClaims !== undefined ? (data.failedClaims ?? 0) : existing.failedClaims,
      progress: data.progress !== undefined ? (data.progress ?? "0") : existing.progress,
      uploadedBy: data.uploadedBy ?? existing.uploadedBy,
      startedAt: data.startedAt !== undefined ? (data.startedAt ?? null) : existing.startedAt,
      completedAt: data.completedAt !== undefined ? (data.completedAt ?? null) : existing.completedAt,
      errorMessage: data.errorMessage !== undefined ? (data.errorMessage ?? null) : existing.errorMessage,
      updatedAt: new Date(),
    };
    this.fwaBatches.set(id, updated);
    return updated;
  }

  async getAgentReports(): Promise<AgentReport[]> {
    return Array.from(this.agentReports.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getAgentReportById(id: string): Promise<AgentReport | undefined> {
    return this.agentReports.get(id);
  }

  async getAgentReportsByCaseId(caseId: string): Promise<AgentReport[]> {
    return Array.from(this.agentReports.values()).filter(
      (report) => report.entityType === "case" && report.entityId === caseId
    ).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getAgentReportsByEntityId(entityId: string, entityType: string): Promise<AgentReport[]> {
    return Array.from(this.agentReports.values()).filter(
      (report) => report.entityId === entityId && report.entityType === entityType
    ).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createAgentReport(data: InsertAgentReport): Promise<AgentReport> {
    const id = randomUUID();
    const now = new Date();
    const newReport: AgentReport = {
      id,
      entityId: data.entityId,
      entityType: data.entityType,
      entityName: data.entityName,
      agentType: data.agentType,
      reportTitle: data.reportTitle,
      status: data.status ?? "pending",
      executiveSummary: data.executiveSummary ?? null,
      findings: (data.findings ?? []) as AgentReport["findings"],
      recommendations: (data.recommendations ?? []) as AgentReport["recommendations"],
      metrics: (data.metrics ?? null) as AgentReport["metrics"],
      charts: (data.charts ?? []) as AgentReport["charts"],
      generatedAt: data.generatedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.agentReports.set(id, newReport);
    return newReport;
  }

  async updateAgentReport(id: string, data: Partial<InsertAgentReport>): Promise<AgentReport | undefined> {
    const existing = this.agentReports.get(id);
    if (!existing) return undefined;
    const updated: AgentReport = {
      ...existing,
      entityId: data.entityId ?? existing.entityId,
      entityType: data.entityType ?? existing.entityType,
      entityName: data.entityName ?? existing.entityName,
      agentType: data.agentType ?? existing.agentType,
      reportTitle: data.reportTitle ?? existing.reportTitle,
      status: data.status !== undefined ? (data.status ?? "pending") : existing.status,
      executiveSummary: data.executiveSummary !== undefined ? (data.executiveSummary ?? null) : existing.executiveSummary,
      findings: data.findings !== undefined ? ((data.findings ?? []) as AgentReport["findings"]) : existing.findings,
      recommendations: data.recommendations !== undefined ? ((data.recommendations ?? []) as AgentReport["recommendations"]) : existing.recommendations,
      metrics: data.metrics !== undefined ? ((data.metrics ?? null) as AgentReport["metrics"]) : existing.metrics,
      charts: data.charts !== undefined ? ((data.charts ?? []) as AgentReport["charts"]) : existing.charts,
      generatedAt: data.generatedAt !== undefined ? (data.generatedAt ?? null) : existing.generatedAt,
      updatedAt: new Date(),
    };
    this.agentReports.set(id, updated);
    return updated;
  }

  // Provider Relations - Dream Reports
  async getAllDreamReports(): Promise<DreamReport[]> {
    return Array.from(this.dreamReportsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getDreamReportById(id: string): Promise<DreamReport | undefined> {
    return this.dreamReportsMap.get(id) || 
      Array.from(this.dreamReportsMap.values()).find(r => r.reportNumber === id);
  }

  async getDreamReportsByProviderId(providerId: string): Promise<DreamReport[]> {
    return Array.from(this.dreamReportsMap.values())
      .filter(r => r.providerId === providerId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async createDreamReport(data: InsertDreamReport): Promise<DreamReport> {
    const id = randomUUID();
    const now = new Date();
    const newReport: DreamReport = {
      id,
      reportNumber: data.reportNumber,
      providerId: data.providerId,
      providerName: data.providerName,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: data.status ?? "generating",
      peerGroupId: data.peerGroupId ?? null,
      executiveSummary: data.executiveSummary ?? null,
      benchmarkAnalysis: (data.benchmarkAnalysis ?? null) as DreamReport["benchmarkAnalysis"],
      findings: (data.findings ?? []) as DreamReport["findings"],
      totalPotentialAmount: data.totalPotentialAmount ?? null,
      categoryBreakdown: (data.categoryBreakdown ?? []) as DreamReport["categoryBreakdown"],
      claimSamples: (data.claimSamples ?? []) as DreamReport["claimSamples"],
      recommendations: (data.recommendations ?? []) as DreamReport["recommendations"],
      aiInsights: data.aiInsights ?? null,
      generatedBy: data.generatedBy ?? null,
      generatedAt: data.generatedAt ?? null,
      exportedAt: data.exportedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.dreamReportsMap.set(id, newReport);
    return newReport;
  }

  async updateDreamReport(id: string, data: Partial<InsertDreamReport>): Promise<DreamReport | undefined> {
    const existing = this.dreamReportsMap.get(id) || 
      Array.from(this.dreamReportsMap.values()).find(r => r.reportNumber === id);
    if (!existing) return undefined;
    const updated: DreamReport = {
      ...existing,
      ...data,
      benchmarkAnalysis: data.benchmarkAnalysis !== undefined ? (data.benchmarkAnalysis as DreamReport["benchmarkAnalysis"]) : existing.benchmarkAnalysis,
      findings: data.findings !== undefined ? (data.findings as DreamReport["findings"]) : existing.findings,
      categoryBreakdown: data.categoryBreakdown !== undefined ? (data.categoryBreakdown as DreamReport["categoryBreakdown"]) : existing.categoryBreakdown,
      claimSamples: data.claimSamples !== undefined ? (data.claimSamples as DreamReport["claimSamples"]) : existing.claimSamples,
      recommendations: data.recommendations !== undefined ? (data.recommendations as DreamReport["recommendations"]) : existing.recommendations,
      updatedAt: new Date(),
    };
    this.dreamReportsMap.set(existing.id, updated);
    return updated;
  }

  // Provider Relations - Evidence Packs
  async getAllEvidencePacks(): Promise<EvidencePack[]> {
    return Array.from(this.evidencePacksMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getEvidencePackById(id: string): Promise<EvidencePack | undefined> {
    return this.evidencePacksMap.get(id) || 
      Array.from(this.evidencePacksMap.values()).find(p => p.packNumber === id);
  }

  async createEvidencePack(data: InsertEvidencePack): Promise<EvidencePack> {
    const id = randomUUID();
    const now = new Date();
    const newPack: EvidencePack = {
      id,
      packNumber: data.packNumber,
      providerId: data.providerId,
      providerName: data.providerName,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "draft",
      findingIds: data.findingIds ?? [],
      claimIds: data.claimIds ?? [],
      totalClaimCount: data.totalClaimCount ?? 0,
      targetAmount: data.targetAmount,
      categories: (data.categories ?? []) as EvidencePack["categories"],
      attachments: (data.attachments ?? []) as EvidencePack["attachments"],
      notes: data.notes ?? null,
      preparedBy: data.preparedBy ?? null,
      lockedAt: data.lockedAt ?? null,
      lockedBy: data.lockedBy ?? null,
      presentedAt: data.presentedAt ?? null,
      sessionId: data.sessionId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.evidencePacksMap.set(id, newPack);
    return newPack;
  }

  async updateEvidencePack(id: string, data: Partial<InsertEvidencePack>): Promise<EvidencePack | undefined> {
    const existing = this.evidencePacksMap.get(id) || 
      Array.from(this.evidencePacksMap.values()).find(p => p.packNumber === id);
    if (!existing) return undefined;
    const updated: EvidencePack = {
      ...existing,
      ...data,
      categories: data.categories !== undefined ? (data.categories as EvidencePack["categories"]) : existing.categories,
      attachments: data.attachments !== undefined ? (data.attachments as EvidencePack["attachments"]) : existing.attachments,
      updatedAt: new Date(),
    };
    this.evidencePacksMap.set(existing.id, updated);
    return updated;
  }

  async lockEvidencePack(id: string, lockedBy: string): Promise<EvidencePack | undefined> {
    const existing = this.evidencePacksMap.get(id) || 
      Array.from(this.evidencePacksMap.values()).find(p => p.packNumber === id);
    if (!existing) return undefined;
    if (existing.status !== "draft") return undefined;
    const updated: EvidencePack = {
      ...existing,
      status: "locked",
      lockedAt: new Date(),
      lockedBy,
      updatedAt: new Date(),
    };
    this.evidencePacksMap.set(existing.id, updated);
    return updated;
  }

  // Provider Relations - Reconciliation Sessions
  async getAllReconciliationSessions(): Promise<ReconciliationSession[]> {
    return Array.from(this.reconciliationSessionsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getReconciliationSessionById(id: string): Promise<ReconciliationSession | undefined> {
    return this.reconciliationSessionsMap.get(id) || 
      Array.from(this.reconciliationSessionsMap.values()).find(s => s.sessionNumber === id);
  }

  async createReconciliationSession(data: InsertReconciliationSession): Promise<ReconciliationSession> {
    const id = randomUUID();
    const now = new Date();
    const newSession: ReconciliationSession = {
      id,
      sessionNumber: data.sessionNumber,
      providerId: data.providerId,
      providerName: data.providerName,
      status: data.status ?? "scheduled",
      scheduledDate: data.scheduledDate,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      location: data.location ?? null,
      meetingType: data.meetingType ?? "in_person",
      attendees: (data.attendees ?? []) as ReconciliationSession["attendees"],
      agenda: data.agenda ?? [],
      evidencePackIds: data.evidencePackIds ?? [],
      proposedAmount: data.proposedAmount ?? null,
      negotiatedAmount: data.negotiatedAmount ?? null,
      outcomes: (data.outcomes ?? []) as ReconciliationSession["outcomes"],
      actionItems: (data.actionItems ?? []) as ReconciliationSession["actionItems"],
      minutes: data.minutes ?? null,
      followUpDate: data.followUpDate ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.reconciliationSessionsMap.set(id, newSession);
    return newSession;
  }

  async updateReconciliationSession(id: string, data: Partial<InsertReconciliationSession>): Promise<ReconciliationSession | undefined> {
    const existing = this.reconciliationSessionsMap.get(id) || 
      Array.from(this.reconciliationSessionsMap.values()).find(s => s.sessionNumber === id);
    if (!existing) return undefined;
    const updated: ReconciliationSession = {
      ...existing,
      ...data,
      attendees: data.attendees !== undefined ? (data.attendees as ReconciliationSession["attendees"]) : existing.attendees,
      outcomes: data.outcomes !== undefined ? (data.outcomes as ReconciliationSession["outcomes"]) : existing.outcomes,
      actionItems: data.actionItems !== undefined ? (data.actionItems as ReconciliationSession["actionItems"]) : existing.actionItems,
      updatedAt: new Date(),
    };
    this.reconciliationSessionsMap.set(existing.id, updated);
    return updated;
  }

  // Provider Relations - Settlement Ledger
  async getAllSettlements(): Promise<SettlementLedger[]> {
    return Array.from(this.settlementLedgerMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getSettlementById(id: string): Promise<SettlementLedger | undefined> {
    return this.settlementLedgerMap.get(id) || 
      Array.from(this.settlementLedgerMap.values()).find(s => s.settlementNumber === id);
  }

  async createSettlement(data: InsertSettlementLedger): Promise<SettlementLedger> {
    const id = randomUUID();
    const now = new Date();
    const newSettlement: SettlementLedger = {
      id,
      settlementNumber: data.settlementNumber,
      providerId: data.providerId,
      providerName: data.providerName,
      status: data.status ?? "proposed",
      sessionId: data.sessionId ?? null,
      evidencePackIds: data.evidencePackIds ?? [],
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      proposedAmount: data.proposedAmount,
      negotiatedAmount: data.negotiatedAmount ?? null,
      agreedAmount: data.agreedAmount ?? null,
      realizedSavings: data.realizedSavings ?? null,
      categories: (data.categories ?? []) as SettlementLedger["categories"],
      providerAcceptance: data.providerAcceptance ?? null,
      providerSignatory: data.providerSignatory ?? null,
      providerSignedAt: data.providerSignedAt ?? null,
      tawuniyaSignatory: data.tawuniyaSignatory ?? null,
      tawuniyaSignedAt: data.tawuniyaSignedAt ?? null,
      financeApprovedBy: data.financeApprovedBy ?? null,
      financeApprovedAt: data.financeApprovedAt ?? null,
      settlementDate: data.settlementDate ?? null,
      paymentReference: data.paymentReference ?? null,
      notes: data.notes ?? null,
      auditTrail: (data.auditTrail ?? []) as SettlementLedger["auditTrail"],
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.settlementLedgerMap.set(id, newSettlement);
    return newSettlement;
  }

  async updateSettlement(id: string, data: Partial<InsertSettlementLedger>): Promise<SettlementLedger | undefined> {
    const existing = this.settlementLedgerMap.get(id) || 
      Array.from(this.settlementLedgerMap.values()).find(s => s.settlementNumber === id);
    if (!existing) return undefined;
    const updated: SettlementLedger = {
      ...existing,
      ...data,
      categories: data.categories !== undefined ? (data.categories as SettlementLedger["categories"]) : existing.categories,
      auditTrail: data.auditTrail !== undefined ? (data.auditTrail as SettlementLedger["auditTrail"]) : existing.auditTrail,
      updatedAt: new Date(),
    };
    this.settlementLedgerMap.set(existing.id, updated);
    return updated;
  }

  // Provider Relations - Peer Groups
  async getAllPeerGroups(): Promise<PeerGroup[]> {
    return Array.from(this.peerGroupsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getPeerGroupById(id: string): Promise<PeerGroup | undefined> {
    return this.peerGroupsMap.get(id);
  }

  async createPeerGroup(data: InsertPeerGroup): Promise<PeerGroup> {
    const id = randomUUID();
    const now = new Date();
    const newGroup: PeerGroup = {
      id,
      groupName: data.groupName,
      region: data.region,
      city: data.city ?? null,
      providerType: data.providerType,
      networkTier: data.networkTier,
      serviceTypes: data.serviceTypes ?? [],
      volumeRangeMin: data.volumeRangeMin ?? null,
      volumeRangeMax: data.volumeRangeMax ?? null,
      policyMixThreshold: data.policyMixThreshold ?? "0.50",
      memberCount: data.memberCount ?? 0,
      providerIds: data.providerIds ?? [],
      avgCostPerMember: data.avgCostPerMember ?? null,
      avgClaimsPerMember: data.avgClaimsPerMember ?? null,
      avgBillingAmount: data.avgBillingAmount ?? null,
      stdDevCpm: data.stdDevCpm ?? null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.peerGroupsMap.set(id, newGroup);
    return newGroup;
  }

  async getPatient360(patientId: string): Promise<Patient360 | undefined> {
    return undefined;
  }

  async createPatient360(data: InsertPatient360): Promise<Patient360> {
    throw new Error("MemStorage not implemented for Patient360");
  }

  async updatePatient360(patientId: string, data: Partial<InsertPatient360>): Promise<Patient360 | undefined> {
    return undefined;
  }

  async listPatient360s(): Promise<Patient360[]> {
    return [];
  }

  async getProvider360(providerId: string): Promise<Provider360 | undefined> {
    return undefined;
  }

  async createProvider360(data: InsertProvider360): Promise<Provider360> {
    throw new Error("MemStorage not implemented for Provider360");
  }

  async updateProvider360(providerId: string, data: Partial<InsertProvider360>): Promise<Provider360 | undefined> {
    return undefined;
  }

  async listProvider360s(): Promise<Provider360[]> {
    return [];
  }

  async getDoctor360(doctorId: string): Promise<Doctor360 | undefined> {
    return undefined;
  }

  async createDoctor360(data: InsertDoctor360): Promise<Doctor360> {
    throw new Error("MemStorage not implemented for Doctor360");
  }

  async updateDoctor360(doctorId: string, data: Partial<InsertDoctor360>): Promise<Doctor360 | undefined> {
    return undefined;
  }

  async listDoctor360s(): Promise<Doctor360[]> {
    return [];
  }

  // Simulation Lab - Digital Twins
  async createDigitalTwin(data: InsertDigitalTwin): Promise<DigitalTwin> {
    const id = randomUUID();
    const now = new Date();
    const newTwin: DigitalTwin = {
      id,
      twinId: data.twinId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      twinData: (data.twinData ?? null) as DigitalTwin["twinData"],
      status: data.status ?? "active",
      expiresAt: data.expiresAt ?? null,
      createdBy: data.createdBy ?? null,
      purpose: data.purpose ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.digitalTwinsMap.set(id, newTwin);
    return newTwin;
  }

  async getDigitalTwin(twinId: string): Promise<DigitalTwin | undefined> {
    return this.digitalTwinsMap.get(twinId) ||
      Array.from(this.digitalTwinsMap.values()).find(t => t.twinId === twinId);
  }

  async listDigitalTwins(): Promise<DigitalTwin[]> {
    return Array.from(this.digitalTwinsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async updateDigitalTwin(twinId: string, data: Partial<InsertDigitalTwin>): Promise<DigitalTwin | undefined> {
    const existing = this.digitalTwinsMap.get(twinId) ||
      Array.from(this.digitalTwinsMap.values()).find(t => t.twinId === twinId);
    if (!existing) return undefined;
    const updated: DigitalTwin = {
      ...existing,
      ...data,
      twinData: data.twinData !== undefined ? (data.twinData as DigitalTwin["twinData"]) : existing.twinData,
      updatedAt: new Date(),
    };
    this.digitalTwinsMap.set(existing.id, updated);
    return updated;
  }

  async deleteDigitalTwin(twinId: string): Promise<boolean> {
    const existing = this.digitalTwinsMap.get(twinId) ||
      Array.from(this.digitalTwinsMap.values()).find(t => t.twinId === twinId);
    if (!existing) return false;
    return this.digitalTwinsMap.delete(existing.id);
  }

  // Simulation Lab - Shadow Rules
  async createShadowRule(data: InsertShadowRule): Promise<ShadowRule> {
    const id = randomUUID();
    const now = new Date();
    const newRule: ShadowRule = {
      id,
      ruleSetId: data.ruleSetId,
      name: data.name,
      description: data.description ?? null,
      baseRuleId: data.baseRuleId ?? null,
      ruleConfig: (data.ruleConfig ?? null) as ShadowRule["ruleConfig"],
      testCases: (data.testCases ?? []) as ShadowRule["testCases"],
      status: data.status ?? "draft",
      validationResults: (data.validationResults ?? null) as ShadowRule["validationResults"],
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.shadowRulesMap.set(id, newRule);
    return newRule;
  }

  async getShadowRule(ruleSetId: string): Promise<ShadowRule | undefined> {
    return this.shadowRulesMap.get(ruleSetId) ||
      Array.from(this.shadowRulesMap.values()).find(r => r.ruleSetId === ruleSetId);
  }

  async listShadowRules(): Promise<ShadowRule[]> {
    return Array.from(this.shadowRulesMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async updateShadowRule(ruleSetId: string, data: Partial<InsertShadowRule>): Promise<ShadowRule | undefined> {
    const existing = this.shadowRulesMap.get(ruleSetId) ||
      Array.from(this.shadowRulesMap.values()).find(r => r.ruleSetId === ruleSetId);
    if (!existing) return undefined;
    const updated: ShadowRule = {
      ...existing,
      ...data,
      ruleConfig: data.ruleConfig !== undefined ? (data.ruleConfig as ShadowRule["ruleConfig"]) : existing.ruleConfig,
      testCases: data.testCases !== undefined ? (data.testCases as ShadowRule["testCases"]) : existing.testCases,
      validationResults: data.validationResults !== undefined ? (data.validationResults as ShadowRule["validationResults"]) : existing.validationResults,
      updatedAt: new Date(),
    };
    this.shadowRulesMap.set(existing.id, updated);
    return updated;
  }

  async deleteShadowRule(ruleSetId: string): Promise<boolean> {
    const existing = this.shadowRulesMap.get(ruleSetId) ||
      Array.from(this.shadowRulesMap.values()).find(r => r.ruleSetId === ruleSetId);
    if (!existing) return false;
    return this.shadowRulesMap.delete(existing.id);
  }

  // Simulation Lab - Ghost Runs
  async createGhostRun(data: InsertGhostRun): Promise<GhostRun> {
    const id = randomUUID();
    const now = new Date();
    const newRun: GhostRun = {
      id,
      runId: data.runId,
      agentType: data.agentType,
      phase: data.phase ?? null,
      entityType: data.entityType ?? null,
      targetId: data.targetId,
      targetType: data.targetType,
      inputData: (data.inputData ?? null) as GhostRun["inputData"],
      ghostOutput: (data.ghostOutput ?? null) as GhostRun["ghostOutput"],
      productionOutput: (data.productionOutput ?? null) as GhostRun["productionOutput"],
      comparison: (data.comparison ?? null) as GhostRun["comparison"],
      status: data.status ?? "pending",
      executionTimeMs: data.executionTimeMs ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      completedAt: null,
    };
    this.ghostRunsMap.set(id, newRun);
    return newRun;
  }

  async getGhostRun(runId: string): Promise<GhostRun | undefined> {
    return this.ghostRunsMap.get(runId) ||
      Array.from(this.ghostRunsMap.values()).find(r => r.runId === runId);
  }

  async listGhostRuns(): Promise<GhostRun[]> {
    return Array.from(this.ghostRunsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async updateGhostRun(runId: string, data: Partial<InsertGhostRun>): Promise<GhostRun | undefined> {
    const existing = this.ghostRunsMap.get(runId) ||
      Array.from(this.ghostRunsMap.values()).find(r => r.runId === runId);
    if (!existing) return undefined;
    const updated: GhostRun = {
      ...existing,
      ...data,
      inputData: data.inputData !== undefined ? (data.inputData as GhostRun["inputData"]) : existing.inputData,
      ghostOutput: data.ghostOutput !== undefined ? (data.ghostOutput as GhostRun["ghostOutput"]) : existing.ghostOutput,
      productionOutput: data.productionOutput !== undefined ? (data.productionOutput as GhostRun["productionOutput"]) : existing.productionOutput,
      comparison: data.comparison !== undefined ? (data.comparison as GhostRun["comparison"]) : existing.comparison,
      completedAt: data.status === "completed" ? new Date() : existing.completedAt,
    };
    this.ghostRunsMap.set(existing.id, updated);
    return updated;
  }

  // Graph Analysis - Relationship Graphs
  async createRelationshipGraph(data: InsertRelationshipGraph): Promise<RelationshipGraph> {
    const id = randomUUID();
    const now = new Date();
    const newGraph: RelationshipGraph = {
      id,
      graphId: data.graphId,
      name: data.name,
      description: data.description ?? null,
      graphType: data.graphType,
      nodes: (data.nodes ?? []) as RelationshipGraph["nodes"],
      edges: (data.edges ?? []) as RelationshipGraph["edges"],
      metrics: (data.metrics ?? null) as RelationshipGraph["metrics"],
      analysisResults: (data.analysisResults ?? null) as RelationshipGraph["analysisResults"],
      status: data.status ?? "active",
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.relationshipGraphsMap.set(id, newGraph);
    return newGraph;
  }

  async getRelationshipGraph(graphId: string): Promise<RelationshipGraph | undefined> {
    return this.relationshipGraphsMap.get(graphId) ||
      Array.from(this.relationshipGraphsMap.values()).find(g => g.graphId === graphId);
  }

  async listRelationshipGraphs(): Promise<RelationshipGraph[]> {
    return Array.from(this.relationshipGraphsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async updateRelationshipGraph(graphId: string, data: Partial<InsertRelationshipGraph>): Promise<RelationshipGraph | undefined> {
    const existing = this.relationshipGraphsMap.get(graphId) ||
      Array.from(this.relationshipGraphsMap.values()).find(g => g.graphId === graphId);
    if (!existing) return undefined;
    const updated: RelationshipGraph = {
      ...existing,
      ...data,
      nodes: data.nodes !== undefined ? (data.nodes as RelationshipGraph["nodes"]) : existing.nodes,
      edges: data.edges !== undefined ? (data.edges as RelationshipGraph["edges"]) : existing.edges,
      metrics: data.metrics !== undefined ? (data.metrics as RelationshipGraph["metrics"]) : existing.metrics,
      analysisResults: data.analysisResults !== undefined ? (data.analysisResults as RelationshipGraph["analysisResults"]) : existing.analysisResults,
      updatedAt: new Date(),
    };
    this.relationshipGraphsMap.set(existing.id, updated);
    return updated;
  }

  async deleteRelationshipGraph(graphId: string): Promise<boolean> {
    const existing = this.relationshipGraphsMap.get(graphId) ||
      Array.from(this.relationshipGraphsMap.values()).find(g => g.graphId === graphId);
    if (!existing) return false;
    return this.relationshipGraphsMap.delete(existing.id);
  }

  // Graph Analysis - Collusion Rings
  async createCollusionRing(data: InsertCollusionRing): Promise<CollusionRing> {
    const id = randomUUID();
    const now = new Date();
    const newRing: CollusionRing = {
      id,
      ringId: data.ringId,
      name: data.name,
      description: data.description ?? null,
      ringType: data.ringType,
      detectionMethod: data.detectionMethod ?? null,
      members: (data.members ?? []) as CollusionRing["members"],
      evidence: (data.evidence ?? []) as CollusionRing["evidence"],
      financialImpact: (data.financialImpact ?? null) as CollusionRing["financialImpact"],
      riskAssessment: (data.riskAssessment ?? null) as CollusionRing["riskAssessment"],
      status: data.status ?? "detected",
      investigationStatus: data.investigationStatus ?? null,
      assignedTo: data.assignedTo ?? null,
      referredTo: data.referredTo ?? null,
      aiSummary: data.aiSummary ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.collusionRingsMap.set(id, newRing);
    return newRing;
  }

  async getCollusionRing(ringId: string): Promise<CollusionRing | undefined> {
    return this.collusionRingsMap.get(ringId) ||
      Array.from(this.collusionRingsMap.values()).find(r => r.ringId === ringId);
  }

  async listCollusionRings(): Promise<CollusionRing[]> {
    return Array.from(this.collusionRingsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async updateCollusionRing(ringId: string, data: Partial<InsertCollusionRing>): Promise<CollusionRing | undefined> {
    const existing = this.collusionRingsMap.get(ringId) ||
      Array.from(this.collusionRingsMap.values()).find(r => r.ringId === ringId);
    if (!existing) return undefined;
    const updated: CollusionRing = {
      ...existing,
      ...data,
      members: data.members !== undefined ? (data.members as CollusionRing["members"]) : existing.members,
      evidence: data.evidence !== undefined ? (data.evidence as CollusionRing["evidence"]) : existing.evidence,
      financialImpact: data.financialImpact !== undefined ? (data.financialImpact as CollusionRing["financialImpact"]) : existing.financialImpact,
      riskAssessment: data.riskAssessment !== undefined ? (data.riskAssessment as CollusionRing["riskAssessment"]) : existing.riskAssessment,
      updatedAt: new Date(),
    };
    this.collusionRingsMap.set(existing.id, updated);
    return updated;
  }

  async getAllProviderCommunications(): Promise<ProviderCommunication[]> {
    return Array.from(this.providerCommunicationsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getProviderCommunicationById(id: string): Promise<ProviderCommunication | undefined> {
    return this.providerCommunicationsMap.get(id);
  }

  async createProviderCommunication(data: InsertProviderCommunication): Promise<ProviderCommunication> {
    const id = randomUUID();
    const now = new Date();
    const newComm: ProviderCommunication = {
      id,
      providerId: data.providerId,
      providerName: data.providerName,
      type: data.type,
      direction: data.direction ?? "outbound",
      subject: data.subject,
      body: data.body ?? null,
      status: data.status ?? "Pending",
      outcome: data.outcome ?? null,
      assignee: data.assignee ?? null,
      nextActionDate: data.nextActionDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.providerCommunicationsMap.set(id, newComm);
    return newComm;
  }

  // Provider Directory
  async getAllProviderDirectoryEntries(): Promise<ProviderDirectory[]> {
    return Array.from(this.providerDirectoryMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getProviderDirectoryById(id: string): Promise<ProviderDirectory | undefined> {
    return this.providerDirectoryMap.get(id);
  }

  async getProviderDirectoryByNpi(npi: string): Promise<ProviderDirectory | undefined> {
    return Array.from(this.providerDirectoryMap.values()).find(entry => entry.npi === npi);
  }

  async createProviderDirectoryEntry(data: InsertProviderDirectory): Promise<ProviderDirectory> {
    const id = randomUUID();
    const now = new Date();
    const newEntry: ProviderDirectory = {
      id,
      npi: data.npi,
      name: data.name,
      specialty: data.specialty,
      organization: data.organization ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      region: data.region ?? null,
      contractStatus: data.contractStatus ?? "Pending",
      networkTier: data.networkTier ?? "Tier 2",
      licenseNumber: data.licenseNumber ?? null,
      licenseExpiry: data.licenseExpiry ?? null,
      memberCount: data.memberCount ?? 0,
      riskScore: data.riskScore ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.providerDirectoryMap.set(id, newEntry);
    return newEntry;
  }

  private providerContractsMap: Map<string, ProviderContract> = new Map();

  async getAllProviderContracts(): Promise<ProviderContract[]> {
    return Array.from(this.providerContractsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getProviderContractById(id: string): Promise<ProviderContract | undefined> {
    return this.providerContractsMap.get(id) ||
      Array.from(this.providerContractsMap.values()).find(c => c.contractNumber === id);
  }

  async createProviderContract(data: InsertProviderContract): Promise<ProviderContract> {
    const id = randomUUID();
    const now = new Date();
    const newContract: ProviderContract = {
      id,
      contractNumber: data.contractNumber,
      providerId: data.providerId,
      providerName: data.providerName,
      contractType: data.contractType,
      status: data.status ?? "Draft",
      startDate: data.startDate,
      endDate: data.endDate,
      value: data.value ?? null,
      terms: (data.terms ?? {}) as ProviderContract["terms"],
      feeSchedule: data.feeSchedule ?? null,
      autoRenewal: data.autoRenewal ?? false,
      signedBy: data.signedBy ?? null,
      signedDate: data.signedDate ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.providerContractsMap.set(id, newContract);
    return newContract;
  }

  // Provider Benchmarks
  async getAllProviderBenchmarks(): Promise<ProviderBenchmark[]> {
    return Array.from(this.providerBenchmarksMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getProviderBenchmarkById(providerId: string): Promise<ProviderBenchmark | undefined> {
    return this.providerBenchmarksMap.get(providerId) ||
      Array.from(this.providerBenchmarksMap.values()).find(b => b.providerId === providerId);
  }

  async createProviderBenchmark(data: InsertProviderBenchmark): Promise<ProviderBenchmark> {
    const id = randomUUID();
    const now = new Date();
    const newBenchmark: ProviderBenchmark = {
      id,
      providerId: data.providerId,
      providerName: data.providerName,
      peerGroupId: data.peerGroupId ?? null,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalClaims: data.totalClaims ?? 0,
      totalBilledAmount: data.totalBilledAmount ?? null,
      totalPaidAmount: data.totalPaidAmount ?? null,
      memberCount: data.memberCount ?? 0,
      costPerMember: data.costPerMember ?? null,
      claimsPerMember: data.claimsPerMember ?? null,
      avgClaimAmount: data.avgClaimAmount ?? null,
      peerPercentile: data.peerPercentile ?? null,
      deviationFromPeer: data.deviationFromPeer ?? null,
      standardDeviations: data.standardDeviations ?? null,
      anomalyScore: data.anomalyScore ?? null,
      anomalyFlags: (data.anomalyFlags ?? []) as ProviderBenchmark["anomalyFlags"],
      serviceBreakdown: (data.serviceBreakdown ?? null) as ProviderBenchmark["serviceBreakdown"],
      createdAt: now,
      updatedAt: now,
    };
    this.providerBenchmarksMap.set(id, newBenchmark);
    return newBenchmark;
  }

  async updateProviderBenchmark(id: string, data: Partial<InsertProviderBenchmark>): Promise<ProviderBenchmark | undefined> {
    const existing = this.providerBenchmarksMap.get(id) ||
      Array.from(this.providerBenchmarksMap.values()).find(b => b.providerId === id);
    if (!existing) return undefined;
    const updated: ProviderBenchmark = {
      ...existing,
      ...data,
      anomalyFlags: data.anomalyFlags !== undefined ? (data.anomalyFlags as ProviderBenchmark["anomalyFlags"]) : existing.anomalyFlags,
      serviceBreakdown: data.serviceBreakdown !== undefined ? (data.serviceBreakdown as ProviderBenchmark["serviceBreakdown"]) : existing.serviceBreakdown,
      updatedAt: new Date(),
    };
    this.providerBenchmarksMap.set(existing.id, updated);
    return updated;
  }

  // CPM Metrics
  async getAllProviderCpmMetrics(): Promise<ProviderCpmMetric[]> {
    return Array.from(this.providerCpmMetricsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getProviderCpmMetricsByProviderId(providerId: string): Promise<ProviderCpmMetric[]> {
    return Array.from(this.providerCpmMetricsMap.values())
      .filter(m => m.providerId === providerId)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.quarter.localeCompare(a.quarter);
      });
  }

  async createProviderCpmMetric(data: InsertProviderCpmMetric): Promise<ProviderCpmMetric> {
    const id = randomUUID();
    const now = new Date();
    const newMetric: ProviderCpmMetric = {
      id,
      providerId: data.providerId,
      providerName: data.providerName,
      region: data.region ?? null,
      networkTier: data.networkTier ?? null,
      specialty: data.specialty ?? null,
      quarter: data.quarter,
      year: data.year,
      memberCount: data.memberCount ?? 0,
      totalCost: data.totalCost ?? null,
      cpm: data.cpm ?? null,
      peerAvgCpm: data.peerAvgCpm ?? null,
      percentile: data.percentile ?? null,
      deviation: data.deviation ?? null,
      trend: data.trend ?? null,
      benchmarkCpm: data.benchmarkCpm ?? null,
      claimsCount: data.claimsCount ?? 0,
      avgClaimAmount: data.avgClaimAmount ?? null,
      rejectionRate: data.rejectionRate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.providerCpmMetricsMap.set(id, newMetric);
    return newMetric;
  }

  // Operational Findings
  async getAllOperationalFindings(): Promise<OperationalFinding[]> {
    return Array.from(this.operationalFindingsMap.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getOperationalFindingById(id: string): Promise<OperationalFinding | undefined> {
    return this.operationalFindingsMap.get(id);
  }

  async getOperationalFindingsByProviderId(providerId: string): Promise<OperationalFinding[]> {
    return Array.from(this.operationalFindingsMap.values())
      .filter(f => f.providerId === providerId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async createOperationalFinding(data: InsertOperationalFinding): Promise<OperationalFinding> {
    const id = randomUUID();
    const now = new Date();
    const newFinding: OperationalFinding = {
      id,
      providerId: data.providerId,
      providerName: data.providerName,
      findingType: data.findingType,
      category: data.category,
      subCategory: data.subCategory ?? null,
      status: data.status ?? "detected",
      potentialAmount: data.potentialAmount,
      claimCount: data.claimCount ?? 0,
      claimIds: data.claimIds ?? [],
      description: data.description,
      evidencePackId: data.evidencePackId ?? null,
      confidence: data.confidence ?? null,
      dataCompleteness: data.dataCompleteness ?? null,
      ruleStrength: data.ruleStrength ?? null,
      attachmentAvailability: data.attachmentAvailability ?? false,
      weaknessFlags: data.weaknessFlags ?? [],
      periodStart: data.periodStart ?? null,
      periodEnd: data.periodEnd ?? null,
      detectedBy: data.detectedBy ?? null,
      validatedBy: data.validatedBy ?? null,
      validatedAt: data.validatedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.operationalFindingsMap.set(id, newFinding);
    return newFinding;
  }

  async updateOperationalFinding(id: string, data: Partial<InsertOperationalFinding>): Promise<OperationalFinding | undefined> {
    const existing = this.operationalFindingsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.operationalFindingsMap.set(id, updated);
    return updated;
  }

  async getKpiDefinitions(): Promise<KpiDefinition[]> {
    return Array.from(this.kpiDefinitionsMap.values()).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getKpiDefinition(id: string): Promise<KpiDefinition | undefined> {
    return this.kpiDefinitionsMap.get(id);
  }

  async createKpiDefinition(data: InsertKpiDefinition): Promise<KpiDefinition> {
    const id = randomUUID();
    const now = new Date();
    const newDef: KpiDefinition = {
      id,
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      category: data.category,
      status: data.status ?? "active",
      numeratorLabel: data.numeratorLabel,
      numeratorFormula: data.numeratorFormula,
      numeratorSource: data.numeratorSource,
      denominatorLabel: data.denominatorLabel,
      denominatorFormula: data.denominatorFormula,
      denominatorSource: data.denominatorSource,
      inclusions: (data.inclusions ?? []) as string[],
      exclusions: (data.exclusions ?? []) as string[],
      unit: data.unit ?? "number",
      decimalPlaces: data.decimalPlaces ?? 2,
      displayFormat: data.displayFormat ?? null,
      enableBenchmarking: data.enableBenchmarking ?? false,
      peerGroupDimensions: (data.peerGroupDimensions ?? []) as string[],
      warningThreshold: data.warningThreshold ?? null,
      criticalThreshold: data.criticalThreshold ?? null,
      thresholdDirection: data.thresholdDirection ?? "above",
      weight: data.weight ?? "1.0",
      categoryWeight: data.categoryWeight ?? null,
      rationale: data.rationale ?? null,
      industryStandard: data.industryStandard ?? null,
      calculationMethodology: data.calculationMethodology ?? null,
      targetValue: data.targetValue ?? null,
      targetDirection: data.targetDirection ?? "lower",
      sortOrder: data.sortOrder ?? 0,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.kpiDefinitionsMap.set(id, newDef);
    return newDef;
  }

  async updateKpiDefinition(id: string, data: Partial<InsertKpiDefinition>): Promise<KpiDefinition | undefined> {
    const existing = this.kpiDefinitionsMap.get(id);
    if (!existing) return undefined;
    const updated: KpiDefinition = {
      ...existing,
      ...data,
      inclusions: data.inclusions ? (data.inclusions as string[]) : existing.inclusions,
      exclusions: data.exclusions ? (data.exclusions as string[]) : existing.exclusions,
      peerGroupDimensions: data.peerGroupDimensions ? (data.peerGroupDimensions as string[]) : existing.peerGroupDimensions,
      updatedAt: new Date()
    };
    this.kpiDefinitionsMap.set(id, updated);
    return updated;
  }

  async deleteKpiDefinition(id: string): Promise<boolean> {
    return this.kpiDefinitionsMap.delete(id);
  }

  async getKpiResults(filters?: { kpiCode?: string; providerId?: string }): Promise<KpiResult[]> {
    let results = Array.from(this.kpiResultsMap.values());
    if (filters?.kpiCode) {
      results = results.filter(r => r.kpiCode === filters.kpiCode);
    }
    if (filters?.providerId) {
      results = results.filter(r => r.providerId === filters.providerId);
    }
    return results.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async createKpiResult(data: InsertKpiResult): Promise<KpiResult> {
    const id = randomUUID();
    const now = new Date();
    const newResult: KpiResult = {
      id,
      kpiDefinitionId: data.kpiDefinitionId,
      kpiCode: data.kpiCode,
      providerId: data.providerId ?? null,
      providerName: data.providerName ?? null,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      periodLabel: data.periodLabel ?? null,
      numeratorValue: data.numeratorValue ?? null,
      denominatorValue: data.denominatorValue ?? null,
      calculatedValue: data.calculatedValue ?? null,
      peerGroupId: data.peerGroupId ?? null,
      peerMean: data.peerMean ?? null,
      peerMedian: data.peerMedian ?? null,
      peerStdDev: data.peerStdDev ?? null,
      zScore: data.zScore ?? null,
      percentileRank: data.percentileRank ?? null,
      priorPeriodValue: data.priorPeriodValue ?? null,
      trendDirection: data.trendDirection ?? null,
      trendPercentage: data.trendPercentage ?? null,
      alertLevel: data.alertLevel ?? null,
      calculatedAt: now,
      dataQualityScore: data.dataQualityScore ?? null,
      recordCount: data.recordCount ?? null,
      createdAt: now,
    };
    this.kpiResultsMap.set(id, newResult);
    return newResult;
  }

  private claimsMap: Map<string, Claim> = new Map();
  private fwaClaimServicesMap: Map<string, FwaClaimService> = new Map();

  async getClaims(options?: { search?: string; limit?: number; offset?: number; status?: string }): Promise<{ claims: Claim[]; total: number }> {
    let results = Array.from(this.claimsMap.values());

    if (options?.search) {
      const search = options.search.toLowerCase();
      results = results.filter(c =>
        c.claimNumber?.toLowerCase().includes(search) ||
        c.memberId?.toLowerCase().includes(search) ||
        c.providerId?.toLowerCase().includes(search) ||
        c.hospital?.toLowerCase().includes(search) ||
        c.primaryDiagnosis?.toLowerCase().includes(search)
      );
    }

    if (options?.status) {
      results = results.filter(c => c.status === options.status);
    }

    const total = results.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    results = results.slice(offset, offset + limit);

    return { claims: results, total };
  }

  async getClaimById(id: string): Promise<Claim | undefined> {
    return this.claimsMap.get(id);
  }

  async getClaimsByIds(ids: string[]): Promise<Claim[]> {
    return Array.from(this.claimsMap.values()).filter(c => ids.includes(c.id));
  }

  async getClaimsByProviderId(providerId: string, options?: { limit?: number }): Promise<Claim[]> {
    let results = Array.from(this.claimsMap.values()).filter(c => c.providerId === providerId || c.hospital === providerId);
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  async getClaimServicesByClaimId(claimId: string): Promise<FwaClaimService[]> {
    return Array.from(this.fwaClaimServicesMap.values())
      .filter(s => s.claimId === claimId)
      .sort((a, b) => a.lineNumber - b.lineNumber);
  }

  async getFwaAnalysisFindingsByCaseId(caseId: string): Promise<FwaAnalysisFinding[]> {
    return Array.from(this.fwaAnalysisFindings.values()).filter(f => f.caseId === caseId);
  }

  async createClaim(data: InsertClaim): Promise<Claim> {
    const claim = {
      id: (data as any).id || randomUUID(),
      claimNumber: data.claimNumber,
      registrationDate: data.registrationDate ?? null,
      claimType: data.claimType ?? null,
      hospital: data.hospital ?? null,
      amount: data.amount ?? null,
      outlierScore: data.outlierScore ?? null,
      description: data.description ?? null,
      primaryDiagnosis: data.primaryDiagnosis ?? null,
      hasSurgery: data.hasSurgery ?? null,
      surgeryFee: data.surgeryFee ?? null,
      hasIcu: data.hasIcu ?? null,
      lengthOfStay: data.lengthOfStay ?? null,
      providerId: data.providerId ?? null,
      memberId: data.memberId ?? null,
      practitionerId: data.practitionerId ?? null,
      specialty: data.specialty ?? null,
      city: data.city ?? null,
      providerType: data.providerType ?? null,
      serviceDate: data.serviceDate ?? null,
      status: data.status ?? "pending",
      category: data.category ?? null,
      flagged: data.flagged ?? false,
      flagReason: data.flagReason ?? null,
      cptCodes: data.cptCodes ?? null,
      icdCodes: data.icdCodes ?? null,
      approvedAmount: data.approvedAmount ?? null,
      isNewborn: data.isNewborn ?? null,
      isChronic: data.isChronic ?? null,
      isPreExisting: data.isPreExisting ?? null,
      isPreAuthorized: data.isPreAuthorized ?? null,
      isMaternity: data.isMaternity ?? null,
      groupNo: data.groupNo ?? null,
      coverageRelationship: data.coverageRelationship ?? null,
      policyEffectiveDate: data.policyEffectiveDate ?? null,
      policyExpiryDate: data.policyExpiryDate ?? null,
      source: data.source ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Claim;
    this.claimsMap.set(claim.id, claim);
    return claim;
  }

  async updateClaim(id: string, data: Partial<InsertClaim>): Promise<Claim | undefined> {
    const existing = this.claimsMap.get(id);
    if (!existing) return undefined;
    const updated: Claim = { ...existing, ...data } as Claim;
    this.claimsMap.set(id, updated);
    return updated;
  }

  // CHI Regulatory Extensions - MemStorage stubs
  private policyViolationsMap: Map<string, PolicyViolationCatalogue> = new Map();
  private clinicalPathwayRulesMap: Map<string, ClinicalPathwayRule> = new Map();
  private providerComplaintsMap: Map<string, ProviderComplaint> = new Map();
  private onlineListeningMentionsMap: Map<string, OnlineListeningMention> = new Map();
  private enforcementCasesMap: Map<string, EnforcementCase> = new Map();
  private enforcementDossiersMap: Map<number, EnforcementDossier> = new Map();
  private enforcementDossierIdCounter: number = 1;
  private regulatoryCircularsMap: Map<string, RegulatoryCircular> = new Map();
  private auditSessionsMap: Map<string, AuditSession> = new Map();

  async getPolicyViolations(): Promise<PolicyViolationCatalogue[]> {
    return Array.from(this.policyViolationsMap.values());
  }
  async getPolicyViolation(id: string): Promise<PolicyViolationCatalogue | undefined> {
    return this.policyViolationsMap.get(id);
  }
  async createPolicyViolation(data: InsertPolicyViolationCatalogue): Promise<PolicyViolationCatalogue> {
    const violation = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as PolicyViolationCatalogue;
    this.policyViolationsMap.set(violation.id, violation);
    return violation;
  }
  async updatePolicyViolation(id: string, data: Partial<InsertPolicyViolationCatalogue>): Promise<PolicyViolationCatalogue | undefined> {
    const existing = this.policyViolationsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.policyViolationsMap.set(id, updated);
    return updated;
  }

  async getClinicalPathwayRules(): Promise<ClinicalPathwayRule[]> {
    return Array.from(this.clinicalPathwayRulesMap.values());
  }
  async getClinicalPathwayRule(id: string): Promise<ClinicalPathwayRule | undefined> {
    return this.clinicalPathwayRulesMap.get(id);
  }
  async createClinicalPathwayRule(data: InsertClinicalPathwayRule): Promise<ClinicalPathwayRule> {
    const rule = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as ClinicalPathwayRule;
    this.clinicalPathwayRulesMap.set(rule.id, rule);
    return rule;
  }
  async updateClinicalPathwayRule(id: string, data: Partial<InsertClinicalPathwayRule>): Promise<ClinicalPathwayRule | undefined> {
    const existing = this.clinicalPathwayRulesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.clinicalPathwayRulesMap.set(id, updated);
    return updated;
  }

  async getProviderComplaints(): Promise<ProviderComplaint[]> {
    return Array.from(this.providerComplaintsMap.values());
  }
  async getProviderComplaint(id: string): Promise<ProviderComplaint | undefined> {
    return this.providerComplaintsMap.get(id);
  }
  async createProviderComplaint(data: InsertProviderComplaint): Promise<ProviderComplaint> {
    const complaint = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as ProviderComplaint;
    this.providerComplaintsMap.set(complaint.id, complaint);
    return complaint;
  }
  async updateProviderComplaint(id: string, data: Partial<InsertProviderComplaint>): Promise<ProviderComplaint | undefined> {
    const existing = this.providerComplaintsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.providerComplaintsMap.set(id, updated);
    return updated;
  }

  async getOnlineListeningMentions(): Promise<OnlineListeningMention[]> {
    return Array.from(this.onlineListeningMentionsMap.values());
  }
  async createOnlineListeningMention(data: InsertOnlineListeningMention): Promise<OnlineListeningMention> {
    const mention = { ...data, id: randomUUID(), createdAt: new Date() } as OnlineListeningMention;
    this.onlineListeningMentionsMap.set(mention.id, mention);
    return mention;
  }

  async getListeningSourceConfigs(): Promise<ListeningSourceConfig[]> { return []; }
  async getListeningSourceConfig(sourceId: string): Promise<ListeningSourceConfig | undefined> { return undefined; }
  async createListeningSourceConfig(data: InsertListeningSourceConfig): Promise<ListeningSourceConfig> { return { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as ListeningSourceConfig; }
  async updateListeningSourceConfig(id: string, data: Partial<InsertListeningSourceConfig>): Promise<ListeningSourceConfig | undefined> { return undefined; }

  async getEnforcementCases(): Promise<EnforcementCase[]> {
    return Array.from(this.enforcementCasesMap.values());
  }
  async getEnforcementCase(id: string): Promise<EnforcementCase | undefined> {
    return this.enforcementCasesMap.get(id);
  }
  async createEnforcementCase(data: InsertEnforcementCase): Promise<EnforcementCase> {
    const enfCase = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as EnforcementCase;
    this.enforcementCasesMap.set(enfCase.id, enfCase);
    return enfCase;
  }
  async updateEnforcementCase(id: string, data: Partial<InsertEnforcementCase>): Promise<EnforcementCase | undefined> {
    const existing = this.enforcementCasesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.enforcementCasesMap.set(id, updated);
    return updated;
  }

  // Enforcement Dossier CRUD (MemStorage)
  async createEnforcementDossier(data: InsertEnforcementDossier): Promise<EnforcementDossier> {
    const id = this.enforcementDossierIdCounter++;
    const dossier = { ...data, id, createdAt: new Date(), updatedAt: new Date() } as EnforcementDossier;
    this.enforcementDossiersMap.set(id, dossier);
    return dossier;
  }

  async getEnforcementDossier(id: number): Promise<EnforcementDossier | undefined> {
    return this.enforcementDossiersMap.get(id);
  }

  async getEnforcementDossierByCaseId(caseId: string): Promise<EnforcementDossier | undefined> {
    return Array.from(this.enforcementDossiersMap.values()).find(d => d.caseId === caseId);
  }

  async updateEnforcementDossier(id: number, data: Partial<InsertEnforcementDossier>): Promise<EnforcementDossier | undefined> {
    const existing = this.enforcementDossiersMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() } as EnforcementDossier;
    this.enforcementDossiersMap.set(id, updated);
    return updated;
  }

  async listEnforcementDossiers(filters?: { status?: string; stage?: string }): Promise<EnforcementDossier[]> {
    let dossiers = Array.from(this.enforcementDossiersMap.values());
    if (filters?.status) dossiers = dossiers.filter(d => d.status === filters.status);
    if (filters?.stage) dossiers = dossiers.filter(d => d.currentStage === filters.stage);
    return dossiers.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
  }

  // Detection results for enforcement workflow (MemStorage stubs)
  async getDetectionResultsByClaimId(claimId: string): Promise<FwaDetectionResult | undefined> {
    return undefined;
  }
  async getDetectionResultsByProvider(providerId: string): Promise<FwaDetectionResult[]> {
    return [];
  }
  async getAnalyzedClaimsByProvider(providerId: string, limit?: number): Promise<Claim[]> {
    return [];
  }

  async getRegulatoryCirculars(): Promise<RegulatoryCircular[]> {
    return Array.from(this.regulatoryCircularsMap.values());
  }
  async getRegulatoryCircular(id: string): Promise<RegulatoryCircular | undefined> {
    return this.regulatoryCircularsMap.get(id);
  }
  async createRegulatoryCircular(data: InsertRegulatoryCircular): Promise<RegulatoryCircular> {
    const circular = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as RegulatoryCircular;
    this.regulatoryCircularsMap.set(circular.id, circular);
    return circular;
  }
  async updateRegulatoryCircular(id: string, data: Partial<InsertRegulatoryCircular>): Promise<RegulatoryCircular | undefined> {
    const existing = this.regulatoryCircularsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.regulatoryCircularsMap.set(id, updated);
    return updated;
  }

  async getAuditSessions(): Promise<AuditSession[]> {
    return Array.from(this.auditSessionsMap.values());
  }
  async getAuditSession(id: string): Promise<AuditSession | undefined> {
    return this.auditSessionsMap.get(id);
  }
  async createAuditSession(data: InsertAuditSession): Promise<AuditSession> {
    const session = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as AuditSession;
    this.auditSessionsMap.set(session.id, session);
    return session;
  }
  async updateAuditSession(id: string, data: Partial<InsertAuditSession>): Promise<AuditSession | undefined> {
    const existing = this.auditSessionsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.auditSessionsMap.set(id, updated);
    return updated;
  }

  // Audit Findings - MemStorage
  async getAuditFindings(auditSessionId?: string): Promise<AuditFinding[]> {
    let results = Array.from(this.auditFindingsMap.values());
    if (auditSessionId) {
      results = results.filter(f => f.auditSessionId === auditSessionId);
    }
    return results.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getAuditFinding(id: string): Promise<AuditFinding | undefined> {
    return this.auditFindingsMap.get(id);
  }

  async createAuditFinding(data: InsertAuditFinding): Promise<AuditFinding> {
    const findingNumber = data.findingNumber || `FND-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const finding = { ...data, id: randomUUID(), findingNumber, createdAt: new Date(), updatedAt: new Date() } as AuditFinding;
    this.auditFindingsMap.set(finding.id, finding);
    return finding;
  }

  async updateAuditFinding(id: string, data: Partial<InsertAuditFinding>): Promise<AuditFinding | undefined> {
    const existing = this.auditFindingsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() } as AuditFinding;
    this.auditFindingsMap.set(id, updated);
    return updated;
  }

  async deleteAuditFinding(id: string): Promise<boolean> {
    return this.auditFindingsMap.delete(id);
  }

  // Audit Checklists - MemStorage
  async getAuditChecklists(auditSessionId: string): Promise<AuditChecklist[]> {
    return Array.from(this.auditChecklistsMap.values()).filter(c => c.auditSessionId === auditSessionId);
  }

  async getAuditChecklist(id: string): Promise<AuditChecklist | undefined> {
    return this.auditChecklistsMap.get(id);
  }

  async createAuditChecklist(data: InsertAuditChecklist): Promise<AuditChecklist> {
    const checklist = { ...data, id: randomUUID(), createdAt: new Date() } as AuditChecklist;
    this.auditChecklistsMap.set(checklist.id, checklist);
    return checklist;
  }

  async updateAuditChecklist(id: string, data: Partial<InsertAuditChecklist>): Promise<AuditChecklist | undefined> {
    const existing = this.auditChecklistsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as AuditChecklist;
    this.auditChecklistsMap.set(id, updated);
    return updated;
  }

  async createDefaultChecklists(auditSessionId: string, category: string): Promise<AuditChecklist[]> {
    const defaultItems = [
      { itemCode: 'DOC-001', description: 'Verify medical records documentation', category: 'documentation', requirement: 'All claims must have supporting medical records' },
      { itemCode: 'DOC-002', description: 'Check prescription validity', category: 'documentation', requirement: 'Prescriptions must be signed and dated' },
      { itemCode: 'BIL-001', description: 'Validate billing codes accuracy', category: 'billing', requirement: 'CPT/ICD codes must match services rendered' },
      { itemCode: 'BIL-002', description: 'Check for unbundling violations', category: 'billing', requirement: 'Related services should be billed together' },
      { itemCode: 'CLI-001', description: 'Verify medical necessity', category: 'clinical', requirement: 'Services must be medically necessary' },
      { itemCode: 'CLI-002', description: 'Check treatment appropriateness', category: 'clinical', requirement: 'Treatment must follow clinical guidelines' },
      { itemCode: 'COM-001', description: 'Review CHI compliance', category: 'compliance', requirement: 'Provider must comply with CHI regulations' },
      { itemCode: 'COM-002', description: 'Verify license validity', category: 'compliance', requirement: 'All practitioners must have valid licenses' },
    ].filter(item => category === 'all' || item.category === category);

    const results: AuditChecklist[] = [];
    for (const item of defaultItems) {
      const checklist = await this.createAuditChecklist({
        auditSessionId,
        ...item,
        evidenceRequired: true,
      } as InsertAuditChecklist);
      results.push(checklist);
    }
    return results;
  }

  // RLHF Feedback (Phase 1) - MemStorage stubs
  private rlhfFeedbackMap: Map<string, RlhfFeedback> = new Map();
  private claimDocumentsMap: Map<string, ClaimDocument> = new Map();
  private weightProposalsMap: Map<string, WeightUpdateProposal> = new Map();

  async getRlhfFeedback(module?: string, filters?: { agentId?: string; phase?: string; limit?: number }): Promise<RlhfFeedback[]> {
    let results = Array.from(this.rlhfFeedbackMap.values());
    if (module) results = results.filter(f => f.module === module);
    if (filters?.agentId) results = results.filter(f => f.agentId === filters.agentId);
    if (filters?.phase) results = results.filter(f => f.phase === filters.phase);
    return results.slice(0, filters?.limit || 100);
  }

  async createRlhfFeedback(data: InsertRlhfFeedback): Promise<RlhfFeedback> {
    const feedback = { ...data, id: randomUUID(), createdAt: new Date() } as RlhfFeedback;
    this.rlhfFeedbackMap.set(feedback.id, feedback);
    return feedback;
  }

  async getRlhfMetrics(): Promise<{ fwa: { total: number; accepted: number }; claims: { total: number; accepted: number } }> {
    const all = Array.from(this.rlhfFeedbackMap.values());
    const fwa = all.filter(f => f.module === "fwa");
    const claims = all.filter(f => f.module === "claims");
    return {
      fwa: { total: fwa.length, accepted: fwa.filter(f => f.wasAccepted).length },
      claims: { total: claims.length, accepted: claims.filter(f => f.wasAccepted).length }
    };
  }

  async getClaimDocuments(claimId?: string): Promise<ClaimDocument[]> {
    let results = Array.from(this.claimDocumentsMap.values());
    if (claimId) results = results.filter(d => d.claimId === claimId);
    return results;
  }

  async getClaimDocument(id: string): Promise<ClaimDocument | undefined> {
    return this.claimDocumentsMap.get(id);
  }

  async createClaimDocument(data: InsertClaimDocument): Promise<ClaimDocument> {
    const doc = { ...data, id: randomUUID(), createdAt: new Date() } as ClaimDocument;
    this.claimDocumentsMap.set(doc.id, doc);
    return doc;
  }

  async updateClaimDocument(id: string, data: Partial<InsertClaimDocument>): Promise<ClaimDocument | undefined> {
    const existing = this.claimDocumentsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as ClaimDocument;
    this.claimDocumentsMap.set(id, updated);
    return updated;
  }

  async getWeightUpdateProposals(status?: string): Promise<WeightUpdateProposal[]> {
    let results = Array.from(this.weightProposalsMap.values());
    if (status) results = results.filter(p => p.status === status);
    return results;
  }

  async createWeightUpdateProposal(data: InsertWeightUpdateProposal): Promise<WeightUpdateProposal> {
    const proposal = { ...data, id: randomUUID(), createdAt: new Date() } as WeightUpdateProposal;
    this.weightProposalsMap.set(proposal.id, proposal);
    return proposal;
  }

  async updateWeightUpdateProposal(id: string, data: Partial<InsertWeightUpdateProposal>): Promise<WeightUpdateProposal | undefined> {
    const existing = this.weightProposalsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as WeightUpdateProposal;
    this.weightProposalsMap.set(id, updated);
    return updated;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.username, username));
    return result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(user).returning();
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(log).returning();
    return result;
  }

  async getAuditLogs(filters?: { userId?: string; resourceType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    return query;
  }

  async getPreAuthClaims(): Promise<PreAuthClaim[]> {
    const results = await db.select().from(preAuthClaims).orderBy(desc(preAuthClaims.createdAt));
    return results;
  }

  async getPreAuthClaim(id: string): Promise<PreAuthClaim | undefined> {
    const [result] = await db.select().from(preAuthClaims).where(eq(preAuthClaims.id, id));
    return result;
  }

  async getPreAuthClaimByClaimId(claimId: string): Promise<PreAuthClaim | undefined> {
    const [result] = await db.select().from(preAuthClaims).where(eq(preAuthClaims.claimId, claimId));
    return result;
  }

  async createPreAuthClaim(claim: InsertPreAuthClaim): Promise<PreAuthClaim> {
    const [result] = await db.insert(preAuthClaims).values(claim).returning();
    return result;
  }

  async updatePreAuthClaim(id: string, updates: Partial<InsertPreAuthClaim>): Promise<PreAuthClaim | undefined> {
    const [result] = await db.update(preAuthClaims).set({ ...updates, updatedAt: new Date() }).where(eq(preAuthClaims.id, id)).returning();
    return result;
  }

  async deletePreAuthClaim(id: string): Promise<boolean> {
    const result = await db.delete(preAuthClaims).where(eq(preAuthClaims.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPreAuthSignalsByClaimId(claimId: string): Promise<PreAuthSignal[]> {
    const results = await db.select().from(preAuthSignals).where(eq(preAuthSignals.claimId, claimId)).orderBy(desc(preAuthSignals.createdAt));
    return results;
  }

  async createPreAuthSignal(signal: InsertPreAuthSignal): Promise<PreAuthSignal> {
    const [result] = await db.insert(preAuthSignals).values(signal).returning();
    return result;
  }

  async getPreAuthDecisionByClaimId(claimId: string): Promise<PreAuthDecision | undefined> {
    const [result] = await db.select().from(preAuthDecisions).where(eq(preAuthDecisions.claimId, claimId));
    return result;
  }

  async createPreAuthDecision(decision: InsertPreAuthDecision): Promise<PreAuthDecision> {
    const [result] = await db.insert(preAuthDecisions).values(decision).returning();
    return result;
  }

  async createPreAuthAdjudicatorAction(action: InsertPreAuthAdjudicatorAction): Promise<PreAuthAdjudicatorAction> {
    const [result] = await db.insert(preAuthAdjudicatorActions).values(action).returning();
    return result;
  }

  async getPreAuthAllSignals(): Promise<PreAuthSignal[]> {
    const results = await db.select().from(preAuthSignals).orderBy(desc(preAuthSignals.createdAt));
    return results;
  }

  async getPreAuthAllActions(): Promise<PreAuthAdjudicatorAction[]> {
    const results = await db.select().from(preAuthAdjudicatorActions);
    return results;
  }

  async getAgentPerformanceMetricsByModule(module: string): Promise<AgentPerformanceMetrics[]> {
    const results = await db.select().from(agentPerformanceMetrics).where(eq(agentPerformanceMetrics.module, module));
    return results;
  }

  async createPreAuthRlhfFeedback(feedback: InsertPreAuthRlhfFeedback): Promise<PreAuthRlhfFeedback> {
    const [result] = await db.insert(preAuthRlhfFeedback).values(feedback).returning();
    return result;
  }

  async getPreAuthRlhfFeedback(): Promise<PreAuthRlhfFeedback[]> {
    const results = await db.select().from(preAuthRlhfFeedback).orderBy(desc(preAuthRlhfFeedback.createdAt));
    return results;
  }

  async updatePreAuthRlhfFeedback(id: string, updates: Partial<InsertPreAuthRlhfFeedback>): Promise<PreAuthRlhfFeedback | undefined> {
    const [result] = await db.update(preAuthRlhfFeedback).set(updates).where(eq(preAuthRlhfFeedback.id, id)).returning();
    return result;
  }

  async getPreAuthDocuments(type?: string): Promise<PreAuthDocument[]> {
    if (type) {
      const results = await db.select().from(preAuthDocuments).where(eq(preAuthDocuments.documentType, type as any)).orderBy(desc(preAuthDocuments.createdAt));
      return results;
    }
    const results = await db.select().from(preAuthDocuments).orderBy(desc(preAuthDocuments.createdAt));
    return results;
  }

  async getPreAuthDocument(id: string): Promise<PreAuthDocument | undefined> {
    const [result] = await db.select().from(preAuthDocuments).where(eq(preAuthDocuments.id, id));
    return result;
  }

  async createPreAuthDocument(doc: InsertPreAuthDocument): Promise<PreAuthDocument> {
    const [result] = await db.insert(preAuthDocuments).values(doc).returning();
    return result;
  }

  async deletePreAuthDocument(id: string): Promise<boolean> {
    const result = await db.delete(preAuthDocuments).where(eq(preAuthDocuments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPreAuthDocumentChunks(documentId: string): Promise<PreAuthDocumentChunk[]> {
    const results = await db.select().from(preAuthDocumentChunks).where(eq(preAuthDocumentChunks.documentId, documentId)).orderBy(desc(preAuthDocumentChunks.createdAt));
    return results;
  }

  async createPreAuthDocumentChunk(chunk: InsertPreAuthDocumentChunk): Promise<PreAuthDocumentChunk> {
    const [result] = await db.insert(preAuthDocumentChunks).values(chunk).returning();
    return result;
  }

  async getPreAuthPolicyRules(): Promise<PreAuthPolicyRule[]> {
    const results = await db.select().from(preAuthPolicyRules).orderBy(desc(preAuthPolicyRules.createdAt));
    return results;
  }

  async createPreAuthPolicyRule(rule: InsertPreAuthPolicyRule): Promise<PreAuthPolicyRule> {
    const [result] = await db.insert(preAuthPolicyRules).values(rule).returning();
    return result;
  }

  async updatePreAuthPolicyRule(id: string, updates: Partial<InsertPreAuthPolicyRule>): Promise<PreAuthPolicyRule | undefined> {
    const [result] = await db.update(preAuthPolicyRules).set(updates).where(eq(preAuthPolicyRules.id, id)).returning();
    return result;
  }

  async deletePreAuthPolicyRule(id: string): Promise<boolean> {
    const result = await db.delete(preAuthPolicyRules).where(eq(preAuthPolicyRules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPreAuthAgentConfigs(): Promise<PreAuthAgentConfig[]> {
    const results = await db.select().from(preAuthAgentConfigs).orderBy(desc(preAuthAgentConfigs.createdAt));
    return results;
  }

  async getPreAuthAgentConfig(agentId: string): Promise<PreAuthAgentConfig | undefined> {
    const [result] = await db.select().from(preAuthAgentConfigs).where(eq(preAuthAgentConfigs.agentId, agentId));
    return result;
  }

  async createPreAuthAgentConfig(config: InsertPreAuthAgentConfig): Promise<PreAuthAgentConfig> {
    const [result] = await db.insert(preAuthAgentConfigs).values(config).returning();
    return result;
  }

  async updatePreAuthAgentConfig(agentId: string, updates: Partial<InsertPreAuthAgentConfig>): Promise<PreAuthAgentConfig | undefined> {
    const [result] = await db.update(preAuthAgentConfigs).set({ ...updates, updatedAt: new Date() }).where(eq(preAuthAgentConfigs.agentId, agentId)).returning();
    return result;
  }

  async getPreAuthBatches(): Promise<PreAuthBatch[]> {
    const results = await db.select().from(preAuthBatches).orderBy(desc(preAuthBatches.createdAt));
    return results;
  }

  async getPreAuthBatch(id: string): Promise<PreAuthBatch | undefined> {
    const [result] = await db.select().from(preAuthBatches).where(eq(preAuthBatches.id, id));
    return result;
  }

  async createPreAuthBatch(batch: InsertPreAuthBatch): Promise<PreAuthBatch> {
    const [result] = await db.insert(preAuthBatches).values(batch).returning();
    return result;
  }

  async updatePreAuthBatch(id: string, updates: Partial<InsertPreAuthBatch>): Promise<PreAuthBatch | undefined> {
    const [result] = await db.update(preAuthBatches).set({ ...updates, updatedAt: new Date() }).where(eq(preAuthBatches.id, id)).returning();
    return result;
  }

  async getFwaCases(): Promise<FwaCase[]> {
    const results = await db.select().from(fwaCases).orderBy(desc(fwaCases.createdAt));
    return results;
  }

  async getFwaCaseById(id: string): Promise<FwaCase | undefined> {
    const [result] = await db.select().from(fwaCases).where(or(eq(fwaCases.id, id), eq(fwaCases.caseId, id)));
    return result;
  }

  async getFwaCaseByClaimId(claimId: string): Promise<FwaCase | undefined> {
    const [result] = await db.select().from(fwaCases).where(or(eq(fwaCases.claimId, claimId), eq(fwaCases.caseId, claimId)));
    return result;
  }

  async createFwaCase(data: InsertFwaCase): Promise<FwaCase> {
    const [result] = await db.insert(fwaCases).values(data).returning();
    return result;
  }

  async updateFwaCase(id: string, data: Partial<InsertFwaCase>): Promise<FwaCase | undefined> {
    const existing = await this.getFwaCaseById(id);
    if (!existing) return undefined;
    const [result] = await db.update(fwaCases).set({ ...data, updatedAt: new Date() }).where(eq(fwaCases.id, existing.id)).returning();
    return result;
  }

  async getFwaFindingsByCaseId(caseId: string): Promise<FwaAnalysisFinding[]> {
    const results = await db.select().from(fwaAnalysisFindings).where(eq(fwaAnalysisFindings.caseId, caseId)).orderBy(desc(fwaAnalysisFindings.createdAt));
    return results;
  }

  async createFwaFinding(data: InsertFwaAnalysisFinding): Promise<FwaAnalysisFinding> {
    const [result] = await db.insert(fwaAnalysisFindings).values(data).returning();
    return result;
  }

  async getFwaCategoriesByCaseId(caseId: string): Promise<FwaCategory[]> {
    const results = await db.select().from(fwaCategories).where(eq(fwaCategories.caseId, caseId)).orderBy(desc(fwaCategories.createdAt));
    return results;
  }

  async createFwaCategory(data: InsertFwaCategory): Promise<FwaCategory> {
    const [result] = await db.insert(fwaCategories).values(data).returning();
    return result;
  }

  async getFwaActionsByCaseId(caseId: string): Promise<FwaAction[]> {
    const results = await db.select().from(fwaActions).where(eq(fwaActions.caseId, caseId)).orderBy(desc(fwaActions.createdAt));
    return results;
  }

  async createFwaAction(data: InsertFwaAction): Promise<FwaAction> {
    const [result] = await db.insert(fwaActions).values(data).returning();
    return result;
  }

  async updateFwaAction(id: string, data: Partial<InsertFwaAction>): Promise<FwaAction | undefined> {
    const [result] = await db.update(fwaActions).set(data).where(eq(fwaActions.id, id)).returning();
    return result;
  }

  async getFwaRegulatoryDocs(): Promise<FwaRegulatoryDoc[]> {
    const results = await db.select().from(fwaRegulatoryDocs).orderBy(desc(fwaRegulatoryDocs.createdAt));
    return results;
  }

  async createFwaRegulatoryDoc(data: InsertFwaRegulatoryDoc): Promise<FwaRegulatoryDoc> {
    const [result] = await db.insert(fwaRegulatoryDocs).values(data).returning();
    return result;
  }

  async getFwaMedicalGuidelines(): Promise<FwaMedicalGuideline[]> {
    const results = await db.select().from(fwaMedicalGuidelines).orderBy(desc(fwaMedicalGuidelines.createdAt));
    return results;
  }

  async createFwaMedicalGuideline(data: InsertFwaMedicalGuideline): Promise<FwaMedicalGuideline> {
    const [result] = await db.insert(fwaMedicalGuidelines).values(data).returning();
    return result;
  }

  async getFwaAgentConfigs(): Promise<FwaAgentConfig[]> {
    const results = await db.select().from(fwaAgentConfigs).orderBy(desc(fwaAgentConfigs.createdAt));
    return results;
  }

  async getFwaAgentConfigByType(agentType: string): Promise<FwaAgentConfig | undefined> {
    const [result] = await db.select().from(fwaAgentConfigs).where(eq(fwaAgentConfigs.agentType, agentType as any));
    return result;
  }

  async createFwaAgentConfig(data: InsertFwaAgentConfig): Promise<FwaAgentConfig> {
    const [result] = await db.insert(fwaAgentConfigs).values(data).returning();
    return result;
  }

  async updateFwaAgentConfig(id: string, data: Partial<InsertFwaAgentConfig>): Promise<FwaAgentConfig | undefined> {
    const [result] = await db.update(fwaAgentConfigs).set({ ...data, updatedAt: new Date() }).where(eq(fwaAgentConfigs.id, id)).returning();
    return result;
  }

  async updateFwaAgentConfigByType(agentType: string, data: Partial<InsertFwaAgentConfig>): Promise<FwaAgentConfig | undefined> {
    const [result] = await db.update(fwaAgentConfigs).set({ ...data, updatedAt: new Date() }).where(eq(fwaAgentConfigs.agentType, agentType as any)).returning();
    return result;
  }

  async getFwaBehaviors(): Promise<FwaBehavior[]> {
    const results = await db.select().from(fwaBehaviors).orderBy(desc(fwaBehaviors.createdAt));
    return results;
  }

  async getFwaBehavior(id: string): Promise<FwaBehavior | undefined> {
    const [result] = await db.select().from(fwaBehaviors).where(eq(fwaBehaviors.id, id));
    return result;
  }

  async createFwaBehavior(data: InsertFwaBehavior): Promise<FwaBehavior> {
    const [result] = await db.insert(fwaBehaviors).values(data).returning();
    return result;
  }

  async updateFwaBehavior(id: string, data: Partial<InsertFwaBehavior>): Promise<FwaBehavior | undefined> {
    const [result] = await db.update(fwaBehaviors).set({ ...data, updatedAt: new Date() }).where(eq(fwaBehaviors.id, id)).returning();
    return result;
  }

  async deleteFwaBehavior(id: string): Promise<boolean> {
    const result = await db.delete(fwaBehaviors).where(eq(fwaBehaviors.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getFwaBatches(): Promise<FwaBatch[]> {
    const results = await db.select().from(fwaBatches).orderBy(desc(fwaBatches.createdAt));
    return results;
  }

  async getFwaBatch(id: string): Promise<FwaBatch | undefined> {
    const [result] = await db.select().from(fwaBatches).where(eq(fwaBatches.id, id));
    return result;
  }

  async createFwaBatch(data: InsertFwaBatch): Promise<FwaBatch> {
    const [result] = await db.insert(fwaBatches).values(data).returning();
    return result;
  }

  async updateFwaBatch(id: string, data: Partial<InsertFwaBatch>): Promise<FwaBatch | undefined> {
    const [result] = await db.update(fwaBatches).set({ ...data, updatedAt: new Date() }).where(eq(fwaBatches.id, id)).returning();
    return result;
  }

  async getAgentReports(): Promise<AgentReport[]> {
    const results = await db.select().from(agentReports).orderBy(desc(agentReports.createdAt));
    return results;
  }

  async getAgentReportById(id: string): Promise<AgentReport | undefined> {
    const [result] = await db.select().from(agentReports).where(eq(agentReports.id, id));
    return result;
  }

  async getAgentReportsByCaseId(caseId: string): Promise<AgentReport[]> {
    const results = await db.select().from(agentReports).where(and(eq(agentReports.entityType, "case"), eq(agentReports.entityId, caseId))).orderBy(desc(agentReports.createdAt));
    return results;
  }

  async getAgentReportsByEntityId(entityId: string, entityType: string): Promise<AgentReport[]> {
    const results = await db.select().from(agentReports).where(and(eq(agentReports.entityId, entityId), eq(agentReports.entityType, entityType))).orderBy(desc(agentReports.createdAt));
    return results;
  }

  async createAgentReport(data: InsertAgentReport): Promise<AgentReport> {
    const [result] = await db.insert(agentReports).values(data).returning();
    return result;
  }

  async updateAgentReport(id: string, data: Partial<InsertAgentReport>): Promise<AgentReport | undefined> {
    const [result] = await db.update(agentReports).set({ ...data, updatedAt: new Date() }).where(eq(agentReports.id, id)).returning();
    return result;
  }

  // Provider Relations - Dream Reports
  async getAllDreamReports(): Promise<DreamReport[]> {
    const results = await db.select().from(dreamReports).orderBy(desc(dreamReports.createdAt));
    return results;
  }

  async getDreamReportById(id: string): Promise<DreamReport | undefined> {
    const [result] = await db.select().from(dreamReports).where(or(eq(dreamReports.id, id), eq(dreamReports.reportNumber, id)));
    return result;
  }

  async getDreamReportsByProviderId(providerId: string): Promise<DreamReport[]> {
    const results = await db.select().from(dreamReports).where(eq(dreamReports.providerId, providerId)).orderBy(desc(dreamReports.createdAt));
    return results;
  }

  async createDreamReport(data: InsertDreamReport): Promise<DreamReport> {
    const [result] = await db.insert(dreamReports).values(data).returning();
    return result;
  }

  async updateDreamReport(id: string, data: Partial<InsertDreamReport>): Promise<DreamReport | undefined> {
    const existing = await this.getDreamReportById(id);
    if (!existing) return undefined;
    const [result] = await db.update(dreamReports).set({ ...data, updatedAt: new Date() }).where(eq(dreamReports.id, existing.id)).returning();
    return result;
  }

  // Provider Relations - Evidence Packs
  async getAllEvidencePacks(): Promise<EvidencePack[]> {
    const results = await db.select().from(evidencePacks).orderBy(desc(evidencePacks.createdAt));
    return results;
  }

  async getEvidencePackById(id: string): Promise<EvidencePack | undefined> {
    const [result] = await db.select().from(evidencePacks).where(or(eq(evidencePacks.id, id), eq(evidencePacks.packNumber, id)));
    return result;
  }

  async createEvidencePack(data: InsertEvidencePack): Promise<EvidencePack> {
    const [result] = await db.insert(evidencePacks).values(data).returning();
    return result;
  }

  async updateEvidencePack(id: string, data: Partial<InsertEvidencePack>): Promise<EvidencePack | undefined> {
    const existing = await this.getEvidencePackById(id);
    if (!existing) return undefined;
    const [result] = await db.update(evidencePacks).set({ ...data, updatedAt: new Date() }).where(eq(evidencePacks.id, existing.id)).returning();
    return result;
  }

  async lockEvidencePack(id: string, lockedBy: string): Promise<EvidencePack | undefined> {
    const existing = await this.getEvidencePackById(id);
    if (!existing) return undefined;
    if (existing.status !== "draft") return undefined;
    const [result] = await db.update(evidencePacks).set({
      status: "locked",
      lockedAt: new Date(),
      lockedBy,
      updatedAt: new Date()
    }).where(eq(evidencePacks.id, existing.id)).returning();
    return result;
  }

  // Provider Relations - Reconciliation Sessions
  async getAllReconciliationSessions(): Promise<ReconciliationSession[]> {
    const results = await db.select().from(reconciliationSessions).orderBy(desc(reconciliationSessions.createdAt));
    return results;
  }

  async getReconciliationSessionById(id: string): Promise<ReconciliationSession | undefined> {
    const [result] = await db.select().from(reconciliationSessions).where(or(eq(reconciliationSessions.id, id), eq(reconciliationSessions.sessionNumber, id)));
    return result;
  }

  async createReconciliationSession(data: InsertReconciliationSession): Promise<ReconciliationSession> {
    const [result] = await db.insert(reconciliationSessions).values(data).returning();
    return result;
  }

  async updateReconciliationSession(id: string, data: Partial<InsertReconciliationSession>): Promise<ReconciliationSession | undefined> {
    const existing = await this.getReconciliationSessionById(id);
    if (!existing) return undefined;
    const [result] = await db.update(reconciliationSessions).set({ ...data, updatedAt: new Date() }).where(eq(reconciliationSessions.id, existing.id)).returning();
    return result;
  }

  // Provider Relations - Settlement Ledger
  async getAllSettlements(): Promise<SettlementLedger[]> {
    const results = await db.select().from(settlementLedger).orderBy(desc(settlementLedger.createdAt));
    return results;
  }

  async getSettlementById(id: string): Promise<SettlementLedger | undefined> {
    const [result] = await db.select().from(settlementLedger).where(or(eq(settlementLedger.id, id), eq(settlementLedger.settlementNumber, id)));
    return result;
  }

  async createSettlement(data: InsertSettlementLedger): Promise<SettlementLedger> {
    const [result] = await db.insert(settlementLedger).values(data).returning();
    return result;
  }

  async updateSettlement(id: string, data: Partial<InsertSettlementLedger>): Promise<SettlementLedger | undefined> {
    const existing = await this.getSettlementById(id);
    if (!existing) return undefined;
    const [result] = await db.update(settlementLedger).set({ ...data, updatedAt: new Date() }).where(eq(settlementLedger.id, existing.id)).returning();
    return result;
  }

  // Provider Relations - Peer Groups
  async getAllPeerGroups(): Promise<PeerGroup[]> {
    const results = await db.select().from(peerGroups).orderBy(desc(peerGroups.createdAt));
    return results;
  }

  async getPeerGroupById(id: string): Promise<PeerGroup | undefined> {
    const [result] = await db.select().from(peerGroups).where(eq(peerGroups.id, id));
    return result;
  }

  async createPeerGroup(data: InsertPeerGroup): Promise<PeerGroup> {
    const [result] = await db.insert(peerGroups).values(data).returning();
    return result;
  }

  // Context Enrichment - Patient 360
  async getPatient360(patientId: string): Promise<Patient360 | undefined> {
    const [result] = await db.select().from(patient360).where(eq(patient360.patientId, patientId));
    return result;
  }

  async createPatient360(data: InsertPatient360): Promise<Patient360> {
    const [result] = await db.insert(patient360).values(data).returning();
    return result;
  }

  async updatePatient360(patientId: string, data: Partial<InsertPatient360>): Promise<Patient360 | undefined> {
    const existing = await this.getPatient360(patientId);
    if (!existing) return undefined;
    const [result] = await db.update(patient360).set({ ...data, updatedAt: new Date() }).where(eq(patient360.id, existing.id)).returning();
    return result;
  }

  async listPatient360s(): Promise<Patient360[]> {
    const results = await db.select().from(patient360).orderBy(desc(patient360.createdAt));
    return results;
  }

  // Context Enrichment - Provider 360
  async getProvider360(providerId: string): Promise<Provider360 | undefined> {
    const [result] = await db.select().from(provider360).where(eq(provider360.providerId, providerId));
    return result;
  }

  async createProvider360(data: InsertProvider360): Promise<Provider360> {
    const [result] = await db.insert(provider360).values(data).returning();
    return result;
  }

  async updateProvider360(providerId: string, data: Partial<InsertProvider360>): Promise<Provider360 | undefined> {
    const existing = await this.getProvider360(providerId);
    if (!existing) return undefined;
    const [result] = await db.update(provider360).set({ ...data, updatedAt: new Date() }).where(eq(provider360.id, existing.id)).returning();
    return result;
  }

  async listProvider360s(): Promise<Provider360[]> {
    const results = await db.select().from(provider360).orderBy(desc(provider360.createdAt));
    return results;
  }

  // Context Enrichment - Doctor 360
  async getDoctor360(doctorId: string): Promise<Doctor360 | undefined> {
    const [result] = await db.select().from(doctor360).where(eq(doctor360.doctorId, doctorId));
    return result;
  }

  async createDoctor360(data: InsertDoctor360): Promise<Doctor360> {
    const [result] = await db.insert(doctor360).values(data).returning();
    return result;
  }

  async updateDoctor360(doctorId: string, data: Partial<InsertDoctor360>): Promise<Doctor360 | undefined> {
    const existing = await this.getDoctor360(doctorId);
    if (!existing) return undefined;
    const [result] = await db.update(doctor360).set({ ...data, updatedAt: new Date() }).where(eq(doctor360.id, existing.id)).returning();
    return result;
  }

  async listDoctor360s(): Promise<Doctor360[]> {
    const results = await db.select().from(doctor360).orderBy(desc(doctor360.createdAt));
    return results;
  }

  // Simulation Lab - Digital Twins
  async createDigitalTwin(data: InsertDigitalTwin): Promise<DigitalTwin> {
    const [result] = await db.insert(digitalTwins).values(data).returning();
    return result;
  }

  async getDigitalTwin(twinId: string): Promise<DigitalTwin | undefined> {
    const [result] = await db.select().from(digitalTwins).where(eq(digitalTwins.twinId, twinId));
    return result;
  }

  async listDigitalTwins(): Promise<DigitalTwin[]> {
    const results = await db.select().from(digitalTwins).orderBy(desc(digitalTwins.createdAt));
    return results;
  }

  async updateDigitalTwin(twinId: string, data: Partial<InsertDigitalTwin>): Promise<DigitalTwin | undefined> {
    const existing = await this.getDigitalTwin(twinId);
    if (!existing) return undefined;
    const [result] = await db.update(digitalTwins).set({ ...data, updatedAt: new Date() }).where(eq(digitalTwins.id, existing.id)).returning();
    return result;
  }

  async deleteDigitalTwin(twinId: string): Promise<boolean> {
    const existing = await this.getDigitalTwin(twinId);
    if (!existing) return false;
    const result = await db.delete(digitalTwins).where(eq(digitalTwins.id, existing.id));
    return (result.rowCount ?? 0) > 0;
  }

  // Simulation Lab - Shadow Rules
  async createShadowRule(data: InsertShadowRule): Promise<ShadowRule> {
    const [result] = await db.insert(shadowRules).values(data).returning();
    return result;
  }

  async getShadowRule(ruleSetId: string): Promise<ShadowRule | undefined> {
    const [result] = await db.select().from(shadowRules).where(eq(shadowRules.ruleSetId, ruleSetId));
    return result;
  }

  async listShadowRules(): Promise<ShadowRule[]> {
    const results = await db.select().from(shadowRules).orderBy(desc(shadowRules.createdAt));
    return results;
  }

  async updateShadowRule(ruleSetId: string, data: Partial<InsertShadowRule>): Promise<ShadowRule | undefined> {
    const existing = await this.getShadowRule(ruleSetId);
    if (!existing) return undefined;
    const [result] = await db.update(shadowRules).set({ ...data, updatedAt: new Date() }).where(eq(shadowRules.id, existing.id)).returning();
    return result;
  }

  async deleteShadowRule(ruleSetId: string): Promise<boolean> {
    const existing = await this.getShadowRule(ruleSetId);
    if (!existing) return false;
    const result = await db.delete(shadowRules).where(eq(shadowRules.id, existing.id));
    return (result.rowCount ?? 0) > 0;
  }

  // Simulation Lab - Ghost Runs
  async createGhostRun(data: InsertGhostRun): Promise<GhostRun> {
    const [result] = await db.insert(ghostRuns).values(data).returning();
    return result;
  }

  async getGhostRun(runId: string): Promise<GhostRun | undefined> {
    const [result] = await db.select().from(ghostRuns).where(eq(ghostRuns.runId, runId));
    return result;
  }

  async listGhostRuns(): Promise<GhostRun[]> {
    const results = await db.select().from(ghostRuns).orderBy(desc(ghostRuns.createdAt));
    return results;
  }

  async updateGhostRun(runId: string, data: Partial<InsertGhostRun>): Promise<GhostRun | undefined> {
    const existing = await this.getGhostRun(runId);
    if (!existing) return undefined;
    const updateData: Record<string, unknown> = { ...data };
    if (data.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
    const [result] = await db.update(ghostRuns).set(updateData).where(eq(ghostRuns.id, existing.id)).returning();
    return result;
  }

  // Graph Analysis - Relationship Graphs
  async createRelationshipGraph(data: InsertRelationshipGraph): Promise<RelationshipGraph> {
    const [result] = await db.insert(relationshipGraphs).values(data).returning();
    return result;
  }

  async getRelationshipGraph(graphId: string): Promise<RelationshipGraph | undefined> {
    const [result] = await db.select().from(relationshipGraphs).where(eq(relationshipGraphs.graphId, graphId));
    return result;
  }

  async listRelationshipGraphs(): Promise<RelationshipGraph[]> {
    const results = await db.select().from(relationshipGraphs).orderBy(desc(relationshipGraphs.createdAt));
    return results;
  }

  async updateRelationshipGraph(graphId: string, data: Partial<InsertRelationshipGraph>): Promise<RelationshipGraph | undefined> {
    const existing = await this.getRelationshipGraph(graphId);
    if (!existing) return undefined;
    const [result] = await db.update(relationshipGraphs).set({ ...data, updatedAt: new Date() }).where(eq(relationshipGraphs.id, existing.id)).returning();
    return result;
  }

  async deleteRelationshipGraph(graphId: string): Promise<boolean> {
    const existing = await this.getRelationshipGraph(graphId);
    if (!existing) return false;
    const result = await db.delete(relationshipGraphs).where(eq(relationshipGraphs.id, existing.id));
    return (result.rowCount ?? 0) > 0;
  }

  // Graph Analysis - Collusion Rings
  async createCollusionRing(data: InsertCollusionRing): Promise<CollusionRing> {
    const [result] = await db.insert(collusionRings).values(data).returning();
    return result;
  }

  async getCollusionRing(ringId: string): Promise<CollusionRing | undefined> {
    const [result] = await db.select().from(collusionRings).where(eq(collusionRings.ringId, ringId));
    return result;
  }

  async listCollusionRings(): Promise<CollusionRing[]> {
    const results = await db.select().from(collusionRings).orderBy(desc(collusionRings.createdAt));
    return results;
  }

  async updateCollusionRing(ringId: string, data: Partial<InsertCollusionRing>): Promise<CollusionRing | undefined> {
    const existing = await this.getCollusionRing(ringId);
    if (!existing) return undefined;
    const [result] = await db.update(collusionRings).set({ ...data, updatedAt: new Date() }).where(eq(collusionRings.id, existing.id)).returning();
    return result;
  }

  async getAllProviderCommunications(): Promise<ProviderCommunication[]> {
    const results = await db.select().from(providerCommunications).orderBy(desc(providerCommunications.createdAt));
    return results;
  }

  async getProviderCommunicationById(id: string): Promise<ProviderCommunication | undefined> {
    const [result] = await db.select().from(providerCommunications).where(eq(providerCommunications.id, id));
    return result;
  }

  async createProviderCommunication(data: InsertProviderCommunication): Promise<ProviderCommunication> {
    const [result] = await db.insert(providerCommunications).values(data).returning();
    return result;
  }

  // Provider Directory
  async getAllProviderDirectoryEntries(): Promise<ProviderDirectory[]> {
    const results = await db.select().from(providerDirectory).orderBy(desc(providerDirectory.createdAt));
    return results;
  }

  async getProviderDirectoryById(id: string): Promise<ProviderDirectory | undefined> {
    const [result] = await db.select().from(providerDirectory).where(eq(providerDirectory.id, id));
    return result;
  }

  async getProviderDirectoryByNpi(npi: string): Promise<ProviderDirectory | undefined> {
    const [result] = await db.select().from(providerDirectory).where(eq(providerDirectory.npi, npi));
    return result;
  }

  async createProviderDirectoryEntry(data: InsertProviderDirectory): Promise<ProviderDirectory> {
    const [result] = await db.insert(providerDirectory).values(data).returning();
    return result;
  }

  async getAllProviderContracts(): Promise<ProviderContract[]> {
    const results = await db.select().from(providerContracts).orderBy(desc(providerContracts.createdAt));
    return results;
  }

  async getProviderContractById(id: string): Promise<ProviderContract | undefined> {
    const [result] = await db.select().from(providerContracts).where(eq(providerContracts.id, id));
    return result;
  }

  async createProviderContract(data: InsertProviderContract): Promise<ProviderContract> {
    const [result] = await db.insert(providerContracts).values(data).returning();
    return result;
  }

  // Provider Benchmarks
  async getAllProviderBenchmarks(): Promise<ProviderBenchmark[]> {
    const results = await db.select().from(providerBenchmarks).orderBy(desc(providerBenchmarks.createdAt));
    return results;
  }

  async getProviderBenchmarkById(providerId: string): Promise<ProviderBenchmark | undefined> {
    const [result] = await db.select().from(providerBenchmarks).where(eq(providerBenchmarks.providerId, providerId));
    return result;
  }

  async createProviderBenchmark(data: InsertProviderBenchmark): Promise<ProviderBenchmark> {
    const [result] = await db.insert(providerBenchmarks).values(data).returning();
    return result;
  }

  async updateProviderBenchmark(id: string, data: Partial<InsertProviderBenchmark>): Promise<ProviderBenchmark | undefined> {
    const existing = await db.select().from(providerBenchmarks).where(eq(providerBenchmarks.id, id));
    if (!existing.length) return undefined;
    const [result] = await db.update(providerBenchmarks).set({ ...data, updatedAt: new Date() }).where(eq(providerBenchmarks.id, id)).returning();
    return result;
  }

  // CPM Metrics
  async getAllProviderCpmMetrics(): Promise<ProviderCpmMetric[]> {
    const results = await db.select().from(providerCpmMetrics).orderBy(desc(providerCpmMetrics.createdAt));
    return results;
  }

  async getProviderCpmMetricsByProviderId(providerId: string): Promise<ProviderCpmMetric[]> {
    const results = await db.select().from(providerCpmMetrics).where(eq(providerCpmMetrics.providerId, providerId)).orderBy(desc(providerCpmMetrics.year));
    return results;
  }

  async createProviderCpmMetric(data: InsertProviderCpmMetric): Promise<ProviderCpmMetric> {
    const [result] = await db.insert(providerCpmMetrics).values(data).returning();
    return result;
  }

  // Operational Findings
  async getAllOperationalFindings(): Promise<OperationalFinding[]> {
    const results = await db.select().from(operationalFindingsLedger).orderBy(desc(operationalFindingsLedger.createdAt));
    return results;
  }

  async getOperationalFindingById(id: string): Promise<OperationalFinding | undefined> {
    const [result] = await db.select().from(operationalFindingsLedger).where(eq(operationalFindingsLedger.id, id));
    return result;
  }

  async getOperationalFindingsByProviderId(providerId: string): Promise<OperationalFinding[]> {
    const results = await db.select().from(operationalFindingsLedger).where(eq(operationalFindingsLedger.providerId, providerId)).orderBy(desc(operationalFindingsLedger.createdAt));
    return results;
  }

  async createOperationalFinding(data: InsertOperationalFinding): Promise<OperationalFinding> {
    const [result] = await db.insert(operationalFindingsLedger).values(data).returning();
    return result;
  }

  async updateOperationalFinding(id: string, data: Partial<InsertOperationalFinding>): Promise<OperationalFinding | undefined> {
    const existing = await db.select().from(operationalFindingsLedger).where(eq(operationalFindingsLedger.id, id));
    if (!existing.length) return undefined;
    const [result] = await db.update(operationalFindingsLedger).set({ ...data, updatedAt: new Date() }).where(eq(operationalFindingsLedger.id, id)).returning();
    return result;
  }

  // KPI Definitions
  async getKpiDefinitions(): Promise<KpiDefinition[]> {
    const results = await db.select().from(kpiDefinitions).orderBy(kpiDefinitions.sortOrder);
    return results;
  }

  async getKpiDefinition(id: string): Promise<KpiDefinition | undefined> {
    const [result] = await db.select().from(kpiDefinitions).where(eq(kpiDefinitions.id, id));
    return result;
  }

  async createKpiDefinition(data: InsertKpiDefinition): Promise<KpiDefinition> {
    const [result] = await db.insert(kpiDefinitions).values(data).returning();
    return result;
  }

  async updateKpiDefinition(id: string, data: Partial<InsertKpiDefinition>): Promise<KpiDefinition | undefined> {
    const existing = await db.select().from(kpiDefinitions).where(eq(kpiDefinitions.id, id));
    if (!existing.length) return undefined;
    const [result] = await db.update(kpiDefinitions).set({ ...data, updatedAt: new Date() }).where(eq(kpiDefinitions.id, id)).returning();
    return result;
  }

  async deleteKpiDefinition(id: string): Promise<boolean> {
    const existing = await db.select().from(kpiDefinitions).where(eq(kpiDefinitions.id, id));
    if (!existing.length) return false;
    await db.delete(kpiDefinitions).where(eq(kpiDefinitions.id, id));
    return true;
  }

  // KPI Results
  async getKpiResults(filters?: { kpiCode?: string; providerId?: string }): Promise<KpiResult[]> {
    let results = await db.select().from(kpiResults).orderBy(desc(kpiResults.createdAt));
    if (filters?.kpiCode) {
      results = results.filter(r => r.kpiCode === filters.kpiCode);
    }
    if (filters?.providerId) {
      results = results.filter(r => r.providerId === filters.providerId);
    }
    return results;
  }

  async createKpiResult(data: InsertKpiResult): Promise<KpiResult> {
    const [result] = await db.insert(kpiResults).values(data).returning();
    return result;
  }

  // Claims for Findings Feature
  async getClaims(options?: { search?: string; limit?: number; offset?: number; status?: string }): Promise<{ claims: Claim[]; total: number }> {
    const limitVal = options?.limit || 50;
    const offsetVal = options?.offset || 0;

    // Simple query without search - fetch all and filter in memory for now
    // This is acceptable for moderate data sizes
    let allResults = await db.select().from(claims).orderBy(desc(claims.registrationDate));

    // Apply search filter in memory
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      allResults = allResults.filter(c =>
        c.claimNumber?.toLowerCase().includes(searchLower) ||
        c.memberId?.toLowerCase().includes(searchLower) ||
        c.providerId?.toLowerCase().includes(searchLower) ||
        c.hospital?.toLowerCase().includes(searchLower) ||
        c.primaryDiagnosis?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (options?.status) {
      allResults = allResults.filter(c => c.status === options.status);
    }

    const total = allResults.length;
    const results = allResults.slice(offsetVal, offsetVal + limitVal);

    return { claims: results, total };
  }

  async getClaimById(id: string): Promise<Claim | undefined> {
    const [result] = await db.select().from(claims).where(eq(claims.id, id));
    return result;
  }

  async getClaimsByIds(ids: string[]): Promise<Claim[]> {
    if (ids.length === 0) return [];
    const results = await db.select().from(claims).where(inArray(claims.id, ids));
    return results;
  }

  async getClaimsByProviderId(providerId: string, options?: { limit?: number }): Promise<Claim[]> {
    let query = db.select().from(claims).where(
      or(eq(claims.providerId, providerId), eq(claims.hospital, providerId))
    );
    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    return query;
  }

  async getClaimServicesByClaimId(claimId: string): Promise<FwaClaimService[]> {
    const results = await db.select().from(fwaClaimServices).where(eq(fwaClaimServices.claimId, claimId)).orderBy(fwaClaimServices.lineNumber);
    return results;
  }

  async getFwaAnalysisFindingsByCaseId(caseId: string): Promise<FwaAnalysisFinding[]> {
    const results = await db.select().from(fwaAnalysisFindings).where(eq(fwaAnalysisFindings.caseId, caseId));
    return results;
  }

  async createClaim(data: InsertClaim): Promise<Claim> {
    const [result] = await db.insert(claims).values(data).returning();
    return result;
  }

  async updateClaim(id: string, data: Partial<InsertClaim>): Promise<Claim | undefined> {
    const [result] = await db.update(claims).set(data).where(eq(claims.id, id)).returning();
    return result;
  }

  // CHI Regulatory Extensions - DatabaseStorage implementations
  async getPolicyViolations(): Promise<PolicyViolationCatalogue[]> {
    return db.select().from(policyViolationCatalogue).orderBy(desc(policyViolationCatalogue.createdAt));
  }
  async getPolicyViolation(id: string): Promise<PolicyViolationCatalogue | undefined> {
    const [result] = await db.select().from(policyViolationCatalogue).where(eq(policyViolationCatalogue.id, id));
    return result;
  }
  async createPolicyViolation(data: InsertPolicyViolationCatalogue): Promise<PolicyViolationCatalogue> {
    const [result] = await db.insert(policyViolationCatalogue).values(data).returning();
    return result;
  }
  async updatePolicyViolation(id: string, data: Partial<InsertPolicyViolationCatalogue>): Promise<PolicyViolationCatalogue | undefined> {
    const [result] = await db.update(policyViolationCatalogue).set({ ...data, updatedAt: new Date() }).where(eq(policyViolationCatalogue.id, id)).returning();
    return result;
  }

  async getClinicalPathwayRules(): Promise<ClinicalPathwayRule[]> {
    return db.select().from(clinicalPathwayRules).orderBy(desc(clinicalPathwayRules.createdAt));
  }
  async getClinicalPathwayRule(id: string): Promise<ClinicalPathwayRule | undefined> {
    const [result] = await db.select().from(clinicalPathwayRules).where(eq(clinicalPathwayRules.id, id));
    return result;
  }
  async createClinicalPathwayRule(data: InsertClinicalPathwayRule): Promise<ClinicalPathwayRule> {
    const [result] = await db.insert(clinicalPathwayRules).values(data).returning();
    return result;
  }
  async updateClinicalPathwayRule(id: string, data: Partial<InsertClinicalPathwayRule>): Promise<ClinicalPathwayRule | undefined> {
    const [result] = await db.update(clinicalPathwayRules).set({ ...data, updatedAt: new Date() }).where(eq(clinicalPathwayRules.id, id)).returning();
    return result;
  }

  async getProviderComplaints(): Promise<ProviderComplaint[]> {
    return db.select().from(providerComplaints).orderBy(desc(providerComplaints.createdAt));
  }
  async getProviderComplaint(id: string): Promise<ProviderComplaint | undefined> {
    const [result] = await db.select().from(providerComplaints).where(eq(providerComplaints.id, id));
    return result;
  }
  async createProviderComplaint(data: InsertProviderComplaint): Promise<ProviderComplaint> {
    const [result] = await db.insert(providerComplaints).values(data).returning();
    return result;
  }
  async updateProviderComplaint(id: string, data: Partial<InsertProviderComplaint>): Promise<ProviderComplaint | undefined> {
    const [result] = await db.update(providerComplaints).set({ ...data, updatedAt: new Date() }).where(eq(providerComplaints.id, id)).returning();
    return result;
  }

  async getOnlineListeningMentions(): Promise<OnlineListeningMention[]> {
    return db.select().from(onlineListeningMentions).orderBy(desc(onlineListeningMentions.createdAt));
  }
  async createOnlineListeningMention(data: InsertOnlineListeningMention): Promise<OnlineListeningMention> {
    const [result] = await db.insert(onlineListeningMentions).values(data).returning();
    return result;
  }

  async getListeningSourceConfigs(): Promise<ListeningSourceConfig[]> {
    return await db.select().from(listeningSourceConfigs).orderBy(listeningSourceConfigs.sourceId);
  }

  async getListeningSourceConfig(sourceId: string): Promise<ListeningSourceConfig | undefined> {
    const [config] = await db.select().from(listeningSourceConfigs).where(eq(listeningSourceConfigs.sourceId, sourceId));
    return config;
  }

  async createListeningSourceConfig(data: InsertListeningSourceConfig): Promise<ListeningSourceConfig> {
    const [config] = await db.insert(listeningSourceConfigs).values(data).returning();
    return config;
  }

  async updateListeningSourceConfig(id: string, data: Partial<InsertListeningSourceConfig>): Promise<ListeningSourceConfig | undefined> {
    const [config] = await db.update(listeningSourceConfigs).set({ ...data, updatedAt: new Date() }).where(eq(listeningSourceConfigs.id, id)).returning();
    return config;
  }

  async getEnforcementCases(): Promise<EnforcementCase[]> {
    return db.select().from(enforcementCases).orderBy(desc(enforcementCases.createdAt));
  }
  async getEnforcementCase(id: string): Promise<EnforcementCase | undefined> {
    const [result] = await db.select().from(enforcementCases).where(eq(enforcementCases.id, id));
    return result;
  }
  async createEnforcementCase(data: InsertEnforcementCase): Promise<EnforcementCase> {
    const caseNumber = data.caseNumber || `ENF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const findingDate = data.findingDate || new Date();
    const [result] = await db.insert(enforcementCases).values({ 
      ...data, 
      caseNumber,
      findingDate,
      status: data.status || "finding" 
    }).returning();
    return result;
  }
  async updateEnforcementCase(id: string, data: Partial<InsertEnforcementCase>): Promise<EnforcementCase | undefined> {
    const [result] = await db.update(enforcementCases).set({ ...data, updatedAt: new Date() }).where(eq(enforcementCases.id, id)).returning();
    return result;
  }

  // Enforcement Dossier CRUD (DatabaseStorage)
  async createEnforcementDossier(data: InsertEnforcementDossier): Promise<EnforcementDossier> {
    const [dossier] = await db.insert(enforcementDossiers).values(data).returning();
    return dossier;
  }

  async getEnforcementDossier(id: number): Promise<EnforcementDossier | undefined> {
    const [dossier] = await db.select().from(enforcementDossiers).where(eq(enforcementDossiers.id, id));
    return dossier;
  }

  async getEnforcementDossierByCaseId(caseId: string): Promise<EnforcementDossier | undefined> {
    const [dossier] = await db.select().from(enforcementDossiers).where(eq(enforcementDossiers.caseId, caseId));
    return dossier;
  }

  async updateEnforcementDossier(id: number, data: Partial<InsertEnforcementDossier>): Promise<EnforcementDossier | undefined> {
    const [dossier] = await db
      .update(enforcementDossiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enforcementDossiers.id, id))
      .returning();
    return dossier;
  }

  async listEnforcementDossiers(filters?: { status?: string; stage?: string }): Promise<EnforcementDossier[]> {
    const conditions = [];
    if (filters?.status) conditions.push(eq(enforcementDossiers.status, filters.status));
    if (filters?.stage) conditions.push(eq(enforcementDossiers.currentStage, filters.stage));
    if (conditions.length > 0) {
      return db.select().from(enforcementDossiers).where(and(...conditions)).orderBy(desc(enforcementDossiers.updatedAt));
    }
    return db.select().from(enforcementDossiers).orderBy(desc(enforcementDossiers.updatedAt));
  }

  // Detection results for enforcement workflow (DatabaseStorage)
  async getDetectionResultsByClaimId(claimId: string): Promise<FwaDetectionResult | undefined> {
    const [result] = await db
      .select()
      .from(fwaDetectionResults)
      .where(eq(fwaDetectionResults.claimId, claimId))
      .orderBy(desc(fwaDetectionResults.analyzedAt))
      .limit(1);
    return result;
  }

  async getDetectionResultsByProvider(providerId: string): Promise<FwaDetectionResult[]> {
    return db
      .select()
      .from(fwaDetectionResults)
      .where(eq(fwaDetectionResults.providerId, providerId))
      .orderBy(desc(fwaDetectionResults.compositeScore))
      .limit(50);
  }

  async getAnalyzedClaimsByProvider(providerId: string, limit?: number): Promise<Claim[]> {
    return db
      .select()
      .from(claims)
      .where(eq(claims.providerId, providerId))
      .orderBy(desc(claims.createdAt))
      .limit(limit || 10);
  }

  async getRegulatoryCirculars(): Promise<RegulatoryCircular[]> {
    return db.select().from(regulatoryCirculars).orderBy(desc(regulatoryCirculars.createdAt));
  }
  async getRegulatoryCircular(id: string): Promise<RegulatoryCircular | undefined> {
    const [result] = await db.select().from(regulatoryCirculars).where(eq(regulatoryCirculars.id, id));
    return result;
  }
  async createRegulatoryCircular(data: InsertRegulatoryCircular): Promise<RegulatoryCircular> {
    const circularNumber = data.circularNumber || `CHI-CIR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const effectiveDate = data.effectiveDate || new Date();
    const [result] = await db.insert(regulatoryCirculars).values({
      ...data,
      circularNumber,
      effectiveDate,
      status: data.status || "draft"
    }).returning();
    return result;
  }
  async updateRegulatoryCircular(id: string, data: Partial<InsertRegulatoryCircular>): Promise<RegulatoryCircular | undefined> {
    const [result] = await db.update(regulatoryCirculars).set({ ...data, updatedAt: new Date() }).where(eq(regulatoryCirculars.id, id)).returning();
    return result;
  }

  async getAuditSessions(): Promise<AuditSession[]> {
    return db.select().from(auditSessions).orderBy(desc(auditSessions.scheduledDate));
  }
  async getAuditSession(id: string): Promise<AuditSession | undefined> {
    const [result] = await db.select().from(auditSessions).where(eq(auditSessions.id, id));
    return result;
  }
  async createAuditSession(data: InsertAuditSession): Promise<AuditSession> {
    const auditNumber = data.auditNumber || `AUD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const scheduledDate = data.scheduledDate || new Date();
    const [result] = await db.insert(auditSessions).values({
      ...data,
      auditNumber,
      scheduledDate,
      status: data.status || "scheduled"
    }).returning();
    return result;
  }
  async updateAuditSession(id: string, data: Partial<InsertAuditSession>): Promise<AuditSession | undefined> {
    const [result] = await db.update(auditSessions).set({ ...data, updatedAt: new Date() }).where(eq(auditSessions.id, id)).returning();
    return result;
  }

  // Audit Findings - DatabaseStorage
  async getAuditFindings(auditSessionId?: string): Promise<AuditFinding[]> {
    if (auditSessionId) {
      return db.select().from(auditFindings).where(eq(auditFindings.auditSessionId, auditSessionId)).orderBy(desc(auditFindings.createdAt));
    }
    return db.select().from(auditFindings).orderBy(desc(auditFindings.createdAt));
  }

  async getAuditFinding(id: string): Promise<AuditFinding | undefined> {
    const [result] = await db.select().from(auditFindings).where(eq(auditFindings.id, id));
    return result;
  }

  async createAuditFinding(data: InsertAuditFinding): Promise<AuditFinding> {
    const findingNumber = data.findingNumber || `FND-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const [result] = await db.insert(auditFindings).values({
      ...data,
      findingNumber,
    }).returning();
    return result;
  }

  async updateAuditFinding(id: string, data: Partial<InsertAuditFinding>): Promise<AuditFinding | undefined> {
    const [result] = await db.update(auditFindings).set({ ...data, updatedAt: new Date() }).where(eq(auditFindings.id, id)).returning();
    return result;
  }

  async deleteAuditFinding(id: string): Promise<boolean> {
    await db.delete(auditFindings).where(eq(auditFindings.id, id));
    return true;
  }

  // Audit Checklists - DatabaseStorage
  async getAuditChecklists(auditSessionId: string): Promise<AuditChecklist[]> {
    return db.select().from(auditChecklists).where(eq(auditChecklists.auditSessionId, auditSessionId));
  }

  async getAuditChecklist(id: string): Promise<AuditChecklist | undefined> {
    const [result] = await db.select().from(auditChecklists).where(eq(auditChecklists.id, id));
    return result;
  }

  async createAuditChecklist(data: InsertAuditChecklist): Promise<AuditChecklist> {
    const [result] = await db.insert(auditChecklists).values(data).returning();
    return result;
  }

  async updateAuditChecklist(id: string, data: Partial<InsertAuditChecklist>): Promise<AuditChecklist | undefined> {
    // Convert timestamp strings to Date objects for Drizzle
    const processedData = { ...data };
    if (processedData.completedAt !== undefined) {
      processedData.completedAt = processedData.completedAt ? new Date(processedData.completedAt) : null;
    }
    const [result] = await db.update(auditChecklists).set(processedData).where(eq(auditChecklists.id, id)).returning();
    return result;
  }

  async createDefaultChecklists(auditSessionId: string, category: string): Promise<AuditChecklist[]> {
    const defaultItems = [
      { itemCode: 'DOC-001', description: 'Verify medical records documentation', category: 'documentation', requirement: 'All claims must have supporting medical records' },
      { itemCode: 'DOC-002', description: 'Check prescription validity', category: 'documentation', requirement: 'Prescriptions must be signed and dated' },
      { itemCode: 'BIL-001', description: 'Validate billing codes accuracy', category: 'billing', requirement: 'CPT/ICD codes must match services rendered' },
      { itemCode: 'BIL-002', description: 'Check for unbundling violations', category: 'billing', requirement: 'Related services should be billed together' },
      { itemCode: 'CLI-001', description: 'Verify medical necessity', category: 'clinical', requirement: 'Services must be medically necessary' },
      { itemCode: 'CLI-002', description: 'Check treatment appropriateness', category: 'clinical', requirement: 'Treatment must follow clinical guidelines' },
      { itemCode: 'COM-001', description: 'Review CHI compliance', category: 'compliance', requirement: 'Provider must comply with CHI regulations' },
      { itemCode: 'COM-002', description: 'Verify license validity', category: 'compliance', requirement: 'All practitioners must have valid licenses' },
    ].filter(item => category === 'all' || item.category === category);

    const results: AuditChecklist[] = [];
    for (const item of defaultItems) {
      const [result] = await db.insert(auditChecklists).values({
        auditSessionId,
        ...item,
        evidenceRequired: true,
      }).returning();
      results.push(result);
    }
    return results;
  }

  // RLHF Feedback (Phase 1)
  async getRlhfFeedback(module?: string, filters?: { agentId?: string; phase?: string; limit?: number }): Promise<RlhfFeedback[]> {
    let query = db.select().from(rlhfFeedback).orderBy(desc(rlhfFeedback.createdAt));
    const results = await query;
    let filtered = results;
    if (module) {
      filtered = filtered.filter(f => f.module === module);
    }
    if (filters?.agentId) {
      filtered = filtered.filter(f => f.agentId === filters.agentId);
    }
    if (filters?.phase) {
      filtered = filtered.filter(f => f.phase === filters.phase);
    }
    const limit = filters?.limit || 100;
    return filtered.slice(0, limit);
  }

  async createRlhfFeedback(data: InsertRlhfFeedback): Promise<RlhfFeedback> {
    const [result] = await db.insert(rlhfFeedback).values(data).returning();
    return result;
  }

  async getRlhfMetrics(): Promise<{ fwa: { total: number; accepted: number }; claims: { total: number; accepted: number } }> {
    const allFeedback = await db.select().from(rlhfFeedback);
    const fwaFeedback = allFeedback.filter(f => f.module === "fwa");
    const claimsFeedback = allFeedback.filter(f => f.module === "claims");
    return {
      fwa: {
        total: fwaFeedback.length,
        accepted: fwaFeedback.filter(f => f.wasAccepted).length
      },
      claims: {
        total: claimsFeedback.length,
        accepted: claimsFeedback.filter(f => f.wasAccepted).length
      }
    };
  }

  // Claim Documents (Phase 2)
  async getClaimDocuments(claimId?: string): Promise<ClaimDocument[]> {
    if (claimId) {
      return await db.select().from(claimDocuments).where(eq(claimDocuments.claimId, claimId)).orderBy(desc(claimDocuments.createdAt));
    }
    return await db.select().from(claimDocuments).orderBy(desc(claimDocuments.createdAt));
  }

  async getClaimDocument(id: string): Promise<ClaimDocument | undefined> {
    const [result] = await db.select().from(claimDocuments).where(eq(claimDocuments.id, id));
    return result;
  }

  async createClaimDocument(data: InsertClaimDocument): Promise<ClaimDocument> {
    const [result] = await db.insert(claimDocuments).values(data).returning();
    return result;
  }

  async updateClaimDocument(id: string, data: Partial<InsertClaimDocument>): Promise<ClaimDocument | undefined> {
    const [result] = await db.update(claimDocuments).set(data).where(eq(claimDocuments.id, id)).returning();
    return result;
  }

  // Weight Update Proposals (Phase 4)
  async getWeightUpdateProposals(status?: string): Promise<WeightUpdateProposal[]> {
    const results = await db.select().from(weightUpdateProposals).orderBy(desc(weightUpdateProposals.createdAt));
    if (status) {
      return results.filter(p => p.status === status);
    }
    return results;
  }

  async createWeightUpdateProposal(data: InsertWeightUpdateProposal): Promise<WeightUpdateProposal> {
    const [result] = await db.insert(weightUpdateProposals).values(data).returning();
    return result;
  }

  async updateWeightUpdateProposal(id: string, data: Partial<InsertWeightUpdateProposal>): Promise<WeightUpdateProposal | undefined> {
    const [result] = await db.update(weightUpdateProposals).set(data).where(eq(weightUpdateProposals.id, id)).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();

export async function seedKpiDefinitions(): Promise<void> {
  await db.delete(kpiDefinitions);
  
  const kpiDefs: InsertKpiDefinition[] = [
    // ============================================
    // FINANCIAL KPIs (Category Weight: 40%)
    // ============================================
    {
      name: "Cost Per Member (CPM)",
      code: "CPM",
      description: "Total claims cost divided by unique members served. Core efficiency metric for provider evaluation.",
      category: "financial",
      status: "active",
      numeratorLabel: "Total Claims Cost",
      numeratorFormula: "SUM(claims.approved_amount)",
      numeratorSource: "claims",
      denominatorLabel: "Unique Members",
      denominatorFormula: "COUNT(DISTINCT claims.member_id)",
      denominatorSource: "membership",
      inclusions: ["Finalized claims", "Paid amounts", "Member liability"],
      exclusions: ["Denied claims", "Voided claims", "Duplicates"],
      unit: "currency",
      decimalPlaces: 2,
      displayFormat: "SAR {value}",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "tier"],
      warningThreshold: "3000.00",
      criticalThreshold: "4000.00",
      thresholdDirection: "above",
      weight: "15.00",
      categoryWeight: "40.00",
      rationale: "Core efficiency metric indicating how much it costs to care for each member. Essential for identifying high-cost providers relative to peers.",
      industryStandard: "NCQA/HEDIS",
      calculationMethodology: "Sum of all approved claim amounts for a provider divided by count of unique members who received services from that provider during the measurement period.",
      targetValue: "2500.00",
      targetDirection: "lower",
      sortOrder: 1,
      createdBy: "system"
    },
    {
      name: "Claims Per Member",
      code: "CLAIMS_PER_MEMBER",
      description: "Average number of claims submitted per unique member. Volume indicator for utilization patterns.",
      category: "financial",
      status: "active",
      numeratorLabel: "Total Claims Count",
      numeratorFormula: "COUNT(claims.id)",
      numeratorSource: "claims",
      denominatorLabel: "Unique Members",
      denominatorFormula: "COUNT(DISTINCT claims.member_id)",
      denominatorSource: "membership",
      inclusions: ["All submitted claims"],
      exclusions: ["Voided claims", "Test claims"],
      unit: "number",
      decimalPlaces: 2,
      displayFormat: "{value} claims/member",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "tier"],
      warningThreshold: "8.00",
      criticalThreshold: "12.00",
      thresholdDirection: "above",
      weight: "10.00",
      categoryWeight: "40.00",
      rationale: "Volume indicator for utilization patterns. High claims per member may indicate over-utilization or fragmented care delivery.",
      industryStandard: "NCQA",
      calculationMethodology: "Total count of claims submitted by provider divided by unique member count receiving services.",
      targetValue: "5.00",
      targetDirection: "lower",
      sortOrder: 2,
      createdBy: "system"
    },
    {
      name: "Average Claim Amount",
      code: "AVG_CLAIM_AMOUNT",
      description: "Average cost per claim. Measures claim intensity and billing patterns.",
      category: "financial",
      status: "active",
      numeratorLabel: "Total Claims Cost",
      numeratorFormula: "SUM(claims.approved_amount)",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims Count",
      denominatorFormula: "COUNT(claims.id)",
      denominatorSource: "claims",
      inclusions: ["Finalized claims", "Approved amounts"],
      exclusions: ["Denied claims", "Zero-dollar claims"],
      unit: "currency",
      decimalPlaces: 2,
      displayFormat: "SAR {value}",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "service_type"],
      warningThreshold: "800.00",
      criticalThreshold: "1200.00",
      thresholdDirection: "above",
      weight: "10.00",
      categoryWeight: "40.00",
      rationale: "Measures claim intensity and billing patterns. Should align with peer average for similar service mix.",
      industryStandard: "HEDIS",
      calculationMethodology: "Sum of approved claim amounts divided by total claim count for the measurement period.",
      targetValue: "500.00",
      targetDirection: "lower",
      sortOrder: 3,
      createdBy: "system"
    },
    {
      name: "High-Cost Claim Ratio",
      code: "HIGH_COST_RATIO",
      description: "Percentage of claims exceeding SAR 50,000. Identifies outlier billing behavior.",
      category: "financial",
      status: "active",
      numeratorLabel: "High-Cost Claims (>50K)",
      numeratorFormula: "COUNT(claims.id) WHERE claims.approved_amount > 50000",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims",
      denominatorFormula: "COUNT(claims.id)",
      denominatorSource: "claims",
      inclusions: ["All finalized claims"],
      exclusions: ["Denied claims", "Pending claims"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "tier"],
      warningThreshold: "5.00",
      criticalThreshold: "10.00",
      thresholdDirection: "above",
      weight: "5.00",
      categoryWeight: "40.00",
      rationale: "Identifies outlier billing behavior and potential cost drivers. Excessive high-cost claims warrant review.",
      industryStandard: "CMS Cost Reports",
      calculationMethodology: "Count of claims with approved amount exceeding SAR 50,000 divided by total claim count, expressed as percentage.",
      targetValue: "3.00",
      targetDirection: "lower",
      sortOrder: 4,
      createdBy: "system"
    },
    
    // ============================================
    // MEDICAL/QUALITY KPIs (Category Weight: 35%)
    // ============================================
    {
      name: "Denial Rate",
      code: "DENIAL_RATE",
      description: "Percentage of claims denied. High denial rates indicate coding issues or inappropriate services.",
      category: "quality",
      status: "active",
      numeratorLabel: "Denied Claims",
      numeratorFormula: "COUNT(claims.id) WHERE claims.status = 'denied'",
      numeratorSource: "claims",
      denominatorLabel: "Total Adjudicated Claims",
      denominatorFormula: "COUNT(claims.id) WHERE claims.status IN ('approved', 'denied', 'partial')",
      denominatorSource: "claims",
      inclusions: ["All adjudicated claims"],
      exclusions: ["Pending claims", "Voided claims"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "network_status"],
      warningThreshold: "10.00",
      criticalThreshold: "20.00",
      thresholdDirection: "above",
      weight: "10.00",
      categoryWeight: "35.00",
      rationale: "High denial rates indicate coding issues, inappropriate services, or documentation problems requiring corrective action.",
      industryStandard: "CMS Quality Measures",
      calculationMethodology: "Count of denied claims divided by total adjudicated claims (approved + denied + partial), expressed as percentage.",
      targetValue: "8.00",
      targetDirection: "lower",
      sortOrder: 5,
      createdBy: "system"
    },
    {
      name: "First-Pass Approval Rate",
      code: "FIRST_PASS_RATE",
      description: "Percentage of claims approved without additional review. Indicates clean claim submission quality.",
      category: "quality",
      status: "active",
      numeratorLabel: "First-Pass Approved Claims",
      numeratorFormula: "COUNT(claims.id) WHERE claims.review_count = 0 AND claims.status = 'approved'",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims",
      denominatorFormula: "COUNT(claims.id)",
      denominatorSource: "claims",
      inclusions: ["All submitted claims"],
      exclusions: ["Test claims", "Voided claims"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty"],
      warningThreshold: "75.00",
      criticalThreshold: "60.00",
      thresholdDirection: "below",
      weight: "8.00",
      categoryWeight: "35.00",
      rationale: "Indicates clean claim submission quality. Higher rates mean fewer resources spent on rework and faster processing.",
      industryStandard: "AHIP Clean Claims Standards",
      calculationMethodology: "Count of claims approved on first submission without additional documentation requests or reviews, divided by total claims.",
      targetValue: "85.00",
      targetDirection: "higher",
      sortOrder: 6,
      createdBy: "system"
    },
    {
      name: "Average Length of Stay (ALOS)",
      code: "ALOS",
      description: "Average inpatient days per admission. Measures efficiency of inpatient care.",
      category: "quality",
      status: "active",
      numeratorLabel: "Total Inpatient Days",
      numeratorFormula: "SUM(claims.length_of_stay)",
      numeratorSource: "claims",
      denominatorLabel: "Total Inpatient Admissions",
      denominatorFormula: "COUNT(claims.id) WHERE claims.encounter_type = 'inpatient'",
      denominatorSource: "claims",
      inclusions: ["Inpatient claims", "Observation stays > 24 hours"],
      exclusions: ["Outpatient claims", "ER visits", "Day surgeries"],
      unit: "days",
      decimalPlaces: 1,
      displayFormat: "{value} days",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "case_mix_index"],
      warningThreshold: "5.00",
      criticalThreshold: "7.00",
      thresholdDirection: "above",
      weight: "7.00",
      categoryWeight: "35.00",
      rationale: "Efficiency of inpatient care. Should align with DRG expectations for case mix. Extended stays increase costs.",
      industryStandard: "CMS/HEDIS",
      calculationMethodology: "Sum of all inpatient days for provider divided by count of inpatient admissions during measurement period.",
      targetValue: "4.00",
      targetDirection: "lower",
      sortOrder: 7,
      createdBy: "system"
    },
    {
      name: "30-Day Readmission Rate",
      code: "READMISSION_RATE",
      description: "Percentage of patients readmitted within 30 days. Quality indicator for care effectiveness.",
      category: "quality",
      status: "active",
      numeratorLabel: "30-Day Readmissions",
      numeratorFormula: "COUNT(claims.id) WHERE claims.is_readmission = true AND claims.days_since_discharge <= 30",
      numeratorSource: "claims",
      denominatorLabel: "Total Discharges",
      denominatorFormula: "COUNT(claims.id) WHERE claims.encounter_type = 'inpatient' AND claims.discharge_date IS NOT NULL",
      denominatorSource: "claims",
      inclusions: ["All inpatient discharges", "Unplanned readmissions"],
      exclusions: ["Planned readmissions", "Transfers", "Deaths"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "case_mix_index"],
      warningThreshold: "15.00",
      criticalThreshold: "20.00",
      thresholdDirection: "above",
      weight: "5.00",
      categoryWeight: "35.00",
      rationale: "Quality indicator for care effectiveness. High readmissions suggest premature discharge or inadequate care.",
      industryStandard: "CMS Hospital Readmissions Reduction Program",
      calculationMethodology: "Count of unplanned readmissions within 30 days of discharge divided by total discharges, expressed as percentage.",
      targetValue: "12.00",
      targetDirection: "lower",
      sortOrder: 8,
      createdBy: "system"
    },
    {
      name: "ICU Utilization Rate",
      code: "ICU_UTILIZATION",
      description: "Percentage of inpatient claims with ICU services. Measures appropriate ICU usage.",
      category: "quality",
      status: "active",
      numeratorLabel: "Claims with ICU Services",
      numeratorFormula: "COUNT(claims.id) WHERE claims.has_icu = true",
      numeratorSource: "claims",
      denominatorLabel: "Total Inpatient Claims",
      denominatorFormula: "COUNT(claims.id) WHERE claims.encounter_type = 'inpatient'",
      denominatorSource: "claims",
      inclusions: ["All inpatient claims"],
      exclusions: ["Outpatient claims", "ER-only visits"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty", "tier"],
      warningThreshold: "25.00",
      criticalThreshold: "35.00",
      thresholdDirection: "above",
      weight: "5.00",
      categoryWeight: "35.00",
      rationale: "Appropriate ICU usage indicates good clinical governance. Over-utilization may indicate upcoding or defensive medicine.",
      industryStandard: "Leapfrog ICU Standards",
      calculationMethodology: "Count of inpatient claims with ICU flag divided by total inpatient claims, expressed as percentage.",
      targetValue: "18.00",
      targetDirection: "lower",
      sortOrder: 9,
      createdBy: "system"
    },
    
    // ============================================
    // OPERATIONAL/FWA KPIs (Category Weight: 25%)
    // ============================================
    {
      name: "Upcoding Index",
      code: "UPCODING_INDEX",
      description: "Ratio of high-severity codes to expected distribution. Detects systematic billing inflation.",
      category: "fwa",
      status: "active",
      numeratorLabel: "High-Severity Code Count",
      numeratorFormula: "COUNT(claims.id) WHERE claims.drg_severity >= 3",
      numeratorSource: "claims",
      denominatorLabel: "Expected High-Severity Count",
      denominatorFormula: "SUM(peer_expected_high_severity_rate * total_claims)",
      denominatorSource: "claims",
      inclusions: ["All coded claims", "DRG-weighted claims"],
      exclusions: ["Uncoded claims", "Bundled services"],
      unit: "ratio",
      decimalPlaces: 2,
      displayFormat: "{value}x",
      enableBenchmarking: true,
      peerGroupDimensions: ["specialty", "case_mix_index"],
      warningThreshold: "1.20",
      criticalThreshold: "1.50",
      thresholdDirection: "above",
      weight: "5.00",
      categoryWeight: "25.00",
      rationale: "Detects systematic billing inflation through severity coding patterns. Values above 1.2 warrant investigation.",
      industryStandard: "OIG Audit Guidelines",
      calculationMethodology: "Ratio of actual high-severity codes (DRG 3+) to statistically expected count based on peer specialty norms.",
      targetValue: "1.00",
      targetDirection: "lower",
      sortOrder: 10,
      createdBy: "system"
    },
    {
      name: "Duplicate Claim Rate",
      code: "DUPLICATE_RATE",
      description: "Percentage of duplicate claims submitted. Billing quality and potential fraud indicator.",
      category: "fwa",
      status: "active",
      numeratorLabel: "Duplicate Claims",
      numeratorFormula: "COUNT(claims.id) WHERE claims.is_duplicate = true",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims",
      denominatorFormula: "COUNT(claims.id)",
      denominatorSource: "claims",
      inclusions: ["All submitted claims"],
      exclusions: ["Corrected resubmissions", "Voided original claims"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty"],
      warningThreshold: "2.00",
      criticalThreshold: "5.00",
      thresholdDirection: "above",
      weight: "5.00",
      categoryWeight: "25.00",
      rationale: "Billing quality and potential fraud indicator. Excessive duplicates may indicate systemic billing issues.",
      industryStandard: "NHCAA Best Practices",
      calculationMethodology: "Count of claims flagged as duplicates (same member, provider, service date, codes) divided by total claims.",
      targetValue: "1.00",
      targetDirection: "lower",
      sortOrder: 11,
      createdBy: "system"
    },
    {
      name: "Same-Day Service Rate",
      code: "SAME_DAY_RATE",
      description: "Percentage of claims with multiple same-day services. Unbundling detection metric.",
      category: "fwa",
      status: "active",
      numeratorLabel: "Same-Day Multi-Service Claims",
      numeratorFormula: "COUNT(DISTINCT claims.member_id, claims.service_date) WHERE service_count > 3",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims",
      denominatorFormula: "COUNT(claims.id)",
      denominatorSource: "claims",
      inclusions: ["All service claims"],
      exclusions: ["Bundled procedure claims", "Lab panels"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["specialty", "service_type"],
      warningThreshold: "15.00",
      criticalThreshold: "25.00",
      thresholdDirection: "above",
      weight: "3.00",
      categoryWeight: "25.00",
      rationale: "Unbundling detection metric. High rates may indicate improper separation of bundled services.",
      industryStandard: "CCI Bundling Rules",
      calculationMethodology: "Percentage of claim encounters with more than 3 separate service line items on same date for same member.",
      targetValue: "10.00",
      targetDirection: "lower",
      sortOrder: 12,
      createdBy: "system"
    },
    {
      name: "Settlement Rate",
      code: "SETTLEMENT_RATE",
      description: "Percentage of negotiations successfully settled. Measures reconciliation effectiveness.",
      category: "reconciliation",
      status: "active",
      numeratorLabel: "Settled Negotiations",
      numeratorFormula: "COUNT(sessions.id) WHERE sessions.status = 'settled'",
      numeratorSource: "sessions",
      denominatorLabel: "Total Negotiations",
      denominatorFormula: "COUNT(sessions.id) WHERE sessions.status IN ('settled', 'failed', 'pending')",
      denominatorSource: "sessions",
      inclusions: ["All negotiation sessions"],
      exclusions: ["Cancelled sessions", "Test sessions"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "tier"],
      warningThreshold: "70.00",
      criticalThreshold: "50.00",
      thresholdDirection: "below",
      weight: "4.00",
      categoryWeight: "25.00",
      rationale: "Reconciliation effectiveness indicator. Higher rates mean fewer disputes escalate to arbitration.",
      industryStandard: "ADR Best Practices",
      calculationMethodology: "Count of successfully settled negotiation sessions divided by all completed sessions.",
      targetValue: "80.00",
      targetDirection: "higher",
      sortOrder: 13,
      createdBy: "system"
    },
    {
      name: "Recovery Yield",
      code: "RECOVERY_YIELD",
      description: "Percentage of identified FWA amounts successfully recovered. FWA remediation effectiveness.",
      category: "fwa",
      status: "active",
      numeratorLabel: "Recovered Amount",
      numeratorFormula: "SUM(settlements.recovered_amount)",
      numeratorSource: "settlements",
      denominatorLabel: "Total FWA Identified",
      denominatorFormula: "SUM(fwa_findings.identified_amount)",
      denominatorSource: "fwa_findings",
      inclusions: ["Confirmed FWA findings", "Settled amounts"],
      exclusions: ["Pending investigations", "Overturned findings"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region"],
      warningThreshold: "50.00",
      criticalThreshold: "30.00",
      thresholdDirection: "below",
      weight: "4.00",
      categoryWeight: "25.00",
      rationale: "FWA remediation effectiveness. Higher yield indicates effective recovery processes.",
      industryStandard: "NHCAA Recovery Standards",
      calculationMethodology: "Total recovered amounts from FWA findings divided by total identified FWA exposure.",
      targetValue: "60.00",
      targetDirection: "higher",
      sortOrder: 14,
      createdBy: "system"
    },
    {
      name: "Days to Settlement",
      code: "DAYS_TO_SETTLEMENT",
      description: "Average days from session start to final settlement. Operational efficiency metric.",
      category: "operational",
      status: "active",
      numeratorLabel: "Total Days to Settlement",
      numeratorFormula: "SUM(DATEDIFF(sessions.settled_date, sessions.start_date))",
      numeratorSource: "sessions",
      denominatorLabel: "Settled Sessions Count",
      denominatorFormula: "COUNT(sessions.id) WHERE sessions.status = 'settled'",
      denominatorSource: "sessions",
      inclusions: ["Settled sessions"],
      exclusions: ["Pending sessions", "Cancelled sessions"],
      unit: "days",
      decimalPlaces: 0,
      displayFormat: "{value} days",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "complexity_tier"],
      warningThreshold: "45.00",
      criticalThreshold: "60.00",
      thresholdDirection: "above",
      weight: "4.00",
      categoryWeight: "25.00",
      rationale: "Operational efficiency metric. Faster settlements reduce administrative burden and improve cash flow.",
      industryStandard: "HFMA Best Practices",
      calculationMethodology: "Average number of calendar days from negotiation session start date to final settlement date.",
      targetValue: "30.00",
      targetDirection: "lower",
      sortOrder: 15,
      createdBy: "system"
    },
    
    // ============================================
    // ADDITIONAL KPIs
    // ============================================
    {
      name: "Contract Compliance Rate",
      code: "CONTRACT_COMPLIANCE",
      description: "Percentage of claims billed within contracted rates. Measures adherence to negotiated terms.",
      category: "financial",
      status: "active",
      numeratorLabel: "Compliant Claims",
      numeratorFormula: "COUNT(claims.id) WHERE claims.billed_amount <= claims.contracted_rate",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims with Contract",
      denominatorFormula: "COUNT(claims.id) WHERE claims.contracted_rate IS NOT NULL",
      denominatorSource: "contracts",
      inclusions: ["Claims with active contracts"],
      exclusions: ["Out-of-network claims", "Emergency services"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "tier"],
      warningThreshold: "90.00",
      criticalThreshold: "80.00",
      thresholdDirection: "below",
      weight: "5.00",
      categoryWeight: "40.00",
      rationale: "Measures adherence to negotiated contract terms. Non-compliance increases dispute risk.",
      industryStandard: "Contract Management Best Practices",
      calculationMethodology: "Percentage of claims where billed amount equals or is less than contracted rate for the service.",
      targetValue: "95.00",
      targetDirection: "higher",
      sortOrder: 16,
      createdBy: "system"
    },
    {
      name: "Evidence Pack Utilization",
      code: "EVIDENCE_PACK_UTIL",
      description: "Percentage of sessions with complete evidence packs. Documentation quality indicator.",
      category: "reconciliation",
      status: "active",
      numeratorLabel: "Sessions with Complete Evidence",
      numeratorFormula: "COUNT(sessions.id) WHERE sessions.evidence_pack_complete = true",
      numeratorSource: "sessions",
      denominatorLabel: "Total Sessions",
      denominatorFormula: "COUNT(sessions.id)",
      denominatorSource: "sessions",
      inclusions: ["All negotiation sessions"],
      exclusions: ["Cancelled sessions"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region"],
      warningThreshold: "80.00",
      criticalThreshold: "60.00",
      thresholdDirection: "below",
      weight: "3.00",
      categoryWeight: "25.00",
      rationale: "Documentation quality indicator. Complete evidence packs improve negotiation outcomes.",
      industryStandard: "Legal Discovery Standards",
      calculationMethodology: "Percentage of reconciliation sessions with all required evidence documentation attached.",
      targetValue: "90.00",
      targetDirection: "higher",
      sortOrder: 17,
      createdBy: "system"
    },
    {
      name: "Pre-Authorization Approval Rate",
      code: "PREAUTH_APPROVAL",
      description: "Percentage of pre-authorization requests approved. Measures clinical appropriateness.",
      category: "utilization",
      status: "active",
      numeratorLabel: "Approved Pre-Authorizations",
      numeratorFormula: "COUNT(preauth.id) WHERE preauth.status = 'approved'",
      numeratorSource: "adjudication",
      denominatorLabel: "Total Pre-Authorization Requests",
      denominatorFormula: "COUNT(preauth.id)",
      denominatorSource: "adjudication",
      inclusions: ["All pre-auth requests"],
      exclusions: ["Withdrawn requests", "Duplicate requests"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["specialty", "service_type"],
      warningThreshold: "70.00",
      criticalThreshold: "50.00",
      thresholdDirection: "below",
      weight: "5.00",
      categoryWeight: "35.00",
      rationale: "Measures clinical appropriateness of requested services. Low rates may indicate overutilization attempts.",
      industryStandard: "URAC Pre-Authorization Standards",
      calculationMethodology: "Percentage of pre-authorization requests that receive full approval.",
      targetValue: "85.00",
      targetDirection: "higher",
      sortOrder: 18,
      createdBy: "system"
    },
    {
      name: "Claim Processing Time",
      code: "PROCESSING_TIME",
      description: "Average days from claim submission to final adjudication. Operational efficiency metric.",
      category: "operational",
      status: "active",
      numeratorLabel: "Total Processing Days",
      numeratorFormula: "SUM(DATEDIFF(claims.adjudicated_date, claims.received_date))",
      numeratorSource: "claims",
      denominatorLabel: "Adjudicated Claims",
      denominatorFormula: "COUNT(claims.id) WHERE claims.adjudicated_date IS NOT NULL",
      denominatorSource: "claims",
      inclusions: ["All adjudicated claims"],
      exclusions: ["Pending claims", "Voided claims"],
      unit: "days",
      decimalPlaces: 1,
      displayFormat: "{value} days",
      enableBenchmarking: true,
      peerGroupDimensions: ["claim_type"],
      warningThreshold: "14.00",
      criticalThreshold: "21.00",
      thresholdDirection: "above",
      weight: "4.00",
      categoryWeight: "25.00",
      rationale: "Operational efficiency metric. Faster processing improves provider satisfaction and cash flow.",
      industryStandard: "State Prompt Pay Laws",
      calculationMethodology: "Average calendar days from claim receipt to final adjudication decision.",
      targetValue: "10.00",
      targetDirection: "lower",
      sortOrder: 19,
      createdBy: "system"
    },
    {
      name: "Provider Response Time",
      code: "PROVIDER_RESPONSE_TIME",
      description: "Average days for provider to respond to information requests. Communication efficiency.",
      category: "operational",
      status: "active",
      numeratorLabel: "Total Response Days",
      numeratorFormula: "SUM(DATEDIFF(communications.response_date, communications.request_date))",
      numeratorSource: "providers",
      denominatorLabel: "Responded Requests",
      denominatorFormula: "COUNT(communications.id) WHERE communications.response_date IS NOT NULL",
      denominatorSource: "providers",
      inclusions: ["All information requests"],
      exclusions: ["Cancelled requests", "Auto-closed requests"],
      unit: "days",
      decimalPlaces: 1,
      displayFormat: "{value} days",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "tier"],
      warningThreshold: "7.00",
      criticalThreshold: "14.00",
      thresholdDirection: "above",
      weight: "3.00",
      categoryWeight: "25.00",
      rationale: "Communication efficiency metric. Faster responses enable quicker claim resolution.",
      industryStandard: "Provider Relations Best Practices",
      calculationMethodology: "Average calendar days from information request sent to provider response received.",
      targetValue: "3.00",
      targetDirection: "lower",
      sortOrder: 20,
      createdBy: "system"
    },
    {
      name: "Case Mix Index",
      code: "CASE_MIX_INDEX",
      description: "Average DRG weight of inpatient admissions. Measures patient acuity and complexity.",
      category: "medical",
      status: "active",
      numeratorLabel: "Total DRG Weight",
      numeratorFormula: "SUM(claims.drg_weight)",
      numeratorSource: "claims",
      denominatorLabel: "Total Inpatient Admissions",
      denominatorFormula: "COUNT(claims.id) WHERE claims.encounter_type = 'inpatient'",
      denominatorSource: "claims",
      inclusions: ["All inpatient claims with DRG"],
      exclusions: ["Outpatient claims", "Non-DRG claims"],
      unit: "ratio",
      decimalPlaces: 3,
      displayFormat: "{value}",
      enableBenchmarking: true,
      peerGroupDimensions: ["specialty", "facility_type"],
      warningThreshold: "1.80",
      criticalThreshold: "2.20",
      thresholdDirection: "above",
      weight: "4.00",
      categoryWeight: "35.00",
      rationale: "Measures patient acuity and case complexity. Used for risk adjustment and peer comparison.",
      industryStandard: "CMS MS-DRG",
      calculationMethodology: "Sum of DRG relative weights divided by total inpatient discharges.",
      targetValue: "1.50",
      targetDirection: "lower",
      sortOrder: 21,
      createdBy: "system"
    },
    {
      name: "Outpatient Surgery Rate",
      code: "OUTPATIENT_SURGERY_RATE",
      description: "Percentage of surgeries performed on outpatient basis. Cost efficiency indicator.",
      category: "utilization",
      status: "active",
      numeratorLabel: "Outpatient Surgeries",
      numeratorFormula: "COUNT(claims.id) WHERE claims.has_surgery = true AND claims.encounter_type = 'outpatient'",
      numeratorSource: "claims",
      denominatorLabel: "Total Surgeries",
      denominatorFormula: "COUNT(claims.id) WHERE claims.has_surgery = true",
      denominatorSource: "claims",
      inclusions: ["All surgical claims"],
      exclusions: ["Non-surgical claims"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["specialty", "region"],
      warningThreshold: "50.00",
      criticalThreshold: "30.00",
      thresholdDirection: "below",
      weight: "4.00",
      categoryWeight: "35.00",
      rationale: "Cost efficiency indicator. Higher outpatient surgery rates generally indicate appropriate care setting selection.",
      industryStandard: "Ambulatory Surgery Center Standards",
      calculationMethodology: "Percentage of surgical procedures performed in outpatient setting versus inpatient.",
      targetValue: "65.00",
      targetDirection: "higher",
      sortOrder: 22,
      createdBy: "system"
    },
    {
      name: "Emergency Room Utilization",
      code: "ER_UTILIZATION",
      description: "ER visits per 1,000 members. Measures appropriate emergency care utilization.",
      category: "utilization",
      status: "active",
      numeratorLabel: "ER Visits",
      numeratorFormula: "COUNT(claims.id) WHERE claims.encounter_type = 'emergency'",
      numeratorSource: "claims",
      denominatorLabel: "Members (per 1,000)",
      denominatorFormula: "COUNT(DISTINCT claims.member_id) / 1000",
      denominatorSource: "membership",
      inclusions: ["All ER claims"],
      exclusions: ["Observation admits", "Direct admits"],
      unit: "ratio",
      decimalPlaces: 1,
      displayFormat: "{value} per 1K",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "network_status"],
      warningThreshold: "250.00",
      criticalThreshold: "350.00",
      thresholdDirection: "above",
      weight: "4.00",
      categoryWeight: "35.00",
      rationale: "Measures appropriate emergency care utilization. High ER rates may indicate access issues or overuse.",
      industryStandard: "HEDIS Emergency Department Utilization",
      calculationMethodology: "Count of ER visits per 1,000 attributed members during measurement period.",
      targetValue: "180.00",
      targetDirection: "lower",
      sortOrder: 23,
      createdBy: "system"
    },
    {
      name: "Pharmacy Cost Ratio",
      code: "PHARMACY_COST_RATIO",
      description: "Pharmacy costs as percentage of total claims. Measures pharmaceutical spending patterns.",
      category: "financial",
      status: "active",
      numeratorLabel: "Pharmacy Claims Cost",
      numeratorFormula: "SUM(claims.approved_amount) WHERE claims.claim_type = 'pharmacy'",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims Cost",
      denominatorFormula: "SUM(claims.approved_amount)",
      denominatorSource: "claims",
      inclusions: ["All pharmacy claims", "All medical claims"],
      exclusions: ["Denied claims"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty"],
      warningThreshold: "25.00",
      criticalThreshold: "35.00",
      thresholdDirection: "above",
      weight: "4.00",
      categoryWeight: "40.00",
      rationale: "Measures pharmaceutical spending patterns relative to total costs. High ratios warrant formulary review.",
      industryStandard: "PBM Industry Standards",
      calculationMethodology: "Sum of pharmacy claim costs divided by total claim costs, expressed as percentage.",
      targetValue: "20.00",
      targetDirection: "lower",
      sortOrder: 24,
      createdBy: "system"
    },
    {
      name: "Network Leakage Rate",
      code: "NETWORK_LEAKAGE",
      description: "Percentage of claims going to out-of-network providers. Network management indicator.",
      category: "financial",
      status: "active",
      numeratorLabel: "Out-of-Network Claims Cost",
      numeratorFormula: "SUM(claims.approved_amount) WHERE claims.network_status = 'out_of_network'",
      numeratorSource: "claims",
      denominatorLabel: "Total Claims Cost",
      denominatorFormula: "SUM(claims.approved_amount)",
      denominatorSource: "claims",
      inclusions: ["All claims"],
      exclusions: ["Emergency claims", "Prior-authorized OON claims"],
      unit: "percentage",
      decimalPlaces: 2,
      displayFormat: "{value}%",
      enableBenchmarking: true,
      peerGroupDimensions: ["region", "specialty"],
      warningThreshold: "15.00",
      criticalThreshold: "25.00",
      thresholdDirection: "above",
      weight: "4.00",
      categoryWeight: "40.00",
      rationale: "Network management indicator. High leakage increases costs and reduces negotiation leverage.",
      industryStandard: "Network Adequacy Standards",
      calculationMethodology: "Percentage of total claim dollars going to out-of-network providers.",
      targetValue: "10.00",
      targetDirection: "lower",
      sortOrder: 25,
      createdBy: "system"
    }
  ];

  for (const kpi of kpiDefs) {
    await db.insert(kpiDefinitions).values(kpi);
  }
  
  console.log(`Seeded ${kpiDefs.length} KPI definitions successfully.`);
}
