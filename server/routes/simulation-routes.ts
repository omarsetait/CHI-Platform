import type { Express } from "express";
import type { IStorage } from "../storage";
import {
  insertDigitalTwinSchema,
  insertShadowRuleSchema,
  insertGhostRunSchema,
  insertRelationshipGraphSchema,
  insertCollusionRingSchema,
} from "@shared/schema";

export function registerSimulationRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  // ============================================
  // Simulation Lab - Digital Twins Routes
  // ============================================

  app.get("/api/simulation/digital-twins", async (req, res) => {
    try {
      const twins = await storage.listDigitalTwins();
      res.json(twins);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/digital-twins", "fetch digital twins");
    }
  });

  app.get("/api/simulation/digital-twins/:twinId", async (req, res) => {
    try {
      const twin = await storage.getDigitalTwin(req.params.twinId);
      if (!twin) {
        return res.status(404).json({ error: "Digital twin not found" });
      }
      res.json(twin);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/digital-twins/:twinId", "fetch digital twin");
    }
  });

  app.post("/api/simulation/digital-twins", async (req, res) => {
    try {
      const parsed = insertDigitalTwinSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const twin = await storage.createDigitalTwin(parsed.data);
      res.status(201).json(twin);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/digital-twins", "create digital twin");
    }
  });

  app.patch("/api/simulation/digital-twins/:twinId", async (req, res) => {
    try {
      const partialSchema = insertDigitalTwinSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const twin = await storage.updateDigitalTwin(req.params.twinId, parsed.data);
      if (!twin) {
        return res.status(404).json({ error: "Digital twin not found" });
      }
      res.json(twin);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/digital-twins/:twinId", "update digital twin");
    }
  });

  app.delete("/api/simulation/digital-twins/:twinId", async (req, res) => {
    try {
      const deleted = await storage.deleteDigitalTwin(req.params.twinId);
      if (!deleted) {
        return res.status(404).json({ error: "Digital twin not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/digital-twins/:twinId", "delete digital twin");
    }
  });

  // ============================================
  // Simulation Lab - Shadow Rules Routes
  // ============================================

  app.get("/api/simulation/shadow-rules", async (req, res) => {
    try {
      const rules = await storage.listShadowRules();
      res.json(rules);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/shadow-rules", "fetch shadow rules");
    }
  });

  app.get("/api/simulation/shadow-rules/:ruleSetId", async (req, res) => {
    try {
      const rule = await storage.getShadowRule(req.params.ruleSetId);
      if (!rule) {
        return res.status(404).json({ error: "Shadow rule not found" });
      }
      res.json(rule);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/shadow-rules/:ruleSetId", "fetch shadow rule");
    }
  });

  app.post("/api/simulation/shadow-rules", async (req, res) => {
    try {
      const parsed = insertShadowRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const rule = await storage.createShadowRule(parsed.data);
      res.status(201).json(rule);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/shadow-rules", "create shadow rule");
    }
  });

  app.patch("/api/simulation/shadow-rules/:ruleSetId", async (req, res) => {
    try {
      const partialSchema = insertShadowRuleSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const rule = await storage.updateShadowRule(req.params.ruleSetId, parsed.data);
      if (!rule) {
        return res.status(404).json({ error: "Shadow rule not found" });
      }
      res.json(rule);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/shadow-rules/:ruleSetId", "update shadow rule");
    }
  });

  app.delete("/api/simulation/shadow-rules/:ruleSetId", async (req, res) => {
    try {
      const deleted = await storage.deleteShadowRule(req.params.ruleSetId);
      if (!deleted) {
        return res.status(404).json({ error: "Shadow rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/shadow-rules/:ruleSetId", "delete shadow rule");
    }
  });

  // ============================================
  // Simulation Lab - Ghost Runs Routes
  // ============================================

  app.get("/api/simulation/ghost-runs", async (req, res) => {
    try {
      const runs = await storage.listGhostRuns();
      res.json(runs);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/ghost-runs", "fetch ghost runs");
    }
  });

  app.get("/api/simulation/ghost-runs/:runId", async (req, res) => {
    try {
      const run = await storage.getGhostRun(req.params.runId);
      if (!run) {
        return res.status(404).json({ error: "Ghost run not found" });
      }
      res.json(run);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/ghost-runs/:runId", "fetch ghost run");
    }
  });

  app.post("/api/simulation/ghost-runs", async (req, res) => {
    try {
      const parsed = insertGhostRunSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const run = await storage.createGhostRun(parsed.data);
      res.status(201).json(run);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/ghost-runs", "create ghost run");
    }
  });

  app.patch("/api/simulation/ghost-runs/:runId", async (req, res) => {
    try {
      const partialSchema = insertGhostRunSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const run = await storage.updateGhostRun(req.params.runId, parsed.data);
      if (!run) {
        return res.status(404).json({ error: "Ghost run not found" });
      }
      res.json(run);
    } catch (error) {
      handleRouteError(res, error, "/api/simulation/ghost-runs/:runId", "update ghost run");
    }
  });

  // ============================================
  // Graph Analysis - Relationship Graphs Routes
  // ============================================

  app.get("/api/graph-analysis/graphs", async (req, res) => {
    try {
      const graphs = await storage.listRelationshipGraphs();
      res.json(graphs);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/graphs", "fetch relationship graphs");
    }
  });

  app.get("/api/graph-analysis/graphs/:graphId", async (req, res) => {
    try {
      const graph = await storage.getRelationshipGraph(req.params.graphId);
      if (!graph) {
        return res.status(404).json({ error: "Relationship graph not found" });
      }
      res.json(graph);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/graphs/:graphId", "fetch relationship graph");
    }
  });

  app.post("/api/graph-analysis/graphs", async (req, res) => {
    try {
      const parsed = insertRelationshipGraphSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const graph = await storage.createRelationshipGraph(parsed.data);
      res.status(201).json(graph);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/graphs", "create relationship graph");
    }
  });

  app.patch("/api/graph-analysis/graphs/:graphId", async (req, res) => {
    try {
      const partialSchema = insertRelationshipGraphSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const graph = await storage.updateRelationshipGraph(req.params.graphId, parsed.data);
      if (!graph) {
        return res.status(404).json({ error: "Relationship graph not found" });
      }
      res.json(graph);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/graphs/:graphId", "update relationship graph");
    }
  });

  app.delete("/api/graph-analysis/graphs/:graphId", async (req, res) => {
    try {
      const deleted = await storage.deleteRelationshipGraph(req.params.graphId);
      if (!deleted) {
        return res.status(404).json({ error: "Relationship graph not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/graphs/:graphId", "delete relationship graph");
    }
  });

  // ============================================
  // Graph Analysis - Collusion Rings Routes
  // ============================================

  app.get("/api/graph-analysis/collusion-rings", async (req, res) => {
    try {
      const rings = await storage.listCollusionRings();
      res.json(rings);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/collusion-rings", "fetch collusion rings");
    }
  });

  app.get("/api/graph-analysis/collusion-rings/:ringId", async (req, res) => {
    try {
      const ring = await storage.getCollusionRing(req.params.ringId);
      if (!ring) {
        return res.status(404).json({ error: "Collusion ring not found" });
      }
      res.json(ring);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/collusion-rings/:ringId", "fetch collusion ring");
    }
  });

  app.post("/api/graph-analysis/collusion-rings", async (req, res) => {
    try {
      const parsed = insertCollusionRingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const ring = await storage.createCollusionRing(parsed.data);
      res.status(201).json(ring);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/collusion-rings", "create collusion ring");
    }
  });

  app.patch("/api/graph-analysis/collusion-rings/:ringId", async (req, res) => {
    try {
      const partialSchema = insertCollusionRingSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const ring = await storage.updateCollusionRing(req.params.ringId, parsed.data);
      if (!ring) {
        return res.status(404).json({ error: "Collusion ring not found" });
      }
      res.json(ring);
    } catch (error) {
      handleRouteError(res, error, "/api/graph-analysis/collusion-rings/:ringId", "update collusion ring");
    }
  });
}
