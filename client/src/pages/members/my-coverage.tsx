import { useState, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { EntityHeader } from "@/components/portal/entity-header";
import { cn } from "@/lib/utils";
import {
  User,
  Search,
  ShieldCheck,
  Stethoscope,
  Pill,
  Eye,
  Baby,
  Brain,
  Bone,
  Heart,
  Syringe,
  Microscope,
  Bed,
  Ambulance,
  Glasses,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface Member {
  code: string;
  name: string;
  nameAr: string;
  iqamaNo: string;
  policyNumber: string;
  employerName: string;
  insurerName: string;
  planTier: string;
  nationality: string;
  age: number;
  gender: string;
  city: string;
  region: string;
  dependentsCount: number;
  policyValidUntil: string;
}

interface MemberResponse {
  member: Member;
  generatedAt: string;
}

interface CoverageCategory {
  benefitCategory: string;
  benefitCategoryAr: string;
  icon: string;
  status: string;
  limitSar: string;
  usedSar: string;
  limitUnits: string | null;
  usedUnits: string | null;
  copayPercent: string;
  note: string;
  noteAr: string;
}

interface CoverageResponse {
  totalLimit: string;
  totalUsed: string;
  utilizationPercent: string;
  categories: CoverageCategory[];
  generatedAt: string;
}

interface CoverageLookupResult {
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
  planTiers: string[];
  category: string;
}

interface CoverageLookupResponse {
  data: CoverageLookupResult[];
  generatedAt: string;
}

// ── Icon Mapping ───────────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  stethoscope: Stethoscope,
  pill: Pill,
  eye: Eye,
  baby: Baby,
  brain: Brain,
  bone: Bone,
  heart: Heart,
  syringe: Syringe,
  microscope: Microscope,
  bed: Bed,
  ambulance: Ambulance,
  glasses: Glasses,
  shield: ShieldCheck,
};

function getCategoryIcon(iconName: string): React.ElementType {
  return iconMap[iconName?.toLowerCase()] || ShieldCheck;
}

// ── Status Helpers ─────────────────────────────────────────────────

function statusBadge(status: string) {
  const s = status?.toLowerCase() || "";
  if (s === "covered" || s === "active") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
        Covered
      </Badge>
    );
  }
  if (s === "partial" || s === "partially_covered") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
        Partial
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
      Not Covered
    </Badge>
  );
}

function statusProgressColor(status: string): string {
  const s = status?.toLowerCase() || "";
  if (s === "covered" || s === "active") return "[&>div]:bg-emerald-500";
  if (s === "partial" || s === "partially_covered")
    return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-400";
}

// ── Main Component ─────────────────────────────────────────────────

export default function MyCoveragePage() {
  const { code } = useParams<{ code: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const { data: memberData, isLoading: memberLoading } =
    useQuery<MemberResponse>({
      queryKey: ["/api/members/portal/member", code],
      queryFn: () =>
        fetch(`/api/members/portal/member/${code}`).then((r) => r.json()),
      enabled: !!code,
    });

  const { data: coverageData, isLoading: coverageLoading } =
    useQuery<CoverageResponse>({
      queryKey: ["/api/members/portal/member", code, "coverage"],
      queryFn: () =>
        fetch(`/api/members/portal/member/${code}/coverage`).then((r) =>
          r.json()
        ),
      enabled: !!code,
    });

  const member = memberData?.member;

  const { data: lookupData, isLoading: lookupLoading } =
    useQuery<CoverageLookupResponse>({
      queryKey: [
        "/api/members/portal/coverage-lookup",
        submittedQuery,
        member?.planTier,
      ],
      queryFn: () =>
        fetch(
          `/api/members/portal/coverage-lookup?q=${encodeURIComponent(submittedQuery)}&planTier=${encodeURIComponent(member?.planTier ?? "")}`
        ).then((r) => r.json()),
      enabled: !!submittedQuery && !!member?.planTier,
    });

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setSubmittedQuery(searchQuery.trim());
      }
    },
    [searchQuery]
  );

  if (!code) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No member code provided.
      </div>
    );
  }

  if (memberLoading || coverageLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Member not found.
      </div>
    );
  }

  const totalLimit = Number(coverageData?.totalLimit ?? 0);
  const totalUsed = Number(coverageData?.totalUsed ?? 0);
  const utilizationPercent = Number(coverageData?.utilizationPercent ?? 0);
  const categories = coverageData?.categories ?? [];

  return (
    <div className="space-y-6">
      {/* Member Profile Header */}
      <EntityHeader
        icon={User}
        name={member.name}
        nameAr={member.nameAr}
        identifiers={[
          { label: "Policy", value: member.policyNumber },
          { label: "Insurer", value: member.insurerName },
          { label: "Plan", value: member.planTier },
          { label: "Employer", value: member.employerName },
          { label: "Valid Until", value: member.policyValidUntil },
        ]}
        pillarTheme="bg-purple-50 text-purple-600"
      />

      {/* Coverage Utilization Summary */}
      <Card className="border-l-4 border-l-purple-500 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            Overall Coverage Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {totalUsed.toLocaleString()} SAR used of{" "}
                {totalLimit.toLocaleString()} SAR
              </span>
              <span className="font-semibold text-purple-700">
                {utilizationPercent}%
              </span>
            </div>
            <Progress
              value={Math.min(utilizationPercent, 100)}
              className={cn(
                "h-3",
                utilizationPercent > 80
                  ? "[&>div]:bg-red-500"
                  : utilizationPercent > 50
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-purple-500"
              )}
            />
            <p className="text-xs text-muted-foreground">
              {totalLimit - totalUsed > 0
                ? `${(totalLimit - totalUsed).toLocaleString()} SAR remaining`
                : "Limit reached"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Categories Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Coverage Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const IconComp = getCategoryIcon(cat.icon);
            const limitSar = Number(cat.limitSar);
            const usedSar = Number(cat.usedSar);
            const limitUnits = cat.limitUnits ? Number(cat.limitUnits) : null;
            const usedUnits = cat.usedUnits ? Number(cat.usedUnits) : null;
            const copay = Number(cat.copayPercent);
            const usedPercent =
              limitSar > 0 ? Math.min((usedSar / limitSar) * 100, 100) : 0;

            return (
              <Card key={cat.benefitCategory} className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  {/* Header: Icon + Name + Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                        <IconComp className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">
                          {cat.benefitCategory}
                        </p>
                        <p
                          className="text-xs text-muted-foreground"
                          dir="rtl"
                        >
                          {cat.benefitCategoryAr}
                        </p>
                      </div>
                    </div>
                    {statusBadge(cat.status)}
                  </div>

                  {/* Progress Bar (SAR) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {usedSar.toLocaleString()} / {limitSar.toLocaleString()}{" "}
                        SAR
                      </span>
                      <span>{usedPercent.toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={usedPercent}
                      className={cn("h-2", statusProgressColor(cat.status))}
                    />
                  </div>

                  {/* Units (if applicable) */}
                  {limitUnits !== null && usedUnits !== null && (
                    <p className="text-xs text-muted-foreground">
                      {usedUnits} / {limitUnits} units used
                    </p>
                  )}

                  {/* Copay + Note */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Copay: {copay}%
                    </Badge>
                  </div>
                  {cat.note && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cat.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* "Is this covered?" Search Section */}
      <Card className="shadow-sm border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-600" />
            Is This Covered?
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search for a procedure, treatment, or benefit to check if it is
            covered under your plan.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder='e.g. "dental implant", "MRI scan", "physiotherapy"...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Search Results */}
          {lookupLoading && (
            <p className="text-sm text-muted-foreground">Searching...</p>
          )}

          {lookupData && lookupData.data.length > 0 && (
            <div className="space-y-3">
              {lookupData.data.map((result, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-purple-50/50 border-purple-200 space-y-2"
                >
                  <p className="text-sm font-semibold text-purple-800">
                    {result.question}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {result.answer}
                  </p>
                  {result.answerAr && (
                    <p
                      className="text-sm text-muted-foreground leading-relaxed"
                      dir="rtl"
                    >
                      {result.answerAr}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {result.category}
                    </Badge>
                    {result.planTiers.map((tier) => (
                      <Badge
                        key={tier}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tier}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {lookupData && lookupData.data.length === 0 && submittedQuery && (
            <p className="text-sm text-muted-foreground">
              No results found for "{submittedQuery}". Try a different search
              term.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
