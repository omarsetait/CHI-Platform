import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Create a mock Express request
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  const headers: Record<string, string> = {
    'user-agent': 'Test Agent',
    'content-type': 'application/json',
    ...overrides.headers as Record<string, string>
  };
  
  return {
    session: {},
    user: null,
    body: {},
    params: {},
    query: {},
    headers,
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    originalUrl: overrides.path || '/',
    protocol: 'http',
    socket: { remoteAddress: '127.0.0.1' },
    get: vi.fn((header: string) => headers[header.toLowerCase()]),
    header: vi.fn((header: string) => headers[header.toLowerCase()]),
    ...overrides
  } as unknown as Request;
}

// Create a mock Express response
export function createMockResponse(): Response & { 
  _status: number; 
  _json: any; 
  _headers: Record<string, string>;
} {
  const res = {
    _status: 200,
    _json: null,
    _headers: {} as Record<string, string>,
    status: vi.fn(function(this: any, code: number) {
      this._status = code;
      return this;
    }),
    json: vi.fn(function(this: any, data: any) {
      this._json = data;
      return this;
    }),
    send: vi.fn(function(this: any, data: any) {
      this._json = data;
      return this;
    }),
    setHeader: vi.fn(function(this: any, name: string, value: string) {
      this._headers[name] = value;
      return this;
    }),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis()
  };
  
  return res as unknown as Response & { 
    _status: number; 
    _json: any; 
    _headers: Record<string, string>;
  };
}

// Create a mock next function
export function createMockNext() {
  return vi.fn() as unknown as NextFunction;
}

// Helper to create authenticated request
export function createAuthenticatedRequest(
  userId: string, 
  role: string = 'viewer',
  overrides: Partial<Request> = {}
): Request {
  return createMockRequest({
    session: { userId } as any,
    user: { id: userId, role, username: 'testuser', email: 'test@example.com' } as any,
    ...overrides
  });
}

// Helper to create admin request
export function createAdminRequest(overrides: Partial<Request> = {}): Request {
  return createAuthenticatedRequest('admin-user-id', 'admin', overrides);
}
