import type {
  CaseDossier,
  EnforcementStage,
  StageDecision,
  StageDecisionRecord,
} from '../../../../shared/types/enforcement-workflow';
import type {
  LLMProvider,
  LLMResponse,
  ChatMessage,
} from '../../llm/llm-provider';
import type { AgentTool } from '../tools/agent-tool';
import { getToolsForStage } from '../tools/tool-registry';
import type { IStorage } from '../../../storage';

export interface AgentExecutionResult {
  enrichedDossier: CaseDossier;
  decision: StageDecision;
  reasoning: string;
  confidence: number;
  targetStage?: EnforcementStage;
  toolsInvoked: string[];
}

export abstract class BaseEnforcementAgent {
  abstract stage: EnforcementStage;
  abstract systemPrompt: string;

  protected maxToolRounds = 5;

  async execute(
    dossier: CaseDossier,
    provider: LLMProvider,
    storage: IStorage
  ): Promise<AgentExecutionResult> {
    const tools = getToolsForStage(this.stage, storage);
    const toolsInvoked: string[] = [];

    const messages: ChatMessage[] = [
      { role: 'user', content: this.buildDossierPrompt(dossier) },
    ];

    let lastResponse: LLMResponse | null = null;

    // Tool-use loop
    for (let round = 0; round < this.maxToolRounds; round++) {
      const response = await provider.chat({
        systemPrompt: this.systemPrompt,
        messages,
        tools: tools.map((t) => t.toToolDefinition()),
        temperature: 0.1,
      });

      lastResponse = response;

      if (response.finishReason !== 'tool_calls' || !response.toolCalls?.length) {
        break;
      }

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Execute each tool call
      for (const toolCall of response.toolCalls) {
        const tool = tools.find((t) => t.name === toolCall.function.name);
        if (!tool) {
          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` }),
            toolCallId: toolCall.id,
          });
          continue;
        }

        toolsInvoked.push(tool.name);
        try {
          const params = JSON.parse(toolCall.function.arguments);
          const result = await tool.execute(params);
          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolCallId: toolCall.id,
          });
        } catch (err: any) {
          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: err.message }),
            toolCallId: toolCall.id,
          });
        }
      }
    }

    const parsed = this.parseDecision(lastResponse!);

    const decisionRecord: StageDecisionRecord = {
      agentId: `enforcement-${this.stage}`,
      stage: this.stage,
      reasoning: parsed.reasoning,
      decision: parsed.decision,
      confidence: parsed.confidence,
      toolsInvoked: Array.from(new Set(toolsInvoked)),
      timestamp: new Date(),
      targetStage: parsed.targetStage,
    };

    const enrichedDossier: CaseDossier = {
      ...dossier,
      stageDecisions: {
        ...dossier.stageDecisions,
        [this.stage]: decisionRecord,
      },
      updatedAt: new Date(),
    };

    return {
      enrichedDossier,
      decision: parsed.decision,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      targetStage: parsed.targetStage,
      toolsInvoked: Array.from(new Set(toolsInvoked)),
    };
  }

  protected abstract parseDecision(response: LLMResponse): {
    decision: StageDecision;
    reasoning: string;
    confidence: number;
    targetStage?: EnforcementStage;
  };

  protected buildDossierPrompt(dossier: CaseDossier): string {
    return `## Case Dossier

**Case ID:** ${dossier.caseId}
**Current Stage:** ${dossier.currentStage}
**Claims:** ${dossier.claimIds.join(', ')}
**Entities:** Provider=${dossier.entities.providerId || 'N/A'}, Patient=${dossier.entities.patientId || 'N/A'}

### Previous Evidence
${JSON.stringify(dossier.evidence, null, 2)}

### Previous Stage Decisions
${JSON.stringify(dossier.stageDecisions, null, 2)}

### Financial Impact
Estimated Loss: ${dossier.financialImpact.estimatedLoss}
Recovery Amount: ${dossier.financialImpact.recoveryAmount}

### Violation Codes
${dossier.violationCodes.join(', ') || 'None yet'}

### Regulatory Citations
${dossier.regulatoryCitations.map((c) => `- ${c.code}: ${c.description} (${c.source})`).join('\n') || 'None yet'}

---

Analyze this case using your available tools and provide your decision. Respond with JSON:
\`\`\`json
{
  "decision": "<your_decision>",
  "reasoning": "<detailed_reasoning>",
  "confidence": <0.0_to_1.0>,
  "targetStage": "<stage_if_loop_back_or_escalate>"
}
\`\`\``;
  }

  // Helper for concrete agents to parse JSON decisions
  protected extractJsonDecision(response: LLMResponse, validDecisions: string[]) {
    try {
      const content = response.content || '';
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"decision"[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr);
      return {
        decision: (validDecisions.includes(parsed.decision) ? parsed.decision : validDecisions[0]) as StageDecision,
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        targetStage: parsed.targetStage as EnforcementStage | undefined,
      };
    } catch {
      return { decision: 'hold' as StageDecision, reasoning: 'Failed to parse agent response', confidence: 0 };
    }
  }
}
