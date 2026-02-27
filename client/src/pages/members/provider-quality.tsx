import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, ThumbsUp, ShieldCheck, XCircle } from "lucide-react";

interface ProviderQualityData {
  avgNationalRating: number;
  avgWaitTime: number;
  providers: Array<{
    name: string;
    city: string;
    rating: number;
    waitTime: number;
    satisfaction: number;
    accredited: boolean;
  }>;
  generatedAt: string;
}

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 text-amber-400 fill-amber-400" />
      ))}
      {halfStar && (
        <Star key="half" className="h-4 w-4 text-amber-400 fill-amber-200" />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      ))}
      <span className="ml-1 text-sm font-bold">{rating.toFixed(1)}</span>
    </div>
  );
}

function satisfactionColor(value: number): string {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

export default function ProviderQualityPage() {
  const { data, isLoading } = useQuery<ProviderQualityData>({
    queryKey: ["/api/members/provider-quality"],
  });

  const sortedProviders = data?.providers
    ? [...data.providers].sort((a, b) => b.rating - a.rating)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Star className="h-8 w-8 text-amber-500" />
          Provider Quality
        </h1>
        <p className="text-muted-foreground mt-1">
          Transparent quality ratings, wait times, and accreditation status for healthcare providers
        </p>
        <p className="text-sm text-teal-600 dark:text-teal-400 mt-0.5 font-medium" dir="rtl">
          جودة مقدمي الخدمات — الشفافية في تقييم الأداء
        </p>
      </div>

      {/* National Averages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Star className="h-6 w-6 text-amber-600 fill-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {data?.avgNationalRating ?? "..."} / 5.0
              </div>
              <div className="text-xs text-muted-foreground">National Average Rating</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {data?.avgWaitTime ?? "..."} <span className="text-sm font-normal text-muted-foreground">min</span>
              </div>
              <div className="text-xs text-muted-foreground">Average Wait Time</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Provider Quality Rankings</CardTitle>
          <CardDescription>All providers ranked by quality rating (highest first)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading providers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <th className="px-4 py-3 text-left rounded-tl-lg">#</th>
                    <th className="px-3 py-3 text-left">Provider</th>
                    <th className="px-3 py-3 text-left">City</th>
                    <th className="px-3 py-3 text-left">Rating</th>
                    <th className="px-3 py-3 text-right">Wait Time</th>
                    <th className="px-3 py-3 text-left">Satisfaction</th>
                    <th className="px-3 py-3 text-left rounded-tr-lg">Accredited</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProviders.map((provider, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3 font-medium">{provider.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{provider.city}</td>
                      <td className="px-3 py-3">{renderStars(provider.rating)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-bold ${provider.waitTime <= 25 ? "text-emerald-600" : provider.waitTime <= 40 ? "text-amber-600" : "text-rose-600"}`}>
                          {provider.waitTime} min
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${satisfactionColor(provider.satisfaction)}`}
                              style={{ width: `${provider.satisfaction}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{provider.satisfaction}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {provider.accredited ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Accredited
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 text-xs">
                            <XCircle className="h-3 w-3 mr-1" /> Not Accredited
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
