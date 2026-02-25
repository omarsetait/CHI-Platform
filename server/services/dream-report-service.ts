import OpenAI from "openai";
import { storage } from "../storage";
import { withRetry } from "../utils/openai-utils";
import type { 
  ProviderDirectory, 
  ProviderBenchmark, 
  OperationalFinding,
  ProviderCpmMetric,
  Claim
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface AiReportContent {
  executiveSummary: string;
  benchmarkAnalysis: {
    costPerMember: number;
    peerAvgCpm: number;
    deviation: number;
    percentile: number;
    anomalyScore: number;
    keyDrivers: Array<{ category: string; impact: number; description: string }>;
  };
  findings: Array<{
    id: string;
    category: string;
    subCategory: string;
    amount: number;
    claimCount: number;
    confidence: "high" | "medium" | "low";
    severity: "high" | "medium" | "low";
    description: string;
    evidence: string[];
  }>;
  totalPotentialAmount: string;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    expectedImpact: string;
    timeline: string;
  }>;
}

export interface GeneratedReportContent extends Omit<AiReportContent, 'findings'> {
  findings: Array<{
    id: string;
    category: string;
    subCategory: string;
    amount: number;
    claimCount: number;
    confidence: "high" | "medium" | "low";
    severity: "high" | "medium" | "low";
    description: string;
    evidence: string[];
    claimIds?: string[];
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    claimCount: number;
    riskLevel: string;
  }>;
  claimSamples: Array<{
    claimId: string;
    category: string;
    amount: number;
    description: string;
    attachmentAvailable: boolean;
  }>;
  aiInsights: string;
}

interface ClaimsAnalysis {
  totalClaims: number;
  totalAmount: number;
  averageAmount: number;
  categoryBreakdown: Record<string, { count: number; amount: number }>;
  statusBreakdown: Record<string, number>;
  flaggedClaims: number;
  highRiskClaims: Claim[];
  diagnosisCodeFrequency: Record<string, number>;
  cptCodeFrequency: Record<string, number>;
  dateRange: { earliest: string; latest: string };
}

interface ProviderContext {
  provider: ProviderDirectory | null;
  benchmark: ProviderBenchmark | null;
  cpmMetrics: ProviderCpmMetric[];
  findings: OperationalFinding[];
  claims: Claim[];
  claimsAnalysis: ClaimsAnalysis | null;
}

interface ReportOptions {
  periodStart?: Date;
  periodEnd?: Date;
}

export class DreamReportService {
  private readonly MODEL = "gpt-4o";
  private readonly MAX_COMPLETION_TOKENS = 8192;

  async generateReport(
    providerId: string, 
    options?: ReportOptions
  ): Promise<GeneratedReportContent> {
    console.log(`[DreamReportService] Generating report for provider: ${providerId}`);

    const context = await this.gatherProviderContext(providerId, options);
    
    if (!context.provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const prompt = this.buildPrompt(context, options);
    const aiReport = await this.callOpenAI(prompt);
    
    const categoryBreakdown = this.buildCategoryBreakdown(context.claimsAnalysis);
    const claimSamples = this.buildClaimSamples(context.claims);
    const aiInsights = this.buildAiInsights(context.claimsAnalysis, aiReport);
    const findingsWithClaimIds = this.linkFindingsToClaims(aiReport.findings, context.claims);
    
    console.log(`[DreamReportService] Report generated successfully for: ${providerId}`);
    return {
      ...aiReport,
      findings: findingsWithClaimIds,
      categoryBreakdown,
      claimSamples,
      aiInsights,
    };
  }

  private buildCategoryBreakdown(analysis: ClaimsAnalysis | null): GeneratedReportContent['categoryBreakdown'] {
    if (!analysis || !analysis.categoryBreakdown) return [];
    
    const totalAmount = analysis.totalAmount || 1;
    return Object.entries(analysis.categoryBreakdown)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: (data.amount / totalAmount) * 100,
        claimCount: data.count,
        riskLevel: data.amount > 100000 ? 'high' : data.amount > 50000 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private buildClaimSamples(claims: Claim[]): GeneratedReportContent['claimSamples'] {
    return claims
      .sort((a, b) => parseFloat(b.outlierScore || '0') - parseFloat(a.outlierScore || '0'))
      .slice(0, 20)
      .map(claim => ({
        claimId: claim.id,
        category: claim.category || 'General',
        amount: parseFloat(claim.amount || '0'),
        description: claim.description || `Claim ${claim.claimNumber || claim.id} - ${claim.category || 'General'}`,
        attachmentAvailable: false,
      }));
  }

  private buildAiInsights(analysis: ClaimsAnalysis | null, report: any): string {
    if (!analysis) return '';
    
    const insights: string[] = [];
    
    if (analysis.highRiskClaims.length > 0) {
      insights.push(`${analysis.highRiskClaims.length} high-risk claims identified with outlier scores above 0.7.`);
    }
    
    const topCategory = Object.entries(analysis.categoryBreakdown)
      .sort((a, b) => b[1].amount - a[1].amount)[0];
    if (topCategory) {
      const pct = ((topCategory[1].amount / analysis.totalAmount) * 100).toFixed(1);
      insights.push(`${topCategory[0]} accounts for ${pct}% of total spend (${topCategory[1].amount.toLocaleString()} SAR).`);
    }
    
    if (analysis.flaggedClaims > 0) {
      const flagPct = ((analysis.flaggedClaims / analysis.totalClaims) * 100).toFixed(1);
      insights.push(`${analysis.flaggedClaims} claims (${flagPct}%) flagged for potential FWA issues.`);
    }
    
    const avgAmount = analysis.averageAmount;
    if (avgAmount > 50000) {
      insights.push(`Average claim amount of ${avgAmount.toLocaleString()} SAR is notably high.`);
    }
    
    return insights.join(' ');
  }

  private linkFindingsToClaims(
    findings: GeneratedReportContent['findings'], 
    claims: Claim[]
  ): GeneratedReportContent['findings'] {
    return findings.map(finding => {
      const findingText = `${finding.subCategory || ''} ${finding.description || ''}`.toLowerCase();
      
      const matchingClaims = claims.filter(claim => {
        const claimCategory = (claim.category || '').trim().toLowerCase();
        const claimDesc = (claim.description || '').trim().toLowerCase();
        
        if (!claimCategory && !claimDesc) {
          return finding.severity === 'high' && parseFloat(claim.outlierScore || '0') >= 0.7;
        }
        
        const categoryWords = claimCategory.split(' ').filter(w => w.length > 2);
        const categoryMatch = claimCategory && (
          findingText.includes(claimCategory) ||
          categoryWords.some(word => findingText.includes(word))
        );
        
        const descWords = claimDesc.split(' ').filter(w => w.length > 3);
        const descMatch = descWords.length > 0 && descWords.some(word => findingText.includes(word));
        
        const outlierMatch = finding.severity === 'high' && parseFloat(claim.outlierScore || '0') >= 0.7;
        
        return categoryMatch || descMatch || outlierMatch;
      });
      
      return {
        ...finding,
        claimIds: matchingClaims.slice(0, 10).map(c => c.id),
      };
    });
  }

  private async gatherProviderContext(
    providerId: string, 
    options?: ReportOptions
  ): Promise<ProviderContext> {
    const [provider, benchmark, cpmMetrics, findings, claims] = await Promise.all([
      this.getProviderContext(providerId),
      this.getBenchmarkData(providerId),
      this.getCpmMetrics(providerId, options?.periodStart, options?.periodEnd),
      this.getFwaFindings(providerId),
      this.getActualClaims(providerId),
    ]);

    const claimsAnalysis = claims.length > 0 ? this.analyzeClaimsData(claims) : null;

    return { provider, benchmark, cpmMetrics, findings, claims, claimsAnalysis };
  }

  private async getActualClaims(providerId: string): Promise<Claim[]> {
    try {
      const claims = await storage.getClaimsByProviderId(providerId);
      return claims || [];
    } catch (error) {
      console.error(`[DreamReportService] Error fetching actual claims:`, error);
      return [];
    }
  }

  private analyzeClaimsData(claims: Claim[]): ClaimsAnalysis {
    const categoryBreakdown: Record<string, { count: number; amount: number }> = {};
    const statusBreakdown: Record<string, number> = {};
    const diagnosisCodeFrequency: Record<string, number> = {};
    const cptCodeFrequency: Record<string, number> = {};
    
    let totalAmount = 0;
    let flaggedCount = 0;
    const dates: Date[] = [];
    const highRiskClaims: Claim[] = [];

    for (const claim of claims) {
      const amount = parseFloat(claim.amount || '0');
      totalAmount += amount;
      
      const category = claim.category || 'Unknown';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { count: 0, amount: 0 };
      }
      categoryBreakdown[category].count++;
      categoryBreakdown[category].amount += amount;
      
      const status = claim.status || 'Unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      
      if (claim.flagged) {
        flaggedCount++;
      }
      
      const outlierScore = parseFloat(claim.outlierScore || '0');
      if (outlierScore >= 0.7) {
        highRiskClaims.push(claim);
      }
      
      if (claim.diagnosisCodes) {
        for (const code of claim.diagnosisCodes) {
          diagnosisCodeFrequency[code] = (diagnosisCodeFrequency[code] || 0) + 1;
        }
      }
      
      if (claim.cptCodes) {
        for (const code of claim.cptCodes) {
          cptCodeFrequency[code] = (cptCodeFrequency[code] || 0) + 1;
        }
      }
      
      if (claim.serviceDate) {
        dates.push(new Date(claim.serviceDate));
      }
    }

    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());

    return {
      totalClaims: claims.length,
      totalAmount,
      averageAmount: claims.length > 0 ? totalAmount / claims.length : 0,
      categoryBreakdown,
      statusBreakdown,
      flaggedClaims: flaggedCount,
      highRiskClaims: highRiskClaims.sort((a, b) => 
        parseFloat(b.outlierScore || '0') - parseFloat(a.outlierScore || '0')
      ).slice(0, 10),
      diagnosisCodeFrequency,
      cptCodeFrequency,
      dateRange: {
        earliest: sortedDates[0]?.toISOString().split('T')[0] || 'N/A',
        latest: sortedDates[sortedDates.length - 1]?.toISOString().split('T')[0] || 'N/A'
      }
    };
  }

  async getProviderContext(providerId: string): Promise<ProviderDirectory | null> {
    try {
      const provider = await storage.getProviderDirectoryById(providerId);
      return provider || null;
    } catch (error) {
      console.error(`[DreamReportService] Error fetching provider context:`, error);
      return null;
    }
  }

  async getCpmMetrics(
    providerId: string, 
    periodStart?: Date, 
    periodEnd?: Date
  ): Promise<ProviderCpmMetric[]> {
    try {
      const allMetrics = await storage.getAllProviderCpmMetrics();
      let metrics = allMetrics.filter((m: ProviderCpmMetric) => m.providerId === providerId);

      if (periodStart || periodEnd) {
        metrics = metrics.filter((metric: ProviderCpmMetric) => {
          const metricDate = new Date(metric.year, this.quarterToMonth(metric.quarter), 1);
          if (periodStart && metricDate < periodStart) return false;
          if (periodEnd && metricDate > periodEnd) return false;
          return true;
        });
      }

      return metrics.sort((a: ProviderCpmMetric, b: ProviderCpmMetric) => {
        if (a.year !== b.year) return b.year - a.year;
        return this.quarterToMonth(b.quarter) - this.quarterToMonth(a.quarter);
      });
    } catch (error) {
      console.error(`[DreamReportService] Error fetching CPM metrics:`, error);
      return [];
    }
  }

  async getBenchmarkData(providerId: string): Promise<ProviderBenchmark | null> {
    try {
      const benchmark = await storage.getProviderBenchmarkById(providerId);
      return benchmark || null;
    } catch (error) {
      console.error(`[DreamReportService] Error fetching benchmark data:`, error);
      return null;
    }
  }

  async getFwaFindings(providerId: string): Promise<OperationalFinding[]> {
    try {
      const findings = await storage.getOperationalFindingsByProviderId(providerId);
      return findings;
    } catch (error) {
      console.error(`[DreamReportService] Error fetching FWA findings:`, error);
      return [];
    }
  }

  private quarterToMonth(quarter: string): number {
    const quarterMap: Record<string, number> = {
      'Q1': 0, 'Q2': 3, 'Q3': 6, 'Q4': 9
    };
    return quarterMap[quarter] || 0;
  }

  private buildPrompt(context: ProviderContext, options?: ReportOptions): string {
    const { provider, benchmark, cpmMetrics, findings, claimsAnalysis } = context;
    
    const providerInfo = provider ? `
Provider Information:
- Name: ${provider.name}
- NPI: ${provider.npi}
- Specialty: ${provider.specialty}
- Organization: ${provider.organization || 'N/A'}
- Region: ${provider.region || 'N/A'}
- Network Tier: ${provider.networkTier || 'N/A'}
- Contract Status: ${provider.contractStatus || 'N/A'}
- Member Count: ${provider.memberCount || 0}
- Risk Score: ${provider.riskScore || 'N/A'}
` : 'Provider information not available.';

    const claimsInfo = claimsAnalysis ? `
ACTUAL CLAIMS DATA ANALYSIS:
- Total Claims Analyzed: ${claimsAnalysis.totalClaims}
- Total Claims Amount: ${claimsAnalysis.totalAmount.toLocaleString()} SAR
- Average Claim Amount: ${claimsAnalysis.averageAmount.toLocaleString()} SAR
- Claims Date Range: ${claimsAnalysis.dateRange.earliest} to ${claimsAnalysis.dateRange.latest}
- Flagged Claims: ${claimsAnalysis.flaggedClaims} (${((claimsAnalysis.flaggedClaims / claimsAnalysis.totalClaims) * 100).toFixed(1)}%)
- High-Risk Claims (outlier score >= 0.7): ${claimsAnalysis.highRiskClaims.length}

Category Breakdown:
${Object.entries(claimsAnalysis.categoryBreakdown)
  .sort((a, b) => b[1].amount - a[1].amount)
  .map(([cat, data]) => `- ${cat}: ${data.count} claims, ${data.amount.toLocaleString()} SAR (${((data.amount / claimsAnalysis.totalAmount) * 100).toFixed(1)}%)`)
  .join('\n')}

Status Distribution:
${Object.entries(claimsAnalysis.statusBreakdown)
  .map(([status, count]) => `- ${status}: ${count} claims (${((count / claimsAnalysis.totalClaims) * 100).toFixed(1)}%)`)
  .join('\n')}

Top Diagnosis Codes:
${Object.entries(claimsAnalysis.diagnosisCodeFrequency)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([code, count]) => `- ${code}: ${count} occurrences`)
  .join('\n')}

Top CPT Codes:
${Object.entries(claimsAnalysis.cptCodeFrequency)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([code, count]) => `- ${code}: ${count} occurrences`)
  .join('\n')}

High-Risk Claims Details:
${claimsAnalysis.highRiskClaims.slice(0, 5).map((c, i) => `
Claim ${i + 1}:
- Claim ID: ${c.claimNumber || c.id}
- Amount: ${parseFloat(c.amount || '0').toLocaleString()} SAR
- Outlier Score: ${c.outlierScore}
- Category: ${c.category}
- Status: ${c.status}
- Flagged: ${c.flagged ? 'Yes' : 'No'}
- Description: ${c.description || 'N/A'}
`).join('')}
` : 'No actual claims data available for this provider.';

    const benchmarkInfo = benchmark ? `
Benchmark Analysis:
- Total Claims: ${benchmark.totalClaims || 0}
- Total Billed Amount: $${benchmark.totalBilledAmount || 0}
- Total Paid Amount: $${benchmark.totalPaidAmount || 0}
- Member Count: ${benchmark.memberCount || 0}
- Cost Per Member (CPM): $${benchmark.costPerMember || 0}
- Claims Per Member: ${benchmark.claimsPerMember || 0}
- Average Claim Amount: $${benchmark.avgClaimAmount || 0}
- Peer Percentile: ${benchmark.peerPercentile || 'N/A'}
- Deviation from Peer: ${benchmark.deviationFromPeer || 0}%
- Standard Deviations: ${benchmark.standardDeviations || 0}
- Anomaly Score: ${benchmark.anomalyScore || 0}
- Anomaly Flags: ${JSON.stringify(benchmark.anomalyFlags || [])}
- Service Breakdown: ${JSON.stringify(benchmark.serviceBreakdown || {})}
` : 'Benchmark data not available.';

    const cpmInfo = cpmMetrics.length > 0 ? `
CPM Trend Data (Recent Quarters):
${cpmMetrics.slice(0, 8).map(m => `- ${m.quarter} ${m.year}: CPM $${m.cpm || 0}, Peer Avg $${m.peerAvgCpm || 0}, Percentile: ${m.percentile || 'N/A'}%, Trend: ${m.trend || 'N/A'}`).join('\n')}
` : 'No CPM trend data available.';

    const findingsInfo = findings.length > 0 ? `
Operational Findings (${findings.length} total):
${findings.map((f, i) => `
Finding ${i + 1}:
- Type: ${f.findingType}
- Category: ${f.category}${f.subCategory ? ` / ${f.subCategory}` : ''}
- Status: ${f.status}
- Potential Amount: $${f.potentialAmount}
- Claim Count: ${f.claimCount || 0}
- Description: ${f.description}
- Confidence: ${f.confidence || 'N/A'}
- Data Completeness: ${f.dataCompleteness || 'N/A'}
- Rule Strength: ${f.ruleStrength || 'N/A'}
- Detected By: ${f.detectedBy || 'N/A'}
`).join('')}
` : 'No operational findings detected.';

    const periodInfo = options?.periodStart || options?.periodEnd 
      ? `\nReport Period: ${options.periodStart?.toISOString().split('T')[0] || 'Start'} to ${options.periodEnd?.toISOString().split('T')[0] || 'Present'}`
      : '';

    return `${providerInfo}${periodInfo}

${claimsInfo}

${benchmarkInfo}

${cpmInfo}

${findingsInfo}`;
  }

  private async callOpenAI(contextPrompt: string): Promise<AiReportContent> {
    const systemPrompt = this.getSystemPrompt();
    
    const result = await withRetry(
      async () => {
        try {
          const response = await openai.chat.completions.create({
            model: this.MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: contextPrompt }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: this.MAX_COMPLETION_TOKENS,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("Empty response from OpenAI");
          }

          return this.parseResponse(content);
        } catch (error: any) {
          if (this.isRateLimitError(error)) {
            console.warn("[DreamReportService] Rate limit hit, will retry with backoff");
          }
          throw error;
        }
      },
      { maxRetries: 3, initialDelayMs: 2000, timeoutMs: 120000 }
    );

    return result;
  }

  private getSystemPrompt(): string {
    return `You are an expert healthcare analytics AI for provider performance and FWA detection. Generate a concise, data-driven report.

**IMPORTANT: Keep all text brief and scannable - maximum 2-3 sentences per field. Use bullet points when listing multiple items.**

Generate JSON with this structure:

{
  "executiveSummary": "Brief 3-4 sentence summary: key metrics, main concern, overall assessment. Be direct.",
  
  "benchmarkAnalysis": {
    "costPerMember": <number>,
    "peerAvgCpm": <number>,
    "deviation": <number - percentage>,
    "percentile": <number>,
    "anomalyScore": <number 0-100>,
    "keyDrivers": [
      {
        "category": "<service category>",
        "impact": <number 0-100>,
        "description": "<10 words max>"
      }
    ]
  },
  
  "findings": [
    {
      "id": "F001",
      "category": "<Financial, Medical, or Operational>",
      "subCategory": "<specific type>",
      "amount": <number>,
      "claimCount": <number>,
      "confidence": "<high, medium, or low>",
      "severity": "<high, medium, or low>",
      "description": "<1-2 sentences max, be specific>",
      "evidence": ["<short evidence point>", "<short evidence point>"]
    }
  ],
  
  "totalPotentialAmount": <number>,
  
  "recommendations": [
    {
      "priority": "<high, medium, or low>",
      "action": "<1 sentence, specific action>",
      "expectedImpact": "<1 sentence max>",
      "timeline": "<e.g., 30 days, Q2 2025>"
    }
  ]
}

Rules:
1. Base on provided data only
2. Keep descriptions SHORT - under 50 words each
3. Findings: max 5, highest severity first
4. Recommendations: max 4, actionable and brief
5. Use numbers and percentages, not vague language

Ensure valid JSON with numbers (not strings) for numeric fields.`;
  }

  private parseResponse(content: string): AiReportContent {
    try {
      const parsed = JSON.parse(content);
      
      return {
        executiveSummary: parsed.executiveSummary || "No executive summary generated.",
        benchmarkAnalysis: {
          costPerMember: Number(parsed.benchmarkAnalysis?.costPerMember) || 0,
          peerAvgCpm: Number(parsed.benchmarkAnalysis?.peerAvgCpm) || 0,
          deviation: Number(parsed.benchmarkAnalysis?.deviation) || 0,
          percentile: Number(parsed.benchmarkAnalysis?.percentile) || 0,
          anomalyScore: Number(parsed.benchmarkAnalysis?.anomalyScore) || 0,
          keyDrivers: Array.isArray(parsed.benchmarkAnalysis?.keyDrivers) 
            ? parsed.benchmarkAnalysis.keyDrivers.map((d: any) => ({
                category: String(d.category || "Unknown"),
                impact: Number(d.impact) || 0,
                description: String(d.description || "")
              }))
            : []
        },
        findings: Array.isArray(parsed.findings) 
          ? parsed.findings.map((f: any) => ({
              id: String(f.id || `F${Math.random().toString(36).substr(2, 6)}`),
              category: String(f.category || "Operational"),
              subCategory: String(f.subCategory || "General"),
              amount: Number(f.amount) || 0,
              claimCount: Number(f.claimCount) || 0,
              confidence: this.validateConfidence(f.confidence),
              severity: this.validateSeverity(f.severity),
              description: String(f.description || ""),
              evidence: Array.isArray(f.evidence) 
                ? f.evidence.map((e: any) => String(e))
                : []
            }))
          : [],
        totalPotentialAmount: this.sanitizeCurrency(parsed.totalPotentialAmount),
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map((r: any) => ({
              priority: this.validatePriority(r.priority),
              action: String(r.action || ""),
              expectedImpact: String(r.expectedImpact || ""),
              timeline: String(r.timeline || "")
            }))
          : []
      };
    } catch (error) {
      console.error("[DreamReportService] Error parsing OpenAI response:", error);
      console.error("[DreamReportService] Raw content:", content.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${(error as Error).message}`);
    }
  }

  private validateConfidence(value: any): "high" | "medium" | "low" {
    const valid = ["high", "medium", "low"];
    const normalized = String(value).toLowerCase();
    return valid.includes(normalized) ? normalized as "high" | "medium" | "low" : "medium";
  }

  private validateSeverity(value: any): "high" | "medium" | "low" {
    const valid = ["high", "medium", "low"];
    const normalized = String(value).toLowerCase();
    return valid.includes(normalized) ? normalized as "high" | "medium" | "low" : "medium";
  }

  private validatePriority(value: any): "high" | "medium" | "low" {
    const valid = ["high", "medium", "low"];
    const normalized = String(value).toLowerCase();
    return valid.includes(normalized) ? normalized as "high" | "medium" | "low" : "medium";
  }

  private isRateLimitError(error: any): boolean {
    if (error?.status === 429) return true;
    if (error?.code === 'rate_limit_exceeded') return true;
    if (error?.message?.toLowerCase().includes('rate limit')) return true;
    return false;
  }

  private sanitizeCurrency(value: any): string {
    if (value === null || value === undefined) {
      return "0";
    }
    
    if (typeof value === 'number') {
      return String(value);
    }
    
    const strValue = String(value);
    const cleaned = strValue.replace(/[$,\s]/g, '').replace(/[^\d.-]/g, '');
    const numValue = parseFloat(cleaned);
    
    if (isNaN(numValue)) {
      return "0";
    }
    
    return String(numValue);
  }
}

export const dreamReportService = new DreamReportService();
