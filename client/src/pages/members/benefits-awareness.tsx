import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface BenefitService {
  service: string;
  serviceAr: string;
  covered: boolean;
  limit: string;
}

interface BenefitCategory {
  name: string;
  nameAr: string;
  services: BenefitService[];
}

interface BenefitsAwarenessData {
  categories: BenefitCategory[];
  generatedAt: string;
}

export default function BenefitsAwarenessPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Preventive Care", "Maternity", "Emergency", "Mental Health"]));

  const { data, isLoading } = useQuery<BenefitsAwarenessData>({
    queryKey: ["/api/members/benefits-awareness"],
  });

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const filteredCategories = data?.categories
    .map((cat) => ({
      ...cat,
      services: cat.services.filter(
        (s) =>
          s.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.serviceAr.includes(searchTerm) ||
          cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((cat) => cat.services.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-emerald-600" />
          Benefits Awareness
        </h1>
        <p className="text-muted-foreground mt-1">
          Understand your health insurance coverage, limits, and what services are included in your plan
        </p>
        <p className="text-sm text-teal-600 dark:text-teal-400 mt-0.5 font-medium" dir="rtl">
          التوعية بالمنافع — تعرّف على تغطيتك التأمينية
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services (e.g., Vaccination, Maternity, ER)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading benefits information...</div>
      ) : filteredCategories && filteredCategories.length > 0 ? (
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.name);
            return (
              <Card key={category.name} className="shadow-sm overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
                  onClick={() => toggleCategory(category.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <span className="text-sm text-muted-foreground" dir="rtl">
                        {category.nameAr}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {category.services.length} services
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="divide-y">
                      {category.services.map((service, i) => (
                        <div
                          key={i}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 flex-1">
                            {service.covered ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{service.service}</span>
                                {service.covered ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                                    Covered
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 text-xs">
                                    Not Covered
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                                {service.serviceAr}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-muted-foreground">{service.limit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No services match your search. Try a different term.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
