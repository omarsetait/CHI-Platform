import OpenAI from "openai";
import { executeSafeQuery, validateQuery } from "./sql-guard";

const openai = new OpenAI();

const DATA_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_claims_summary",
      description: "Get claims statistics: count, total amount, grouped by status or provider. Use for questions about claim volumes, amounts, approval/rejection rates.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by claim status", enum: ["approved", "rejected", "pending", "all"] },
          groupBy: { type: "string", description: "Group results by field", enum: ["status", "provider", "month"] },
          limit: { type: "number", description: "Max results to return", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_provider_stats",
      description: "Get provider performance: compliance rates, rejection rates, risk scores. Use for questions about provider performance or risk.",
      parameters: {
        type: "object",
        properties: {
          sortBy: { type: "string", description: "Sort providers by metric", enum: ["rejection_rate", "compliance_score", "risk_score", "claims_volume"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_beneficiary_stats",
      description: "Get beneficiary/member statistics: counts, coverage status, demographics.",
      parameters: {
        type: "object",
        properties: {
          groupBy: { type: "string", description: "Group results by", enum: ["region", "coverage_status", "employer"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_fwa_alerts",
      description: "Get fraud/waste/abuse detection alerts and cases.",
      parameters: {
        type: "object",
        properties: {
          severity: { type: "string", description: "Filter by severity", enum: ["high", "medium", "low", "all"] },
          entityType: { type: "string", description: "Filter by entity type", enum: ["provider", "doctor", "patient", "all"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_drg_analysis",
      description: "Get DRG analysis: distribution, cost outliers, case-mix index.",
      parameters: {
        type: "object",
        properties: {
          groupBy: { type: "string", description: "Group by", enum: ["drg_code", "provider", "specialty"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_custom_query",
      description: "Run a custom SQL SELECT query against the platform database. ONLY use when other tools cannot answer the question.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "SQL SELECT query to execute" },
          explanation: { type: "string", description: "Brief explanation of what this query does" }
        },
        required: ["query", "explanation"]
      }
    }
  }
];

async function executeDataTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_claims_summary": {
        const { status, groupBy, limit = 10 } = args as any;
        let query = "SELECT ";
        if (groupBy === "status") {
          query += "status, COUNT(*) as count FROM claims";
        } else if (groupBy === "provider") {
          query += "provider_name, COUNT(*) as count FROM claims";
        } else if (groupBy === "month") {
          query += "DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM claims";
        } else {
          query += "COUNT(*) as total_claims FROM claims";
        }
        if (status && status !== "all") query += ` WHERE status = '${status}'`;
        if (groupBy) query += ` GROUP BY 1 ORDER BY count DESC`;
        query += ` LIMIT ${Number(limit) || 10}`;
        const result = await executeSafeQuery(query);
        return JSON.stringify(result.rows);
      }

      case "get_provider_stats": {
        const { sortBy = "claims_volume", limit = 10 } = args as any;
        const orderCol = sortBy === "rejection_rate" ? "rejection_rate DESC" :
          sortBy === "compliance_score" ? "compliance_score DESC" :
          sortBy === "risk_score" ? "risk_score DESC" : "total_claims DESC";
        const query = `SELECT name, region, tier, total_claims, rejection_rate, compliance_score, risk_score FROM provider_directory ORDER BY ${orderCol} LIMIT ${Number(limit) || 10}`;
        const result = await executeSafeQuery(query);
        return JSON.stringify(result.rows);
      }

      case "get_beneficiary_stats": {
        const { groupBy = "coverage_status", limit = 10 } = args as any;
        const col = groupBy === "region" ? "region" : groupBy === "employer" ? "employer_name" : "coverage_status";
        const query = `SELECT ${col}, COUNT(*) as count FROM portal_members GROUP BY 1 ORDER BY count DESC LIMIT ${Number(limit) || 10}`;
        const result = await executeSafeQuery(query);
        return JSON.stringify(result.rows);
      }

      case "get_fwa_alerts": {
        const { severity = "all", entityType = "all", limit = 10 } = args as any;
        let query = "SELECT id, entity_type, entity_name, risk_score, status, created_at FROM fwa_cases";
        const conditions: string[] = [];
        if (severity !== "all") conditions.push(`severity = '${severity}'`);
        if (entityType !== "all") conditions.push(`entity_type = '${entityType}'`);
        if (conditions.length) query += " WHERE " + conditions.join(" AND ");
        query += ` ORDER BY risk_score DESC LIMIT ${Number(limit) || 10}`;
        const result = await executeSafeQuery(query);
        return JSON.stringify(result.rows);
      }

      case "get_drg_analysis": {
        const { groupBy = "drg_code", limit = 10 } = args as any;
        const query = `SELECT ${groupBy}, COUNT(*) as cases FROM digital_twins GROUP BY 1 ORDER BY cases DESC LIMIT ${Number(limit) || 10}`;
        const result = await executeSafeQuery(query);
        return JSON.stringify(result.rows);
      }

      case "run_custom_query": {
        const { query, explanation } = args as any;
        const validation = validateQuery(query);
        if (!validation.allowed) {
          return JSON.stringify({ error: validation.reason });
        }
        const result = await executeSafeQuery(query);
        return JSON.stringify({ explanation, data: result.rows, rowCount: result.rowCount });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

const DATA_AGENT_SYSTEM_PROMPT = `You are a data analyst for CHI's healthcare regulatory platform (TachyHealth).
You answer questions about platform data: claims, providers, encounters, DRGs, FWA alerts, beneficiaries.

When answering:
- Use the provided tools to query real platform data
- Present numbers clearly with context
- Use tables and bullet points for multiple data points
- If a pre-built tool can answer the question, prefer it over run_custom_query
- Only use run_custom_query for questions that can't be answered by other tools
- Always attribute data: "According to platform data..."
- If data seems unexpected, note it rather than hiding it`;

export async function queryPlatformData(
  userMessage: string,
  conversationHistory: Array<{role: string; content: string}> = []
): Promise<{ content: string; toolsUsed: string[] }> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: DATA_AGENT_SYSTEM_PROMPT },
    ...conversationHistory.slice(-5).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    })),
    { role: "user", content: userMessage }
  ];

  const toolsUsed: string[] = [];
  let iterations = 0;
  const maxIterations = 3;

  while (iterations < maxIterations) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      tools: DATA_TOOLS,
      messages
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        toolsUsed.push(toolName);

        const toolResult = await executeDataTool(toolName, toolArgs);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult
        });
      }
    } else {
      return {
        content: choice.message.content || "I couldn't find the data to answer that question.",
        toolsUsed
      };
    }
  }

  return {
    content: "I attempted to query the data but reached the processing limit. Please try a more specific question.",
    toolsUsed
  };
}
