import { describe, it, expect, vi } from 'vitest';
import { getEngineTools } from '../tools/engine-tools';

function createMockStorage(detectionResult: any = null): any {
  return {
    getDetectionResultsByClaimId: vi.fn().mockResolvedValue(detectionResult),
  };
}

describe('Engine Tools (storage-backed)', () => {
  const SAMPLE_RESULT = {
    claimId: 'claim-1',
    compositeScore: '85.50',
    ruleEngineScore: '78.00',
    statisticalScore: '72.50',
    unsupervisedScore: '65.00',
    ragLlmScore: '80.00',
    ruleEngineFindings: { matchedRules: [{ ruleId: 'R1', ruleName: 'Duplicate billing' }], totalRulesChecked: 50, violationCount: 3 },
    statisticalFindings: { modelPrediction: 0.82, featureImportance: [], peerComparison: { mean: 50, stdDev: 15, zScore: 2.3 }, historicalTrend: 'increasing' },
    unsupervisedFindings: { anomalyScore: 0.78, clusterAssignment: 2, clusterSize: 15, outlierReason: ['high_amount'], isolationForestScore: 0.85, nearestClusterDistance: 3.2 },
    ragLlmFindings: { contextualAnalysis: 'Suspicious pattern', similarCases: [], knowledgeBaseMatches: [], recommendation: 'Investigate', confidence: 0.8 },
    detectionSummary: 'High risk claim with multiple red flags',
    recommendedAction: 'Full investigation required',
  };

  it('rule_engine tool returns score and findings from storage', async () => {
    const storage = createMockStorage(SAMPLE_RESULT);
    const tools = getEngineTools(['rule_engine'], storage);
    const result = await tools[0].execute({ claimId: 'claim-1' });
    expect(result.engine).toBe('rule_engine');
    expect(result.score).toBe(78);
    expect(result.findings).toEqual(SAMPLE_RESULT.ruleEngineFindings);
    expect(storage.getDetectionResultsByClaimId).toHaveBeenCalledWith('claim-1');
  });

  it('statistical tool returns score and findings from storage', async () => {
    const storage = createMockStorage(SAMPLE_RESULT);
    const tools = getEngineTools(['statistical'], storage);
    const result = await tools[0].execute({ claimId: 'claim-1' });
    expect(result.engine).toBe('statistical');
    expect(result.score).toBe(72.5);
    expect(result.findings).toEqual(SAMPLE_RESULT.statisticalFindings);
  });

  it('unsupervised tool returns score and findings from storage', async () => {
    const storage = createMockStorage(SAMPLE_RESULT);
    const tools = getEngineTools(['unsupervised'], storage);
    const result = await tools[0].execute({ claimId: 'claim-1' });
    expect(result.engine).toBe('unsupervised');
    expect(result.score).toBe(65);
    expect(result.findings).toEqual(SAMPLE_RESULT.unsupervisedFindings);
  });

  it('rag_llm tool returns score and findings from storage', async () => {
    const storage = createMockStorage(SAMPLE_RESULT);
    const tools = getEngineTools(['rag_llm'], storage);
    const result = await tools[0].execute({ claimId: 'claim-1' });
    expect(result.engine).toBe('rag_llm');
    expect(result.score).toBe(80);
    expect(result.findings).toEqual(SAMPLE_RESULT.ragLlmFindings);
  });

  it('semantic tool returns composite score and summary', async () => {
    const storage = createMockStorage(SAMPLE_RESULT);
    const tools = getEngineTools(['semantic'], storage);
    const result = await tools[0].execute({ claimId: 'claim-1' });
    expect(result.engine).toBe('semantic');
    expect(result.score).toBe(85.5);
    expect(result.findings).toEqual({
      detectionSummary: SAMPLE_RESULT.detectionSummary,
      recommendedAction: SAMPLE_RESULT.recommendedAction,
    });
  });

  it('returns score 0 when no detection result exists', async () => {
    const storage = createMockStorage(null);
    const tools = getEngineTools(['rule_engine'], storage);
    const result = await tools[0].execute({ claimId: 'missing' });
    expect(result.score).toBe(0);
    expect(result.note).toBe('No detection results found');
  });

  it('creates all 5 engine tools', () => {
    const storage = createMockStorage(null);
    const tools = getEngineTools(['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic'], storage);
    expect(tools).toHaveLength(5);
    expect(tools.map(t => t.name)).toEqual(['rule_engine', 'statistical', 'unsupervised', 'rag_llm', 'semantic']);
  });

  it('each tool has a valid toToolDefinition', () => {
    const storage = createMockStorage(null);
    const tools = getEngineTools(['rule_engine'], storage);
    const def = tools[0].toToolDefinition();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('rule_engine');
    expect(def.function.parameters).toBeDefined();
  });
});
