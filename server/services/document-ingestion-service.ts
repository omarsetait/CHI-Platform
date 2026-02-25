import { db } from "../db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-ada-002";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_CHUNK_TOKENS = 500;
const CHUNK_OVERLAP = 50;
const UPLOAD_DIR = "./uploads/documents";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export type DocumentCategory = 
  | "medical_guideline"
  | "clinical_pathway"
  | "policy_violation"
  | "regulation"
  | "circular"
  | "contract"
  | "procedure_manual"
  | "training_material"
  | "other";

export type FileType = "pdf" | "word" | "image" | "text" | "html" | "excel";

export interface DocumentUploadRequest {
  file: Express.Multer.File;
  title: string;
  titleAr?: string;
  category: DocumentCategory;
  description?: string;
  descriptionAr?: string;
  sourceAuthority?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  uploadedBy?: string;
}

export interface DocumentUploadResult {
  documentId: string;
  filename: string;
  status: "pending" | "completed" | "failed";
  chunkCount?: number;
  message: string;
  messageAr: string;
}

export interface SemanticSearchResult {
  id: string;
  documentId: string;
  content: string;
  contentAr: string | null;
  sectionTitle: string | null;
  pageNumber: number | null;
  similarity: number;
  documentTitle: string;
  documentCategory: string;
}

function getFileType(mimeType: string): FileType {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("word") || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "word";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "text/plain" || mimeType === "text/html") return "text";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "excel";
  return "text";
}

async function extractTextFromPDF(filePath: string): Promise<{ text: string; pageCount: number }> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return {
    text: data.text,
    pageCount: data.numpages
  };
}

async function extractTextFromWord(filePath: string): Promise<{ text: string; pageCount: number }> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    pageCount: Math.ceil(result.value.length / 3000)
  };
}

async function extractTextFromImage(filePath: string): Promise<{ text: string; pageCount: number }> {
  const base64Image = fs.readFileSync(filePath).toString('base64');
  const mimeType = path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all text content from this image. Include all visible text, maintaining the structure and formatting as much as possible. If there is Arabic text, include it as well. Return only the extracted text, no explanations."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 4096
  });

  return {
    text: response.choices[0]?.message?.content || "",
    pageCount: 1
  };
}

function chunkText(text: string, maxTokens: number = MAX_CHUNK_TOKENS, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  let estimatedTokens = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = Math.ceil(paragraph.length / 4);
    
    if (estimatedTokens + paragraphTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      const lastWords = currentChunk.split(/\s+/).slice(-overlap);
      currentChunk = lastWords.join(" ") + " " + paragraph;
      estimatedTokens = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      estimatedTokens += paragraphTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(c => c.length > 10);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000)
  });
  return response.data[0].embedding;
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const truncatedTexts = texts.map(t => t.slice(0, 8000));
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedTexts
  });
  return response.data.map(d => d.embedding);
}

export class DocumentIngestionService {
  
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResult> {
    const { file, title, titleAr, category, description, descriptionAr, sourceAuthority, effectiveDate, expiryDate, uploadedBy } = request;
    
    const fileType = getFileType(file.mimetype);
    const filename = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    fs.writeFileSync(filePath, file.buffer);
    
    const result = await db.execute(sql`
      INSERT INTO knowledge_documents (
        filename, original_filename, file_type, category, title, title_ar, 
        description, description_ar, source_authority, effective_date, expiry_date,
        file_path, file_size, mime_type, processing_status, uploaded_by
      ) VALUES (
        ${filename}, ${file.originalname}, ${fileType}, ${category}, ${title}, ${titleAr || null},
        ${description || null}, ${descriptionAr || null}, ${sourceAuthority || null}, 
        ${effectiveDate || null}, ${expiryDate || null},
        ${filePath}, ${file.size}, ${file.mimetype}, 'pending', ${uploadedBy || null}
      ) RETURNING id
    `);
    
    const documentId = (result.rows[0] as any).id;
    
    this.processDocumentAsync(documentId, filePath, fileType);
    
    return {
      documentId,
      filename,
      status: "pending",
      message: "Document uploaded successfully. Processing started in background.",
      messageAr: "تم رفع المستند بنجاح. بدأت المعالجة في الخلفية."
    };
  }
  
  private async processDocumentAsync(documentId: string, filePath: string, fileType: FileType): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE knowledge_documents 
        SET processing_status = 'extracting_text', updated_at = NOW()
        WHERE id = ${documentId}
      `);
      
      let extractedText: string;
      let pageCount: number;
      
      if (fileType === "pdf") {
        const result = await extractTextFromPDF(filePath);
        extractedText = result.text;
        pageCount = result.pageCount;
      } else if (fileType === "word") {
        const result = await extractTextFromWord(filePath);
        extractedText = result.text;
        pageCount = result.pageCount;
      } else if (fileType === "image") {
        const result = await extractTextFromImage(filePath);
        extractedText = result.text;
        pageCount = result.pageCount;
      } else {
        extractedText = fs.readFileSync(filePath, 'utf-8');
        pageCount = 1;
      }
      
      await db.execute(sql`
        UPDATE knowledge_documents 
        SET extracted_text = ${extractedText}, page_count = ${pageCount},
            processing_status = 'chunking', updated_at = NOW()
        WHERE id = ${documentId}
      `);
      
      const chunks = chunkText(extractedText);
      
      await db.execute(sql`
        UPDATE knowledge_documents 
        SET processing_status = 'generating_embeddings', updated_at = NOW()
        WHERE id = ${documentId}
      `);
      
      const BATCH_SIZE = 20;
      let processedChunks = 0;
      
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await generateEmbeddingsBatch(batchChunks);
        
        for (let j = 0; j < batchChunks.length; j++) {
          const chunkIndex = i + j;
          const embedding = embeddings[j];
          const embeddingStr = `[${embedding.join(",")}]`;
          
          await db.execute(sql`
            INSERT INTO knowledge_chunks (
              document_id, chunk_index, content, token_count, embedding
            ) VALUES (
              ${documentId}, ${chunkIndex}, ${batchChunks[j]}, 
              ${Math.ceil(batchChunks[j].length / 4)},
              ${embeddingStr}::vector
            )
          `);
          processedChunks++;
        }
      }
      
      await db.execute(sql`
        UPDATE knowledge_documents 
        SET processing_status = 'completed', chunk_count = ${processedChunks}, updated_at = NOW()
        WHERE id = ${documentId}
      `);
      
      console.log(`Document ${documentId} processed successfully: ${processedChunks} chunks created`);
      
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await db.execute(sql`
        UPDATE knowledge_documents 
        SET processing_status = 'failed', processing_error = ${errorMessage}, updated_at = NOW()
        WHERE id = ${documentId}
      `);
    }
  }
  
  async semanticSearch(query: string, limit: number = 10, category?: DocumentCategory): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;
    
    let categoryFilter = "";
    if (category) {
      categoryFilter = `AND d.category = '${category}'`;
    }
    
    const results = await db.execute(sql.raw(`
      SELECT 
        c.id,
        c.document_id,
        c.content,
        c.content_ar,
        c.section_title,
        c.page_number,
        1 - (c.embedding <=> '${embeddingStr}'::vector) as similarity,
        d.title as document_title,
        d.category as document_category
      FROM knowledge_chunks c
      JOIN knowledge_documents d ON c.document_id = d.id
      WHERE d.processing_status = 'completed' ${categoryFilter}
      ORDER BY c.embedding <=> '${embeddingStr}'::vector
      LIMIT ${limit}
    `));
    
    return (results.rows as any[]).map(row => ({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      contentAr: row.content_ar,
      sectionTitle: row.section_title,
      pageNumber: row.page_number,
      similarity: parseFloat(row.similarity),
      documentTitle: row.document_title,
      documentCategory: row.document_category
    }));
  }
  
  async getDocuments(options: {
    category?: DocumentCategory;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ documents: any[]; total: number }> {
    const { category, status, limit = 50, offset = 0 } = options;
    
    let whereClause = "1=1";
    if (category) whereClause += ` AND category = '${category}'`;
    if (status) whereClause += ` AND processing_status = '${status}'`;
    
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as total FROM knowledge_documents WHERE ${whereClause}
    `));
    const total = parseInt((countResult.rows[0] as any).total);
    
    const documents = await db.execute(sql.raw(`
      SELECT 
        id, filename, original_filename, file_type, category,
        title, title_ar, description, source_authority,
        file_size, page_count, processing_status, processing_error,
        chunk_count, created_at, updated_at
      FROM knowledge_documents 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `));
    
    return {
      documents: documents.rows as any[],
      total
    };
  }
  
  async getDocumentById(id: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM knowledge_documents WHERE id = ${id}
    `);
    return result.rows[0];
  }
  
  async deleteDocument(id: string): Promise<boolean> {
    const docResult = await db.execute(sql`
      SELECT file_path FROM knowledge_documents WHERE id = ${id}
    `);
    
    const doc = docResult.rows[0];
    if (doc) {
      const filePath = (doc as any).file_path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${id}`);
    return true;
  }
  
  async getProcessingStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalChunks: number;
  }> {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE processing_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE processing_status IN ('extracting_text', 'chunking', 'generating_embeddings')) as processing,
        COUNT(*) FILTER (WHERE processing_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE processing_status = 'failed') as failed,
        COALESCE(SUM(chunk_count), 0) as total_chunks
      FROM knowledge_documents
    `);
    
    const row = stats.rows[0] as any;
    return {
      total: parseInt(row.total),
      pending: parseInt(row.pending),
      processing: parseInt(row.processing),
      completed: parseInt(row.completed),
      failed: parseInt(row.failed),
      totalChunks: parseInt(row.total_chunks)
    };
  }
}

export const documentIngestionService = new DocumentIngestionService();
