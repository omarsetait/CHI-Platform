import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, requireAuth, requireRole, requirePermission, sanitizeUserOutput, loadUserFromSession } from '../../middleware/auth';
import { createMockRequest, createMockResponse, createMockNext, createAuthenticatedRequest } from '../../../test-utils/mock-request';

// Mock storage for loadUserFromSession tests
vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn()
  }
}));

describe('Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const hash = await hashPassword('password123');
      expect(hash).not.toBe('password123');
      expect(hash).toMatch(/^\$2[aby]?\$\d+\$/);
    });

    it('should produce different hashes for same password (salting)', async () => {
      const hash1 = await hashPassword('password123');
      const hash2 = await hashPassword('password123');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hash format', async () => {
      const hash = await hashPassword('testPassword!@#');
      // bcrypt hashes are 60 characters
      expect(hash.length).toBe(60);
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

    it('should return false for empty password', async () => {
      const hash = await hashPassword('password123');
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@$$w0rd!#$%^&*()';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });
  });

  describe('requireAuth', () => {
    it('should call next() when session has userId', async () => {
      const req = createMockRequest({
        session: { userId: 'user-123' } as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await requireAuth(req, res as any, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no session', async () => {
      const req = createMockRequest({
        session: undefined as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await requireAuth(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when session exists but no userId', async () => {
      const req = createMockRequest({
        session: {} as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await requireAuth(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for matching single role', async () => {
      const middleware = requireRole('admin');
      const req = createAuthenticatedRequest('user-123', 'admin');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for any matching role from multiple', async () => {
      const middleware = requireRole('admin', 'fwa_analyst', 'claims_reviewer');
      const req = createAuthenticatedRequest('user-123', 'fwa_analyst');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-matching role', async () => {
      const middleware = requireRole('admin');
      const req = createAuthenticatedRequest('user-123', 'viewer');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when no user is present', async () => {
      const middleware = requireRole('admin');
      const req = createMockRequest({ user: null as any });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow claims:read for claims_reviewer', async () => {
      const middleware = requirePermission('claims:read');
      const req = createAuthenticatedRequest('user-123', 'claims_reviewer');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should allow all permissions for admin', async () => {
      // Use actual permission names from RESOURCE_PERMISSIONS
      const permissions = ['claims:read', 'claims:write', 'fwa:read', 'fwa:write', 'provider:read', 'provider:write'];
      
      for (const permission of permissions) {
        const middleware = requirePermission(permission);
        const req = createAuthenticatedRequest('user-123', 'admin');
        const res = createMockResponse();
        const next = vi.fn();
        
        await middleware(req, res as any, next);
        
        expect(next).toHaveBeenCalled();
      }
    });

    it('should deny fwa:write for viewer', async () => {
      const middleware = requirePermission('fwa:write');
      const req = createAuthenticatedRequest('user-123', 'viewer');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when no user is present', async () => {
      const middleware = requirePermission('claims:read');
      const req = createMockRequest({ user: null as any });
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access for unknown/undefined permission', async () => {
      const middleware = requirePermission('nonexistent:permission');
      const req = createAuthenticatedRequest('user-123', 'admin');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      // Unknown permissions should be denied - empty allowedRoles array
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with required permission in error body', async () => {
      const middleware = requirePermission('admin:write');
      const req = createAuthenticatedRequest('user-123', 'viewer');
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req, res as any, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: 'admin:write'
      });
    });
  });

  describe('loadUserFromSession', () => {
    it('should load user from storage when session has userId', async () => {
      const { storage } = await import('../../storage');
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        isActive: true,
        password: 'hashed'
      };
      (storage.getUser as any).mockResolvedValue(mockUser);
      
      const req = createMockRequest({
        session: { userId: 'user-123' } as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await loadUserFromSession(req, res as any, next);
      
      expect(storage.getUser).toHaveBeenCalledWith('user-123');
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('user-123');
      expect(req.user?.username).toBe('testuser');
      expect(next).toHaveBeenCalled();
    });

    it('should call next without setting user when no session', async () => {
      const req = createMockRequest({
        session: {} as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await loadUserFromSession(req, res as any, next);
      
      // user starts as null in mock, and is not set by middleware
      expect(req.user).toBeFalsy();
      expect(next).toHaveBeenCalled();
    });

    it('should call next without setting user when user not found', async () => {
      const { storage } = await import('../../storage');
      (storage.getUser as any).mockResolvedValue(null);
      
      const req = createMockRequest({
        session: { userId: 'nonexistent-user' } as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await loadUserFromSession(req, res as any, next);
      
      expect(req.user).toBeFalsy();
      expect(next).toHaveBeenCalled();
    });

    it('should call next without setting user when user is inactive', async () => {
      const { storage } = await import('../../storage');
      (storage.getUser as any).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'viewer',
        isActive: false
      });
      
      const req = createMockRequest({
        session: { userId: 'user-123' } as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await loadUserFromSession(req, res as any, next);
      
      expect(req.user).toBeFalsy();
      expect(next).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      const { storage } = await import('../../storage');
      (storage.getUser as any).mockRejectedValue(new Error('Database error'));
      
      const req = createMockRequest({
        session: { userId: 'user-123' } as any
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await loadUserFromSession(req, res as any, next);
      
      expect(req.user).toBeFalsy();
      expect(next).toHaveBeenCalled(); // Should still call next
    });
  });

  describe('sanitizeUserOutput', () => {
    it('should remove password from user object', () => {
      const user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password-value',
        role: 'viewer',
        isActive: true
      };
      
      const sanitized = sanitizeUserOutput(user);
      
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized.id).toBe('user-123');
      expect(sanitized.username).toBe('testuser');
      expect(sanitized.email).toBe('test@example.com');
    });

    it('should preserve all other user fields', () => {
      const user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password-value',
        role: 'admin',
        isActive: true,
        lastLoginAt: new Date()
      };
      
      const sanitized = sanitizeUserOutput(user);
      
      expect(sanitized.role).toBe('admin');
      expect(sanitized.isActive).toBe(true);
      expect(sanitized.lastLoginAt).toBeDefined();
    });
  });
});
