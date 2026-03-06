# AiAudit — Business Requirements Document (BRD)

## Document Control
- Product Name: `AiAudit`
- Version: `v1.0`
- Date: `2026-03-05`
- Prepared From: Current `CHI-Platform` codebase baseline (client, server routes/services, schema, and docs)

## 1. Executive Summary
AiAudit is an AI-powered healthcare audit and fraud, waste, and abuse (FWA) platform for regulatory and payer oversight. It combines:
- Multi-method claim risk detection
- Knowledge-driven investigation (RAG over regulatory and clinical documents)
- Case management and enforcement workflows
- Persona portals for regulator, business, provider, and member visibility
- Human-in-the-loop adjudication and feedback learning (RLHF)

The business outcome is faster detection, better compliance, improved transparency, and measurable financial recovery with audit-grade traceability.

## 2. Business Context and Problem Statement
Healthcare oversight teams currently face fragmented workflows:
- Claims, policy, provider, and member data are spread across disconnected tools.
- Audit teams cannot consistently combine regulatory policy context with live operational data.
- Detection logic is often static and weakly explainable.
- Human overrides are not systematically captured for continuous model improvement.
- Enforcement and communication workflows are hard to operationalize end-to-end.

AiAudit addresses this by centralizing detection, knowledge, adjudication, and enforcement into one governed platform.

## 3. Strategic Objectives
1. Reduce time-to-detect high-risk claims/entities.
2. Improve detection precision through multi-method scoring and human feedback loops.
3. Increase regulatory compliance through policy-grounded decisions and audit trails.
4. Improve recovery and prevention impact through case-to-enforcement workflows.
5. Provide cross-stakeholder transparency through role-based dashboards and portals.

## 4. Success Metrics (Business KPIs)
- Detection Coverage: % of ingested claims scored by detection engine.
- Detection Yield: % of analyzed claims flagged as actionable risk.
- Precision Proxy: % of AI recommendations accepted by human reviewers.
- Case Cycle Time: Time from flagging to case resolution/escalation.
- Financial Impact: Prevented loss + recovered amount.
- Compliance Outcome: Reduction in repeated policy violations.
- Knowledge Effectiveness: % of assistant responses with valid grounded sources.
- Operational Throughput: Files/claims processed per day and queue completion rates.

## 5. Stakeholders and User Groups
- Regulatory Leadership (CHI-equivalent): policy oversight, enforcement governance, national KPIs.
- Audit & FWA Unit: detection operations, investigation, case handling, escalation.
- Claims Governance / Adjudication: claim review, override decisions, decision traceability.
- Provider Oversight Teams: compliance scorecards, rejection analysis, DRG readiness.
- Business Oversight Teams: insurer/employer compliance and market intelligence.
- Member Protection Teams: complaints, fraud intake, beneficiary transparency.
- Platform Admin / Data Ops: configuration, ingestion, quality, and system operations.

## 6. Solution Scope
### In Scope (Current Codebase-Aligned)
- FWA command center and detection workflows
- Knowledge Hub with document upload, processing, vectorization, and search
- Universal AI assistant (document/data/mixed query routing)
- Pre-auth/claims governance workflows and analytics
- Enforcement, circulars, audit sessions, and investigation notes
- Intelligence, Business, and Members pillar portals
- Data ingestion (Excel/CSV/ETL), pipeline orchestration, and seeded demo realism
- RBAC, session auth, CSRF protection, and audit logging

### Out of Scope (for this BRD baseline)
- Billing/payment settlement execution in external core systems
- Real-time direct integration with every payer/provider core platform
- Automated sanctions execution without human approval
- Replacement of statutory legal/regulatory authority processes

## 7. Business Requirements

### 7.1 Platform and Governance
- `BR-001`: The platform shall provide a unified workspace spanning FWA, Intelligence, Business, Members, and Pre-Auth modules.
- `BR-002`: The platform shall support authenticated user sessions with role-based access (`admin`, `claims_reviewer`, `fwa_analyst`, `provider_manager`, `auditor`, `viewer`).
- `BR-003`: The platform shall record audit events for sensitive access/actions (who, what, when, resource, request metadata).
- `BR-004`: The platform shall support CSRF protection and secure session handling for protected operations.
- `BR-005`: Product branding shall be standardized to `AiAudit` across UI, API docs, exports, and stakeholder materials.

### 7.2 Claims and Data Foundation
- `BR-010`: The solution shall ingest claims via Excel/CSV and API-driven workflows.
- `BR-011`: The solution shall maintain normalized master data entities (policies, members, providers, practitioners, claims, service lines).
- `BR-012`: The solution shall store claim lifecycle and pipeline events to support operational traceability.
- `BR-013`: The solution shall support bulk ETL ingestion for claims/providers/doctors/patients and provide progress/status visibility.

### 7.3 Detection and Investigation
- `BR-020`: The platform shall score claims using multiple detection methods (rule, statistical, unsupervised, RAG/LLM, semantic validation).
- `BR-021`: The platform shall compute and persist composite risk scores and method-level explainability artifacts.
- `BR-022`: Analysts shall be able to configure detection thresholds, weights, and method enablement without code changes.
- `BR-023`: The solution shall support provider, doctor, and patient entity-level risk profiling and timelines.
- `BR-024`: The platform shall support case progression through analysis, categorization, and action phases with status tracking.
- `BR-025`: The platform shall support creation and management of findings, categories, and action plans per case.
- `BR-026`: The platform shall support detection run orchestration (single, batch, full scan, entity focused) with progress metrics.

### 7.4 Knowledge and AI Assistant
- `BR-030`: Users shall upload single or batch knowledge documents with metadata (category, title, source authority, description).
- `BR-031`: Uploaded documents shall be processed asynchronously (text extraction, chunking, embeddings) with queue tracking and retries.
- `BR-032`: Knowledge retrieval shall support semantic search across indexed chunks with category-aware filtering.
- `BR-033`: The assistant shall classify intents (`document`, `data`, `mixed`, `general`) and route to proper processing paths.
- `BR-034`: The assistant shall support grounded responses with source references and conversation history context.
- `BR-035`: The platform shall support document lifecycle operations (delete, reprocess, retry failed uploads).
- `BR-036`: Batch upload status shall stream in near real-time for operational monitoring.

### 7.5 Claims Governance and Human-in-the-Loop Learning
- `BR-040`: The solution shall provide claims governance dashboards (pipeline counts, pending review, auto-approvals, flagged claims).
- `BR-041`: The platform shall support pre-auth analysis with signals, decisions, recommendation candidates, and hard-stop indicators.
- `BR-042`: Human adjudicators shall capture final actions and override reasons per claim/case.
- `BR-043`: RLHF feedback shall be persisted and reused to improve recommendation quality.
- `BR-044`: The system shall generate and manage weight update proposals based on accepted/overridden recommendation patterns.

### 7.6 Enforcement and Regulatory Operations
- `BR-050`: The platform shall manage enforcement cases with workflow status and dossier context.
- `BR-051`: The platform shall manage regulatory circulars and communication actions.
- `BR-052`: The platform shall support audit sessions, findings, and checklist workflows.
- `BR-053`: The platform shall allow investigation notes with ownership, status transitions, and links to enforcement artifacts.
- `BR-054`: The platform shall support export/report outputs for high-risk entities and investigation summaries.

### 7.7 Stakeholder Portals
- `BR-060`: Intelligence portal shall provide provider oversight (scorecards, compliance, DRG readiness, rejection and documentation insights).
- `BR-061`: Business portal shall provide employer/insurer and market intelligence (compliance, concentration, cost containment).
- `BR-062`: Members portal shall provide complaints tracking, fraud reporting, coverage lookup, and provider quality transparency.
- `BR-063`: Dashboards shall expose actionable metrics and drill-down navigation rather than static summaries only.

## 8. Non-Functional Requirements
- `NFR-001` Availability: Platform should be available during business-critical oversight hours with production-grade monitoring.
- `NFR-002` Scalability: Knowledge ingestion must support at least 50 files per batch and asynchronous processing at worker concurrency.
- `NFR-003` Performance: Core dashboard and search APIs should respond within acceptable analyst workflow latency (target p95 < 2s for reads).
- `NFR-004` Explainability: Detection outcomes must retain method-level evidence and rationale for auditability.
- `NFR-005` Security: Password hashing, session controls, and CSRF protection are mandatory for protected operations.
- `NFR-006` Auditability: Material access and decisions must be logged with traceable metadata.
- `NFR-007` Data Integrity: Referential links between claims, entities, and actions must be preserved.
- `NFR-008` Resilience: Background processing must support retry with backoff and clear failure visibility.

## 9. Data and Integration Requirements
- Primary data store: PostgreSQL with pgvector for semantic search.
- AI services: LLM for chat/routing/explanations; embeddings for retrieval; vision/OCR for image-text extraction.
- Ingestion channels: file upload (Excel/CSV/docs), ETL APIs, pipeline-triggered processing.
- Output channels: dashboard APIs, SSE streams, report generation, export endpoints.
- Integration guardrails: read-only SQL guardrails for AI-driven data querying when using custom query execution.

## 10. Assumptions and Constraints
- Assumes required environment variables and model/database access are available in deployment environments.
- Assumes queue migrations and vector extensions are installed before production rollout.
- Current baseline includes demo-oriented open API access in several modules; production hardening is required before go-live.
- Existing naming in some UI elements still references legacy labels (Daman/TachyHealth); rebranding to AiAudit is required.

## 11. Risks and Mitigations
- `R-001` Data quality inconsistency across feeds
  - Mitigation: schema validation, ETL checks, and data quality dashboards.
- `R-002` False positives causing reviewer fatigue
  - Mitigation: threshold tuning, RLHF loop, precision KPI tracking.
- `R-003` Over-reliance on LLM outputs
  - Mitigation: source-grounded responses, explicit confidence, human approval checkpoints.
- `R-004` Security/compliance exposure
  - Mitigation: enforce auth on non-public endpoints, audit log review, secrets and key management.
- `R-005` Operational queue backlog
  - Mitigation: worker scaling, retry policies, proactive queue monitoring.

## 12. Phased Delivery Recommendation
1. Foundation Hardening
   - Auth boundary tightening, baseline observability, data quality controls.
2. Detection and Knowledge Excellence
   - Threshold calibration, rule governance, citation quality, document operations maturity.
3. Enforcement and Workflow Optimization
   - Standardize case-to-enforcement process and turnaround SLAs.
4. Scale and Outcome Optimization
   - Cross-pillar KPI governance, executive scorecards, feedback-driven model tuning.

## 13. Release Plan (Milestones, Dates, Owners)

| Milestone | Target Date | Primary Owner | Supporting Owners | Exit Criteria |
|---|---|---|---|---|
| M0: Program kickoff and scope lock | March 12, 2026 | Product Owner | Engineering Lead, Compliance Lead | Scope baseline, KPI targets, and RACI approved |
| M1: Foundation hardening complete | April 9, 2026 | Platform Engineering Lead | Security Lead, DevOps Lead | Auth/CSRF/audit controls validated; environment readiness checklist signed off |
| M2: Detection + Knowledge beta | May 14, 2026 | AI/ML Lead | Data Engineering Lead, FWA Operations Lead | Multi-method detection, knowledge queue, and assistant grounding validated in staging |
| M3: Workflow and enforcement UAT sign-off | June 11, 2026 | QA/UAT Lead | Enforcement Operations Lead, Claims Governance Lead | UAT passed for case flow, adjudication, RLHF capture, and enforcement workflows |
| M4: Production Wave 1 (FWA + Knowledge Hub) | July 9, 2026 | Release Manager | SRE Lead, Product Owner | Go-live checklist passed, rollback plan verified, stakeholder sign-off completed |
| M5: Production Wave 2 (Intelligence, Business, Members portals) | August 13, 2026 | Program Manager | Pillar Product Leads, Data Ops Lead | Cross-pillar dashboards stable, KPI reporting live, adoption onboarding completed |
| M6: Hypercare close and BAU transition | September 10, 2026 | Operations Manager | Support Lead, Engineering Lead | 30-day stability targets met, critical defects closed, BAU handover complete |

### Stage Gates
- Gate A (Pre-Beta): April 30, 2026 — Data quality thresholds and baseline model metrics approved.
- Gate B (Pre-Prod): June 25, 2026 — Security/compliance sign-off and performance readiness complete.
- Gate C (Post-Go-Live): August 27, 2026 — KPI trend review confirms expected operational and business uplift.

## 14. Business Acceptance Criteria
- End-to-end flow from claim ingestion to risk scoring to case action is demonstrable and measurable.
- Knowledge Hub can ingest, process, search, and ground AI answers with source metadata.
- Human overrides are captured and reflected in recommendation-improvement metrics.
- Enforcement workflow artifacts (cases, notes, circulars, sessions) are traceable and reportable.
- Executive stakeholders can review KPI outcomes across FWA, intelligence, business, and member protection dimensions.

---

## Appendix A: Codebase Traceability (Baseline)
- Frontend routing and pillar scope: `client/src/App.tsx`, `client/src/pillars/config/*`
- Knowledge Hub UX: `client/src/pages/fwa/knowledge-hub.tsx`
- Document upload UX: `client/src/components/document-upload-dialog.tsx`, `client/src/components/knowledge-batch-upload-dialog.tsx`
- Knowledge/document APIs: `server/routes/document-routes.ts`
- Knowledge ingestion and queue: `server/services/document-ingestion-service.ts`, `server/services/knowledge-upload-queue-service.ts`
- Chat orchestration and routing: `server/routes/chat-routes.ts`, `server/services/chat-rag-service.ts`, `server/services/chat-query-router.ts`, `server/services/chat-data-agent.ts`
- FWA operations: `server/routes/fwa-routes.ts`, `server/services/fwa-detection-engine.ts`
- Pre-auth and adjudication: `server/routes/preauth-routes.ts`
- Claims and RLHF action capture: `server/routes/claims-routes.ts`
- Security and audit controls: `server/routes/auth-routes.ts`, `server/middleware/audit.ts`, `server/routes.ts`
- Data model baseline: `shared/schema.ts`
