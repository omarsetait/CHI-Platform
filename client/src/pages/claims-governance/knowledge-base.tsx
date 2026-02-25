import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Stethoscope,
  FileText,
  Search,
  Upload,
  Calendar,
  ExternalLink,
  Download,
  Book
} from "lucide-react";
import { Link } from "wouter";

interface KBDocument {
  id: string;
  title: string;
  source: string;
  category: string;
  effectiveDate: string;
  status: string;
}

const kbTypeConfig: Record<string, {
  title: string;
  description: string;
  icon: typeof Shield;
  documents: KBDocument[];
}> = {
  regulatory: {
    title: "Regulatory Guidelines",
    description: "Knowledge base for regulatory compliance and claim validation (NPHIES, CCHI, MOH)",
    icon: Shield,
    documents: [
      { id: "REG-001", title: "NPHIES Claims Submission Guidelines v3.2", source: "NPHIES", category: "claims", effectiveDate: "2024-01-01", status: "active" },
      { id: "REG-002", title: "CCHI Provider Contracting Requirements", source: "CCHI", category: "provider", effectiveDate: "2023-10-15", status: "active" },
      { id: "REG-003", title: "MOH Fraud Detection Framework", source: "MOH", category: "fraud", effectiveDate: "2023-12-01", status: "active" },
      { id: "REG-004", title: "Insurance Authority Anti-Fraud Mandate", source: "Authority", category: "fraud", effectiveDate: "2024-01-15", status: "active" },
      { id: "REG-005", title: "NPHIES Error Code Reference", source: "NPHIES", category: "claims", effectiveDate: "2023-11-20", status: "active" },
      { id: "REG-006", title: "CCHI Medical Coding Standards", source: "CCHI", category: "coding", effectiveDate: "2023-09-01", status: "active" },
    ],
  },
  medical: {
    title: "Medical Guidelines",
    description: "Clinical protocols, treatment guidelines, and medical necessity criteria",
    icon: Stethoscope,
    documents: [
      { id: "MED-001", title: "Clinical Treatment Protocols - Cardiology", source: "Medical", category: "clinical", effectiveDate: "2024-01-01", status: "active" },
      { id: "MED-002", title: "Surgical Procedure Guidelines", source: "Medical", category: "surgical", effectiveDate: "2023-11-15", status: "active" },
      { id: "MED-003", title: "Drug Formulary and Prescribing Guidelines", source: "Pharmacy", category: "pharmacy", effectiveDate: "2024-01-01", status: "active" },
      { id: "MED-004", title: "Medical Necessity Criteria - Imaging", source: "Medical", category: "imaging", effectiveDate: "2023-10-01", status: "active" },
      { id: "MED-005", title: "Rehabilitation Therapy Standards", source: "Medical", category: "therapy", effectiveDate: "2023-09-01", status: "active" },
    ],
  },
  policy: {
    title: "Policy Documents",
    description: "Insurance policy rules, coverage criteria, and benefit guidelines",
    icon: FileText,
    documents: [
      { id: "POL-001", title: "Coverage Determination Guidelines", source: "Policy", category: "coverage", effectiveDate: "2024-01-01", status: "active" },
      { id: "POL-002", title: "Prior Authorization Requirements", source: "Policy", category: "preauth", effectiveDate: "2023-12-01", status: "active" },
      { id: "POL-003", title: "Benefit Limit Policies", source: "Policy", category: "benefits", effectiveDate: "2024-01-01", status: "active" },
      { id: "POL-004", title: "Network Provider Requirements", source: "Policy", category: "network", effectiveDate: "2023-11-01", status: "active" },
      { id: "POL-005", title: "Claims Processing Rules", source: "Policy", category: "claims", effectiveDate: "2023-10-15", status: "active" },
      { id: "POL-006", title: "Appeal and Grievance Procedures", source: "Policy", category: "appeals", effectiveDate: "2023-09-01", status: "active" },
    ],
  },
};

const sourceColors: Record<string, string> = {
  NPHIES: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CCHI: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MOH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Authority: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Medical: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  Pharmacy: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  Policy: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

export default function ClaimsGovernanceKnowledgeBase() {
  const params = useParams<{ type: string }>();
  const kbType = params.type || "regulatory";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const config = kbTypeConfig[kbType];

  if (!config) {
    return (
      <div className="p-6" data-testid="page-kb-not-found">
        <Card>
          <CardContent className="p-6 text-center">
            <Book className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Knowledge Base Not Found</h2>
            <p className="text-muted-foreground">The requested knowledge base type does not exist.</p>
            <Button asChild className="mt-4">
              <Link href="/claims-governance/knowledge-base/regulatory">View Regulatory KB</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = config.icon;
  
  const categories = Array.from(new Set(config.documents.map(d => d.category)));
  
  const filteredDocs = config.documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6" data-testid={`page-kb-${kbType}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="page-title">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        <Button data-testid="button-upload">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="flex gap-2">
        {Object.entries(kbTypeConfig).map(([key, cfg]) => (
          <Link key={key} href={`/claims-governance/knowledge-base/${key}`}>
            <Button 
              variant={key === kbType ? "default" : "outline"} 
              size="sm"
              data-testid={`tab-${key}`}
            >
              <cfg.icon className="w-4 h-4 mr-2" />
              {cfg.title.split(" ")[0]}
            </Button>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            RAG Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Documents are embedded in a vector database for semantic search. Used for claim validation, rejection justification, and regulatory citations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{config.documents.length}</p>
              <p className="text-sm text-muted-foreground">Documents Indexed</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">
                {(config.documents.length * 1.5).toFixed(1)}K
              </p>
              <p className="text-sm text-muted-foreground">Text Chunks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredDocs.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center justify-between p-4 border-b hover-elevate" 
              data-testid={`doc-row-${doc.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={sourceColors[doc.source] || "bg-gray-100 text-gray-800"}>
                      {doc.source}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {doc.effectiveDate}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={doc.status === "active" ? "default" : "secondary"}>
                  {doc.status}
                </Badge>
                <Button variant="ghost" size="icon" data-testid={`button-download-${doc.id}`}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" data-testid={`button-view-${doc.id}`}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filteredDocs.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No documents match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
