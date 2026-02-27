import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Target, TrendingUp, DollarSign } from "lucide-react";

interface CoverageExpansionData {
  current: { covered: number; target: number; progress: number };
  segments: Array<{ segment: string; covered: number; target: number; progress: number }>;
  premiumImpact: {
    currentAvgPremium: number;
    projectedWithExpansion: number;
    volumeDiscount: string;
  };
  generatedAt: string;
}

function progressColor(progress: number): string {
  if (progress >= 80) return "bg-emerald-500";
  if (progress >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function progressTextColor(progress: number): string {
  if (progress >= 80) return "text-emerald-600";
  if (progress >= 40) return "text-amber-600";
  return "text-rose-600";
}

export default function CoverageExpansionPage() {
  const { data, isLoading } = useQuery<CoverageExpansionData>({
    queryKey: ["/api/business/coverage-expansion"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Users className="h-8 w-8 text-amber-600" />
          Coverage Expansion
        </h1>
        <p className="text-muted-foreground mt-1">
          Track health insurance coverage progress toward Vision 2030 universal coverage target
        </p>
        <p className="text-sm text-sky-600 dark:text-sky-400 mt-0.5 font-medium" dir="rtl">
          توسعة التغطية — نحو التغطية الشاملة بحلول رؤية 2030
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="shadow-sm border-2 border-amber-200 dark:border-amber-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-amber-600" />
            Overall Coverage Progress
          </CardTitle>
          <CardDescription>National health insurance coverage toward 25 million target</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold">
                {data ? `${(data.current.covered / 1000000).toFixed(1)}M` : "..."}
                <span className="text-lg font-normal text-muted-foreground ml-2">
                  of {data ? `${(data.current.target / 1000000).toFixed(0)}M` : "..."} target
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${data ? progressTextColor(data.current.progress) : ""}`}>
                {data?.current.progress ?? "..."}%
              </div>
              <div className="text-xs text-muted-foreground">achieved</div>
            </div>
          </div>
          <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${data ? progressColor(data.current.progress) : "bg-muted"}`}
              style={{ width: `${data?.current.progress ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>5M</span>
            <span>10M</span>
            <span>15M</span>
            <span>20M</span>
            <span>25M</span>
          </div>
        </CardContent>
      </Card>

      {/* Segment Progress */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Coverage by Segment</CardTitle>
          <CardDescription>Progress breakdown across population segments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading segments...</div>
          ) : (
            <div className="space-y-6">
              {data?.segments.map((seg, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">{seg.segment}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({(seg.covered / 1000000).toFixed(1)}M / {(seg.target / 1000000).toFixed(1)}M)
                      </span>
                    </div>
                    <span className={`font-bold text-sm ${progressTextColor(seg.progress)}`}>
                      {seg.progress}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressColor(seg.progress)}`}
                      style={{ width: `${seg.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Impact Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data?.premiumImpact.currentAvgPremium?.toLocaleString() ?? "..."} <span className="text-sm font-normal text-muted-foreground">SAR</span></div>
              <div className="text-xs text-muted-foreground">Current Avg Premium</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data?.premiumImpact.projectedWithExpansion?.toLocaleString() ?? "..."} <span className="text-sm font-normal text-muted-foreground">SAR</span></div>
              <div className="text-xs text-muted-foreground">Projected With Expansion</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-violet-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30">
              <Target className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-violet-600">{data?.premiumImpact.volumeDiscount ?? "..."}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Volume Discount Impact</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
