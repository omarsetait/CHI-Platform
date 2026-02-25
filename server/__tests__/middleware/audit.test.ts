import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuditLog, auditDataAccess, auditMiddleware } from '../../middleware/audit';
import { createMockRequest, createMockResponse, createMockNext, createAuthenticatedRequest } from '../../../test-utils/mock-request';

// Mock the storage module
vi.mock('../../storage', () => ({
  storage: {
    createAuditLog: vi.fn().mockResolvedValue({ id: 'audit-123' })
  }
}));

describe('Audit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create audit log entry with all required fields', async () => {
      const { storage } = await import('../../storage');
      
      await createAuditLog({
        userId: 'user-123',
        action: 'VIEW_PATIENT_360',
        resourceType: 'patient_360',
        resourceId: 'patient-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: 'VIEW_PATIENT_360',
          resourceType: 'patient_360',
          resourceId: 'patient-456'
        })
      );
    });

    it('should create audit log with minimal fields', async () => {
      const { storage } = await import('../../storage');
      
      await createAuditLog({
        action: 'LOGIN_FAILED'
      });
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED'
        })
      );
    });

    it('should handle optional details field', async () => {
      const { storage } = await import('../../storage');
      
      await createAuditLog({
        userId: 'user-123',
        action: 'UPDATE_CLAIM',
        resourceType: 'claim',
        resourceId: 'claim-789',
        details: { 
          previousStatus: 'pending', 
          newStatus: 'approved' 
        }
      });
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            previousStatus: 'pending',
            newStatus: 'approved'
          })
        })
      );
    });

    it('should not throw when storage fails', async () => {
      const { storage } = await import('../../storage');
      (storage.createAuditLog as any).mockRejectedValueOnce(new Error('Database error'));
      
      // Should not throw, just log the error
      await expect(createAuditLog({
        action: 'TEST_ACTION'
      })).resolves.not.toThrow();
    });
  });

  describe('auditDataAccess', () => {
    it('should return 401 when no user is authenticated', async () => {
      const middleware = auditDataAccess('patient_360');
      const req = createMockRequest({ user: null as any });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should log access and call next for authenticated users', async () => {
      const { storage } = await import('../../storage');
      const middleware = auditDataAccess('patient_360');
      const req = createAuthenticatedRequest('user-123', 'admin', {
        params: { patientId: 'patient-456' },
        method: 'GET',
        path: '/api/context/patient-360/patient-456'
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(next).toHaveBeenCalled();
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: 'VIEW_PATIENT_360',
          resourceType: 'patient_360'
        })
      );
    });

    it('should capture IP address in audit log', async () => {
      const { storage } = await import('../../storage');
      const middleware = auditDataAccess('provider_360');
      const req = createAuthenticatedRequest('user-123', 'fwa_analyst', {
        params: { providerId: 'provider-789' },
        ip: '10.0.0.50'
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.50'
        })
      );
    });

    it('should capture user agent in audit log', async () => {
      const { storage } = await import('../../storage');
      const middleware = auditDataAccess('doctor_360');
      const req = createAuthenticatedRequest('user-123', 'claims_reviewer', {
        params: { doctorId: 'doctor-101' }
      });
      // Override the get function to return a specific user agent
      (req.get as any) = vi.fn((header: string) => {
        if (header.toLowerCase() === 'user-agent') {
          return 'TestBrowser/1.0';
        }
        return undefined;
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'TestBrowser/1.0'
        })
      );
    });

    it('should include request details in audit log', async () => {
      const { storage } = await import('../../storage');
      const middleware = auditDataAccess('fwa_case');
      const req = createAuthenticatedRequest('user-123', 'admin', {
        params: { caseId: 'case-555' },
        method: 'GET',
        path: '/api/fwa/cases/case-555',
        query: { includeDetails: 'true' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            method: 'GET',
            path: '/api/fwa/cases/case-555'
          })
        })
      );
    });

    it('should capture resourceId from params', async () => {
      const { storage } = await import('../../storage');
      const middleware = auditDataAccess('patient_360');
      const req = createAuthenticatedRequest('user-123', 'admin', {
        params: { patientId: 'specific-patient-id' },
        method: 'GET',
        path: '/api/context/patient-360/specific-patient-id'
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'specific-patient-id'
        })
      );
    });
  });

  describe('auditMiddleware', () => {
    it('should call next immediately', async () => {
      const middleware = auditMiddleware('CREATE_CLAIM', 'claim');
      const req = createAuthenticatedRequest('user-123', 'claims_reviewer');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should wrap res.json to log on success', async () => {
      const { storage } = await import('../../storage');
      const middleware = auditMiddleware('CREATE_CLAIM', 'claim');
      const req = createAuthenticatedRequest('user-123', 'claims_reviewer', {
        params: { id: 'claim-123' },
        method: 'POST',
        path: '/api/claims'
      });
      
      // Create a mock response with proper statusCode
      const res = createMockResponse();
      (res as any).statusCode = 201;
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      // Trigger the wrapped json method
      (res.json as any)({ id: 'new-claim-id', status: 'created' });
      
      // Wait for async audit log
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(storage.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: 'CREATE_CLAIM',
          resourceType: 'claim'
        })
      );
    });

    it('should not log on error responses', async () => {
      const { storage } = await import('../../storage');
      const middleware = auditMiddleware('UPDATE_CLAIM', 'claim');
      const req = createAuthenticatedRequest('user-123', 'claims_reviewer');
      
      const res = createMockResponse();
      (res as any).statusCode = 400; // Error status
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      // Trigger the wrapped json method with error status
      (res.json as any)({ error: 'Validation failed' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should NOT have been called because statusCode is 400
      expect(storage.createAuditLog).not.toHaveBeenCalled();
    });
  });
});
