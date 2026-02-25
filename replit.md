# Fraud, Waste & Abuse Detection Platform

## Overview
This platform is an AI-powered system designed to detect and prevent fraud, waste, and abuse (FWA) in healthcare insurance claims. It analyzes claim data, provider patterns, and patient histories to identify suspicious activities, assign risk scores, and provide actionable insights for regulatory oversight. The platform aims to automate provider reports, streamline pre-authorization processes, enhance clinical governance, and support FWA unit operations. Its business vision is to minimize inappropriate care and ensure compliance within the healthcare insurance sector, ultimately reducing costs and improving healthcare quality.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, and Vite. It utilizes shadcn/ui (Radix UI + Tailwind CSS) for a custom amber/orange theme with light/dark mode support, and Recharts for data visualization. State management is handled by TanStack Query for server-side data and local React state for UI components. The design emphasizes a component-based architecture, accessibility, custom hooks, and path aliases, including standardized components for loading, empty states, and status.

### Backend
The backend uses Node.js with Express.js and TypeScript, providing a RESTful API. It features an abstracted `IStorage` interface with PostgreSQL as the production database. Session management is handled by `connect-pg-simple` with PostgreSQL. Security is implemented through a comprehensive middleware stack including Helmet, CORS, Express Rate Limit, Bcrypt for password hashing, secure cookies, CSRF protection, role-based access control (RBAC), input validation with Zod, AI prompt sanitization, and HIPAA-compliant audit logging. Error handling is centralized using `handleRouteError` for consistent responses and proper HTTP status codes.

### Data Storage
Drizzle ORM is used for PostgreSQL, with a comprehensive schema covering `Users`, `Claims`, `Pre-Authorization`, `FWA`, and `Provider Relations` modules. Drizzle Kit manages migrations. Zod schemas are generated from Drizzle for validation. The database configuration includes connection pooling, automatically created indexes, and `CHECK` constraints for data integrity.

### Core Modules
1.  **AI Agentic Workflow**: Automates bulk provider report generation using Large Language Models (LLMs).
2.  **Pre-Authorization Module**: Implements a 6-phase AI-driven claims adjudication workflow.
3.  **Claims Management & Clinical Governance**: Manages rules, QA validation, and a 6-phase claims adjudication workflow.
4.  **Audit & FWA Unit Module**: Features AI-powered FWA detection through a 3-phase sequential agent workflow utilizing 36 specialized agents.
    -   **Explainability & Drill-Down System**: Offers human-readable explanations, evidence, suggested actions, drill-down views, and one-click audit reports.
    -   **5-Method FWA Detection Engine**: Integrates a weighted composite scoring system:
        -   **Rule Engine (30%)**: Pattern matching against a Policy Violation Catalogue and FWA Behaviors database (102 rules across 18 categories). Includes a Rules Management UI.
        -   **Statistical Learning (22%)**: Enterprise-grade 62-feature supervised scoring system with database-backed population statistics.
        -   **Unsupervised Learning (18%)**: Anomaly detection via simulated Isolation Forest and clustering analysis.
        -   **RAG/LLM (15%)**: Contextual analysis using vector database semantic search and AI-powered recommendations.
        -   **Semantic Validation (15%)**: ICD-10/CPT procedure-diagnosis matching using AI embeddings (1536 dimensions) with pgvector cosine similarity.
    -   **Semantic Embedding Database**: Stores CPT and ICD-10 codes with vector embeddings for clinical semantic matching, managed via an FWA Settings UI.
    -   **Database-Configurable Detection Thresholds**: All detection thresholds are stored in the `detection_thresholds` table, support bilingual content, and are cached for performance.
    -   **CHI Regulatory Extensions**: Adapts the platform for Council of Health Insurance (CHI) regulatory oversight, including a knowledge base, online listening, and an 8-stage enforcement workflow.
    -   **5-Phase Regulatory Oversight Engine**: Analyzes regulatory compliance, clinical appropriateness, behavioral patterns, public sentiment (via Grok integration), and synthesizes evidence.
    -   **Audit Workflow System**: Manages audit sessions, findings, checklists, claim linkages, and PDF report exports.
    -   **7-Stage FWA Pipeline**: An automated pipeline that triggers after claim import, performing preprocessing, entity extraction, feature computation, and 5-method detection for claims, providers, patients, and doctors.
5.  **Provider Relations Module**: Manages provider directories, reconciliation, contract management, communication logs, AI-powered reports, and a "Two-Ledger Architecture."
6.  **Modular KPI System**: Provides configurable KPIs with CRUD operations, a calculation engine, and dashboard visualization.
7.  **Context Enrichment 360 System**: Offers AI-powered 360-degree views for patients, providers, and doctors.
8.  **RLHF System**: Implements a Reinforcement Learning from Human Feedback loop with database persistence and AI-generated weight adjustment proposals.
9.  **Simulation Lab**: A testing environment with Digital Twins, Shadow KB, and Ghost Runs for AI agents.
10. **Graph & Collusion Analysis**: Utilizes network-based fraud detection for visualizing relationships and identifying collusion.

## External Dependencies

### Database
-   Neon serverless PostgreSQL

### AI/LLM
-   Configured LLM providers for AI-powered analysis
-   Grok (xAI) via Replit OpenRouter for Twitter/X sentiment analysis

### Email
-   Resend for transactional emails

### UI Libraries
-   Radix UI
-   Tailwind CSS
-   Recharts
-   Lucide icons

### Form Handling & Validation
-   React Hook Form
-   Zod