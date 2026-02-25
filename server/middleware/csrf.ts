import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import "express-session";

declare module "express-session" {
  interface SessionData {
    csrfToken: string;
  }
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  
  if (safeMethod) {
    next();
    return;
  }

  if (!req.session) {
    res.status(403).json({ error: "Session required for CSRF protection" });
    return;
  }

  const tokenFromHeader = req.get("X-CSRF-Token");
  const tokenFromBody = req.body?._csrf;
  const providedToken = tokenFromHeader || tokenFromBody;
  const sessionToken = req.session.csrfToken;

  if (!providedToken || !sessionToken || providedToken !== sessionToken) {
    res.status(403).json({ error: "Invalid or missing CSRF token" });
    return;
  }

  next();
}

export function ensureCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (req.session && !req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  next();
}
