# API Reference

Comprehensive documentation for the Unified Agentic Claims Intelligence Platform API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Security & Rate Limiting](#security--rate-limiting)
4. [Error Handling](#error-handling)
5. [Versioning](#versioning)
6. [API Modules](#api-modules)
   - [Authentication API](#authentication-api)
   - [Pre-Authorization API](#pre-authorization-api)
   - [FWA Detection API](#fwa-detection-api)
   - [Claims Management API](#claims-management-api)
   - [Provider Relations API](#provider-relations-api)
   - [Context 360 API](#context-360-api)
   - [Simulation Lab API](#simulation-lab-api)
   - [Graph Analysis API](#graph-analysis-api)

---

## Overview

**Base URL**: `/api`

All API endpoints are prefixed with `/api`. The platform provides RESTful APIs for healthcare claims intelligence, fraud detection, and provider management.

### Response Format

All responses are returned as JSON. Success responses return the resource or array directly (no wrapper object):

**Success Response (Single Resource):**
```json
{
  "id": "uuid",
  "claimId": "PA-20250101-001",
  "status": "pending_review",
  ...
}
```

**Success Response (Collection):**
```json
[
  { "id": "uuid", "claimId": "PA-20250101-001", ... },
  { "id": "uuid", "claimId": "PA-20250101-002", ... }
]
```

**Error Response:**
```json
{
  "error": "Human-readable error message",
  "details": { ... }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 204 | No Content - Resource deleted successfully |
| 400 | Bad Request - Validation failed or invalid request body |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions or account disabled |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource already exists or constraint violation |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Unexpected server error |
| 503 | Service Unavailable - Database connection error |

---

## Authentication

All API endpoints (except `/api/auth/*`) require authentication via session cookies.

### Session Management

- Sessions are stored in PostgreSQL using `connect-pg-simple`
- Session lifetime: 24 hours
- Cookies are `httpOnly` and `sameSite: lax`
- In production, cookies are `secure` (HTTPS only)

### Required Headers

```http
Cookie: sessionId=<session_cookie>
X-CSRF-Token: <csrf_token>
Content-Type: application/json
```

### Getting a CSRF Token

Before making mutating requests (POST, PATCH, PUT, DELETE), obtain a CSRF token:

```http
GET /api/auth/csrf-token
```

**Response:**
```json
{
  "csrfToken": "abc123..."
}
```

---

## Security & Rate Limiting

### Rate Limits

The API implements three tiers of rate limiting:

| Tier | Endpoints | Limit | Window |
|------|-----------|-------|--------|
| General | All `/api/*` routes | 100 requests | 15 minutes |
| Authentication | `/api/auth/login`, `/api/auth/register` | 5 requests | 15 minutes |
| AI Operations | `/api/generate-report`, `/api/dream-report`, `/api/context/*`, `/api/fwa/run-agent` | 10 requests | 1 minute |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705089600
```

**Rate Limit Exceeded Response (429):**
```json
{
  "error": "Too many requests, please try again later."
}
```

### Security Headers

The API uses Helmet.js to set security headers:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)

### CORS Configuration

- Allowed origins: Configurable whitelist
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Credentials: Enabled for session cookies

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Human-readable error message",
  "details": { ... }
}
```

### Validation Errors (400)

When request validation fails (Zod schema validation):

```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["email"],
      "message": "Required"
    }
  ]
}
```

### Database Errors (503)

```json
{
  "error": "Service temporarily unavailable",
  "details": "Database connection error"
}
```

### Conflict Errors (409)

```json
{
  "error": "Conflict",
  "details": "duplicate key value violates unique constraint"
}
```

---

## Versioning

### Current Version

The API is currently at version 1.0 (implicit versioning).

### Future Versioning Strategy

API versioning will be implemented via:
1. **URL Path**: `/api/v2/...` for breaking changes
2. **Accept Header**: `Accept: application/vnd.claims-intel.v2+json`

### Deprecation Policy

- Deprecated endpoints will include a `Deprecation` header
- Minimum 6-month notice before removal
- Migration guides provided for breaking changes

---

## API Modules

---

## Authentication API

Base path: `/api/auth`

### Register User

Creates a new user account.

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "viewer"
}
```

**Roles:** `admin`, `claims_reviewer`, `fwa_analyst`, `provider_manager`, `auditor`, `viewer`

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "viewer",
    "isActive": true,
    "createdAt": "2025-01-09T12:00:00Z"
  }
}
```

**Errors:**
- `409` - Email already registered or username taken

---

### Login

Authenticates a user and creates a session.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "viewer"
  }
}
```

**Errors:**
- `401` - Invalid email or password
- `403` - Account is disabled

---

### Logout

Ends the user session.

```http
POST /api/auth/logout
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

### Get Current User

Returns the authenticated user's profile.

```http
GET /api/auth/me
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "viewer",
    "isActive": true,
    "lastLogin": "2025-01-09T12:00:00Z"
  }
}
```

---

### Get CSRF Token

Retrieves a CSRF token for session protection.

```http
GET /api/auth/csrf-token
```

**Response (200):**
```json
{
  "csrfToken": "abc123def456..."
}
```

---

## Pre-Authorization API

Base path: `/api/pre-auth`

Manages the 6-phase pre-authorization workflow for claims adjudication.

### Get Stats

Returns dashboard statistics for pre-authorization claims.

```http
GET /api/pre-auth/stats
```

**Response (200):**
```json
{
  "totalClaims": 150,
  "pendingReview": 25,
  "approved": 100,
  "rejected": 15,
  "riskFlags": 42,
  "avgProcessingTime": "2.4 hours"
}
```

---

### List Claims

Returns all pre-authorization claims with optional filtering.

```http
GET /api/pre-auth/claims
GET /api/pre-auth/claims?status=pending_review
```

**Query Parameters:**
- `status` (optional): Filter by status (`ingested`, `analyzing`, `pending_review`, `approved`, `rejected`)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "claimId": "PA-20250101-001",
    "payerId": "PAYER-001",
    "memberId": "MEM-10001",
    "memberDob": "1985-03-15",
    "memberGender": "M",
    "policyPlanId": "GOLD-2024",
    "providerId": "PROV-501",
    "specialty": "Cardiology",
    "networkStatus": "in-network",
    "encounterType": "outpatient",
    "totalAmount": "5250.00",
    "status": "pending_review",
    "priority": "NORMAL",
    "phase": 3,
    "diagnoses": [...],
    "lineItems": [...],
    "createdAt": "2025-01-09T12:00:00Z"
  }
]
```

---

### Get Claim by ID

```http
GET /api/pre-auth/claims/:id
```

**Response (200):** Single claim object

**Errors:**
- `404` - Claim not found

---

### Get Recent Claims

Returns the 10 most recently created claims.

```http
GET /api/pre-auth/claims/recent
```

---

### Create Claim

```http
POST /api/pre-auth/claims
```

**Request Body:**
```json
{
  "claimId": "PA-20250109-001",
  "payerId": "PAYER-001",
  "memberId": "MEM-10001",
  "memberDob": "1985-03-15",
  "memberGender": "M",
  "policyPlanId": "GOLD-2024",
  "providerId": "PROV-501",
  "specialty": "Cardiology",
  "networkStatus": "in-network",
  "encounterType": "outpatient",
  "totalAmount": "5250.00",
  "priority": "NORMAL",
  "diagnoses": [
    {
      "code_system": "ICD-10",
      "code": "I25.10",
      "desc": "Atherosclerotic heart disease",
      "type": "primary"
    }
  ],
  "lineItems": [
    {
      "line_id": "L1",
      "code_type": "CPT",
      "code": "93306",
      "desc": "Echocardiography",
      "units": 1,
      "net_amount": 2500
    }
  ]
}
```

**Response (201):** Created claim object

---

### Update Claim

```http
PATCH /api/pre-auth/claims/:id
```

**Request Body:** Partial claim object (any fields to update)

**Response (200):** Updated claim object

---

### Delete Claim

```http
DELETE /api/pre-auth/claims/:id
```

**Response (204):** No content

---

### Batch Create Claims

```http
POST /api/pre-auth/claims/batch
```

**Request Body:** Array of claim objects

**Response (201):** Array of created claims

---

### Get Claim Signals

Returns AI-generated signals for a claim.

```http
GET /api/pre-auth/claims/:id/signals
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "claimId": "uuid",
    "signalId": "SIG-001",
    "detector": "regulatory_compliance",
    "riskFlag": true,
    "severity": "HIGH",
    "confidence": "0.92",
    "recommendation": "PEND_REVIEW",
    "rationale": "Missing CCHI compliance code",
    "evidence": [...]
  }
]
```

---

### Create Signal

```http
POST /api/pre-auth/claims/:claimId/signals
```

---

### Get Claim Decision

```http
GET /api/pre-auth/claims/:claimId/decision
```

**Response (200):**
```json
{
  "id": "uuid",
  "claimId": "uuid",
  "aggregatedScore": "0.78",
  "riskLevel": "MEDIUM",
  "hasHardStop": false,
  "candidates": [...],
  "topRecommendation": "APPROVE",
  "safetyCheckPassed": true,
  "isFinal": true
}
```

---

### Create Decision

```http
POST /api/pre-auth/claims/:claimId/decision
```

---

### Get Claim Actions

```http
GET /api/pre-auth/claims/:claimId/actions
```

---

### Create Action

```http
POST /api/pre-auth/claims/:claimId/actions
```

---

### Policy Rules

```http
GET /api/pre-auth/policy-rules
POST /api/pre-auth/policy-rules
PUT /api/pre-auth/policy-rules/:id
DELETE /api/pre-auth/policy-rules/:id
POST /api/pre-auth/policy-rules/seed
```

---

### Agent Configurations

```http
GET /api/pre-auth/agent-configs
POST /api/pre-auth/agent-configs
PUT /api/pre-auth/agent-configs/:id
DELETE /api/pre-auth/agent-configs/:id
POST /api/pre-auth/agent-configs/seed
```

---

### Documents

```http
GET /api/pre-auth/documents
GET /api/pre-auth/documents/:id
GET /api/pre-auth/documents/:id/chunks
POST /api/pre-auth/documents
POST /api/pre-auth/documents/batch
DELETE /api/pre-auth/documents/:id
```

---

### Batches

```http
GET /api/pre-auth/batches
GET /api/pre-auth/batches/:id
POST /api/pre-auth/batches
PATCH /api/pre-auth/batches/:id
DELETE /api/pre-auth/batches/:id
POST /api/pre-auth/batches/:id/trigger-analysis
```

---

### RLHF Feedback

```http
GET /api/pre-auth/feedback
GET /api/pre-auth/feedback/exemplars
POST /api/pre-auth/feedback
POST /api/pre-auth/feedback/:id/curate
```

---

## FWA Detection API

Base path: `/api/fwa`

Manages the 3-phase FWA (Fraud, Waste, Abuse) detection workflow.

### Get Stats

```http
GET /api/fwa/stats
```

**Response (200):**
```json
{
  "totalCases": 45,
  "draftCases": 5,
  "analyzingCases": 10,
  "categorizedCases": 15,
  "actionPendingCases": 8,
  "resolvedCases": 5,
  "escalatedCases": 2,
  "criticalCases": 3,
  "highPriorityCases": 12,
  "totalAmount": "2500000.00",
  "totalRecovery": "750000.00"
}
```

---

### Generate Penalization Letter

Uses AI to generate formal FWA penalization letters.

```http
POST /api/generate-letter
```

**Request Body:**
```json
{
  "providers": [
    { "id": "PROV-001", "name": "ABC Medical Center" }
  ],
  "summary": "Consistent upcoding patterns detected...",
  "claimCount": 150,
  "totalAmount": 250000
}
```

**Response (200):**
```json
{
  "letter": "Dear Provider,\n\nWe are writing to inform you..."
}
```

---

### List Cases

```http
GET /api/fwa/cases
GET /api/fwa/cases?status=analyzing&priority=high
```

**Query Parameters:**
- `status`: `draft`, `analyzing`, `categorized`, `action_pending`, `resolved`, `escalated`
- `priority`: `critical`, `high`, `medium`, `low`
- `phase`: `a1_analysis`, `a2_categorization`, `a3_action`

---

### CRUD Operations

```http
GET /api/fwa/cases/:id
POST /api/fwa/cases
PATCH /api/fwa/cases/:id
DELETE /api/fwa/cases/:id
```

---

### Findings

```http
GET /api/fwa/cases/:caseId/findings
POST /api/fwa/cases/:caseId/findings
PATCH /api/fwa/findings/:id
```

---

### Categories

```http
GET /api/fwa/cases/:caseId/categories
POST /api/fwa/cases/:caseId/categories
```

---

### Actions

```http
GET /api/fwa/cases/:caseId/actions
POST /api/fwa/cases/:caseId/actions
PATCH /api/fwa/actions/:id
```

---

### Regulatory Documents

```http
GET /api/fwa/regulatory-docs
GET /api/fwa/regulatory-docs/:id
POST /api/fwa/regulatory-docs
PATCH /api/fwa/regulatory-docs/:id
DELETE /api/fwa/regulatory-docs/:id
```

---

### Medical Guidelines

```http
GET /api/fwa/medical-guidelines
GET /api/fwa/medical-guidelines/:id
POST /api/fwa/medical-guidelines
PATCH /api/fwa/medical-guidelines/:id
DELETE /api/fwa/medical-guidelines/:id
```

---

### Agent Configurations

```http
GET /api/fwa/agent-configs
POST /api/fwa/agent-configs
PATCH /api/fwa/agent-configs/:id
DELETE /api/fwa/agent-configs/:id
```

---

### AI Agent Operations

#### Run Phase 1 Analysis Agent

```http
POST /api/fwa/cases/:caseId/run-agent
```

**Request Body:**
```json
{
  "agentId": "intel-gatherer",
  "phase": 1
}
```

---

#### Query Knowledge Base

```http
POST /api/fwa/query-kb
```

**Request Body:**
```json
{
  "kbType": "regulatory",
  "query": "What are CCHI requirements for billing cardiac procedures?",
  "context": { ... }
}
```

---

### Agent Reports

```http
GET /api/fwa/agent-reports
GET /api/fwa/agent-reports/:id
POST /api/fwa/agent-reports
```

---

## Claims Management API

Base path: `/api/claims` and `/api/demo`

### Demo Data Endpoints

Read-only endpoints for demonstration data:

```http
GET /api/demo/providers
GET /api/demo/patients
GET /api/demo/doctors
GET /api/demo/fwa-cases
GET /api/demo/pre-auth-claims
GET /api/demo/claims
GET /api/demo/claims/:id
GET /api/demo/rules
GET /api/demo/rules/:id
GET /api/demo/qa-findings
GET /api/demo/contracts
GET /api/demo/contracts/provider/:providerId
GET /api/demo/communications
GET /api/demo/reconciliation
```

---

### RLHF Feedback

Record human feedback for AI model improvement:

#### FWA Actions Feedback

```http
POST /api/fwa/actions
```

**Request Body:**
```json
{
  "caseId": "FWA-2025-001",
  "entityId": "ENT-001",
  "entityType": "provider",
  "agentId": "intel-gatherer",
  "phase": 1,
  "aiRecommendation": "Flag for review",
  "humanAction": "Approve",
  "wasAccepted": true,
  "overrideReason": null,
  "reviewerNotes": "Pattern is legitimate",
  "reviewerId": "user-123"
}
```

---

#### Claims Actions Feedback

```http
POST /api/claims/actions
```

**Request Body:**
```json
{
  "claimId": "CLM-001",
  "adjudicationPhase": 3,
  "aiRecommendation": "Deny",
  "humanAction": "Approve with notes",
  "wasAccepted": false,
  "overrideReason": "Supporting documentation provided"
}
```

---

### Claims Pipeline

#### Get Pipeline Status

```http
GET /api/claims/pipeline/status
```

---

#### Upload Claims Batch

```http
POST /api/claims/pipeline/upload
```

**Request Body (multipart/form-data):**
- `file`: CSV or Excel file with claims data

---

#### Manual Claim Submission

```http
POST /api/claims/pipeline/manual
```

---

#### Process Batch

```http
POST /api/claims/pipeline/batches/:batchId/process
```

---

## Provider Relations API

Base path: `/api/provider-relations`

### Dream Reports

AI-powered provider analysis reports.

```http
GET /api/provider-relations/dream-reports
GET /api/provider-relations/dream-reports?status=completed&providerId=PROV-001
GET /api/provider-relations/dream-reports/:id
POST /api/provider-relations/dream-reports/generate
```

**Generate Request:**
```json
{
  "providerId": "PROV-001",
  "periodStart": "2024-10-01",
  "periodEnd": "2025-01-01"
}
```

---

### Evidence Packs

Document packages for provider discussions.

```http
GET /api/provider-relations/evidence-packs
GET /api/provider-relations/evidence-packs/:id
POST /api/provider-relations/evidence-packs
PATCH /api/provider-relations/evidence-packs/:id
DELETE /api/provider-relations/evidence-packs/:id
```

---

### Reconciliation Sessions

Provider settlement meetings.

```http
GET /api/provider-relations/reconciliation-sessions
GET /api/provider-relations/reconciliation-sessions/:id
POST /api/provider-relations/reconciliation-sessions
PATCH /api/provider-relations/reconciliation-sessions/:id
```

---

### Settlements

Two-ledger architecture for financial settlements.

```http
GET /api/provider-relations/settlements
GET /api/provider-relations/settlements/:id
POST /api/provider-relations/settlements
PATCH /api/provider-relations/settlements/:id
```

---

### Operational Findings

```http
GET /api/provider-relations/operational-findings
GET /api/provider-relations/operational-findings/:id
```

---

### Peer Groups

Provider comparison groups.

```http
GET /api/provider-relations/peer-groups
GET /api/provider-relations/peer-groups/:id
POST /api/provider-relations/peer-groups
```

---

### Provider Benchmarks

Performance metrics vs. peer group.

```http
GET /api/provider-relations/benchmarks
GET /api/provider-relations/benchmarks/:providerId
POST /api/provider-relations/benchmarks
```

---

### Dashboard Stats

```http
GET /api/provider-relations/dashboard/stats
```

**Response (200):**
```json
{
  "totalProviders": 150,
  "activeReconciliations": 12,
  "pendingSettlements": 8,
  "recentDreamReports": 5,
  "totalRecoveryAmount": "2500000.00"
}
```

---

## Context 360 API

Base path: `/api/context`

AI-powered 360-degree views for patients, providers, and doctors.

### Patient 360

```http
GET /api/context/patient-360
GET /api/context/patient-360/:patientId
POST /api/context/patient-360
POST /api/context/patient-360/:patientId/analyze
```

**Analyze Request:**
```json
{
  "patientName": "John Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "patient360": {
    "patientId": "PAT-001",
    "patientName": "John Doe",
    "aiSummary": "Patient shows consistent utilization patterns...",
    "riskLevel": "medium",
    "riskScore": "0.45",
    "riskFactors": ["Multiple ER visits", "Chronic conditions"],
    "behavioralPatterns": [...],
    "fwaAlerts": [...],
    "lastAnalyzedAt": "2025-01-09T12:00:00Z"
  },
  "analysis": { ... }
}
```

---

### Provider 360

```http
GET /api/context/provider-360
GET /api/context/provider-360/:providerId
POST /api/context/provider-360
POST /api/context/provider-360/:providerId/analyze
```

---

### Doctor 360

```http
GET /api/context/doctor-360
GET /api/context/doctor-360/:doctorId
POST /api/context/doctor-360
```

---

## Simulation Lab API

Base path: `/api/simulation`

Testing environment for AI agents with digital twins and shadow configurations.

### Digital Twins

Clone cases for safe testing.

```http
GET /api/simulation/digital-twins
GET /api/simulation/digital-twins/:twinId
POST /api/simulation/digital-twins
PATCH /api/simulation/digital-twins/:twinId
DELETE /api/simulation/digital-twins/:twinId
```

**Create Request:**
```json
{
  "twinId": "TW-001",
  "sourceType": "fwa_case",
  "sourceId": "FWA-2025-001",
  "twinData": { ... },
  "status": "active",
  "purpose": "Testing new detection rules"
}
```

---

### Shadow Rules

Test rule configurations in isolation.

```http
GET /api/simulation/shadow-rules
GET /api/simulation/shadow-rules/:ruleSetId
POST /api/simulation/shadow-rules
PATCH /api/simulation/shadow-rules/:ruleSetId
DELETE /api/simulation/shadow-rules/:ruleSetId
```

---

### Ghost Runs

Execute AI agents in simulation mode.

```http
GET /api/simulation/ghost-runs
GET /api/simulation/ghost-runs/:runId
POST /api/simulation/ghost-runs
PATCH /api/simulation/ghost-runs/:runId
```

**Create Request:**
```json
{
  "runId": "GR-001",
  "agentType": "intel-gatherer",
  "phase": 1,
  "twinId": "TW-001",
  "status": "pending"
}
```

---

## Graph Analysis API

Base path: `/api/graph-analysis`

Network-based fraud detection and collusion ring analysis.

### Relationship Graphs

```http
GET /api/graph-analysis/graphs
GET /api/graph-analysis/graphs/:graphId
POST /api/graph-analysis/graphs
PATCH /api/graph-analysis/graphs/:graphId
DELETE /api/graph-analysis/graphs/:graphId
```

**Create Request:**
```json
{
  "graphId": "GRP-001",
  "name": "Provider Network Q4 2024",
  "nodes": [
    { "id": "PROV-001", "type": "provider", "label": "ABC Medical" },
    { "id": "PAT-001", "type": "patient", "label": "John Doe" }
  ],
  "edges": [
    { "source": "PROV-001", "target": "PAT-001", "type": "treated", "weight": 15 }
  ],
  "metrics": {
    "nodeCount": 2,
    "edgeCount": 1,
    "density": 0.5
  }
}
```

---

### Collusion Rings

Detected fraud rings and patterns.

```http
GET /api/graph-analysis/collusion-rings
GET /api/graph-analysis/collusion-rings/:ringId
POST /api/graph-analysis/collusion-rings
PATCH /api/graph-analysis/collusion-rings/:ringId
DELETE /api/graph-analysis/collusion-rings/:ringId
```

**Ring Object:**
```json
{
  "ringId": "CR-001",
  "ringType": "provider_patient",
  "members": ["PROV-001", "PROV-002", "PAT-001"],
  "evidence": [...],
  "financialImpact": "150000.00",
  "riskAssessment": {
    "score": 0.85,
    "level": "high",
    "factors": ["Unusual referral patterns", "Synchronized billing"]
  },
  "status": "investigating"
}
```

---

## Audit Logging

All access to PHI/PII data is automatically logged to the `audit_logs` table for HIPAA compliance.

### Audited Endpoints

- `/api/context/patient-360/:patientId` - Patient data access
- `/api/context/provider-360/:providerId` - Provider data access
- `/api/context/doctor-360/:doctorId` - Doctor data access
- `/api/fwa/cases/:id` - FWA case access

### Audit Log Fields

```json
{
  "id": "uuid",
  "userId": "user-123",
  "action": "DATA_ACCESS",
  "resourceType": "patient",
  "resourceId": "PAT-001",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "details": { ... },
  "createdAt": "2025-01-09T12:00:00Z"
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Using fetch with session cookies
const API_BASE = '/api';

async function getClaims() {
  const response = await fetch(`${API_BASE}/pre-auth/claims`, {
    credentials: 'include',
    headers: {
      'X-CSRF-Token': await getCsrfToken(),
    },
  });
  return response.json();
}

async function createClaim(claim: Claim) {
  const response = await fetch(`${API_BASE}/pre-auth/claims`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': await getCsrfToken(),
    },
    body: JSON.stringify(claim),
  });
  return response.json();
}
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt

# Get claims (with session cookie)
curl http://localhost:5000/api/pre-auth/claims \
  -b cookies.txt

# Create claim (with CSRF token)
curl -X POST http://localhost:5000/api/pre-auth/claims \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -b cookies.txt \
  -d '{"claimId":"PA-001",...}'
```

---

## Changelog

### v1.0.0 (January 2025)

- Initial release
- Pre-Authorization workflow (6-phase)
- FWA Detection (3-phase A1-A3)
- Provider Relations module
- Context 360 views
- Simulation Lab
- Graph Analysis
- HIPAA-compliant audit logging
- Rate limiting (3 tiers)
- CSRF protection
- Role-based access control

---

## Support

For API support, please contact the development team or refer to:
- Internal documentation: `docs/` directory
- Schema reference: `shared/schema.ts`
- Error handling: `server/routes.ts`
