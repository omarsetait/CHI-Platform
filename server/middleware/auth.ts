import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    csrfToken: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

export type UserRole = "admin" | "claims_reviewer" | "fwa_analyst" | "provider_manager" | "auditor" | "viewer";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  fwa_analyst: 80,
  claims_reviewer: 70,
  provider_manager: 60,
  auditor: 50,
  viewer: 10,
};

const RESOURCE_PERMISSIONS: Record<string, UserRole[]> = {
  "claims:read": ["admin", "claims_reviewer", "fwa_analyst", "auditor", "viewer"],
  "claims:write": ["admin", "claims_reviewer"],
  "fwa:read": ["admin", "fwa_analyst", "auditor", "viewer"],
  "fwa:write": ["admin", "fwa_analyst"],
  "provider:read": ["admin", "provider_manager", "fwa_analyst", "auditor", "viewer"],
  "provider:write": ["admin", "provider_manager"],
  "preauth:read": ["admin", "claims_reviewer", "auditor", "viewer"],
  "preauth:write": ["admin", "claims_reviewer"],
  "context:read": ["admin", "fwa_analyst", "claims_reviewer", "auditor"],
  "simulation:read": ["admin", "fwa_analyst", "auditor"],
  "simulation:write": ["admin", "fwa_analyst"],
  "admin:read": ["admin"],
  "admin:write": ["admin"],
  "audit:read": ["admin", "auditor"],
};

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userRole = req.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userRole = req.user.role as UserRole;
    const allowedRoles = RESOURCE_PERMISSIONS[permission] || [];

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ 
        error: "Insufficient permissions", 
        required: permission 
      });
      return;
    }

    next();
  };
}

export async function loadUserFromSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.session?.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        };
      }
    } catch (error) {
      console.error("Error loading user from session:", error);
    }
  }
  next();
}

export function sanitizeUserOutput(user: any): Omit<typeof user, "password"> {
  const { password, ...safeUser } = user;
  return safeUser;
}
