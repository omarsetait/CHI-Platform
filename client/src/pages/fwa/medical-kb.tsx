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
  Stethoscope,
  Search,
  Upload,
  FileText,
  Calendar,
  ExternalLink,
  Download,
  Heart,
  Brain,
  Bone,
  Eye,
} from "lucide-react";
import type { FwaMedicalGuideline } from "@shared/schema";

interface DisplayGuideline {
  id: string;
  title: string;
  category: string;
  specialty: string;
  lastUpdated: string;
  status: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  cardiology: Heart,
  psychiatry: Brain,
  orthopedics: Bone,
  radiology: Eye,
};

const categoryColors: Record<string, string> = {
  endocrinology: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  cardiology: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  orthopedics: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  psychiatry: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  oncology: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  pediatrics: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  emergency: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  radiology: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  clinical_practice: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  treatment_pathway: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medical_necessity: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  diagnosis_procedure: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function MedicalKB() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: guidelines, isLoading } = useQuery<FwaMedicalGuideline[]>({
    queryKey: ["/api/fwa/medical-guidelines"],
  });

  const displayGuidelines: DisplayGuideline[] = (guidelines || []).map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    specialty: g.specialtyArea,
    lastUpdated: g.createdAt ? new Date(g.createdAt).toISOString().split("T")[0] : "",
    status: "current",
  }));

  const filteredGuidelines = displayGuidelines.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || guide.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">B2</Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Medical Guidelines</h1>
          <p className="text-muted-foreground">
            Clinical validation against published medical standards and protocols
          </p>
        </div>
        <Button data-testid="button-upload">
          <Upload className="w-4 h-4 mr-2" />
          Upload Guideline
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-600" />
            RAG Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Medical guidelines are embedded in a vector database for clinical validation. Used for medical necessity validation and cross-referencing claimed procedures.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-12 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-purple-600">{displayGuidelines.length}</p>
              )}
              <p className="text-sm text-muted-foreground">Guidelines Indexed</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">8</p>
              <p className="text-sm text-muted-foreground">Medical Categories</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">8.7K</p>
              <p className="text-sm text-muted-foreground">Clinical Text Chunks</p>
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
                placeholder="Search guidelines..."
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
                <SelectItem value="endocrinology">Endocrinology</SelectItem>
                <SelectItem value="cardiology">Cardiology</SelectItem>
                <SelectItem value="orthopedics">Orthopedics</SelectItem>
                <SelectItem value="psychiatry">Psychiatry</SelectItem>
                <SelectItem value="oncology">Oncology</SelectItem>
                <SelectItem value="pediatrics">Pediatrics</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="radiology">Radiology</SelectItem>
                <SelectItem value="clinical_practice">Clinical Practice</SelectItem>
                <SelectItem value="treatment_pathway">Treatment Pathway</SelectItem>
                <SelectItem value="medical_necessity">Medical Necessity</SelectItem>
                <SelectItem value="diagnosis_procedure">Diagnosis Procedure</SelectItem>
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
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-28" />
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
            filteredGuidelines.map((guide) => {
              const IconComponent = categoryIcons[guide.category] || FileText;
              return (
                <div key={guide.id} className="flex items-center justify-between p-4 border-b hover-elevate" data-testid={`guide-row-${guide.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{guide.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={categoryColors[guide.category] || "bg-gray-100 text-gray-800"}>{guide.specialty}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Updated: {guide.lastUpdated}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={guide.status === "current" ? "default" : "secondary"}>
                      {guide.status === "current" ? "Current" : "Under Review"}
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
          {!isLoading && filteredGuidelines.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No guidelines match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
