import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { GitMerge, AlertTriangle, TrendingDown, Info } from "lucide-react";

interface MergerScenario {
  scenario: string;
  combinedShare: number;
  resultingHHI: number;
  impact: string;
}

interface MarketConcentrationData {
  herfindahlIndex: number;
  interpretation: string;
  top5Share: number;
  mergerScenarios: MergerScenario[];
  historicalHHI: Array<{ year: string; hhi: number }>;
  generatedAt: string;
}

function hhiColor(hhi: number): string {
  if (hhi >= 2500) return "text-rose-600";
  if (hhi >= 1500) return "text-amber-600";
  return "text-emerald-600";
}

function hhiLabel(hhi: number): string {
  if (hhi >= 2500) return "Highly Concentrated";
  if (hhi >= 1500) return "Moderately Concentrated";
  return "Competitive";
}

export default function MarketConcentrationPage() {
  const { data, isLoading } = useQuery<MarketConcentrationData>({
    queryKey: ["/api/business/market-concentration"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <GitMerge className="h-8 w-8 text-violet-600" />
          Market Concentration
        </h1>
        <p className="text-muted-foreground mt-1">
          Herfindahl-Hirschman Index analysis and merger impact simulation
        </p>
        <p className="text-sm text-sky-600 dark:text-sky-400 mt-0.5 font-medium" dir="rtl">
          تركز السوق — مؤشر هيرفيندال هيرشمان
        </p>
      </div>

      {/* HHI Gauge + Top 5 Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">HHI Index</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="url(#hhiGradient)" strokeWidth="10"
                  strokeDasharray={`${((data?.herfindahlIndex ?? 0) / 3000) * 314} 314`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="hhiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${data ? hhiColor(data.herfindahlIndex) : ""}`}>
                  {data?.herfindahlIndex ?? "..."}
                </span>
                <span className="text-xs text-muted-foreground">HHI</span>
              </div>
            </div>
            {data && (
              <Badge className={`mt-4 ${
                data.herfindahlIndex >= 2500
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                  : data.herfindahlIndex >= 1500
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              }`}>
                {hhiLabel(data.herfindahlIndex)}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Market Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data?.interpretation ?? "Loading interpretation..."}
            </p>
            <div className="flex items-center justify-between p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
              <span className="text-sm font-medium">Top 5 Insurer Market Share</span>
              <span className="text-2xl font-bold text-violet-600">{data?.top5Share ?? "..."}%</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs text-muted-foreground">Competitive</div>
                <div className="text-sm font-bold text-emerald-600">&lt; 1,500</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="text-xs text-muted-foreground">Moderate</div>
                <div className="text-sm font-bold text-amber-600">1,500 - 2,500</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                <div className="text-xs text-muted-foreground">Highly Conc.</div>
                <div className="text-sm font-bold text-rose-600">&gt; 2,500</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merger Scenarios */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Merger Impact Scenarios
          </CardTitle>
          <CardDescription>Hypothetical merger analysis and regulatory implications</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading scenarios...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data?.mergerScenarios.map((scenario, i) => (
                <div key={i} className="p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors space-y-3">
                  <h3 className="font-semibold text-sm">{scenario.scenario}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">Combined Share</div>
                      <div className="text-lg font-bold">{scenario.combinedShare}%</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">Resulting HHI</div>
                      <div className={`text-lg font-bold ${hhiColor(scenario.resultingHHI)}`}>{scenario.resultingHHI}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{scenario.impact}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical HHI Trend */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-5 w-5 text-emerald-500" />
            Historical HHI Trend
          </CardTitle>
          <CardDescription>Year-over-year market concentration trajectory</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.historicalHHI} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis domain={[1000, 2000]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number) => [`${value}`, "HHI"]}
                />
                <Line
                  type="monotone"
                  dataKey="hhi"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: "#8b5cf6", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
