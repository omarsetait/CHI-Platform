import { z } from "zod";

export function sanitizeForAI(input: string): string {
  if (!input) return "";
  
  let sanitized = input
    .replace(/[<>]/g, "") // Remove potential HTML/script tags
    .replace(/\{[\s\S]*?\}/g, (match) => {
      // Preserve JSON objects but remove code blocks
      try {
        JSON.parse(match);
        return match;
      } catch {
        return "";
      }
    })
    .trim();

  // Limit length to prevent prompt injection attacks
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeForAI(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === "string" ? sanitizeForAI(item) : 
        typeof item === "object" ? sanitizeObject(item) : item
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export const letterGenerationSchema = z.object({
  type: z.enum(["provider_notice", "regulatory_report", "warning_letter", "settlement_proposal"]),
  caseId: z.string().min(1),
  providerId: z.string().optional(),
  recipientName: z.string().max(200).optional(),
  recipientAddress: z.string().max(500).optional(),
  subject: z.string().max(500).optional(),
  content: z.string().max(10000).optional(),
});

export const reportGenerationSchema = z.object({
  agentId: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityName: z.string().min(1).max(200),
  phase: z.number().int().min(1).max(3),
});

export const dreamReportSchema = z.object({
  providerId: z.string().min(1).max(100),
  providerName: z.string().min(1).max(200),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export const simulationSchema = z.object({
  sourceType: z.string().max(50).optional(),
  sourceId: z.string().max(100).optional(),
  twinData: z.any().optional(),
  purpose: z.string().max(500).optional(),
  status: z.string().max(50).optional(),
});

export const actionSchema = z.object({
  caseId: z.string().min(1),
  actionType: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  assignedTo: z.string().max(200).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  dueDate: z.string().optional(),
});

export const context360Schema = z.object({
  patientId: z.string().max(100).optional(),
  providerId: z.string().max(100).optional(),
  doctorId: z.string().max(100).optional(),
  forceRefresh: z.boolean().optional(),
});
