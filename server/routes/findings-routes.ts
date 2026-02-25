import type { Express } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import { withRetry } from "../utils/openai-utils";
import { sanitizeForAI } from "../utils/input-sanitizer";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const findingsClaimsQuerySchema = z.object({
  source: z.enum(["dream_report", "operational", "fwa"]),
  sample: z.string().optional(),
  limit: z.string().optional(),
  reportId: z.string().optional(),
  providerId: z.string().optional(),
  findingTitle: z.string().optional(),
});

export function registerFindingsRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  app.get("/api/findings/:findingId/claims", async (req, res) => {
    try {
      const { findingId } = req.params;
      const query = findingsClaimsQuerySchema.parse(req.query);
      const { source, sample, limit, reportId, providerId: queryProviderId, findingTitle } = query;
      const isSample = sample === "true";
      const limitNum = limit ? parseInt(limit, 10) : 50;

      let claimIds: string[] = [];
      let providerId: string | null = queryProviderId || null;

      if (source === "dream_report") {
        // Use providerId from query params if available, otherwise try to get from report
        if (!providerId && reportId) {
          const dreamReport = await storage.getDreamReportById(reportId);
          if (dreamReport) {
            providerId = dreamReport.providerId;
          }
        }
        
        // If still no providerId, try using findingId as reportId (fallback)
        if (!providerId) {
          const dreamReport = await storage.getDreamReportById(findingId);
          if (dreamReport) {
            providerId = dreamReport.providerId;
          }
        }
        
        if (!providerId) {
          return res.status(404).json({ error: "Provider not found for this finding" });
        }
        
        // Get all claims for this provider
        let claims = await storage.getClaimsByProviderId(providerId, { limit: 200 });
        
        // Filter claims by category if findingTitle is provided
        // Extract category keywords from finding title (e.g., "Surgery - High Cost Outlier" -> "Surgery")
        const allProviderClaims = [...claims]; // Keep original for fallback
        
        if (findingTitle) {
          const titleLower = findingTitle.toLowerCase();
          const categoryKeywords = [
            { keywords: ["surgery", "surgical", "operation"], category: "Surgery" },
            { keywords: ["emergency", "er ", "urgent", "acute"], category: "Emergency" },
            { keywords: ["dental", "orthodontic"], category: "Dental" },
            { keywords: ["maternity", "obstetric", "pregnancy", "labor", "delivery"], category: "Maternity" },
            { keywords: ["pharmacy", "medication", "drug", "prescription"], category: "Pharmacy" },
            { keywords: ["outpatient", "clinic", "consultation"], category: "Outpatient" },
            { keywords: ["inpatient", "admission", "hospitalization"], category: "Inpatient" },
            { keywords: ["diagnostic", "imaging", "radiology", "lab", "test", "mri", "ct scan", "x-ray"], category: "Diagnostic" },
            { keywords: ["therapy", "rehabilitation", "physical therapy"], category: "Therapy" },
            { keywords: ["medical", "general", "care"], category: "Medical" },
            { keywords: ["cost", "outlier", "high", "expensive", "anomaly"], category: null }, // Cost-related - use outlier filter
            { keywords: ["readmission", "revisit", "recurrence"], category: null }, // Pattern-related
          ];
          
          // Find matching category from title
          let matchedCategory: string | null = null;
          let isCostRelated = false;
          
          for (const { keywords, category } of categoryKeywords) {
            if (keywords.some(kw => titleLower.includes(kw))) {
              if (category === null) {
                isCostRelated = true;
              } else {
                matchedCategory = category;
                break;
              }
            }
          }
          
          // Filter claims by matched category
          if (matchedCategory) {
            const filteredClaims = claims.filter(claim => {
              const claimCategory = (claim.category || "").toLowerCase();
              const claimType = (claim.claimType || "").toLowerCase();
              const claimDescription = (claim.description || "").toLowerCase();
              const matchedLower = matchedCategory!.toLowerCase();
              return claimCategory.includes(matchedLower) || 
                     claimType.includes(matchedLower) ||
                     claimDescription.includes(matchedLower);
            });
            
            if (filteredClaims.length > 0) {
              claims = filteredClaims;
            }
            // If no matches, keep all provider claims (fallback)
          } else if (isCostRelated) {
            // For cost/outlier findings, prioritize high-value or high-outlier claims
            const highValueClaims = claims.filter(claim => {
              const score = parseFloat(String(claim.outlierScore || "0"));
              const amount = parseFloat(String(claim.amount || "0"));
              return score >= 0.5 || amount >= 50000; // High outlier or high amount
            });
            
            if (highValueClaims.length > 0) {
              claims = highValueClaims;
            }
            // If no matches, keep all provider claims
          }
        }
        
        // IMPORTANT: Never return empty - fallback to all provider claims
        if (claims.length === 0 && allProviderClaims.length > 0) {
          claims = allProviderClaims;
        }
        
        // Apply limit
        if (isSample && claims.length > limitNum) {
          claims = claims.slice(0, limitNum);
        }
        
        return res.json({
          claims,
          total: claims.length,
          sample: isSample,
          source: "dream_report",
          findingId,
          providerId,
        });
      }

      if (source === "operational") {
        const operationalFinding = await storage.getOperationalFindingById(findingId);
        if (!operationalFinding) {
          return res.status(404).json({ error: "Operational finding not found" });
        }
        claimIds = operationalFinding.claimIds || [];
        if (isSample && claimIds.length > limitNum) {
          claimIds = claimIds.slice(0, limitNum);
        }
        const claims = await storage.getClaimsByIds(claimIds);
        return res.json({
          claims,
          total: claims.length,
          sample: isSample,
          source: "operational",
          findingId,
          providerId: operationalFinding.providerId,
        });
      }

      if (source === "fwa") {
        const fwaCase = await storage.getFwaCaseById(findingId);
        if (fwaCase) {
          claimIds = [fwaCase.claimId];
        } else {
          const fwaFindings = await storage.getFwaAnalysisFindingsByCaseId(findingId);
          if (fwaFindings.length > 0) {
            const caseId = fwaFindings[0].caseId;
            const relatedCase = await storage.getFwaCaseById(caseId);
            if (relatedCase) {
              claimIds = [relatedCase.claimId];
            }
          }
        }
        if (claimIds.length === 0) {
          return res.status(404).json({ error: "FWA case or finding not found" });
        }
        if (isSample && claimIds.length > limitNum) {
          claimIds = claimIds.slice(0, limitNum);
        }
        const claims = await storage.getClaimsByIds(claimIds);
        return res.json({
          claims,
          total: claims.length,
          sample: isSample,
          source: "fwa",
          findingId,
          caseId: fwaCase?.id || findingId,
        });
      }

      return res.status(400).json({ error: "Invalid source type" });
    } catch (error) {
      handleRouteError(res, error, "/api/findings/:findingId/claims", "get claims for finding");
    }
  });

  app.get("/api/claims/:claimId/services", async (req, res) => {
    try {
      const { claimId } = req.params;

      const claim = await storage.getClaimById(claimId);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      const services = await storage.getClaimServicesByClaimId(claimId);

      return res.json({
        claimId,
        claimNumber: claim.claimNumber,
        services,
        total: services.length,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims/:claimId/services", "get services for claim");
    }
  });

  const exportSchema = z.object({
    format: z.enum(["excel", "pdf", "both"]).default("both"),
    source: z.enum(["dream_report", "operational", "fwa"]),
    includeServices: z.boolean().default(true),
    findingTitle: z.string().optional(),
    providerId: z.string().optional(),
    providerName: z.string().optional(),
  });

  app.post("/api/findings/:findingId/export", async (req, res) => {
    try {
      const { findingId } = req.params;
      const body = exportSchema.parse(req.body);
      const { format, source, includeServices, findingTitle, providerId, providerName } = body;

      let claims: any[] = [];
      let findingContext: any = {};

      if (source === "dream_report") {
        const dreamReport = await storage.getDreamReportById(findingId);
        if (!dreamReport) {
          return res.status(404).json({ error: "Dream report not found" });
        }
        claims = await storage.getClaimsByProviderId(dreamReport.providerId);
        findingContext = {
          reportId: dreamReport.id,
          providerName: dreamReport.providerName,
          periodStart: dreamReport.periodStart,
          periodEnd: dreamReport.periodEnd,
          totalPotentialAmount: dreamReport.totalPotentialAmount,
          findings: dreamReport.findings,
        };
      } else if (source === "operational") {
        const finding = await storage.getOperationalFindingById(findingId);
        if (!finding) {
          return res.status(404).json({ error: "Operational finding not found" });
        }
        claims = await storage.getClaimsByIds(finding.claimIds || []);
        findingContext = {
          findingId: finding.id,
          providerName: finding.providerName,
          findingType: finding.findingType,
          category: finding.category,
          potentialAmount: finding.potentialAmount,
          description: finding.description,
          claimCount: finding.claimCount,
        };
      } else if (source === "fwa") {
        const fwaCase = await storage.getFwaCaseById(findingId);
        if (fwaCase) {
          claims = await storage.getClaimsByIds([fwaCase.claimId]);
          const fwaFindings = await storage.getFwaAnalysisFindingsByCaseId(fwaCase.id);
          findingContext = {
            caseId: fwaCase.caseId,
            totalAmount: fwaCase.totalAmount,
            status: fwaCase.status,
            priority: fwaCase.priority,
            analysisFindings: fwaFindings,
          };
        } else {
          return res.status(404).json({ error: "FWA case not found" });
        }
      }

      let claimsWithServices = claims;
      if (includeServices) {
        claimsWithServices = await Promise.all(
          claims.map(async (claim) => {
            const services = await storage.getClaimServicesByClaimId(claim.id);
            return { ...claim, services };
          })
        );
      }

      const totalAmount = claims.reduce((sum, c) => sum + parseFloat(c.amount || "0"), 0);
      const avgAmount = claims.length > 0 ? totalAmount / claims.length : 0;
      const flaggedCount = claims.filter(c => parseFloat(c.outlierScore || "0") >= 0.8).length;

      const aiPrompt = `You are a healthcare insurance fraud analyst. Analyze the following claims data and finding context to generate an executive report.

FINDING CONTEXT:
${sanitizeForAI(JSON.stringify(findingContext, null, 2))}

CLAIMS SUMMARY:
- Total Claims: ${claims.length}
- Total Amount: SAR ${totalAmount.toLocaleString()}
- Average Amount: SAR ${avgAmount.toLocaleString()}
- Flagged Claims (high outlier score): ${flaggedCount}

SAMPLE CLAIMS DATA (first 10):
${sanitizeForAI(JSON.stringify(claimsWithServices.slice(0, 10), null, 2))}

Please provide:
1. EXECUTIVE SUMMARY (2-3 paragraphs summarizing key findings)
2. RISK ASSESSMENT (overall risk level and key risk factors)
3. PATTERN ANALYSIS (any billing patterns, anomalies, or concerns identified)
4. FINANCIAL IMPACT (total exposure, recovery potential)
5. RECOMMENDATIONS (3-5 actionable next steps)

Format your response in clear sections with bullet points where appropriate.`;

      let aiAnalysis = "";
      try {
        const response = await withRetry(() => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a senior healthcare insurance fraud investigator. Provide detailed, professional analysis of claims data with actionable insights."
            },
            {
              role: "user",
              content: aiPrompt
            }
          ],
          max_completion_tokens: 2000,
        }));
        aiAnalysis = response.choices[0]?.message?.content || "Analysis could not be generated.";
      } catch (aiError) {
        console.error("[Export] AI analysis failed:", aiError);
        aiAnalysis = "AI analysis is temporarily unavailable. Please try again later.";
      }

      let excelBuffer: Buffer | null = null;
      if (format === "excel" || format === "both") {
        const workbook = XLSX.utils.book_new();

        const claimsSummaryData = claims.map(c => ({
          "Claim ID": c.id,
          "Claim Number": c.claimNumber,
          "Provider": c.hospital,
          "Amount (SAR)": parseFloat(c.amount || "0"),
          "Claim Type": c.claimType,
          "Outlier Score": parseFloat(c.outlierScore || "0"),
          "Registration Date": c.registrationDate ? new Date(c.registrationDate).toLocaleDateString() : "",
          "Policy Number": c.policyNumber,
          "ICD Code": c.icd || "",
        }));
        const claimsSheet = XLSX.utils.json_to_sheet(claimsSummaryData);
        XLSX.utils.book_append_sheet(workbook, claimsSheet, "Claims Summary");

        if (includeServices) {
          const servicesData: any[] = [];
          for (const claim of claimsWithServices) {
            if (claim.services) {
              for (const svc of claim.services) {
                servicesData.push({
                  "Claim ID": claim.id,
                  "Claim Number": claim.claimNumber,
                  "Line Number": svc.lineNumber,
                  "Service Code": svc.serviceCode,
                  "Description": svc.serviceDescription,
                  "Quantity": parseFloat(svc.quantity || "0"),
                  "Unit Price (SAR)": parseFloat(svc.unitPrice || "0"),
                  "Total Price (SAR)": parseFloat(svc.totalPrice || "0"),
                  "Approved Amount (SAR)": svc.approvedAmount ? parseFloat(svc.approvedAmount) : "",
                  "Adjudication Status": svc.adjudicationStatus || "",
                  "Approval Status": svc.approvalStatus || "",
                  "Violations": (svc.violations || []).join("; "),
                  "Denial Reason": svc.denialReason || "",
                });
              }
            }
          }
          if (servicesData.length > 0) {
            const servicesSheet = XLSX.utils.json_to_sheet(servicesData);
            XLSX.utils.book_append_sheet(workbook, servicesSheet, "Services Detail");
          }
        }

        const findingSummaryData = [{
          "Finding ID": findingId,
          "Source": source,
          "Provider Name": providerName || findingContext.providerName || "",
          "Finding Title": findingTitle || "",
          "Total Claims": claims.length,
          "Total Amount (SAR)": totalAmount,
          "Average Amount (SAR)": avgAmount,
          "Flagged Claims": flaggedCount,
          "Export Date": new Date().toISOString(),
        }];
        const findingSheet = XLSX.utils.json_to_sheet(findingSummaryData);
        XLSX.utils.book_append_sheet(workbook, findingSheet, "Finding Summary");

        const statsData = [
          { "Metric": "Total Claims", "Value": claims.length },
          { "Metric": "Total Amount (SAR)", "Value": totalAmount },
          { "Metric": "Average Amount (SAR)", "Value": avgAmount.toFixed(2) },
          { "Metric": "Flagged Claims", "Value": flaggedCount },
          { "Metric": "Flagged Percentage", "Value": `${((flaggedCount / Math.max(claims.length, 1)) * 100).toFixed(1)}%` },
        ];
        const statsSheet = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, "Statistics");

        excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      }

      const responseData: any = {
        success: true,
        findingId,
        source,
        analysis: {
          executiveSummary: aiAnalysis,
          claimCount: claims.length,
          totalAmount,
          avgAmount,
          flaggedCount,
        },
      };

      if (excelBuffer) {
        const base64Excel = excelBuffer.toString("base64");
        responseData.excelData = base64Excel;
        responseData.excelFilename = `claims-export-${findingId}-${new Date().toISOString().split("T")[0]}.xlsx`;
      }

      return res.json(responseData);
    } catch (error) {
      handleRouteError(res, error, "/api/findings/:findingId/export", "export finding data");
    }
  });
}
