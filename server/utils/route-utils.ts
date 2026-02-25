import { Response } from "express";
import { z } from "zod";

export function handleRouteError(
  error: unknown,
  res: Response,
  routePath: string,
  operation: string = "process request"
): void {
  console.error(`Error in ${routePath}:`, error);
  
  if (error instanceof z.ZodError) {
    res.status(400).json({ 
      error: "Validation failed", 
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes("not found") || error.message.includes("Not found")) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      res.status(409).json({ error: error.message });
      return;
    }

    if (error.message.includes("ECONNREFUSED") || error.message.includes("database")) {
      res.status(503).json({ error: "Database temporarily unavailable" });
      return;
    }
  }

  res.status(500).json({ 
    error: `Failed to ${operation}`,
    message: error instanceof Error ? error.message : "Unknown error"
  });
}
