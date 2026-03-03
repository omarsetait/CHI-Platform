import type { LLMProvider, ProviderConfig } from './llm-provider';
import { OpenAIProvider } from './openai-provider';

export function createLLMProvider(config: ProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
    case 'azure':
      return new OpenAIProvider(config);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

export function getDefaultProvider(): LLMProvider {
  return createLLMProvider({
    provider: 'openai',
    model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || 'gpt-4o',
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || '',
    baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}
