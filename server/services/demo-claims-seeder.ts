import OpenAI from "openai";
import { storage } from "../storage";
import { withRetry } from "../utils/openai-utils";
import type { ProviderDirectory, InsertClaim } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface GeneratedClaim {
  claimNumber: string;
  policyNumber: string;
  registrationDate: string;
  serviceDate: string;
  claimType: string;
  hospital: string;
  amount: number;
  outlierScore: number;
  description: string;
  icd: string;
  hasSurgery: string;
  surgeryFee: number | null;
  hasIcu: string;
  lengthOfStay: number | null;
  patientId: string;
  patientName: string;
  status: string;
  category: string;
  flagged: boolean;
  flagReason: string | null;
  cptCodes: string[];
  diagnosisCodes: string[];
}

interface ClaimsGenerationResult {
  claims: GeneratedClaim[];
}

export class DemoClaimsSeeder {
  private readonly MODEL = "gpt-4o";
  private readonly CLAIMS_PER_PROVIDER = 25;

  async seedClaimsForTopProviders(count: number = 10): Promise<{ providersSeeded: number; claimsGenerated: number }> {
    console.log(`[DemoClaimsSeeder] Starting to seed claims for top ${count} providers...`);
    
    const providers = await storage.getAllProviderDirectoryEntries();
    const topProviders = providers.slice(0, count);
    
    if (topProviders.length === 0) {
      console.log("[DemoClaimsSeeder] No providers found. Creating demo providers first...");
      await this.createDemoProviders(count);
      const newProviders = await storage.getAllProviderDirectoryEntries();
      topProviders.push(...newProviders.slice(0, count));
    }

    let totalClaimsGenerated = 0;

    for (const provider of topProviders) {
      try {
        const existingClaims = await storage.getClaimsByProviderId(provider.id);
        if (existingClaims && existingClaims.length > 10) {
          console.log(`[DemoClaimsSeeder] Provider ${provider.name} already has ${existingClaims.length} claims, skipping...`);
          continue;
        }

        console.log(`[DemoClaimsSeeder] Generating claims for: ${provider.name} (${provider.specialty})`);
        const claims = await this.generateClaimsForProvider(provider);
        
        for (const claim of claims) {
          await this.insertClaim(claim, provider);
          totalClaimsGenerated++;
        }
        
        console.log(`[DemoClaimsSeeder] Generated ${claims.length} claims for ${provider.name}`);
      } catch (error) {
        console.error(`[DemoClaimsSeeder] Error generating claims for provider ${provider.name}:`, error);
      }
    }

    console.log(`[DemoClaimsSeeder] Completed: ${topProviders.length} providers, ${totalClaimsGenerated} claims generated`);
    return { providersSeeded: topProviders.length, claimsGenerated: totalClaimsGenerated };
  }

  private async createDemoProviders(count: number): Promise<void> {
    const demoProviders = [
      { npi: "1111111111", name: "King Faisal Specialist Hospital", specialty: "Multi-Specialty", organization: "KFSH Network", city: "Riyadh", region: "Central" },
      { npi: "2222222222", name: "Saudi German Hospital", specialty: "General Surgery", organization: "SGH Group", city: "Jeddah", region: "Western" },
      { npi: "3333333333", name: "Dr. Sulaiman Al Habib Medical Group", specialty: "Multi-Specialty", organization: "HMG", city: "Riyadh", region: "Central" },
      { npi: "4444444444", name: "Dallah Hospital", specialty: "Cardiology", organization: "Dallah Health", city: "Riyadh", region: "Central" },
      { npi: "5555555555", name: "International Medical Center", specialty: "Oncology", organization: "IMC Group", city: "Jeddah", region: "Western" },
      { npi: "6666666666", name: "National Guard Hospital", specialty: "Trauma", organization: "NGHA", city: "Riyadh", region: "Central" },
      { npi: "7777777777", name: "Johns Hopkins Aramco Healthcare", specialty: "Internal Medicine", organization: "JHAH", city: "Dhahran", region: "Eastern" },
      { npi: "8888888888", name: "Mouwasat Medical Services", specialty: "Orthopedics", organization: "Mouwasat Group", city: "Dammam", region: "Eastern" },
      { npi: "9999999999", name: "Al Hammadi Hospital", specialty: "Obstetrics", organization: "Al Hammadi", city: "Riyadh", region: "Central" },
      { npi: "1010101010", name: "Care National Hospital", specialty: "Pediatrics", organization: "Care Group", city: "Riyadh", region: "Central" },
    ];

    for (let i = 0; i < Math.min(count, demoProviders.length); i++) {
      try {
        await storage.createProviderDirectoryEntry(demoProviders[i] as any);
      } catch (error) {
        console.log(`[DemoClaimsSeeder] Provider may already exist: ${demoProviders[i].name}`);
      }
    }
  }

  private async generateClaimsForProvider(provider: ProviderDirectory): Promise<GeneratedClaim[]> {
    const prompt = this.buildClaimsPrompt(provider);
    
    const response = await withRetry(async () => {
      return await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: "system",
            content: `You are a healthcare data expert generating realistic medical claims data for testing and demonstration purposes. Generate varied, realistic claims with appropriate medical codes, amounts, and patterns. Include some claims with potential fraud indicators (high outlier scores, unusual patterns) for FWA detection testing.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 8192,
        temperature: 0.8,
      });
    }, { maxRetries: 3, timeoutMs: 120000 });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const parsed = JSON.parse(content) as ClaimsGenerationResult;
    return parsed.claims || [];
  }

  private buildClaimsPrompt(provider: ProviderDirectory): string {
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setMonth(startDate.getMonth() - 12);

    return `Generate ${this.CLAIMS_PER_PROVIDER} realistic healthcare insurance claims for the following provider:

PROVIDER INFORMATION:
- Name: ${provider.name}
- NPI: ${provider.npi}
- Specialty: ${provider.specialty}
- Organization: ${provider.organization || "Independent"}
- City: ${provider.city || "Riyadh"}
- Region: ${provider.region || "Central"}

REQUIREMENTS:
1. Generate claims spanning the last 12 months (${startDate.toISOString().split('T')[0]} to ${currentDate.toISOString().split('T')[0]})
2. Include a mix of claim types appropriate for the specialty:
   - Inpatient stays, Outpatient visits, Emergency, Pharmacy, Laboratory, Radiology, Surgery
3. Amounts should be realistic for Saudi Arabia healthcare (in SAR):
   - Outpatient: 200-5,000 SAR
   - Inpatient: 5,000-500,000 SAR
   - Surgery: 10,000-1,000,000 SAR
   - Emergency: 500-50,000 SAR
4. Include appropriate ICD-10 and CPT codes for the specialty
5. Categories should be: Consultation, Procedure, Medication, Diagnostic, Therapy, Surgery, Emergency, Preventive
6. Include some claims with potential FWA indicators:
   - 3-5 claims with high outlier scores (0.7-0.99)
   - 2-3 claims flagged with reasons like "unusual billing pattern", "excessive charges", "duplicate claim suspected"
7. Generate unique patient IDs and realistic Arabic names
8. Statuses: approved (70%), pending (15%), rejected (10%), under_review (5%)

Return a JSON object with this structure:
{
  "claims": [
    {
      "claimNumber": "CLM-2025-XXXXX",
      "policyNumber": "POL-XXXXX",
      "registrationDate": "YYYY-MM-DDTHH:mm:ss.000Z",
      "serviceDate": "YYYY-MM-DDTHH:mm:ss.000Z",
      "claimType": "Inpatient|Outpatient|Emergency|Surgery|Laboratory|Radiology|Pharmacy",
      "hospital": "${provider.name}",
      "amount": 12500.00,
      "outlierScore": 0.25,
      "description": "Brief description of the claim",
      "icd": "ICD-10 code",
      "hasSurgery": "Yes|No",
      "surgeryFee": null or number,
      "hasIcu": "Yes|No",
      "lengthOfStay": null or number in days,
      "patientId": "PAT-XXXXX",
      "patientName": "Arabic name",
      "status": "approved|pending|rejected|under_review",
      "category": "Consultation|Procedure|Medication|Diagnostic|Therapy|Surgery|Emergency|Preventive",
      "flagged": false,
      "flagReason": null or "reason string",
      "cptCodes": ["XXXXX", "XXXXX"],
      "diagnosisCodes": ["X00.0", "X00.1"]
    }
  ]
}`;
  }

  private async insertClaim(claim: GeneratedClaim, provider: ProviderDirectory): Promise<void> {
    const id = `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const insertData = {
      claimNumber: claim.claimNumber,
      registrationDate: new Date(claim.registrationDate),
      claimType: claim.claimType,
      hospital: claim.hospital || provider.name,
      amount: claim.amount.toString(),
      outlierScore: claim.outlierScore.toString(),
      description: claim.description,
      primaryDiagnosis: claim.icd || "UNKNOWN",
      hasSurgery: claim.hasSurgery === "Yes",
      surgeryFee: claim.surgeryFee?.toString() || null,
      hasIcu: claim.hasIcu === "Yes",
      lengthOfStay: claim.lengthOfStay,
      providerId: provider.id,
      memberId: claim.patientId || "UNKNOWN",
      serviceDate: new Date(claim.serviceDate),
      status: claim.status,
      category: claim.category,
      flagged: claim.flagged,
      flagReason: claim.flagReason,
      cptCodes: claim.cptCodes,
      icdCodes: claim.diagnosisCodes,
    } as InsertClaim;

    await storage.createClaim(insertData);
  }
}

export const demoClaimsSeeder = new DemoClaimsSeeder();
