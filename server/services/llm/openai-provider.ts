import OpenAI from 'openai';
import type {
  LLMProvider,
  ChatParams,
  LLMResponse,
  ProviderConfig,
  ChatMessage,
} from './llm-provider';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  readonly model: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(params: ChatParams): Promise<LLMResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages.map((m) => this.toOpenAIMessage(m)),
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: params.tools?.length
        ? params.tools.map((t) => ({
            type: 'function' as const,
            function: t.function,
          }))
        : undefined,
      temperature: params.temperature ?? 0.1,
      max_tokens: params.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls
        ?.filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall => tc.type === 'function')
        .map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      finishReason:
        choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
    };
  }

  private toOpenAIMessage(
    msg: ChatMessage
  ): OpenAI.Chat.ChatCompletionMessageParam {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content || '',
        tool_call_id: msg.toolCallId!,
      };
    }
    if (msg.role === 'assistant' && msg.toolCalls) {
      return {
        role: 'assistant',
        content: msg.content,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: tc.function,
        })),
      };
    }
    return { role: msg.role as 'user' | 'assistant', content: msg.content || '' };
  }
}
