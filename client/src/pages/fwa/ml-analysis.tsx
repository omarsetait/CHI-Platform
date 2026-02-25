import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  Activity, 
  BarChart3,
  Target,
  RefreshCw,
  Database,
  Users,
  Building,
  FileText,
  Layers,
  Info,
  ArrowRight
} from "lucide-react";

type MLStats = {
  featureStore: { providers: number; members: number };
  inference: { totalAnalyzed: number };
  patterns: { learned: number };
  algorithms: { name: string; status: string; weight: number }[];
  featureCount: number;
};

export default function MLAnalysisPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mlStats, isLoading: statsLoading } = useQuery<MLStats>({
    queryKey: ['/api/fwa/ml/stats'],
  });

  const { data: learnedPatterns } = useQuery<any[]>({
    queryKey: ['/api/fwa/ml/learned-patterns'],
  });

  const { data: peerBaselines } = useQuery<any[]>({
    queryKey: ['/api/fwa/ml/peer-baselines'],
  });

  const trainMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/fwa/ml/train");
    },
    onSuccess: () => {
      toast({
        title: "Training Started",
        description: "ML models are being trained in the background",
      });
    },
  });

  const aggregateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/ml/aggregate-features");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Aggregation Complete",
        description: `Processed ${data.providersProcessed} providers and ${data.membersProcessed} members`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fwa/ml/stats'] });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-ml-analysis">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Unsupervised Lab</h1>
            <p className="text-muted-foreground">Train and review ML models, features, and learned patterns</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => aggregateMutation.mutate()}
            disabled={aggregateMutation.isPending}
            data-testid="button-aggregate-features"
          >
            <Database className="h-4 w-4 mr-2" />
            Aggregate Features
          </Button>
          <Button 
            variant="outline" 
            onClick={() => trainMutation.mutate()}
            disabled={trainMutation.isPending}
            data-testid="button-train-models"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Train Models
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Feature Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">62</div>
            <p className="text-xs text-muted-foreground">24 raw + 38 engineered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Provider Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{mlStats?.featureStore.providers || 0}</div>
                <p className="text-xs text-muted-foreground">Entity aggregations</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Member Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{mlStats?.featureStore.members || 0}</div>
                <p className="text-xs text-muted-foreground">Entity aggregations</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Learned Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learnedPatterns?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active fraud patterns</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About This Lab
            </CardTitle>
            <CardDescription>
              ML infrastructure for the Detection Engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-3">
              <p className="text-sm">
                This lab manages the <strong>unsupervised learning</strong> component (18% weight) 
                of the 5-method Detection Engine composite score.
              </p>
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span><strong>Aggregate Features:</strong> Build entity profiles from claims data</span>
                </div>
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span><strong>Train Models:</strong> Update algorithm parameters</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span><strong>Learned Patterns:</strong> Review discovered fraud patterns</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                To analyze claims, use the Detection Engine which combines all 5 methods.
              </p>
              <Link href="/fwa/detection-engine">
                <Button variant="outline" className="w-full" data-testid="link-detection-engine">
                  <Brain className="h-4 w-4 mr-2" />
                  Go to Detection Engine
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              5 ML Algorithms
            </CardTitle>
            <CardDescription>
              Unsupervised anomaly detection algorithms used in the composite score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "Isolation Forest", type: "Tree-based", desc: "Detects anomalies by isolation depth in random trees" },
                { name: "Local Outlier Factor", type: "Density-based", desc: "Measures local deviation from k-nearest neighbors" },
                { name: "DBSCAN", type: "Clustering", desc: "Identifies noise points that don't belong to clusters" },
                { name: "Autoencoder", type: "Neural Network", desc: "Flags claims with high reconstruction error" },
                { name: "Deep Learning", type: "Neural Network", desc: "Multi-layer confidence-based anomaly scoring" },
              ].map((algo) => (
                <div key={algo.name} className="p-3 rounded-lg border bg-card hover-elevate">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{algo.name}</span>
                    <Badge variant="secondary" className="text-xs">{algo.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{algo.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Learned Fraud Patterns
          </CardTitle>
          <CardDescription>
            Patterns discovered through unsupervised analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learnedPatterns && learnedPatterns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {learnedPatterns.map((pattern: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{pattern.name || `Pattern ${i + 1}`}</span>
                    <Badge variant="outline">{pattern.type || 'anomaly'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pattern.description || 'Discovered pattern'}</p>
                  {pattern.frequency && (
                    <p className="text-xs text-muted-foreground mt-1">Frequency: {pattern.frequency}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No patterns learned yet.</p>
              <p className="text-xs mt-1">Run "Train Models" to discover fraud patterns from your data.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Peer Group Baselines
          </CardTitle>
          <CardDescription>
            Statistical baselines for specialty/region peer groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {peerBaselines && peerBaselines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {peerBaselines.slice(0, 8).map((baseline: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border bg-card">
                  <div className="font-medium text-sm mb-1">{baseline.peerGroup || baseline.specialty || `Group ${i + 1}`}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {baseline.avgClaimAmount && <p>Avg Amount: {baseline.avgClaimAmount}</p>}
                    {baseline.claimCount && <p>Sample Size: {baseline.claimCount}</p>}
                    {baseline.stdDev && <p>Std Dev: {baseline.stdDev}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No peer baselines calculated yet.</p>
              <p className="text-xs mt-1">Run "Aggregate Features" to build peer group statistics.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legacy content removed - claim analysis now handled by Detection Engine */}


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Algorithm Configuration
          </CardTitle>
          <CardDescription>
            Weighted ensemble of 5 unsupervised learning algorithms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(mlStats?.algorithms || [
              { name: "Isolation Forest", status: "active", weight: 0.25 },
              { name: "Local Outlier Factor", status: "active", weight: 0.20 },
              { name: "DBSCAN Clustering", status: "active", weight: 0.20 },
              { name: "Autoencoder", status: "active", weight: 0.15 },
              { name: "Deep Learning", status: "active", weight: 0.20 }
            ]).map((algo, i) => (
              <div key={i} className="p-4 border rounded-md text-center">
                <div className="text-sm font-medium mb-2">{algo.name}</div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {(algo.weight * 100).toFixed(0)}%
                </div>
                <Badge variant={algo.status === 'active' ? 'default' : 'secondary'}>
                  {algo.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
