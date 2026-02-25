import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, TrendingUp, TrendingDown, AlertTriangle, FileText } from "lucide-react";
import { AIScoreBadge } from "@/components/ai-score-badge";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface TrendData {
  month: string;
  claims: number;
  amount: number;
}

interface DetailPanelProps {
  type: "provider" | "patient";
  data: any;
  onClose: () => void;
  relatedClaims?: any[];
}

export function DetailPanel({ type, data, onClose, relatedClaims = [] }: DetailPanelProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-popover-border rounded-md p-2 shadow-md text-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'amount' ? `$${entry.value.toLocaleString()}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-background h-full overflow-auto shadow-xl animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">{data.name}</h2>
            <p className="text-sm text-muted-foreground">
              {type === "provider" ? data.specialty : `Age: ${data.age} • ${data.gender}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">AI Risk Score</p>
                <div className="mt-2">
                  <AIScoreBadge score={data.aiScore} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Claimed</p>
                <p className="text-2xl font-bold mt-2">
                  ${data.totalClaimedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Outlier Claims</p>
                <div className="flex items-center gap-2 mt-2">
                  <AlertTriangle className="h-5 w-5 text-chart-3" />
                  <span className="text-2xl font-bold">{data.outlierClaimsCount}</span>
                  <span className="text-sm text-muted-foreground">
                    / {data.numberOfClaims} total
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Length of Stay</p>
                <p className="text-2xl font-bold mt-2">{data.avgLengthOfStay} days</p>
              </CardContent>
            </Card>
          </div>

          {type === "provider" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Provider Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License Number</span>
                  <span className="font-medium">{data.license}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hospital</span>
                  <span className="font-medium">{data.hospital}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Years of Practice</span>
                  <span className="font-medium">{data.yearsOfPractice} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surgery Rate</span>
                  <span className="font-medium">{(data.surgeryRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Readmission Rate</span>
                  <span className="font-medium">{(data.readmissionRate * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {type === "patient" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Policy Number</span>
                  <span className="font-medium">{data.policyNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Policy Start Date</span>
                  <span className="font-medium">{data.policyStartDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primary Provider</span>
                  <span className="font-medium">{data.primaryProvider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Claim Date</span>
                  <span className="font-medium">{data.lastClaimDate}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Chronic Conditions</span>
                  <div className="flex flex-wrap gap-1">
                    {data.chronicConditions.length > 0 ? (
                      data.chronicConditions.map((condition: string) => (
                        <Badge key={condition} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm">None reported</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Diagnoses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.topDiagnoses.map((code: string) => (
                  <Badge key={code} variant="outline" className="text-sm">
                    {code}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Claims Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.claimsTrend}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="claims" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Amount Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.claimsTrend}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-3))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {relatedClaims.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Related Claims ({relatedClaims.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedClaims.slice(0, 5).map((claim) => (
                    <div 
                      key={claim.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-primary">{claim.claimNumber}</p>
                        <p className="text-xs text-muted-foreground">{claim.registrationDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${claim.amount.toLocaleString()}</p>
                        <p className={`text-xs font-medium ${
                          claim.outlierScore >= 0.7 ? 'text-chart-2' : 
                          claim.outlierScore >= 0.4 ? 'text-chart-3' : 'text-chart-4'
                        }`}>
                          Score: {claim.outlierScore.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
