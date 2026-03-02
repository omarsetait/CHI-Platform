import OpenAI from "openai";

const openai = new OpenAI();

export type QueryIntent = "document" | "data" | "mixed" | "general";
export type DocumentSubtype = "law_regulation" | "resolution_circular" | "chi_mandatory_policy" | "clinical_manual" | "drug_formulary" | "all";

export interface RouterResult {
  intent: QueryIntent;
  documentSubtype?: DocumentSubtype;
  confidence: number;
  reasoning: string;
}

const ROUTER_SYSTEM_PROMPT = `You are a query intent classifier for a healthcare regulatory platform (CHI - Council of Health Insurance, Saudi Arabia).

Classify user queries into one of these intents:
- "document": Questions about regulations, guidelines, policies, procedures, circulars, drug formulary. The user wants information from uploaded reference documents.
- "data": Questions about platform data — claims statistics, provider performance, encounter volumes, denial rates, beneficiary counts, DRG analysis, FWA alerts. The user wants numbers and analytics.
- "mixed": Questions requiring BOTH document knowledge AND platform data. Example: "Are providers complying with the MOH circular on DRG coding?" needs the circular text AND compliance data.
- "general": Greetings, clarifications, general questions not needing documents or data.

For "document" and "mixed" intents, also classify the document subtype:
- "law_regulation": Laws, royal decrees, regulatory frameworks
- "resolution_circular": MOH/CHI resolutions, circulars, directives
- "chi_mandatory_policy": CHI mandatory policies, medical necessity criteria
- "clinical_manual": Clinical pathways, procedure manuals, medical guidelines
- "drug_formulary": Drug formulary, pharmaceutical guidelines
- "all": Cannot determine specific subtype or spans multiple

Return JSON: {"intent": "...", "documentSubtype": "...", "confidence": 0.0-1.0, "reasoning": "..."}`;

export async function classifyQuery(
  userMessage: string,
  recentMessages: Array<{role: string; content: string}> = []
): Promise<RouterResult> {
  const start = Date.now();
  const contextMessages = recentMessages.slice(-3).map(m =>
    `${m.role}: ${m.content}`
  ).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 200,
    messages: [
      { role: "system", content: ROUTER_SYSTEM_PROMPT },
      {
        role: "user",
        content: contextMessages
          ? `Recent conversation:\n${contextMessages}\n\nNew message to classify: "${userMessage}"`
          : `Classify this message: "${userMessage}"`
      }
    ]
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  const routerResult = {
    intent: result.intent || "general",
    documentSubtype: result.documentSubtype || undefined,
    confidence: result.confidence || 0.5,
    reasoning: result.reasoning || ""
  };

  console.info(
    `[Chat][Router] intent=${routerResult.intent} subtype=${routerResult.documentSubtype || "none"} confidence=${routerResult.confidence} latency=${Date.now() - start}ms`
  );

  return routerResult;
}
