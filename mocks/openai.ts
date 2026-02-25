import { vi } from 'vitest';

export const mockChatCompletionsCreate = vi.fn();

export const mockOpenAI = {
  chat: {
    completions: {
      create: mockChatCompletionsCreate
    }
  }
};

// Default mock response for AI agent calls
export const defaultAgentResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        executiveSummary: "Mock analysis complete - test environment",
        findings: [{
          title: "Mock Finding",
          description: "Test finding for unit testing",
          severity: "medium",
          confidence: 0.85,
          evidence: ["Evidence 1", "Evidence 2"]
        }],
        recommendations: [{
          action: "Mock recommendation",
          priority: "high",
          estimatedImpact: "$10,000",
          timeline: "7 days"
        }],
        riskScore: 65,
        recoveryPotential: 50000
      })
    }
  }]
};

// Set default mock response
mockChatCompletionsCreate.mockResolvedValue(defaultAgentResponse);

// Reset mock between tests
export function resetOpenAIMock() {
  mockChatCompletionsCreate.mockClear();
  mockChatCompletionsCreate.mockResolvedValue(defaultAgentResponse);
}

// Helper to mock a specific response
export function mockOpenAIResponse(response: any) {
  mockChatCompletionsCreate.mockResolvedValueOnce({
    choices: [{
      message: {
        content: typeof response === 'string' ? response : JSON.stringify(response)
      }
    }]
  });
}

// Helper to mock an error
export function mockOpenAIError(error: Error) {
  mockChatCompletionsCreate.mockRejectedValueOnce(error);
}
