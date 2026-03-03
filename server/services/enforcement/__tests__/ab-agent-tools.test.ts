import { describe, it, expect, vi } from 'vitest';
import { getAgentTools } from '../tools/ab-agent-tools';

function createMockStorage(overrides: Record<string, any> = {}): any {
  return {
    getFwaAnalysisFindingsByCaseId: vi.fn().mockResolvedValue(overrides.findings || []),
    getFwaCategoriesByCaseId: vi.fn().mockResolvedValue(overrides.categories || []),
    getFwaBehaviors: vi.fn().mockResolvedValue(overrides.behaviors || []),
    getFwaActionsByCaseId: vi.fn().mockResolvedValue(overrides.actions || []),
    getFwaRegulatoryDocs: vi.fn().mockResolvedValue(overrides.regulatoryDocs || []),
    getFwaMedicalGuidelines: vi.fn().mockResolvedValue(overrides.medicalGuidelines || []),
    getProvider360: vi.fn().mockResolvedValue(overrides.provider360 || null),
    getPatient360: vi.fn().mockResolvedValue(overrides.patient360 || null),
    getDoctor360: vi.fn().mockResolvedValue(overrides.doctor360 || null),
  };
}

describe('A/B Agent Tools (storage-backed)', () => {
  it('a1_analysis returns findings from storage', async () => {
    const mockFindings = [{ id: '1', type: 'pattern', description: 'Duplicate billing' }];
    const storage = createMockStorage({ findings: mockFindings });
    const tools = getAgentTools(['a1_analysis'], storage);
    const result = await tools[0].execute({ caseId: 'case-1' });
    expect(result.agent).toBe('a1_analysis');
    expect(result.findings).toEqual(mockFindings);
    expect(result.confidence).toBe(0.8);
    expect(storage.getFwaAnalysisFindingsByCaseId).toHaveBeenCalledWith('case-1');
  });

  it('a1_analysis returns low confidence when no findings', async () => {
    const storage = createMockStorage();
    const tools = getAgentTools(['a1_analysis'], storage);
    const result = await tools[0].execute({ caseId: 'missing' });
    expect(result.confidence).toBe(0.1);
    expect(result.findings).toEqual([]);
  });

  it('a2_categorization returns categories and behaviors', async () => {
    const storage = createMockStorage({
      categories: [{ category: 'coding', confidence: 0.9 }],
      behaviors: [{ id: '1', name: 'upcoding' }],
    });
    const tools = getAgentTools(['a2_categorization'], storage);
    const result = await tools[0].execute({ caseId: 'case-1' });
    expect(result.agent).toBe('a2_categorization');
    expect(result.categories).toHaveLength(1);
    expect(result.behaviors).toHaveLength(1);
    expect(result.confidence).toBe(0.75);
  });

  it('a3_action returns actions from storage', async () => {
    const mockActions = [{ id: '1', type: 'preventive', action: 'Suspend claims' }];
    const storage = createMockStorage({ actions: mockActions });
    const tools = getAgentTools(['a3_action'], storage);
    const result = await tools[0].execute({ caseId: 'case-1' });
    expect(result.agent).toBe('a3_action');
    expect(result.actions).toEqual(mockActions);
    expect(result.confidence).toBe(0.7);
  });

  it('b1_regulatory returns docs with text matching', async () => {
    const docs = [
      { title: 'NPHIES Fraud Detection Rules', content: 'Section 5 covers upcoding penalties', source: 'NPHIES' },
      { title: 'MOH General Guidelines', content: 'General healthcare guidelines', source: 'MOH' },
    ];
    const storage = createMockStorage({ regulatoryDocs: docs });
    const tools = getAgentTools(['b1_regulatory'], storage);
    const result = await tools[0].execute({ query: 'upcoding' });
    expect(result.agent).toBe('b1_regulatory');
    expect(result.citations).toHaveLength(1);
    expect(result.confidence).toBe(0.8);
  });

  it('b1_regulatory filters by source', async () => {
    const docs = [
      { title: 'NPHIES Rules', content: 'Section on fraud', source: 'NPHIES' },
      { title: 'MOH Rules', content: 'Section on fraud', source: 'MOH' },
    ];
    const storage = createMockStorage({ regulatoryDocs: docs });
    const tools = getAgentTools(['b1_regulatory'], storage);
    const result = await tools[0].execute({ query: 'fraud', sources: ['NPHIES'] });
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].source).toBe('NPHIES');
  });

  it('b2_medical returns guidelines with text matching', async () => {
    const guidelines = [
      { title: 'Cardiology Pathway', content: 'Heart disease management' },
      { title: 'Orthopedic Guidelines', content: 'Joint replacement protocols' },
    ];
    const storage = createMockStorage({ medicalGuidelines: guidelines });
    const tools = getAgentTools(['b2_medical'], storage);
    const result = await tools[0].execute({ query: 'heart' });
    expect(result.agent).toBe('b2_medical');
    expect(result.clinicalAnalysis).toHaveLength(1);
    expect(result.confidence).toBe(0.75);
  });

  it('b3_history queries provider360 for provider entity type', async () => {
    const mockProvider = { id: 'prov-1', name: 'Test Provider', riskScore: 75 };
    const storage = createMockStorage({ provider360: mockProvider });
    const tools = getAgentTools(['b3_history'], storage);
    const result = await tools[0].execute({ entityId: 'prov-1', entityType: 'provider' });
    expect(result.agent).toBe('b3_history');
    expect(result.entity360).toEqual(mockProvider);
    expect(result.confidence).toBe(0.85);
    expect(storage.getProvider360).toHaveBeenCalledWith('prov-1');
  });

  it('b3_history queries patient360 for patient entity type', async () => {
    const storage = createMockStorage({ patient360: { id: 'pat-1' } });
    const tools = getAgentTools(['b3_history'], storage);
    await tools[0].execute({ entityId: 'pat-1', entityType: 'patient' });
    expect(storage.getPatient360).toHaveBeenCalledWith('pat-1');
  });

  it('b3_history queries doctor360 for doctor entity type', async () => {
    const storage = createMockStorage({ doctor360: { id: 'doc-1' } });
    const tools = getAgentTools(['b3_history'], storage);
    await tools[0].execute({ entityId: 'doc-1', entityType: 'doctor' });
    expect(storage.getDoctor360).toHaveBeenCalledWith('doc-1');
  });

  it('b3_history returns low confidence when entity not found', async () => {
    const storage = createMockStorage();
    const tools = getAgentTools(['b3_history'], storage);
    const result = await tools[0].execute({ entityId: 'missing', entityType: 'provider' });
    expect(result.confidence).toBe(0.1);
    expect(result.entity360.note).toContain('No provider data found');
  });

  it('creates all 6 agent tools', () => {
    const storage = createMockStorage();
    const tools = getAgentTools(
      ['a1_analysis', 'a2_categorization', 'a3_action', 'b1_regulatory', 'b2_medical', 'b3_history'],
      storage,
    );
    expect(tools).toHaveLength(6);
    expect(tools.map(t => t.name)).toEqual([
      'a1_analysis', 'a2_categorization', 'a3_action', 'b1_regulatory', 'b2_medical', 'b3_history',
    ]);
  });
});
