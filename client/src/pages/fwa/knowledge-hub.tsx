import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentUploadDialog } from "@/components/document-upload-dialog";
import {
  Upload,
  FileText,
  Search,
  Database,
  FileType,
  Clock,
  Layers,
} from "lucide-react";

type KnowledgeDocumentRow = {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  category: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  source_authority: string | null;
  file_size: number;
  page_count: number | null;
  processing_status: string;
  processing_error: string | null;
  chunk_count: number | null;
  created_at: string;
  updated_at: string;
};

type KnowledgeDocumentsResponse = {
  success: boolean;
  data: {
    documents: KnowledgeDocumentRow[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

type KnowledgeStatsResponse = {
  success: boolean;
  data: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalChunks: number;
  };
};

const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  completed: { label: "Completed", variant: "default" },
  extracting_text: { label: "Extracting", variant: "secondary" },
  chunking: { label: "Chunking", variant: "secondary" },
  generating_embeddings: { label: "Embedding", variant: "secondary" },
  processing: { label: "Processing", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  word: "DOC",
  image: "IMG",
  text: "TXT",
  html: "HTML",
  excel: "XLS",
};

export default function KnowledgeHub() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: documentsResponse,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useQuery<KnowledgeDocumentsResponse>({
    queryKey: ["/api/knowledge-documents"],
  });

  const { data: statsResponse } = useQuery<KnowledgeStatsResponse>({
    queryKey: ["/api/knowledge-documents/stats"],
  });

  const documents = documentsResponse?.data?.documents ?? [];

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc) => {
      const searchable = [doc.filename, doc.original_filename, doc.title, doc.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [documents, searchQuery]);

  const stats = {
    totalDocs: statsResponse?.data?.total ?? documents.length,
    totalChunks:
      statsResponse?.data?.totalChunks ??
      documents.reduce((sum, doc) => sum + (doc.chunk_count ?? 0), 0),
    indexed: statsResponse?.data?.completed ?? 0,
    processing: statsResponse?.data?.processing ?? 0,
  };

  return (
    <div className="space-y-6" data-testid="page-knowledge-hub">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalDocs}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Layers className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalChunks}</p>
              <p className="text-sm text-muted-foreground">Knowledge Chunks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Database className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.indexed}</p>
              <p className="text-sm text-muted-foreground">Indexed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Document Library</CardTitle>
            <Button
              onClick={() => setUploadOpen(true)}
              data-testid="button-upload-document"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="max-w-sm"
              data-testid="input-search-documents"
            />
          </div>
        </CardHeader>

        <CardContent>
          {!isLoadingDocuments && filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-documents">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No documents yet</p>
              <p className="text-sm">Upload documents to build the knowledge base for Daman AI</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const statusInfo = STATUS_BADGES[doc.processing_status] ?? STATUS_BADGES.pending;
                  const fileType = FILE_TYPE_LABELS[doc.file_type] ?? doc.file_type.toUpperCase();

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{doc.title || doc.original_filename}</p>
                          <p className="text-xs text-muted-foreground">{doc.original_filename}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          <FileType className="h-3 w-3 mr-1" />
                          {fileType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{doc.category || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {doc.chunk_count ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            void refetchDocuments();
          }
        }}
      />
    </div>
  );
}
