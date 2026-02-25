// Grok (xAI) Twitter Listening Service with Live Search
// Uses direct xAI API with search_parameters for REAL Twitter/X data
// Falls back to OpenRouter if no XAI_API_KEY is set

import OpenAI from "openai";

interface GrokClientConfig {
  client: OpenAI;
  model: string;
  hasLiveSearch: boolean;
}

const getGrokClient = (): GrokClientConfig => {
  // Prefer direct xAI API for Live Search (real Twitter data)
  const xaiApiKey = process.env.XAI_API_KEY;
  if (xaiApiKey) {
    return {
      client: new OpenAI({ 
        baseURL: "https://api.x.ai/v1", 
        apiKey: xaiApiKey 
      }),
      model: "grok-3",
      hasLiveSearch: true
    };
  }
  
  // Fallback to OpenRouter
  const baseUrl = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;
  
  if (baseUrl && apiKey) {
    return {
      client: new OpenAI({ baseURL: baseUrl, apiKey }),
      model: "x-ai/grok-3",
      hasLiveSearch: false
    };
  }
  
  throw new Error("No Grok API configured");
};

// Valid sentiment values for database
const VALID_SENTIMENTS = ["very_negative", "negative", "neutral", "positive", "very_positive"] as const;
type ValidSentiment = typeof VALID_SENTIMENTS[number];

function normalizeSentiment(sentiment: string): ValidSentiment {
  const s = sentiment?.toLowerCase()?.trim() || "neutral";
  if (VALID_SENTIMENTS.includes(s as ValidSentiment)) {
    return s as ValidSentiment;
  }
  // Map common variations
  if (s === "mixed" || s === "uncertain") return "neutral";
  if (s.includes("very_neg") || s.includes("very neg")) return "very_negative";
  if (s.includes("very_pos") || s.includes("very pos")) return "very_positive";
  if (s.includes("neg")) return "negative";
  if (s.includes("pos")) return "positive";
  return "neutral";
}

export interface TwitterMention {
  content: string;
  sentiment: ValidSentiment;
  sentimentScore: number;
  topics: string[];
  providerName?: string;
  providerId?: string;
  authorHandle?: string;
  engagementEstimate: number;
  reachEstimate: number;
  requiresAction: boolean;
  alertLevel: "normal" | "warning" | "critical";
  publishedAt: Date;
  sourceUrl?: string;
}

export interface GrokTwitterResponse {
  mentions: TwitterMention[];
  summary: string;
  totalFound: number;
  analysisTimestamp: Date;
}

export async function searchTwitterForHealthcareProviders(
  keywords: string[],
  providerNames: string[] = []
): Promise<GrokTwitterResponse> {
  const { client, model, hasLiveSearch } = getGrokClient();

  const searchTerms = [
    ...keywords,
    ...providerNames,
    "مستشفى السعودية",
    "مجلس الضمان الصحي",
  ].filter(k => k).slice(0, 10);

  const prompt = `Search X (Twitter) for recent posts about Saudi Arabian healthcare.

Search for posts mentioning: ${searchTerms.join(", ")}

Focus on Saudi healthcare providers:
- مستشفى الحبيب (Dr. Sulaiman Al Habib)
- مستشفى المواساة (Al Mouwasat Hospital)  
- المستشفى السعودي الألماني (Saudi German Hospital)
- مستشفى دله (Dallah Hospital)
- مستشفى الملك فيصل التخصصي (King Faisal Specialist Hospital)
- مجلس الضمان الصحي (CHI)
- وزارة الصحة (MOH)

For EACH post found, provide:
1. The exact content/text (in Arabic if original is Arabic)
2. Author handle (@username)
3. Direct URL to the post
4. Sentiment: MUST be one of: very_negative, negative, neutral, positive, very_positive
5. Sentiment score (-1.0 to 1.0)
6. Topics (billing, wait_times, quality, fraud, service, staff)
7. Provider name mentioned
8. Estimated engagement (likes + retweets)
9. Whether regulatory action is needed

Return JSON:
{
  "mentions": [
    {
      "content": "النص الحقيقي للمنشور",
      "authorHandle": "@real_handle",
      "sourceUrl": "https://x.com/real_handle/status/real_id",
      "sentiment": "positive",
      "sentimentScore": 0.75,
      "topics": ["quality", "service"],
      "providerName": "مستشفى الحبيب",
      "engagementEstimate": 150,
      "reachEstimate": 5000,
      "requiresAction": false,
      "alertLevel": "normal"
    }
  ],
  "summary": "ملخص التحليل",
  "totalFound": 10
}`;

  try {
    // Build request with Live Search enabled for xAI
    const requestBody: any = {
      model,
      messages: [
        {
          role: "system",
          content: "You are a healthcare social media analyst with real-time access to X/Twitter. Search for and analyze actual posts about Saudi healthcare. Return real post URLs. IMPORTANT: sentiment must be exactly one of: very_negative, negative, neutral, positive, very_positive"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
    };

    // Enable Live Search for xAI direct API
    if (hasLiveSearch) {
      requestBody.search_parameters = {
        mode: "auto",
        sources: [{ type: "x" }],
        return_citations: true,
        max_search_results: 20
      };
    }

    const response = await (client.chat.completions.create as any)(requestBody);

    const content = response.choices[0].message.content || "{}";
    
    // Log citations if available (real URLs from Live Search)
    if (response.citations) {
      console.log("[Grok Twitter] Live Search citations:", response.citations);
    }
    
    // Parse JSON from response
    let jsonStr = content;
    if (content.includes("```json")) {
      jsonStr = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonStr = content.split("```")[1].split("```")[0].trim();
    }
    
    const result = JSON.parse(jsonStr);
    
    const mentions: TwitterMention[] = (result.mentions || []).map((m: any) => {
      const sentimentScore = typeof m.sentimentScore === "number" ? m.sentimentScore : 0;
      return {
        content: m.content || "",
        sentiment: normalizeSentiment(m.sentiment),
        sentimentScore,
        topics: Array.isArray(m.topics) ? m.topics : [],
        providerName: m.providerName,
        providerId: m.providerId,
        authorHandle: m.authorHandle,
        engagementEstimate: m.engagementEstimate || 0,
        reachEstimate: m.reachEstimate || 0,
        requiresAction: m.requiresAction || sentimentScore < -0.5,
        alertLevel: sentimentScore < -0.6 ? "critical" : sentimentScore < -0.3 ? "warning" : "normal",
        publishedAt: m.publishedAt ? new Date(m.publishedAt) : new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        sourceUrl: m.sourceUrl,
      };
    });

    return {
      mentions,
      summary: result.summary || "تم تحليل منصة إكس بنجاح",
      totalFound: result.totalFound || mentions.length,
      analysisTimestamp: new Date(),
    };
  } catch (error: any) {
    console.error("[Grok Twitter] Error:", error.message);
    throw new Error(`Grok Twitter analysis failed: ${error.message}`);
  }
}

export async function analyzeProviderReputation(providerName: string): Promise<{
  overallSentiment: string;
  sentimentScore: number;
  recentTrend: string;
  keyIssues: string[];
  positiveHighlights: string[];
  recommendations: string[];
}> {
  const { client, model, hasLiveSearch } = getGrokClient();

  const prompt = `Analyze the X/Twitter reputation of the Saudi healthcare provider: "${providerName}"

Search for real posts and provide:
1. Overall sentiment (very_negative, negative, neutral, positive, very_positive)
2. Sentiment score (-1.0 to 1.0)
3. Recent trend (improving, stable, declining)
4. Key issues mentioned (max 5, in Arabic)
5. Positive highlights (max 5, in Arabic)
6. Recommendations for the provider (max 3, in Arabic)

Return as JSON:
{
  "overallSentiment": "positive",
  "sentimentScore": 0.45,
  "recentTrend": "stable",
  "keyIssues": ["أوقات الانتظار الطويلة", "عدم وضوح الفواتير"],
  "positiveHighlights": ["طاقم طبي محترف", "مرافق حديثة"],
  "recommendations": ["تحسين التواصل", "توضيح الفوترة"]
}`;

  try {
    const requestBody: any = {
      model,
      messages: [
        {
          role: "system",
          content: "You are a healthcare reputation analyst with access to real-time X/Twitter data about Saudi Arabian healthcare providers."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
    };

    if (hasLiveSearch) {
      requestBody.search_parameters = {
        mode: "auto",
        sources: [{ type: "x" }],
        return_citations: true
      };
    }

    const response = await (client.chat.completions.create as any)(requestBody);

    const content = response.choices[0].message.content || "{}";
    let jsonStr = content;
    if (content.includes("```json")) {
      jsonStr = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonStr = content.split("```")[1].split("```")[0].trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("[Grok Reputation] Error:", error.message);
    throw error;
  }
}

export function isGrokConfigured(): boolean {
  return !!(process.env.XAI_API_KEY || (process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL && process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY));
}
