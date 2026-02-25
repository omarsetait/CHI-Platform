import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";

const openai = new OpenAI();

// Generate embedding for text using OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000), // Limit input length
  });
  return response.data[0].embedding;
}

// Generate and store embeddings for knowledge base records
export async function generateKnowledgeBaseEmbeddings(): Promise<{ success: boolean; results: Record<string, number> }> {
  const results: Record<string, number> = {};

  // Policy Violations
  const policyViolations = await db.execute(sql`
    SELECT id, violation_code, title, description, category 
    FROM policy_violation_catalogue 
    WHERE embedding IS NULL
  `);
  
  for (const row of policyViolations.rows) {
    const text = `${row.violation_code}: ${row.title}. ${row.description}. Category: ${row.category}`;
    try {
      const embedding = await generateEmbedding(text);
      await db.execute(sql`
        UPDATE policy_violation_catalogue 
        SET embedding = ${JSON.stringify(embedding)}::vector 
        WHERE id = ${row.id}
      `);
    } catch (error) {
      console.error(`Failed to embed policy violation ${row.id}:`, error);
    }
  }
  results.policyViolations = policyViolations.rows.length;

  // Clinical Pathways
  const clinicalPathways = await db.execute(sql`
    SELECT id, rule_code, title, description, category, specialty 
    FROM clinical_pathway_rules 
    WHERE embedding IS NULL
  `);
  
  for (const row of clinicalPathways.rows) {
    const text = `${row.rule_code}: ${row.title}. ${row.description}. Category: ${row.category}. Specialty: ${row.specialty || 'General'}`;
    try {
      const embedding = await generateEmbedding(text);
      await db.execute(sql`
        UPDATE clinical_pathway_rules 
        SET embedding = ${JSON.stringify(embedding)}::vector 
        WHERE id = ${row.id}
      `);
    } catch (error) {
      console.error(`Failed to embed clinical pathway ${row.id}:`, error);
    }
  }
  results.clinicalPathways = clinicalPathways.rows.length;

  // Regulatory Documents
  const regulatoryDocs = await db.execute(sql`
    SELECT id, regulation_id, title, content, category, jurisdiction 
    FROM fwa_regulatory_docs 
    WHERE embedding IS NULL
  `);
  
  for (const row of regulatoryDocs.rows) {
    const text = `${row.regulation_id}: ${row.title}. ${row.content}. Category: ${row.category}. Jurisdiction: ${row.jurisdiction || 'Saudi Arabia'}`;
    try {
      const embedding = await generateEmbedding(text);
      await db.execute(sql`
        UPDATE fwa_regulatory_docs 
        SET embedding = ${JSON.stringify(embedding)}::vector 
        WHERE id = ${row.id}
      `);
    } catch (error) {
      console.error(`Failed to embed regulatory doc ${row.id}:`, error);
    }
  }
  results.regulatoryDocs = regulatoryDocs.rows.length;

  // Medical Guidelines
  const medicalGuidelines = await db.execute(sql`
    SELECT id, title, content, category, source_authority, specialty_area 
    FROM fwa_medical_guidelines 
    WHERE embedding IS NULL
  `);
  
  for (const row of medicalGuidelines.rows) {
    const text = `${row.title}. ${row.content}. Category: ${row.category}. Source: ${row.source_authority}. Specialty: ${row.specialty_area || 'General'}`;
    try {
      const embedding = await generateEmbedding(text);
      await db.execute(sql`
        UPDATE fwa_medical_guidelines 
        SET embedding = ${JSON.stringify(embedding)}::vector 
        WHERE id = ${row.id}
      `);
    } catch (error) {
      console.error(`Failed to embed medical guideline ${row.id}:`, error);
    }
  }
  results.medicalGuidelines = medicalGuidelines.rows.length;

  // Provider Complaints
  const providerComplaints = await db.execute(sql`
    SELECT id, complaint_number, provider_name, description, category, source 
    FROM provider_complaints 
    WHERE embedding IS NULL
  `);
  
  for (const row of providerComplaints.rows) {
    const text = `Complaint ${row.complaint_number} against ${row.provider_name}: ${row.description}. Category: ${row.category}. Source: ${row.source}`;
    try {
      const embedding = await generateEmbedding(text);
      await db.execute(sql`
        UPDATE provider_complaints 
        SET embedding = ${JSON.stringify(embedding)}::vector 
        WHERE id = ${row.id}
      `);
    } catch (error) {
      console.error(`Failed to embed complaint ${row.id}:`, error);
    }
  }
  results.providerComplaints = providerComplaints.rows.length;

  return { success: true, results };
}

// Semantic search across all knowledge base tables
export async function semanticSearch(query: string, limit: number = 5): Promise<{
  policyViolations: any[];
  clinicalPathways: any[];
  regulatoryDocs: any[];
  medicalGuidelines: any[];
  providerComplaints: any[];
}> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = JSON.stringify(queryEmbedding);

  // Search policy violations
  const policyViolations = await db.execute(sql`
    SELECT id, violation_code, title, description, category, severity,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM policy_violation_catalogue
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  // Search clinical pathways
  const clinicalPathways = await db.execute(sql`
    SELECT id, rule_code, title, description, category, specialty,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM clinical_pathway_rules
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  // Search regulatory docs
  const regulatoryDocs = await db.execute(sql`
    SELECT id, regulation_id, title, content, category, jurisdiction,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM fwa_regulatory_docs
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  // Search medical guidelines
  const medicalGuidelines = await db.execute(sql`
    SELECT id, title, content, category, source_authority, specialty_area,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM fwa_medical_guidelines
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  // Search provider complaints
  const providerComplaints = await db.execute(sql`
    SELECT id, complaint_number, provider_name, description, category, source, severity,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM provider_complaints
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return {
    policyViolations: policyViolations.rows,
    clinicalPathways: clinicalPathways.rows,
    regulatoryDocs: regulatoryDocs.rows,
    medicalGuidelines: medicalGuidelines.rows,
    providerComplaints: providerComplaints.rows,
  };
}

// RAG-powered knowledge base query with LLM response
export async function ragKnowledgeBaseQuery(query: string): Promise<{
  answer: string;
  sources: any[];
  context: string;
}> {
  // Get relevant context from semantic search
  const searchResults = await semanticSearch(query, 3);
  
  // Build context from all sources
  const contextParts: string[] = [];
  const sources: any[] = [];

  for (const violation of searchResults.policyViolations) {
    contextParts.push(`[Policy Violation ${violation.violation_code}] ${violation.title}: ${violation.description}`);
    sources.push({ type: 'policy_violation', ...violation });
  }

  for (const pathway of searchResults.clinicalPathways) {
    contextParts.push(`[Clinical Pathway ${pathway.rule_code}] ${pathway.title}: ${pathway.description}`);
    sources.push({ type: 'clinical_pathway', ...pathway });
  }

  for (const doc of searchResults.regulatoryDocs) {
    contextParts.push(`[Regulatory Doc ${doc.regulation_id}] ${doc.title}: ${doc.content}`);
    sources.push({ type: 'regulatory_doc', ...doc });
  }

  for (const guideline of searchResults.medicalGuidelines) {
    contextParts.push(`[Medical Guideline] ${guideline.title}: ${guideline.content}`);
    sources.push({ type: 'medical_guideline', ...guideline });
  }

  for (const complaint of searchResults.providerComplaints) {
    contextParts.push(`[Complaint ${complaint.complaint_number}] Provider: ${complaint.provider_name}: ${complaint.description}`);
    sources.push({ type: 'provider_complaint', ...complaint });
  }

  const context = contextParts.join('\n\n');

  // Generate answer using LLM with retrieved context
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a CHI (Council of Health Insurance) regulatory expert assistant. Answer questions based on the provided knowledge base context. Be specific, cite sources when relevant, and provide actionable regulatory guidance. If the context doesn't contain relevant information, say so clearly.

Context from CHI Knowledge Base:
${context || "No relevant context found in the knowledge base."}`
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0.3,
    max_tokens: 1000
  });

  return {
    answer: response.choices[0]?.message?.content || "Unable to generate response",
    sources,
    context
  };
}
