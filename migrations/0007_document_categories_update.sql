-- Rename existing enum values to new document sub-types
DO $$ BEGIN
  -- Add new values
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'law_regulation';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'resolution_circular';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'chi_mandatory_policy';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'clinical_manual';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'drug_formulary';
END $$;

-- Migrate existing data to new categories
UPDATE knowledge_documents SET category = 'law_regulation' WHERE category = 'regulation';
UPDATE knowledge_documents SET category = 'resolution_circular' WHERE category = 'circular';
UPDATE knowledge_documents SET category = 'chi_mandatory_policy' WHERE category = 'policy_violation';
UPDATE knowledge_documents SET category = 'clinical_manual' WHERE category IN ('medical_guideline', 'clinical_pathway', 'procedure_manual');
-- 'contract' maps to 'other', 'training_material' stays, 'other' stays
UPDATE knowledge_documents SET category = 'other' WHERE category = 'contract';
