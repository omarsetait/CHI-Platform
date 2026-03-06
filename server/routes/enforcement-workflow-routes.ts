import type { Express } from 'express';
import type { IStorage } from '../storage';
import { EnforcementWorkflowOrchestrator } from '../services/enforcement/workflow-orchestrator';
import { getDefaultProvider } from '../services/llm';
import type { CaseDossier } from '../../shared/types/enforcement-workflow';

export function registerEnforcementWorkflowRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  const provider = getDefaultProvider();
  const orchestrator = new EnforcementWorkflowOrchestrator(provider, storage);

  // Create a new enforcement workflow dossier
  app.post('/api/fwa/enforcement-workflow', async (req, res) => {
    try {
      const { enforcementCaseId, claimIds, entities } = req.body;
      const dossier = await storage.createEnforcementDossier({
        caseId: `dossier-${Date.now()}`,
        enforcementCaseId: enforcementCaseId || '',
        claimIds: claimIds || [],
        entities: entities || {},
        currentStage: 'finding',
        stageHistory: [],
        evidence: { engineResults: {}, agentFindings: {} },
        stageDecisions: {},
        financialImpact: { estimatedLoss: 0, recoveryAmount: 0 },
        regulatoryCitations: [],
        violationCodes: [],
        humanReviews: [],
        status: 'active',
      });
      res.json(dossier);
    } catch (error) {
      handleRouteError(res, error, '/api/fwa/enforcement-workflow', 'create enforcement workflow');
    }
  });

  // Execute the current stage of the workflow
  app.post('/api/fwa/enforcement-workflow/:id/execute', async (req, res) => {
    try {
      const dossierRecord = await storage.getEnforcementDossier(req.params.id);
      if (!dossierRecord) {
        return res.status(404).json({ error: 'Dossier not found' });
      }
      const dossier = dbToDossier(dossierRecord);
      const result = await orchestrator.executeStage(dossier);
      await storage.updateEnforcementDossier(dossierRecord.id, {
        currentStage: result.enrichedDossier.currentStage,
        stageHistory: result.enrichedDossier.stageHistory as any,
        evidence: result.enrichedDossier.evidence as any,
        stageDecisions: result.enrichedDossier.stageDecisions as any,
        financialImpact: result.enrichedDossier.financialImpact as any,
        regulatoryCitations: result.enrichedDossier.regulatoryCitations as any,
        humanReviews: result.enrichedDossier.humanReviews as any,
        status: result.nextStage === 'closed' ? 'closed' : 'active',
      });
      if (dossierRecord.enforcementCaseId) {
        await storage.updateEnforcementCase(dossierRecord.enforcementCaseId, {
          status: result.enrichedDossier.currentStage as any,
        });
      }
      res.json({
        decision: result.decision,
        reasoning: result.reasoning,
        confidence: result.confidence,
        nextStage: result.nextStage,
        requiresHITL: result.requiresHITL,
        toolsInvoked: result.toolsInvoked,
        dossier: result.enrichedDossier,
      });
    } catch (error) {
      handleRouteError(res, error, '/api/fwa/enforcement-workflow/:id/execute', 'execute enforcement stage');
    }
  });

  // Run workflow until HITL gate
  app.post('/api/fwa/enforcement-workflow/:id/run', async (req, res) => {
    try {
      const dossierRecord = await storage.getEnforcementDossier(req.params.id);
      if (!dossierRecord) {
        return res.status(404).json({ error: 'Dossier not found' });
      }
      const dossier = dbToDossier(dossierRecord);
      const result = await orchestrator.runUntilGate(dossier);
      await storage.updateEnforcementDossier(dossierRecord.id, {
        currentStage: result.enrichedDossier.currentStage,
        stageHistory: result.enrichedDossier.stageHistory as any,
        evidence: result.enrichedDossier.evidence as any,
        stageDecisions: result.enrichedDossier.stageDecisions as any,
        financialImpact: result.enrichedDossier.financialImpact as any,
        regulatoryCitations: result.enrichedDossier.regulatoryCitations as any,
        humanReviews: result.enrichedDossier.humanReviews as any,
        status: ['closed', 'resolved'].includes(result.nextStage) ? 'closed' : 'active',
      });
      res.json({
        decision: result.decision,
        reasoning: result.reasoning,
        confidence: result.confidence,
        nextStage: result.nextStage,
        requiresHITL: result.requiresHITL,
        stagesExecuted: result.enrichedDossier.stageHistory.length,
        dossier: result.enrichedDossier,
      });
    } catch (error) {
      handleRouteError(res, error, '/api/fwa/enforcement-workflow/:id/run', 'run enforcement workflow');
    }
  });

  // HITL approval endpoint
  app.post('/api/fwa/enforcement-workflow/:id/approve', async (req, res) => {
    try {
      const { reviewerId, reviewerName, decision, notes } = req.body;
      const dossierRecord = await storage.getEnforcementDossier(req.params.id);
      if (!dossierRecord) {
        return res.status(404).json({ error: 'Dossier not found' });
      }
      const dossier = dbToDossier(dossierRecord);
      const result = await orchestrator.resumeAfterApproval(dossier, {
        reviewerId: reviewerId || 'system',
        reviewerName: reviewerName || 'System',
        decision: decision || 'approved',
        notes: notes || '',
      });
      await storage.updateEnforcementDossier(dossierRecord.id, {
        currentStage: result.enrichedDossier.currentStage,
        stageHistory: result.enrichedDossier.stageHistory as any,
        evidence: result.enrichedDossier.evidence as any,
        stageDecisions: result.enrichedDossier.stageDecisions as any,
        humanReviews: result.enrichedDossier.humanReviews as any,
        status: ['closed', 'resolved'].includes(result.nextStage) ? 'closed' : 'active',
      });
      res.json({
        decision: result.decision,
        nextStage: result.nextStage,
        requiresHITL: result.requiresHITL,
        dossier: result.enrichedDossier,
      });
    } catch (error) {
      handleRouteError(res, error, '/api/fwa/enforcement-workflow/:id/approve', 'approve enforcement workflow');
    }
  });

  // Get dossier details
  app.get('/api/fwa/enforcement-workflow/:id', async (req, res) => {
    try {
      const dossier = await storage.getEnforcementDossier(req.params.id);
      if (!dossier) {
        return res.status(404).json({ error: 'Dossier not found' });
      }
      res.json(dossier);
    } catch (error) {
      handleRouteError(res, error, '/api/fwa/enforcement-workflow/:id', 'get enforcement dossier');
    }
  });

  // List dossiers with filters
  app.get('/api/fwa/enforcement-workflows', async (req, res) => {
    try {
      const { status, stage } = req.query;
      const dossiers = await storage.listEnforcementDossiers({
        status: status as string,
        stage: stage as string,
      });
      res.json(dossiers);
    } catch (error) {
      handleRouteError(res, error, '/api/fwa/enforcement-workflows', 'list enforcement dossiers');
    }
  });
}

function dbToDossier(record: any): CaseDossier {
  return {
    caseId: record.caseId,
    enforcementCaseId: record.enforcementCaseId,
    claimIds: (record.claimIds as string[]) || [],
    entities: (record.entities as any) || {},
    currentStage: record.currentStage as any,
    stageHistory: (record.stageHistory as any[]) || [],
    evidence: (record.evidence as any) || { engineResults: {}, agentFindings: {} },
    stageDecisions: (record.stageDecisions as any) || {},
    financialImpact: (record.financialImpact as any) || { estimatedLoss: 0, recoveryAmount: 0 },
    regulatoryCitations: (record.regulatoryCitations as any[]) || [],
    violationCodes: (record.violationCodes as string[]) || [],
    humanReviews: (record.humanReviews as any[]) || [],
    createdAt: record.createdAt || new Date(),
    updatedAt: record.updatedAt || new Date(),
  };
}
