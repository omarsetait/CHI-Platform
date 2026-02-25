import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Search,
  Upload,
  FileText,
  Calendar,
  ExternalLink,
  Download,
} from "lucide-react";
import type { FwaRegulatoryDoc } from "@shared/schema";

interface DisplayDoc {
  id: string;
  title: string;
  source: string;
  category: string;
  effectiveDate: string;
  status: string;
}

const sourceColors: Record<string, string> = {
  NPHIES: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CCHI: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MOH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Insurance Authority": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  nphies: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cchi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  moh: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  insurance_authority: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export default function RegulatoryKB() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: docs, isLoading } = useQuery<FwaRegulatoryDoc[]>({
    queryKey: ["/api/fwa/regulatory-docs"],
  });

  const displayDocs: DisplayDoc[] = (docs || []).map((d) => ({
    id: d.id,
    title: d.title,
    source: d.category.toUpperCase(),
    category: d.category,
    effectiveDate: d.effectiveDate ? new Date(d.effectiveDate).toISOString().split("T")[0] : "",
    status: "active",
  }));

  const filteredDocs = displayDocs.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || doc.source === sourceFilter || doc.source.toLowerCase() === sourceFilter.toLowerCase();
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesSource && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">B1</Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Regulatory Guidelines</h1>
          <p className="text-muted-foreground">
            Knowledge base for regulatory compliance and claim validation
          </p>
        </div>
        <Button data-testid="button-upload">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            RAG Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Regulatory documents are embedded in a vector database for semantic search. Used for claim rejection justification and regulatory citations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-12 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-purple-600">{displayDocs.length}</p>
              )}
              <p className="text-sm text-muted-foreground">Documents Indexed</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">4</p>
              <p className="text-sm text-muted-foreground">Regulatory Sources</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">12.4K</p>
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
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-source">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="NPHIES">NPHIES</SelectItem>
                <SelectItem value="CCHI">CCHI</SelectItem>
                <SelectItem value="MOH">MOH</SelectItem>
                <SelectItem value="Insurance Authority">Insurance Authority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="claims">Claims</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="fraud">Fraud</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="preauth">Pre-Auth</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))
          ) : (
            filteredDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border-b hover-elevate" data-testid={`doc-row-${doc.id}`}>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={sourceColors[doc.source] || sourceColors[doc.source.toLowerCase()] || "bg-gray-100 text-gray-800"}>{doc.source}</Badge>
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
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          {!isLoading && filteredDocs.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No documents match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
