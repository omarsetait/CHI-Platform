import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";

import { registerPreAuthRoutes } from "./routes/preauth-routes";
import { registerFwaRoutes } from "./routes/fwa-routes";
import { registerClaimsRoutes, registerClaimsPipelineRoutes } from "./routes/claims-routes";
import { registerDocumentRoutes } from "./routes/document-routes";
import { registerProviderRoutes } from "./routes/provider-routes";
import { registerContextRoutes } from "./routes/context-routes";
import { registerSimulationRoutes } from "./routes/simulation-routes";
import { registerFindingsRoutes } from "./routes/findings-routes";
import { registerETLRoutes } from "./routes/etl-routes";
import { registerSemanticRoutes } from "./routes/semantic-routes";
import { registerPillarRoutes } from "./routes/pillar-routes";
import authRoutes from "./routes/auth-routes";
import { registerPipelineRoutes } from "./routes/pipeline-routes";
import { loadUserFromSession, requireAuth } from "./middleware/auth";
import { csrfProtection, ensureCsrfToken } from "./middleware/csrf";

/**
 * Utility function to handle errors consistently across all API routes.
 * - Logs errors with console.error for debugging/monitoring
 * - Differentiates between client errors (4xx) and server errors (5xx)
 * - Handles specific error types (Zod validation, database errors)
 * - Returns consistent error response format: { error: string, details?: any }
 */
function handleRouteError(
  res: import("express").Response,
  error: unknown,
  routePath: string,
  operation: string = "process request"
): void {
  console.error(`Error in ${routePath}:`, error);
  
  if (error instanceof z.ZodError) {
    res.status(400).json({ 
      error: "Validation failed", 
      details: error.errors 
    });
    return;
  }
  
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusError = error as { statusCode: number; message?: string };
    const statusCode = statusError.statusCode;
    res.status(statusCode).json({ 
      error: statusError.message || `Failed to ${operation}`,
      details: statusCode >= 500 ? undefined : statusError.message
    });
    return;
  }
  
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('connection') || errorMessage.includes('econnrefused')) {
      res.status(503).json({ 
        error: "Service temporarily unavailable", 
        details: "Database connection error" 
      });
      return;
    }
    
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('constraint')) {
      res.status(409).json({ 
        error: "Conflict", 
        details: error.message 
      });
      return;
    }
  }
  
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ 
    error: `Failed to ${operation}`, 
    details: message 
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgStore = connectPgSimple(session);
  const MemoryStore = createMemoryStore(session);
  const useMemorySessionStore = process.env.SESSION_STORE === "memory";
  const sessionStore = useMemorySessionStore
    ? new MemoryStore({
        checkPeriod: 24 * 60 * 60 * 1000,
      })
    : new PgStore({
        conString: process.env.DATABASE_URL,
        tableName: "user_sessions",
        createTableIfMissing: true,
      });
  
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
    name: 'sessionId',
  }));

  app.use(loadUserFromSession);
  app.use(ensureCsrfToken);
  
  app.use('/api/auth', authRoutes);
  
  const exemptAuthPaths = [
    '/api/auth',
    '/api/admin/seed-database', // Protected by token-based auth, not session
    '/api/admin/verify-database', // Protected by token-based auth, not session
    '/api/admin/populate-rule-violations', // Protected by token-based auth, not session
    '/api/admin/seed-audit-sessions', // Protected by token-based auth, not session
    // FWA Module - always accessible (demo platform for CHI presentation)
    '/api/fwa',
    '/api/generate-letter',
    '/api/weight-proposals',
    '/api/rlhf',
    '/api/documents',
    // Provider Relations - always accessible
    '/api/provider-relations',
    // Pre-Auth - always accessible
    '/api/pre-auth',
    // Claims - always accessible
    '/api/claims',
    // Context 360 - always accessible
    '/api/context',
    // Simulation Lab - always accessible
    '/api/simulation',
    // Graph Analysis - always accessible
    '/api/graph-analysis',
    // Findings - always accessible
    '/api/findings',
    // ETL - always accessible
    '/api/etl',
    // Demo data endpoints - always accessible
    '/api/demo',
    // Knowledge documents - always accessible for CHI demo
    '/api/knowledge-documents',
    // Additional development-only paths
    ...(process.env.NODE_ENV !== 'production' ? [
      // Provider Relations
      '/api/provider-relations/benchmarks',
      '/api/provider-relations/cpm-analytics',
      '/api/provider-relations/evidence-packs',
      '/api/provider-relations/providers',
      '/api/provider-relations/directory',
      '/api/provider-relations/settlements',
      '/api/provider-relations/sessions',
      '/api/provider-relations/contracts',
      '/api/provider-relations/communications',
      '/api/provider-relations/kpi-definitions',
      '/api/provider-relations/kpi-dashboard',
      '/api/provider-relations/kpi-results',
      '/api/provider-relations/provider-rankings',
      '/api/provider-relations/operational-findings',
      '/api/provider-relations/dream-reports',
      '/api/provider-relations/seed-demo-claims',
      // FWA Module
      '/api/fwa',
      '/api/generate-letter',
      '/api/weight-proposals',
      '/api/rlhf',
      '/api/documents',
      '/api/knowledge-documents',
      // Simulation Lab
      '/api/simulation',
      // Graph Analysis
      '/api/graph-analysis',
      // Context 360
      '/api/context',
      // Pre-Auth
      '/api/pre-auth',
      // Claims
      '/api/claims',
      // Demo data endpoints
      '/api/demo',
      // Findings (View Related Claims feature)
      '/api/findings',
      // ETL Bulk Ingestion
      '/api/etl',
      // Pipeline (internal access)
      '/api/pipeline',
    ] : []),
  ];
  
  app.use('/api', (req, res, next) => {
    if (exemptAuthPaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }
    csrfProtection(req, res, next);
  });
  
  app.use('/api', (req, res, next) => {
    if (exemptAuthPaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }
    requireAuth(req, res, next);
  });
  
  registerPreAuthRoutes(app, storage, handleRouteError);
  registerFwaRoutes(app, storage, handleRouteError);
  registerClaimsRoutes(app, storage, handleRouteError);
  await registerClaimsPipelineRoutes(app, handleRouteError);
  registerPipelineRoutes(app);
  registerDocumentRoutes(app, storage, handleRouteError);
  registerProviderRoutes(app, storage, handleRouteError);
  registerContextRoutes(app, storage, handleRouteError);
  registerSimulationRoutes(app, storage, handleRouteError);
  registerFindingsRoutes(app, storage, handleRouteError);
  registerETLRoutes(app);
  registerSemanticRoutes(app, handleRouteError);
  registerPillarRoutes(app, handleRouteError);

  const httpServer = createServer(app);

  return httpServer;
}
