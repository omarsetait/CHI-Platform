import { db } from "../db";
import { cptEmbeddings, icd10Embeddings, embeddingImportJobs } from "@shared/schema";
import { eq, sql, cosineDistance } from "drizzle-orm";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./embedding-config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 100;

interface CptRecord {
  code: string;
  cpt_long_descriptor?: string;
  primary_term?: string;
  keywords?: string;
  explainer_json?: string;
  embedding_text?: string;
}

interface Icd10Record {
  code: string;
  description?: string;
  chapter?: number;
  chapter_description?: string;
  section?: string;
  section_description?: string;
  parent_code?: string;
  depth?: number;
  includes?: string;
  inclusion_terms?: string;
  excludes1?: string;
  excludes2?: string;
  embedding_text?: string;
}

export function enrichCptText(record: CptRecord): string {
  const parts: string[] = [];
  
  if (record.primary_term) {
    parts.push(`Procedure: ${record.primary_term}`);
  }
  
  if (record.cpt_long_descriptor) {
    parts.push(`Description: ${record.cpt_long_descriptor}`);
  }
  
  if (record.explainer_json) {
    try {
      const explainer = typeof record.explainer_json === 'string' 
        ? JSON.parse(record.explainer_json) 
        : record.explainer_json;
      
      if (explainer.service_type) parts.push(`Service Type: ${explainer.service_type}`);
      if (explainer.intent) parts.push(`Intent: ${explainer.intent}`);
      if (explainer.what_it_is) parts.push(`What it is: ${explainer.what_it_is}`);
      if (explainer.body_system) parts.push(`Body System: ${explainer.body_system}`);
      if (explainer.clinical_context) parts.push(`Clinical Context: ${explainer.clinical_context}`);
    } catch (e) {
    }
  }
  
  if (record.keywords) {
    const keywords = typeof record.keywords === 'string' 
      ? record.keywords.replace(/[\[\]']/g, '').split(',').map(k => k.trim()).filter(Boolean)
      : record.keywords;
    if (Array.isArray(keywords) && keywords.length > 0) {
      parts.push(`Keywords: ${keywords.slice(0, 15).join(', ')}`);
    }
  }
  
  const enriched = parts.join('. ');
  return enriched || record.embedding_text || record.cpt_long_descriptor || `CPT Code ${record.code}`;
}

export function enrichIcd10Text(record: Icd10Record): string {
  const parts: string[] = [];
  
  if (record.description) {
    parts.push(`Diagnosis: ${record.description}`);
  }
  
  if (record.chapter_description) {
    parts.push(`Category: ${record.chapter_description}`);
  }
  
  if (record.section_description) {
    parts.push(`Section: ${record.section_description}`);
  }
  
  if (record.includes) {
    parts.push(`Includes: ${record.includes}`);
  }
  
  if (record.inclusion_terms) {
    const terms = record.inclusion_terms.split('|').map(t => t.trim()).filter(Boolean).slice(0, 5);
    if (terms.length > 0) {
      parts.push(`Related terms: ${terms.join(', ')}`);
    }
  }
  
  if (record.excludes1) {
    parts.push(`Excludes: ${record.excludes1.substring(0, 200)}`);
  }
  
  const enriched = parts.join('. ');
  return enriched || record.embedding_text || record.description || `ICD-10 Code ${record.code}`;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, ' ').substring(0, 8000),
  });
  return response.data[0].embedding;
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const cleanedTexts = texts.map(t => t.replace(/\n/g, ' ').substring(0, 8000));
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleanedTexts,
  });
  return response.data.map(d => d.embedding);
}

export async function importCptCodes(filePath: string): Promise<{ jobId: number }> {
  const [job] = await db.insert(embeddingImportJobs).values({
    jobType: 'cpt',
    status: 'in_progress',
    startedAt: new Date()
  }).returning();
  
  importCptCodesAsync(filePath, job.id).catch(console.error);
  
  return { jobId: job.id };
}

async function importCptCodesAsync(filePath: string, jobId: number): Promise<void> {
  try {
    const fullPath = path.resolve(filePath);
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const records: CptRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseCSVLine(lines[i]);
      const record: any = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx];
      });
      records.push(record);
    }
    
    await db.update(embeddingImportJobs)
      .set({ totalRecords: records.length })
      .where(eq(embeddingImportJobs.id, jobId));
    
    let processed = 0;
    let embedded = 0;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const enrichedTexts = batch.map(r => enrichCptText(r));
      
      try {
        const embeddings = await generateEmbeddingsBatch(enrichedTexts);
        
        for (let j = 0; j < batch.length; j++) {
          const record = batch[j];
          const enrichedText = enrichedTexts[j];
          const embedding = embeddings[j];
          
          let explainerJson = null;
          if (record.explainer_json) {
            try {
              explainerJson = typeof record.explainer_json === 'string' 
                ? JSON.parse(record.explainer_json) 
                : record.explainer_json;
            } catch (e) {}
          }
          
          await db.insert(cptEmbeddings).values({
            code: record.code,
            cptLongDescriptor: record.cpt_long_descriptor || null,
            primaryTerm: record.primary_term || null,
            keywords: record.keywords || null,
            explainerJson,
            embeddingText: record.embedding_text || null,
            enrichedText,
            embedding
          }).onConflictDoUpdate({
            target: cptEmbeddings.code,
            set: {
              cptLongDescriptor: record.cpt_long_descriptor || null,
              primaryTerm: record.primary_term || null,
              keywords: record.keywords || null,
              explainerJson,
              embeddingText: record.embedding_text || null,
              enrichedText,
              embedding,
              updatedAt: new Date()
            }
          });
          
          embedded++;
        }
      } catch (embeddingError) {
        console.error(`[SemanticEmbedding] Batch embedding error at ${i}:`, embeddingError);
      }
      
      processed += batch.length;
      
      await db.update(embeddingImportJobs)
        .set({ processedRecords: processed, embeddedRecords: embedded })
        .where(eq(embeddingImportJobs.id, jobId));
      
      console.log(`[SemanticEmbedding] CPT progress: ${processed}/${records.length} (${embedded} embedded)`);
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    await db.update(embeddingImportJobs)
      .set({ 
        status: 'completed', 
        completedAt: new Date(),
        processedRecords: processed,
        embeddedRecords: embedded
      })
      .where(eq(embeddingImportJobs.id, jobId));
    
    console.log(`[SemanticEmbedding] CPT import complete: ${embedded} codes embedded`);
    
  } catch (error: any) {
    console.error('[SemanticEmbedding] CPT import failed:', error);
    await db.update(embeddingImportJobs)
      .set({ 
        status: 'failed', 
        errorMessage: error.message,
        completedAt: new Date()
      })
      .where(eq(embeddingImportJobs.id, jobId));
  }
}

export async function importIcd10Codes(filePath: string): Promise<{ jobId: number }> {
  const [job] = await db.insert(embeddingImportJobs).values({
    jobType: 'icd10',
    status: 'in_progress',
    startedAt: new Date()
  }).returning();
  
  importIcd10CodesAsync(filePath, job.id).catch(console.error);
  
  return { jobId: job.id };
}

async function importIcd10CodesAsync(filePath: string, jobId: number): Promise<void> {
  try {
    const fullPath = path.resolve(filePath);
    const workbook = XLSX.readFile(fullPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records: Icd10Record[] = XLSX.utils.sheet_to_json(worksheet);
    
    await db.update(embeddingImportJobs)
      .set({ totalRecords: records.length })
      .where(eq(embeddingImportJobs.id, jobId));
    
    let processed = 0;
    let embedded = 0;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const enrichedTexts = batch.map(r => enrichIcd10Text(r));
      
      try {
        const embeddings = await generateEmbeddingsBatch(enrichedTexts);
        
        for (let j = 0; j < batch.length; j++) {
          const record = batch[j];
          const enrichedText = enrichedTexts[j];
          const embedding = embeddings[j];
          
          await db.insert(icd10Embeddings).values({
            code: String(record.code),
            description: record.description || null,
            chapter: record.chapter || null,
            chapterDescription: record.chapter_description || null,
            section: record.section || null,
            sectionDescription: record.section_description || null,
            parentCode: record.parent_code || null,
            depth: record.depth || null,
            includes: record.includes || null,
            inclusionTerms: record.inclusion_terms || null,
            excludes1: record.excludes1 || null,
            excludes2: record.excludes2 || null,
            embeddingText: record.embedding_text || null,
            enrichedText,
            embedding
          }).onConflictDoUpdate({
            target: icd10Embeddings.code,
            set: {
              description: record.description || null,
              chapter: record.chapter || null,
              chapterDescription: record.chapter_description || null,
              section: record.section || null,
              sectionDescription: record.section_description || null,
              parentCode: record.parent_code || null,
              depth: record.depth || null,
              includes: record.includes || null,
              inclusionTerms: record.inclusion_terms || null,
              excludes1: record.excludes1 || null,
              excludes2: record.excludes2 || null,
              embeddingText: record.embedding_text || null,
              enrichedText,
              embedding,
              updatedAt: new Date()
            }
          });
          
          embedded++;
        }
      } catch (embeddingError) {
        console.error(`[SemanticEmbedding] Batch embedding error at ${i}:`, embeddingError);
      }
      
      processed += batch.length;
      
      await db.update(embeddingImportJobs)
        .set({ processedRecords: processed, embeddedRecords: embedded })
        .where(eq(embeddingImportJobs.id, jobId));
      
      console.log(`[SemanticEmbedding] ICD-10 progress: ${processed}/${records.length} (${embedded} embedded)`);
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    await db.update(embeddingImportJobs)
      .set({ 
        status: 'completed', 
        completedAt: new Date(),
        processedRecords: processed,
        embeddedRecords: embedded
      })
      .where(eq(embeddingImportJobs.id, jobId));
    
    console.log(`[SemanticEmbedding] ICD-10 import complete: ${embedded} codes embedded`);
    
  } catch (error: any) {
    console.error('[SemanticEmbedding] ICD-10 import failed:', error);
    await db.update(embeddingImportJobs)
      .set({ 
        status: 'failed', 
        errorMessage: error.message,
        completedAt: new Date()
      })
      .where(eq(embeddingImportJobs.id, jobId));
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

export interface SemanticMatchResult {
  similarity: number;
  confidencePercent: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  clinicalInterpretation: string;
  icdCode: string;
  icdDescription: string;
  cptCode: string;
  cptDescription: string;
  matchDetails: {
    icdChapter?: string;
    icdSection?: string;
    cptServiceType?: string;
    cptIntent?: string;
  };
}

export async function getSemanticMatch(icdCode: string, cptCode: string): Promise<SemanticMatchResult | null> {
  const [icdRecord] = await db.select()
    .from(icd10Embeddings)
    .where(eq(icd10Embeddings.code, icdCode))
    .limit(1);
  
  const [cptRecord] = await db.select()
    .from(cptEmbeddings)
    .where(eq(cptEmbeddings.code, cptCode))
    .limit(1);
  
  if (!icdRecord || !cptRecord) {
    return null;
  }
  
  if (!icdRecord.embedding || !cptRecord.embedding) {
    return null;
  }
  
  const queryResult = await db.execute(sql`
    SELECT 1 - (${icd10Embeddings.embedding} <=> ${cptEmbeddings.embedding}) as similarity
    FROM ${icd10Embeddings}, ${cptEmbeddings}
    WHERE ${icd10Embeddings.code} = ${icdCode}
    AND ${cptEmbeddings.code} = ${cptCode}
  `);
  const result = (queryResult as unknown as any[])[0];
  
  const similarity = result?.similarity ?? 0;
  const confidencePercent = Math.round(similarity * 100);
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  let clinicalInterpretation: string;
  
  if (similarity >= 0.7) {
    riskLevel = 'low';
    clinicalInterpretation = 'Strong clinical alignment. The procedure is clearly appropriate for this diagnosis.';
  } else if (similarity >= 0.5) {
    riskLevel = 'medium';
    clinicalInterpretation = 'Moderate alignment. The procedure may be appropriate but warrants review.';
  } else if (similarity >= 0.3) {
    riskLevel = 'high';
    clinicalInterpretation = 'Weak alignment. The procedure-diagnosis pairing is unusual and requires justification.';
  } else {
    riskLevel = 'critical';
    clinicalInterpretation = 'No clinical alignment. The procedure and diagnosis appear unrelated - potential billing error or fraud indicator.';
  }
  
  let cptServiceType = undefined;
  let cptIntent = undefined;
  if (cptRecord.explainerJson && typeof cptRecord.explainerJson === 'object') {
    const explainer = cptRecord.explainerJson as any;
    cptServiceType = explainer.service_type;
    cptIntent = explainer.intent;
  }
  
  return {
    similarity,
    confidencePercent,
    riskLevel,
    clinicalInterpretation,
    icdCode,
    icdDescription: icdRecord.description || '',
    cptCode,
    cptDescription: cptRecord.cptLongDescriptor || cptRecord.primaryTerm || '',
    matchDetails: {
      icdChapter: icdRecord.chapterDescription || undefined,
      icdSection: icdRecord.sectionDescription || undefined,
      cptServiceType,
      cptIntent
    }
  };
}

export async function findSimilarCptCodes(icdCode: string, limit: number = 5): Promise<any[]> {
  const [icdRecord] = await db.select()
    .from(icd10Embeddings)
    .where(eq(icd10Embeddings.code, icdCode))
    .limit(1);
  
  if (!icdRecord || !icdRecord.embedding) {
    return [];
  }
  
  const results = await db
    .select({
      code: cptEmbeddings.code,
      description: cptEmbeddings.cptLongDescriptor,
      primaryTerm: cptEmbeddings.primaryTerm,
      distance: cosineDistance(cptEmbeddings.embedding, icdRecord.embedding)
    })
    .from(cptEmbeddings)
    .orderBy(cosineDistance(cptEmbeddings.embedding, icdRecord.embedding))
    .limit(limit);
  
  return results.map(r => {
    const distance = Number(r.distance) || 0;
    return {
      code: r.code,
      description: r.description || r.primaryTerm,
      similarity: 1 - distance,
      confidencePercent: Math.round((1 - distance) * 100)
    };
  });
}

export async function findSimilarIcd10Codes(cptCode: string, limit: number = 5): Promise<any[]> {
  const [cptRecord] = await db.select()
    .from(cptEmbeddings)
    .where(eq(cptEmbeddings.code, cptCode))
    .limit(1);
  
  if (!cptRecord || !cptRecord.embedding) {
    return [];
  }
  
  const results = await db
    .select({
      code: icd10Embeddings.code,
      description: icd10Embeddings.description,
      chapter: icd10Embeddings.chapterDescription,
      distance: cosineDistance(icd10Embeddings.embedding, cptRecord.embedding)
    })
    .from(icd10Embeddings)
    .orderBy(cosineDistance(icd10Embeddings.embedding, cptRecord.embedding))
    .limit(limit);
  
  return results.map(r => {
    const distance = Number(r.distance) || 0;
    return {
      code: r.code,
      description: r.description,
      chapter: r.chapter,
      similarity: 1 - distance,
      confidencePercent: Math.round((1 - distance) * 100)
    };
  });
}

export async function getImportJobStatus(jobId: number): Promise<any> {
  const [job] = await db.select()
    .from(embeddingImportJobs)
    .where(eq(embeddingImportJobs.id, jobId))
    .limit(1);
  
  return job;
}

export async function getEmbeddingStats(): Promise<{
  cptCount: number;
  icd10Count: number;
  cptWithEmbeddings: number;
  icd10WithEmbeddings: number;
  recentJobs: any[];
}> {
  const cptResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as with_embeddings
    FROM cpt_embeddings
  `);
  const cptStats = (cptResult as unknown as any[])[0];
  
  const icd10Result = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as with_embeddings
    FROM icd10_embeddings
  `);
  const icd10Stats = (icd10Result as unknown as any[])[0];
  
  const recentJobs = await db.select()
    .from(embeddingImportJobs)
    .orderBy(sql`${embeddingImportJobs.createdAt} DESC`)
    .limit(5);
  
  return {
    cptCount: parseInt(cptStats?.total || '0'),
    icd10Count: parseInt(icd10Stats?.total || '0'),
    cptWithEmbeddings: parseInt(cptStats?.with_embeddings || '0'),
    icd10WithEmbeddings: parseInt(icd10Stats?.with_embeddings || '0'),
    recentJobs
  };
}
