# Testing Strategy & Coverage Assessment

## Unified Agentic Claims Intelligence Platform

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Assessment & Roadmap

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Critical User Flows](#critical-user-flows)
4. [Test Coverage Recommendations](#test-coverage-recommendations)
5. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
6. [Test Data & Mocking Strategies](#test-data--mocking-strategies)
7. [Testing Roadmap](#testing-roadmap)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Executive Summary

This document provides a comprehensive testing strategy for the Unified Agentic Claims Intelligence Platform, a healthcare analytics system featuring 36 AI agents, 8 API modules, and ~70 frontend pages. The platform handles sensitive PHI/PII data requiring HIPAA compliance and robust security testing.

### Key Findings

- **Current Test Coverage:** 0% (No existing test suite)
- **Total API Endpoints:** ~163 endpoints across 8 modules
- **Frontend Pages:** ~70 pages with complex workflows
- **AI Agents:** 36 specialized agents requiring mock strategies
- **Critical Priority:** Security, Authentication, HIPAA Compliance

### Recommended Testing Stack

| Layer | Tool | Rationale |
|-------|------|-----------|
| Unit Tests | Vitest | Fast, TypeScript-native, Vite-compatible |
| Integration Tests | Vitest + Supertest | API testing with Express |
| E2E Tests | Playwright | Cross-browser, built-in test runner |
| Mocking | MSW (Mock Service Worker) | OpenAI/external API mocking |
| Database | Testcontainers or In-Memory | Isolated database testing |

---

## Current State Analysis

### Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vite)                    │
│  ~70 pages across 8 modules with TanStack Query integration │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API LAYER (Express.js)                     │
│            163 endpoints, 3-tier rate limiting               │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────────┐    ┌─────────────┐
    │ PostgreSQL│       │ OpenAI GPT-4o│    │  Security   │
    │  (Neon)   │       │  36 Agents   │    │ Middleware  │
    └──────────┘       └──────────────┘    └─────────────┘
```

### Existing Security Controls (Already Implemented)

The following security features are already implemented in the codebase and need testing:

| Control | Implementation | Status |
|---------|----------------|--------|
| Rate Limiting (General) | 100 req/15min on `/api/*` | `server/index.ts:41-49` |
| Rate Limiting (Auth) | 5 req/15min on login/register | `server/index.ts:52-60` |
| Rate Limiting (AI) | 10 req/min on AI endpoints | `server/index.ts:63-74` |
| Session Expiration | 24-hour maxAge, PostgreSQL-backed | `server/routes.ts:81-97` |
| Password Hashing | bcrypt with 12 salt rounds | `server/middleware/auth.ts:54-57` |
| CSRF Protection | Token validation on mutations | `server/middleware/csrf.ts` |
| Failed Login Audit | LOGIN_FAILED logged to audit_logs | `server/routes/auth-routes.ts:84-92` |
| Successful Login Audit | LOGIN_SUCCESS logged | `server/routes/auth-routes.ts:102-110` |
| PHI Access Audit | auditDataAccess middleware | `server/middleware/audit.ts:52-76` |
| Role-Based Access | 6 roles with permission matrix | `server/middleware/auth.ts:26-52` |
| Helmet.js Headers | CSP, X-Frame-Options, etc. | `server/index.ts:14-27` |

### Critical Components Requiring Tests

| Component | File(s) | Risk Level |
|-----------|---------|------------|
| Authentication | `server/middleware/auth.ts` | **CRITICAL** |
| Audit Logging | `server/middleware/audit.ts` | **CRITICAL** |
| CSRF Protection | `server/middleware/csrf.ts` | **HIGH** |
| Agent Orchestrator | `server/services/agent-orchestrator.ts` | **HIGH** |
| Storage Interface | `server/storage.ts` | **HIGH** |
| Claims Pipeline | `server/services/claims-pipeline.ts` | **MEDIUM** |
| Input Sanitization | `server/utils/input-sanitizer.ts` | **HIGH** |
| Data Redaction | `server/utils/data-redaction.ts` | **CRITICAL** |

### Endpoint Distribution

| Module | Endpoints | Priority |
|--------|-----------|----------|
| Authentication | 4 | P0 |
| Pre-Authorization | 44 | P1 |
| FWA Detection | 37 | P1 |
| Claims Management | 27 | P1 |
| Provider Relations | 21 | P2 |
| Context 360 | 11 | P2 |
| Simulation Lab | 12 | P3 |
| Graph Analysis | 11 | P3 |

---

## Critical User Flows

### P0 - Security Critical (Must Test First)

#### 1. Authentication Flow
```
User Registration → Password Hashing → Session Creation
User Login → Credential Verification → Session Assignment
User Logout → Session Destruction → Cookie Cleanup
```

**Test Scenarios:**
- [ ] Successful registration with valid credentials
- [ ] Registration with duplicate username/email (should fail)
- [ ] Login with correct credentials
- [ ] Login with incorrect password (should fail)
- [ ] Login with non-existent user (should fail)
- [ ] Session persistence across requests
- [ ] Session expiration after 24 hours
- [ ] Logout invalidates session
- [ ] Password is hashed with bcrypt (12 rounds)
- [ ] Rate limiting blocks after 5 failed attempts

#### 2. Authorization & RBAC Flow
```
Request → Load User from Session → Check Role/Permission → Allow/Deny
```

**Test Scenarios:**
- [ ] Admin can access all resources
- [ ] claims_reviewer can read/write claims only
- [ ] fwa_analyst can read/write FWA cases only
- [ ] provider_manager can manage providers only
- [ ] auditor has read-only access with audit logs
- [ ] viewer has read-only access
- [ ] Unauthorized access returns 401
- [ ] Insufficient permissions returns 403

#### 3. CSRF Protection Flow
```
GET Request → Generate Token → Include in Response
POST/PUT/DELETE → Validate X-CSRF-Token Header → Process/Reject
```

**Test Scenarios:**
- [ ] CSRF token generated on first request
- [ ] Requests without token return 403
- [ ] Requests with invalid token return 403
- [ ] Valid token allows mutation requests
- [ ] Token refreshes on each response

#### 4. Audit Logging (HIPAA Compliance)
```
PHI/PII Access → Capture Request Context → Create Audit Log Entry
```

**Test Scenarios:**
- [ ] Patient 360 access creates audit log
- [ ] Provider 360 access creates audit log
- [ ] Doctor 360 access creates audit log
- [ ] FWA case access creates audit log
- [ ] Audit logs capture userId, action, resourceType, resourceId
- [ ] Audit logs capture IP address and user agent
- [ ] Failed authentication attempts are logged

### P1 - Core Business Flows

#### 5. Pre-Authorization Workflow (6-Phase)
```
Claim Submission → Cognitive Agents → Signal Aggregation → 
Decision → Adjudicator Review → RLHF Feedback
```

**Test Scenarios:**
- [ ] Create new pre-auth claim with required fields
- [ ] Validation rejects invalid claim data
- [ ] Agents process claim and generate signals
- [ ] Decision engine aggregates signals
- [ ] Adjudicator can approve/deny/escalate
- [ ] RLHF feedback is recorded
- [ ] Batch upload processes multiple claims
- [ ] Workflow phase transitions are correct

#### 6. FWA Detection Workflow (3-Phase A1-A3)
```
Case Creation → Phase A1 (Analysis) → Phase A2 (Categorization) → 
Phase A3 (Recovery) → Case Resolution
```

**Test Scenarios:**
- [ ] Create FWA case from claim
- [ ] Phase A1 agents gather intelligence
- [ ] Phase A2 agents classify FWA type
- [ ] Phase A3 agents recommend recovery actions
- [ ] Findings are recorded per phase
- [ ] Actions are tracked with status
- [ ] Case priority affects processing order
- [ ] 36 agents execute correctly per entity type

#### 7. Claims Pipeline
```
Batch Ingest → Validation → Stage Processing → 
Quality Assurance → Final Decision
```

**Test Scenarios:**
- [ ] Batch upload creates ingest items
- [ ] Validation catches invalid claims
- [ ] Pipeline stages execute in order
- [ ] QA validation flags issues
- [ ] RLHF feedback improves future processing

### P2 - Supporting Flows

#### 8. Provider Relations
```
Provider Management → Reconciliation → Evidence Packs → 
Dream Reports → Settlement
```

**Test Scenarios:**
- [ ] Create/update provider records
- [ ] Generate benchmark comparisons
- [ ] Create evidence packs with findings
- [ ] AI Dream Reports generate analysis
- [ ] Settlement ledger tracks transactions

#### 9. Context Enrichment 360
```
Entity Request → AI Analysis → Narrative Generation → 
Risk Assessment → Display
```

**Test Scenarios:**
- [ ] Patient 360 generates comprehensive view
- [ ] Provider 360 includes billing patterns
- [ ] Doctor 360 includes practice patterns
- [ ] AI narratives are coherent
- [ ] Risk scores are calculated correctly

### P3 - Advanced Features

#### 10. Simulation Lab
```
Digital Twin Creation → Shadow Rules → Ghost Runs → 
Comparison Analysis
```

**Test Scenarios:**
- [ ] Clone cases as digital twins
- [ ] Configure shadow rule sets
- [ ] Execute ghost runs without affecting production
- [ ] Compare ghost vs production outputs

#### 11. Graph & Collusion Analysis
```
Build Relationship Graph → Pattern Detection → 
Collusion Ring Identification → Investigation
```

**Test Scenarios:**
- [ ] Graph construction from entity relationships
- [ ] Collusion patterns are detected
- [ ] Risk scores consider network effects

---

## Test Coverage Recommendations

### Unit Test Coverage Targets

| Component Category | Target Coverage | Priority |
|--------------------|-----------------|----------|
| Security Middleware | 95% | P0 |
| Authentication Helpers | 95% | P0 |
| Input Validation | 90% | P0 |
| Data Redaction | 95% | P0 |
| Storage Interface | 85% | P1 |
| Route Handlers | 80% | P1 |
| Agent Orchestrator | 75% | P2 |
| Utility Functions | 80% | P2 |

### Unit Tests - Backend

#### Authentication Module (`server/middleware/auth.ts`)

```typescript
// Test file: server/__tests__/middleware/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword, requireAuth, requireRole, requirePermission } from '../../middleware/auth';

describe('Authentication Middleware', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const hash = await hashPassword('password123');
      expect(hash).not.toBe('password123');
      expect(hash).toMatch(/^\$2[aby]?\$\d+\$/);
    });

    it('should produce different hashes for same password', async () => {
      const hash1 = await hashPassword('password123');
      const hash2 = await hashPassword('password123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword('password123');
      const result = await verifyPassword('password123', hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword('password123');
      const result = await verifyPassword('wrongpassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should call next() when session has userId', () => {
      const req = { session: { userId: 'user-123' } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();
      
      requireAuth(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no session', () => {
      const req = { session: null } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();
      
      requireAuth(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for matching role', () => {
      const middleware = requireRole('admin', 'fwa_analyst');
      const req = { user: { role: 'admin' } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-matching role', () => {
      const middleware = requireRole('admin');
      const req = { user: { role: 'viewer' } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requirePermission', () => {
    it('should allow claims:read for claims_reviewer', () => {
      const middleware = requirePermission('claims:read');
      const req = { user: { role: 'claims_reviewer' } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should deny fwa:write for viewer', () => {
      const middleware = requirePermission('fwa:write');
      const req = { user: { role: 'viewer' } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
```

#### Audit Middleware (`server/middleware/audit.ts`)

```typescript
// Test file: server/__tests__/middleware/audit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuditLog, auditDataAccess } from '../../middleware/audit';

describe('Audit Middleware', () => {
  describe('createAuditLog', () => {
    it('should create audit log entry with all fields', async () => {
      // createAuditLog calls storage.createAuditLog internally
      // This test verifies the function doesn't throw
      await expect(createAuditLog({
        userId: 'user-123',
        action: 'VIEW_PATIENT_360',
        resourceType: 'patient_360',
        resourceId: 'patient-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      })).resolves.not.toThrow();
    });

    it('should handle missing optional fields gracefully', async () => {
      await expect(createAuditLog({
        action: 'LOGIN'
      })).resolves.not.toThrow();
    });
  });

  describe('auditDataAccess', () => {
    it('should require authentication', async () => {
      const middleware = auditDataAccess('patient_360');
      const req = { user: null } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();
      
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should log access and call next for authenticated users', async () => {
      const middleware = auditDataAccess('patient_360');
      const req = {
        user: { id: 'user-123', role: 'admin', username: 'admin' },
        params: { patientId: 'patient-456' },
        method: 'GET',
        path: '/api/context/patient-360/patient-456',
        query: {},
        ip: '192.168.1.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0')
      } as any;
      const res = {} as any;
      const next = vi.fn();
      
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
});
```

#### OpenAI Utility (`server/utils/openai-utils.ts`)

```typescript
// Test file: server/__tests__/utils/openai-utils.test.ts
import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../utils/openai-utils';

describe('OpenAI Utilities', () => {
  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure up to maxRetries', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(fn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after exhausting retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(withRetry(fn, { maxRetries: 2 }))
        .rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should respect timeout', async () => {
      const slowFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );
      
      await expect(withRetry(slowFn, { timeoutMs: 100, maxRetries: 0 }))
        .rejects.toThrow('OpenAI request timeout');
    });
  });
});
```

### Integration Tests

#### Authentication API

```typescript
// Test file: server/__tests__/integration/auth.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index';

describe('Authentication API', () => {
  const testUser = {
    username: 'testuser_' + Date.now(),
    email: `testuser_${Date.now()}@test.com`,
    password: 'SecurePass123!',
    role: 'viewer'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(testUser.username);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject duplicate username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'incomplete' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      
      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword'
        });
      
      expect(response.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password'
        });
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session on logout', async () => {
      // First login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      
      const cookies = loginRes.headers['set-cookie'];
      
      // Then logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);
      
      expect(logoutRes.status).toBe(200);
    });
  });
});
```

#### Pre-Authorization API

```typescript
// Test file: server/__tests__/integration/preauth.test.ts

describe('Pre-Authorization API', () => {
  let authCookies: string[];
  let csrfToken: string;

  beforeAll(async () => {
    // Login as admin for full access
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'adminpass' });
    
    authCookies = loginRes.headers['set-cookie'];
    csrfToken = loginRes.body.csrfToken;
  });

  describe('GET /api/pre-auth/claims', () => {
    it('should return list of claims', async () => {
      const response = await request(app)
        .get('/api/pre-auth/claims')
        .set('Cookie', authCookies);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/pre-auth/claims');
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/pre-auth/claims', () => {
    it('should create new claim with valid data', async () => {
      const claimData = {
        claimId: `PA-TEST-${Date.now()}`,
        patientName: 'Test Patient',
        patientId: 'P-12345',
        providerId: 'PROV-001',
        providerName: 'Test Hospital',
        procedureCode: '99213',
        icdCodes: ['J06.9'],
        requestedAmount: 500.00,
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/pre-auth/claims')
        .set('Cookie', authCookies)
        .set('X-CSRF-Token', csrfToken)
        .send(claimData);
      
      expect(response.status).toBe(201);
      expect(response.body.claimId).toBe(claimData.claimId);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/pre-auth/claims')
        .set('Cookie', authCookies)
        .set('X-CSRF-Token', csrfToken)
        .send({ claimId: 'incomplete' });
      
      expect(response.status).toBe(400);
    });

    it('should require CSRF token for mutations', async () => {
      const response = await request(app)
        .post('/api/pre-auth/claims')
        .set('Cookie', authCookies)
        .send({ claimId: 'test' });
      
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/pre-auth/claims/:id/signals', () => {
    it('should return signals for a claim', async () => {
      // Assuming claim ID exists
      const response = await request(app)
        .get('/api/pre-auth/claims/existing-claim-id/signals')
        .set('Cookie', authCookies);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
```

#### FWA API

```typescript
// Test file: server/__tests__/integration/fwa.test.ts

describe('FWA Detection API', () => {
  describe('GET /api/fwa/cases', () => {
    it('should return FWA cases list', async () => {
      const response = await request(app)
        .get('/api/fwa/cases')
        .set('Cookie', authCookies);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/fwa/cases?status=open')
        .set('Cookie', authCookies);
      
      expect(response.status).toBe(200);
      response.body.forEach(c => expect(c.status).toBe('open'));
    });
  });

  describe('POST /api/fwa/cases/:id/run-agents', () => {
    it('should execute agents for a case', async () => {
      const response = await request(app)
        .post('/api/fwa/cases/test-case-id/run-agents')
        .set('Cookie', authCookies)
        .set('X-CSRF-Token', csrfToken)
        .send({
          phase: 'A1',
          entityType: 'provider',
          agents: ['billing_patterns_agent']
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// Test file: e2e/auth-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to registration (if available)
    await page.click('[data-testid="link-register"]');
    
    // Fill registration form
    await page.fill('[data-testid="input-username"]', `user_${Date.now()}`);
    await page.fill('[data-testid="input-email"]', `user_${Date.now()}@test.com`);
    await page.fill('[data-testid="input-password"]', 'SecurePass123!');
    await page.click('[data-testid="button-submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should login and access dashboard', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('[data-testid="input-username"]', 'testuser');
    await page.fill('[data-testid="input-password"]', 'password');
    await page.click('[data-testid="button-login"]');
    
    await expect(page.locator('[data-testid="text-welcome"]')).toBeVisible();
  });
});

test.describe('Pre-Authorization Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as claims_reviewer
    await page.goto('/');
    await page.fill('[data-testid="input-username"]', 'claims_reviewer');
    await page.fill('[data-testid="input-password"]', 'password');
    await page.click('[data-testid="button-login"]');
  });

  test('should navigate through pre-auth module', async ({ page }) => {
    // Navigate to pre-auth
    await page.click('[data-testid="nav-pre-auth"]');
    await expect(page).toHaveURL(/pre-auth/);
    
    // View claims list
    await page.click('[data-testid="link-claims"]');
    await expect(page.locator('[data-testid="table-claims"]')).toBeVisible();
  });

  test('should create new pre-auth claim', async ({ page }) => {
    await page.goto('/pre-auth/claims/new');
    
    // Fill claim form
    await page.fill('[data-testid="input-patient-name"]', 'John Doe');
    await page.fill('[data-testid="input-procedure-code"]', '99213');
    await page.fill('[data-testid="input-amount"]', '500');
    
    await page.click('[data-testid="button-submit"]');
    
    // Verify claim created
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });
});

test.describe('FWA Case Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as fwa_analyst
    await page.goto('/');
    await page.fill('[data-testid="input-username"]', 'fwa_analyst');
    await page.fill('[data-testid="input-password"]', 'password');
    await page.click('[data-testid="button-login"]');
  });

  test('should view FWA dashboard', async ({ page }) => {
    await page.click('[data-testid="nav-fwa"]');
    
    await expect(page.locator('[data-testid="card-total-cases"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-recovery-amount"]')).toBeVisible();
  });

  test('should run AI agents on a case', async ({ page }) => {
    await page.goto('/fwa/cases/test-case-id');
    
    // Select phase and run agents
    await page.click('[data-testid="tab-phase-a1"]');
    await page.click('[data-testid="button-run-agents"]');
    
    // Wait for agent execution
    await expect(page.locator('[data-testid="status-agent-complete"]')).toBeVisible({ timeout: 60000 });
  });
});
```

---

## Edge Cases & Error Scenarios

### Security Edge Cases

| Scenario | Expected Behavior | Test Type |
|----------|-------------------|-----------|
| SQL injection in login | Query parameterized, no injection | Unit |
| XSS in user input | HTML escaped/sanitized | Unit |
| Session fixation attack | New session ID on login | Integration |
| CSRF token replay | Token invalidated after use | Integration |
| Concurrent session manipulation | Race condition handled | Integration |
| JWT/Session tampering | Invalid session rejected | Integration |
| Privilege escalation attempt | Role verified server-side | Integration |
| PHI access without auth | 401 returned, access logged | Integration |

### API Edge Cases

| Scenario | Expected Behavior | Test Type |
|----------|-------------------|-----------|
| Empty request body | 400 with validation error | Integration |
| Invalid JSON syntax | 400 with parse error | Integration |
| Missing required fields | 400 with field list | Integration |
| Invalid field types | 400 with type error | Integration |
| Overly large payload | 413 or validation error | Integration |
| Rate limit exceeded | 429 with retry-after | Integration |
| Database connection lost | 503 with graceful error | Integration |
| Concurrent updates | Last-write-wins or conflict | Integration |

### AI Agent Edge Cases

| Scenario | Expected Behavior | Test Type |
|----------|-------------------|-----------|
| OpenAI API timeout | Fallback report generated | Unit |
| OpenAI rate limit | Retry with backoff | Unit |
| Invalid JSON from AI | Parse error handled gracefully | Unit |
| Empty AI response | Fallback content used | Unit |
| OpenAI API key invalid | 500 with clear error | Integration |
| Prompt injection attempt | Input sanitized | Unit |
| Very large input data | Truncated/chunked | Unit |
| Malformed entity data | Default values used | Unit |

### Database Edge Cases

| Scenario | Expected Behavior | Test Type |
|----------|-------------------|-----------|
| Duplicate primary key | 409 conflict error | Integration |
| Foreign key violation | 400 with reference error | Integration |
| CHECK constraint violation | 400 with constraint error | Integration |
| Transaction rollback needed | Data consistent | Integration |
| Connection pool exhausted | 503 with retry | Integration |
| Concurrent inserts | No duplicates | Integration |
| Large result set | Pagination applied | Integration |
| NULL in required field | Validation error | Unit |

### Frontend Edge Cases

| Scenario | Expected Behavior | Test Type |
|----------|-------------------|-----------|
| Network offline | Error state shown | E2E |
| API timeout | Loading spinner, then error | E2E |
| Form validation errors | Inline error messages | E2E |
| Navigation during submission | Submission continues | E2E |
| Session expired mid-use | Redirect to login | E2E |
| Deep link without auth | Redirect with return URL | E2E |
| Mobile viewport | Responsive layout | E2E |
| Slow network (3G) | Graceful degradation | E2E |

---

## Test Data & Mocking Strategies

### OpenAI Mocking Strategy

The agent orchestrator (`server/services/agent-orchestrator.ts`) uses the OpenAI SDK for server-side API calls. For testing, we need to mock the OpenAI module directly using Vitest's `vi.mock()`.

#### Method 1: Direct Module Mock (Recommended for Unit Tests)

```typescript
// mocks/openai.ts
import { vi } from 'vitest';

export const mockChatCompletionsCreate = vi.fn();

export const mockOpenAI = {
  chat: {
    completions: {
      create: mockChatCompletionsCreate
    }
  }
};

// Set default mock response
mockChatCompletionsCreate.mockResolvedValue({
  choices: [{
    message: {
      content: JSON.stringify({
        executiveSummary: "Mock analysis complete",
        findings: [{
          title: "Mock Finding",
          description: "Test finding description",
          severity: "medium",
          confidence: 0.85,
          evidence: ["Evidence 1", "Evidence 2"]
        }],
        recommendations: [{
          action: "Mock recommendation",
          priority: "high",
          estimatedImpact: "$10,000",
          timeline: "7 days"
        }],
        riskScore: 65,
        recoveryPotential: 50000
      })
    }
  }]
});

// Reset mock between tests
export function resetOpenAIMock() {
  mockChatCompletionsCreate.mockClear();
}
```

```typescript
// server/__tests__/services/agent-orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockOpenAI, mockChatCompletionsCreate, resetOpenAIMock } from '../../../mocks/openai';

// Mock OpenAI module BEFORE importing agent-orchestrator
vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI)
}));

// Now import the module under test
import { runAgent } from '../../services/agent-orchestrator';

describe('Agent Orchestrator', () => {
  beforeEach(() => {
    resetOpenAIMock();
  });

  it('should call OpenAI with correct prompts', async () => {
    const result = await runAgent({
      entityId: 'provider-123',
      entityType: 'provider',
      entityName: 'Test Hospital',
      agentId: 'billing_patterns',
      agentName: 'Billing Patterns Agent',
      phase: 'A1'
    });

    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        response_format: { type: 'json_object' }
      })
    );
    expect(result.status).toBe('completed');
  });

  it('should generate fallback report on API failure', async () => {
    mockChatCompletionsCreate.mockRejectedValueOnce(new Error('API Error'));

    const result = await runAgent({
      entityId: 'provider-123',
      entityType: 'provider',
      entityName: 'Test Hospital',
      agentId: 'billing_patterns',
      agentName: 'Billing Patterns Agent',
      phase: 'A1'
    });

    expect(result.status).toBe('completed');
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
```

#### Method 2: MSW Node for Integration Tests

For integration tests that need to mock HTTP requests at the network level:

```typescript
// mocks/msw-handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Replit AI Integration endpoint (used when AI_INTEGRATIONS_OPENAI_BASE_URL is set)
  http.post(/.*modelfarm\.replit\.com.*/, () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: JSON.stringify({
            executiveSummary: "AI Analysis Complete",
            findings: [],
            recommendations: [],
            riskScore: 50,
            recoveryPotential: 25000
          })
        }
      }]
    });
  }),

  // Mock direct OpenAI API (fallback)
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: JSON.stringify({
            executiveSummary: "Direct API response",
            findings: [],
            recommendations: [],
            riskScore: 45,
            recoveryPotential: 30000
          })
        }
      }]
    });
  })
];
```

```typescript
// test-utils/msw-setup.ts
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/msw-handlers';

// Create MSW server for Node.js (backend integration tests)
export const mswServer = setupServer(...handlers);

// Usage in Vitest setup file
// test-utils/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { mswServer } from './msw-setup';

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
```

> **Note:** MSW v2 uses `http` and `HttpResponse` instead of the v1 `rest` API. The handlers above are compatible with MSW v2.x.

### Test Database Strategy

#### Option 1: In-Memory SQLite (Fast, Isolated)

```typescript
// test-utils/db.ts

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';

export function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  
  // Apply migrations or create tables
  sqlite.exec(/* SQL schema */);
  
  return db;
}
```

#### Option 2: PostgreSQL Test Container (Realistic)

```typescript
// test-utils/testcontainers.ts

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

let container: PostgreSqlContainer;
let testDb: ReturnType<typeof drizzle>;

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer()
    .withDatabase('test')
    .start();
  
  const connectionString = container.getConnectionUri();
  const client = postgres(connectionString);
  testDb = drizzle(client);
  
  // Run migrations
  await migrate(testDb);
  
  return testDb;
}

export async function teardownTestDatabase() {
  await container?.stop();
}
```

#### Option 3: Transaction Rollback (Shared DB)

```typescript
// test-utils/transaction.ts

import { db } from '../server/db';

export async function withTransaction<T>(
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    const result = await fn(tx);
    // Always rollback - changes never persist
    throw new Error('ROLLBACK');
  }).catch(err => {
    if (err.message === 'ROLLBACK') return undefined as T;
    throw err;
  });
}
```

### Test Data Factories

```typescript
// test-utils/factories.ts

import { faker } from '@faker-js/faker';
import type { InsertUser, InsertPreAuthClaim, InsertFwaCase } from '@shared/schema';

export function createTestUser(overrides: Partial<InsertUser> = {}): InsertUser {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: 'hashedpassword',
    role: 'viewer',
    isActive: true,
    ...overrides
  };
}

export function createTestPreAuthClaim(overrides: Partial<InsertPreAuthClaim> = {}): InsertPreAuthClaim {
  return {
    claimId: `PA-${faker.string.alphanumeric(8).toUpperCase()}`,
    patientName: faker.person.fullName(),
    patientId: `P-${faker.string.numeric(6)}`,
    providerId: `PROV-${faker.string.numeric(4)}`,
    providerName: faker.company.name() + ' Hospital',
    procedureCode: faker.helpers.arrayElement(['99213', '99214', '99215', '90834']),
    icdCodes: [faker.helpers.arrayElement(['J06.9', 'M54.5', 'I10', 'E11.9'])],
    requestedAmount: faker.number.float({ min: 100, max: 10000, precision: 2 }),
    status: 'pending',
    priority: faker.helpers.arrayElement(['normal', 'urgent', 'stat']),
    ...overrides
  };
}

export function createTestFwaCase(overrides: Partial<InsertFwaCase> = {}): InsertFwaCase {
  return {
    claimId: `CLM-${faker.string.alphanumeric(8).toUpperCase()}`,
    providerId: `PROV-${faker.string.numeric(4)}`,
    providerName: faker.company.name() + ' Medical Center',
    patientId: `P-${faker.string.numeric(6)}`,
    patientName: faker.person.fullName(),
    totalAmount: faker.number.float({ min: 1000, max: 100000, precision: 2 }),
    flaggedAmount: faker.number.float({ min: 500, max: 50000, precision: 2 }),
    status: 'open',
    phase: 'A1',
    priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
    fwaType: faker.helpers.arrayElement(['upcoding', 'unbundling', 'phantom_billing']),
    riskScore: faker.number.int({ min: 0, max: 100 }),
    ...overrides
  };
}

export function createTestPatient360(overrides = {}) {
  return {
    patientId: `P-${faker.string.numeric(6)}`,
    demographics: {
      name: faker.person.fullName(),
      dob: faker.date.birthdate().toISOString(),
      gender: faker.helpers.arrayElement(['M', 'F']),
      mrn: faker.string.numeric(10)
    },
    chronicConditions: ['Diabetes', 'Hypertension'],
    visitHistory: [],
    claimsSummary: { totalClaims: 15, totalAmount: 25000 },
    fwaAlerts: [],
    behavioralPatterns: {},
    aiNarrative: 'Patient 360 view generated',
    riskAssessment: { score: 45, level: 'medium' },
    ...overrides
  };
}
```

### Environment Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-utils/setup.ts'],
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'test-utils/**',
        '**/*.d.ts',
        'mocks/**'
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './client/src')
    }
  }
});
```

```typescript
// test-utils/setup.ts

import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Global test environment setup
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
```

---

## Testing Roadmap

### Phase 1: Security Foundation (Week 1-2)
**Priority: P0 - CRITICAL**

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Install Vitest + testing dependencies | 2h | - | Pending |
| Set up test configuration | 2h | - | Pending |
| Unit tests: `auth.ts` (100% coverage) | 4h | - | Pending |
| Unit tests: `csrf.ts` (100% coverage) | 2h | - | Pending |
| Unit tests: `audit.ts` (95% coverage) | 3h | - | Pending |
| Unit tests: `input-sanitizer.ts` | 2h | - | Pending |
| Unit tests: `data-redaction.ts` | 2h | - | Pending |
| Integration tests: Auth endpoints | 4h | - | Pending |

**Deliverables:**
- [ ] 95%+ coverage on security middleware
- [ ] All RBAC scenarios tested
- [ ] Audit logging verified
- [ ] HIPAA compliance tests pass

### Phase 2: API Integration Tests (Week 3-4)
**Priority: P1 - HIGH**

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Set up MSW for OpenAI mocking | 2h | - | Pending |
| Set up test database strategy | 4h | - | Pending |
| Integration tests: Pre-Auth API (44 endpoints) | 8h | - | Pending |
| Integration tests: FWA API (37 endpoints) | 8h | - | Pending |
| Integration tests: Claims API (27 endpoints) | 6h | - | Pending |
| Integration tests: Provider API (21 endpoints) | 4h | - | Pending |

**Deliverables:**
- [ ] 80%+ coverage on route handlers
- [ ] All CRUD operations tested
- [ ] Validation error scenarios covered
- [ ] Rate limiting verified

### Phase 3: AI Agent Testing (Week 5-6)
**Priority: P2 - MEDIUM**

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Unit tests: `agent-orchestrator.ts` | 6h | - | Pending |
| Unit tests: `openai-utils.ts` | 2h | - | Pending |
| Mock AI response scenarios | 4h | - | Pending |
| Integration tests: Agent execution flows | 6h | - | Pending |
| Test RLHF feedback loop | 4h | - | Pending |

**Deliverables:**
- [ ] 75%+ coverage on agent orchestrator
- [ ] All 36 agent types have mock responses
- [ ] Fallback scenarios tested
- [ ] Retry logic verified

### Phase 4: E2E Testing (Week 7-8)
**Priority: P2 - MEDIUM**

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Install Playwright | 1h | - | Pending |
| Set up E2E test infrastructure | 2h | - | Pending |
| E2E: Authentication flows | 4h | - | Pending |
| E2E: Pre-Auth workflow | 6h | - | Pending |
| E2E: FWA case management | 6h | - | Pending |
| E2E: Context 360 views | 4h | - | Pending |

**Deliverables:**
- [ ] Critical user journeys automated
- [ ] Cross-browser testing configured
- [ ] Visual regression baseline established

### Phase 5: Advanced Testing (Week 9-10)
**Priority: P3 - LOW**

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Integration tests: Context 360 API | 4h | - | Pending |
| Integration tests: Simulation Lab API | 4h | - | Pending |
| Integration tests: Graph Analysis API | 4h | - | Pending |
| Load testing setup (k6 or Artillery) | 4h | - | Pending |
| Performance benchmarks | 4h | - | Pending |

**Deliverables:**
- [ ] Full API coverage
- [ ] Performance baselines established
- [ ] Load test scenarios documented

### Test Automation Pipeline

```yaml
# .github/workflows/test.yml (example)

name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## Implementation Guidelines

### Directory Structure

```
project/
├── server/
│   ├── __tests__/
│   │   ├── middleware/
│   │   │   ├── auth.test.ts
│   │   │   ├── audit.test.ts
│   │   │   └── csrf.test.ts
│   │   ├── integration/
│   │   │   ├── auth.test.ts
│   │   │   ├── preauth.test.ts
│   │   │   ├── fwa.test.ts
│   │   │   └── provider.test.ts
│   │   ├── services/
│   │   │   ├── agent-orchestrator.test.ts
│   │   │   └── claims-pipeline.test.ts
│   │   └── utils/
│   │       ├── openai-utils.test.ts
│   │       └── input-sanitizer.test.ts
├── client/
│   └── src/
│       └── __tests__/
│           ├── components/
│           └── hooks/
├── e2e/
│   ├── auth-flow.spec.ts
│   ├── preauth-workflow.spec.ts
│   ├── fwa-management.spec.ts
│   └── context-360.spec.ts
├── test-utils/
│   ├── setup.ts
│   ├── db.ts
│   ├── factories.ts
│   └── mocks.ts
├── mocks/
│   ├── handlers.ts
│   └── openai.ts
├── vitest.config.ts
└── playwright.config.ts
```

### Package Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.16",
    "msw": "^2.0.0",
    "@faker-js/faker": "^8.0.0",
    "@playwright/test": "^1.40.0",
    "@testcontainers/postgresql": "^10.0.0"
  }
}
```

### npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage --coverage.reporter=html"
  }
}
```

### Best Practices

1. **Isolation**: Each test should be independent and not rely on external state
2. **Speed**: Unit tests should complete in <100ms, integration tests <5s
3. **Clarity**: Test names should describe the scenario: `it('should return 401 when session is expired')`
4. **Coverage**: Aim for 80%+ line coverage, 70%+ branch coverage
5. **Mocking**: Mock external dependencies (OpenAI, external APIs) but test real database interactions
6. **Data Cleanup**: Use transactions or truncate tables between tests
7. **CI Integration**: Run tests on every PR and merge to main
8. **Security Tests**: Include negative tests (unauthorized access, invalid input)
9. **HIPAA Compliance**: Verify audit logs are created for PHI access
10. **Performance**: Track test execution time and optimize slow tests

---

## Appendix A: Test Coverage Matrix

| Module | Unit | Integration | E2E | Total Target |
|--------|------|-------------|-----|--------------|
| Authentication | 95% | 90% | 80% | 90% |
| Authorization | 95% | 90% | 80% | 90% |
| Audit Logging | 95% | 85% | - | 90% |
| Pre-Authorization | 80% | 85% | 75% | 80% |
| FWA Detection | 80% | 85% | 75% | 80% |
| Claims Management | 80% | 80% | 70% | 77% |
| Provider Relations | 75% | 75% | 60% | 70% |
| Context 360 | 75% | 75% | 60% | 70% |
| Simulation Lab | 70% | 70% | 50% | 63% |
| Graph Analysis | 70% | 70% | 50% | 63% |

## Appendix B: Test Environment Requirements

| Environment | Database | AI API | Purpose |
|-------------|----------|--------|---------|
| Local Dev | PostgreSQL (Neon) | Mock | Development testing |
| CI | PostgreSQL Container | Mock | Automated pipeline |
| Staging | PostgreSQL Replica | Real OpenAI | Pre-production validation |
| Production | - | - | No tests in production |

## Appendix C: Security Test Checklist

- [ ] Authentication bypass attempts blocked
- [ ] Session fixation prevented
- [ ] CSRF protection enforced
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (input sanitization)
- [ ] Rate limiting enforced
- [ ] Role-based access control verified
- [ ] PHI access logged (HIPAA)
- [ ] Sensitive data not exposed in errors
- [ ] Secure headers applied (Helmet.js)
