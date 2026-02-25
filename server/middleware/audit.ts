import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { InsertAuditLog } from "@shared/schema";

export async function createAuditLog(logData: Partial<InsertAuditLog>): Promise<void> {
  try {
    await storage.createAuditLog({
      userId: logData.userId || null,
      action: logData.action || "UNKNOWN",
      resourceType: logData.resourceType || "unknown",
      resourceId: logData.resourceId || null,
      ipAddress: logData.ipAddress || null,
      userAgent: logData.userAgent || null,
      details: logData.details || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export function auditMiddleware(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalEnd = res.end;
    const originalJson = res.json;

    res.json = function(body: any): Response {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.id || req.params.caseId || req.params.claimId || body?.id;
        
        createAuditLog({
          userId: req.user?.id,
          action,
          resourceType,
          resourceId: resourceId?.toString(),
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get("User-Agent"),
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

export function auditDataAccess(resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.id) {
      await createAuditLog({
        userId: req.user.id,
        action: `VIEW_${resourceType.toUpperCase()}`,
        resourceType,
        resourceId: req.params.id || req.params.patientId || req.params.providerId || req.params.doctorId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          userRole: req.user.role,
          username: req.user.username,
        },
      });
    }
    next();
  };
}
