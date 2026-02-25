import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Rss,
  Search,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Newspaper,
  Building2,
  Eye,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Settings,
  Globe,
  BookOpen,
  Twitter,
} from "lucide-react";
import type { OnlineListeningMention, ListeningSourceConfig } from "@shared/schema";

const sourceIcons: Record<string, any> = {
  alriyadh: Newspaper,
  almadina: Newspaper,
  alsharq_alawsat: Globe,
  okaz: Newspaper,
  sabq: Newspaper,
  twitter: Twitter,
  news_article: Newspaper,
  medical_journal: BookOpen,
  blog: MessageCircle,
  forum: MessageCircle,
};

const sourceNames: Record<string, { en: string; ar: string }> = {
  alriyadh: { en: "Al Riyadh", ar: "صحيفة الرياض" },
  almadina: { en: "Al Madina", ar: "صحيفة المدينة" },
  alsharq_alawsat: { en: "Al Sharq Al Awsat", ar: "الشرق الأوسط" },
  okaz: { en: "Okaz", ar: "صحيفة عكاظ" },
  sabq: { en: "Sabq", ar: "صحيفة سبق" },
  twitter: { en: "X (Twitter)", ar: "منصة إكس (تويتر)" },
  news_article: { en: "Healthcare News", ar: "أخبار الرعاية الصحية" },
  medical_journal: { en: "Medical Journal", ar: "المجلة الطبية" },
  blog: { en: "Blog", ar: "مدونة" },
  forum: { en: "Forum", ar: "منتدى" },
};

const sentimentColors: Record<string, string> = {
  very_negative: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  negative: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  positive: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  very_positive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

const alertColors: Record<string, string> = {
  normal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const getSourceIcon = (sourceId: string) => {
  return sourceIcons[sourceId] || Newspaper;
};

const saudiNewspapers = [
  { id: "alriyadh", name: "Al Riyadh", nameAr: "صحيفة الرياض", url: "https://www.alriyadh.com", color: "text-green-600" },
  { id: "almadina", name: "Al Madina", nameAr: "صحيفة المدينة", url: "https://www.al-madina.com", color: "text-blue-600" },
  { id: "alsharq_alawsat", name: "Al Sharq Al Awsat", nameAr: "الشرق الأوسط", url: "https://aawsat.com", color: "text-red-600" },
  { id: "okaz", name: "Okaz", nameAr: "صحيفة عكاظ", url: "https://www.okaz.com.sa", color: "text-amber-600" },
  { id: "sabq", name: "Sabq", nameAr: "صحيفة سبق", url: "https://sabq.org", color: "text-purple-600" },
  { id: "arab_news", name: "Arab News", nameAr: "أراب نيوز", url: "https://www.arabnews.com", color: "text-blue-700" },
  { id: "saudi_gazette", name: "Saudi Gazette", nameAr: "سعودي غازيت", url: "https://www.saudigazette.com.sa", color: "text-teal-600" },
];

export default function OnlineListening() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("mentions");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editedSources, setEditedSources] = useState<ListeningSourceConfig[]>([]);
  const { toast } = useToast();

  const { data: mentions, isLoading, refetch } = useQuery<OnlineListeningMention[]>({
    queryKey: ["/api/fwa/chi/online-listening"],
  });

  const { data: sourceConfigs, isLoading: configsLoading } = useQuery<ListeningSourceConfig[]>({
    queryKey: ["/api/fwa/chi/online-listening/configs"],
  });

  useEffect(() => {
    if (sourceConfigs) {
      setEditedSources(sourceConfigs);
    }
  }, [sourceConfigs]);

  const saveConfigMutation = useMutation({
    mutationFn: async (configs: Partial<ListeningSourceConfig>[]) => {
      const response = await apiRequest("PUT", "/api/fwa/chi/online-listening/configs", configs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/online-listening/configs"] });
      setConfigDialogOpen(false);
      toast({
        title: "Configuration saved",
        description: "Your listening source settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const fetchMentionsMutation = useMutation({
    mutationFn: async (data: { keywords: string[]; providers: string[] }) => {
      const response = await apiRequest("POST", "/api/fwa/chi/online-listening/fetch", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/online-listening"] });
      toast({
        title: "Fetch complete",
        description: `Found and analyzed ${data.analyzed || 0} articles from ${data.totalFetched || 0} results.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fetch failed",
        description: error.message || "Failed to fetch news. Check if NEWS_API_KEY is configured.",
        variant: "destructive",
      });
    },
  });

  // Twitter/X mentions via Grok AI (Replit OpenRouter - no API key required)
  const fetchTwitterMutation = useMutation({
    mutationFn: async (data: { keywords: string[]; providers?: string[] }) => {
      const response = await apiRequest("POST", "/api/fwa/chi/online-listening/twitter", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/online-listening"] });
      toast({
        title: "تحليل منصة إكس / X Analysis Complete",
        description: data.summary || `تم تحليل ${data.totalFound || 0} نقاش`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "فشل التحليل / Analysis Failed",
        description: error.message || "فشل في تحليل منصة إكس. تحقق من إعدادات OpenRouter.",
        variant: "destructive",
      });
    },
  });

  const handleTwitterRefresh = () => {
    // Default Arabic healthcare keywords for Saudi Twitter
    const keywords = [
      "مستشفى الحبيب",
      "المواساة",
      "السعودي الألماني",
      "مجلس الضمان الصحي",
      "احتيال صحي",
    ];
    fetchTwitterMutation.mutate({ keywords });
  };

  const handleRefresh = () => {
    // Collect keywords and providers from enabled sources
    const enabledSources = editedSources.filter(s => s.enabled);
    const allKeywords = enabledSources
      .flatMap(s => (s.keywords || []).filter(k => k))
      .filter((k, i, arr) => arr.indexOf(k) === i); // unique
    const allProviders = enabledSources
      .flatMap(s => (s.providerNames || []).filter(p => p))
      .filter((p, i, arr) => arr.indexOf(p) === i); // unique
    
    if (allKeywords.length === 0 && allProviders.length === 0) {
      // Use Arabic healthcare keywords for Saudi news
      fetchMentionsMutation.mutate({
        keywords: ["احتيال صحي", "تأمين طبي السعودية", "مستشفيات السعودية", "مجلس الضمان الصحي", "وزارة الصحة"],
        providers: allProviders,
      });
    } else {
      fetchMentionsMutation.mutate({
        keywords: (allKeywords.length > 0 ? allKeywords : ["صحة السعودية"]).slice(0, 10),
        providers: allProviders,
      });
    }
  };

  const handleSaveConfig = () => {
    // Transform to API format
    const configsToSave = editedSources.map(s => ({
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      sourceNameAr: s.sourceNameAr,
      enabled: s.enabled,
      apiSupported: s.apiSupported,
      keywords: s.keywords || [],
      providerNames: s.providerNames || []
    }));
    saveConfigMutation.mutate(configsToSave);
  };

  const toggleSource = (sourceId: string) => {
    setEditedSources(prev => prev.map(s => 
      s.sourceId === sourceId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const updateSourceKeywords = (sourceId: string, keywordsStr: string) => {
    const keywords = keywordsStr.split(",").map(k => k.trim()).filter(k => k);
    setEditedSources(prev => prev.map(s => 
      s.sourceId === sourceId ? { ...s, keywords } : s
    ));
  };

  const updateSourceProviders = (sourceId: string, providersStr: string) => {
    const providerNames = providersStr.split(",").map(p => p.trim()).filter(p => p);
    setEditedSources(prev => prev.map(s => 
      s.sourceId === sourceId ? { ...s, providerNames } : s
    ));
  };

  const mentionList = mentions || [];

  const filteredMentions = mentionList.filter((m) => {
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.providerName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || m.source === sourceFilter;
    const matchesSentiment = sentimentFilter === "all" || m.sentiment === sentimentFilter;
    return matchesSearch && matchesSource && matchesSentiment;
  });

  const stats = {
    totalMentions: mentionList.length,
    negativeMentions: mentionList.filter(m => Number(m.sentimentScore) < 0).length,
    requiresAction: mentionList.filter(m => m.requiresAction).length,
    avgSentiment: mentionList.length > 0 
      ? mentionList.reduce((sum, m) => sum + Number(m.sentimentScore), 0) / mentionList.length 
      : 0,
  };

  const providerSentimentSummary = mentionList.reduce((acc, m) => {
    const existing = acc.find(p => p.providerId === m.providerId);
    if (existing) {
      existing.mentionCount++;
      existing.totalSentiment += Number(m.sentimentScore);
      existing.avgSentiment = existing.totalSentiment / existing.mentionCount;
    } else {
      acc.push({
        providerId: m.providerId || "",
        providerName: m.providerName || "",
        mentionCount: 1,
        totalSentiment: Number(m.sentimentScore),
        avgSentiment: Number(m.sentimentScore),
        trendDirection: Number(m.sentimentScore) > 0 ? "up" : Number(m.sentimentScore) < 0 ? "down" : "stable",
        alertLevel: Number(m.sentimentScore) < -0.3 ? "critical" : Number(m.sentimentScore) < 0 ? "warning" : "normal",
      });
    }
    return acc;
  }, [] as { providerId: string; providerName: string; mentionCount: number; totalSentiment: number; avgSentiment: number; trendDirection: string; alertLevel: string }[]);

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return <ThumbsUp className="w-4 h-4 text-green-600" />;
    if (score < -0.3) return <ThumbsDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Beta</Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Online Listening</h1>
          <p className="text-muted-foreground">
            Monitor social media and external reputation signals
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={fetchMentionsMutation.isPending}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${fetchMentionsMutation.isPending ? "animate-spin" : ""}`} />
            {fetchMentionsMutation.isPending ? "جاري الجلب..." : "تحديث الأخبار"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleTwitterRefresh} 
            disabled={fetchTwitterMutation.isPending}
            className="bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 border-sky-200 dark:border-sky-800"
            data-testid="button-twitter-refresh"
          >
            <Twitter className={`w-4 h-4 mr-2 text-sky-500 ${fetchTwitterMutation.isPending ? "animate-pulse" : ""}`} />
            {fetchTwitterMutation.isPending ? "جاري التحليل..." : "تحليل إكس / Analyze X"}
          </Button>
          <Button onClick={() => setConfigDialogOpen(true)} data-testid="button-configure">
            <Settings className="w-4 h-4 mr-2" />
            إعدادات المصادر
          </Button>
        </div>
      </div>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rss className="w-5 h-5" />
              Configure Listening Sources
            </DialogTitle>
            <DialogDescription>
              Enable or disable sources and configure keywords to monitor for provider mentions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {configsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-5 h-5 rounded" />
                        <Skeleton className="w-32 h-4" />
                      </div>
                      <Skeleton className="w-10 h-5 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              editedSources.map((source) => {
                const SourceIcon = getSourceIcon(source.sourceId);
                return (
                  <div key={source.sourceId} className="space-y-3 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SourceIcon className="w-5 h-5 text-muted-foreground" />
                        <Label htmlFor={`source-${source.sourceId}`} className="font-medium">
                          {source.sourceName}
                        </Label>
                        {!source.apiSupported && (
                          <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                        )}
                      </div>
                      <Switch
                        id={`source-${source.sourceId}`}
                        checked={source.enabled ?? false}
                        onCheckedChange={() => toggleSource(source.sourceId)}
                        disabled={!source.apiSupported}
                        data-testid={`switch-source-${source.sourceId}`}
                      />
                    </div>
                    {source.enabled && source.apiSupported && (
                      <div className="space-y-3 pl-8">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Keywords (comma-separated)</Label>
                          <Input
                            placeholder="e.g., fraud, malpractice / احتيال، سوء الممارسة"
                            value={(source.keywords || []).join(", ")}
                            onChange={(e) => updateSourceKeywords(source.sourceId, e.target.value)}
                            data-testid={`input-keywords-${source.sourceId}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Provider Names to Track (comma-separated)</Label>
                          <Input
                            placeholder="e.g., Al Moosa Hospital / مستشفى الموسى"
                            value={(source.providerNames || []).join(", ")}
                            onChange={(e) => updateSourceProviders(source.sourceId, e.target.value)}
                            data-testid={`input-providers-${source.sourceId}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)} data-testid="button-cancel-config">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveConfig} 
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-config"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-total">{stats.totalMentions}</p>
            <p className="text-xs text-muted-foreground">Total Mentions (7 days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <ThumbsDown className="w-5 h-5 text-red-600" />
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{stats.negativeMentions}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-negative">{stats.negativeMentions}</p>
            <p className="text-xs text-muted-foreground">Negative Mentions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Flag className="w-5 h-5 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{stats.requiresAction}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-action">{stats.requiresAction}</p>
            <p className="text-xs text-muted-foreground">Requires Action</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {getSentimentIcon(stats.avgSentiment)}
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-sentiment">{(stats.avgSentiment * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Avg Sentiment Score</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Rss className="w-5 h-5 text-primary" />
            تحليل المشاعر بالذكاء الاصطناعي / NLP-Powered Sentiment Analysis
          </CardTitle>
          <CardDescription>
            يحلل الذكاء الاصطناعي المقالات الإخبارية والصحف السعودية لتحديد مخاطر السمعة والقضايا الناشئة مع مقدمي الخدمات الصحية
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mentions" data-testid="tab-mentions">
            <MessageCircle className="w-4 h-4 mr-2" />
            Recent Mentions
          </TabsTrigger>
          <TabsTrigger value="providers" data-testid="tab-providers">
            <Building2 className="w-4 h-4 mr-2" />
            Provider Summary
          </TabsTrigger>
          <TabsTrigger value="news-portal" data-testid="tab-news-portal">
            <Newspaper className="w-4 h-4 mr-2" />
            News Portal
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في الإشارات... / Search mentions..."
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
                <SelectItem value="all">جميع المصادر / All Sources</SelectItem>
                <SelectItem value="alriyadh">صحيفة الرياض / Al Riyadh</SelectItem>
                <SelectItem value="almadina">صحيفة المدينة / Al Madina</SelectItem>
                <SelectItem value="alsharq_alawsat">الشرق الأوسط / Al Sharq Al Awsat</SelectItem>
                <SelectItem value="okaz">صحيفة عكاظ / Okaz</SelectItem>
                <SelectItem value="sabq">صحيفة سبق / Sabq</SelectItem>
                <SelectItem value="news_article">أخبار أخرى / Other News</SelectItem>
                <SelectItem value="medical_journal">مجلات طبية / Journals</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-sentiment">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="very_positive">Very Positive</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="very_negative">Very Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="mentions">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3,4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : filteredMentions.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Rss className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No online mentions found. Configure sources to start monitoring provider sentiment.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredMentions.map((mention) => {
                  const SourceIcon = sourceIcons[mention.source] || MessageCircle;
                  return (
                    <Card key={mention.id} className={mention.requiresAction ? "border-amber-300 dark:border-amber-700" : ""} data-testid={`mention-${mention.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-muted">
                              <SourceIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{mention.providerName}</span>
                                {mention.authorHandle && (
                                  <span className="text-sm text-muted-foreground">{mention.authorHandle}</span>
                                )}
                                {mention.requiresAction && (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                    <Flag className="w-3 h-3 mr-1" />
                                    Action Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm mb-2">{mention.content}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={sentimentColors[mention.sentiment || "neutral"] || ""}>
                                  {(mention.sentiment || "neutral").replace("_", " ")}
                                </Badge>
                                {mention.topics && mention.topics.map((topic) => (
                                  <Badge key={topic} variant="outline" className="text-xs">{topic}</Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{mention.publishedAt ? new Date(mention.publishedAt).toLocaleDateString() : ""}</span>
                                <span>{mention.engagementCount} engagements</span>
                                <span>~{((mention.reachEstimate || 0) / 1000).toFixed(1)}K reach</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-center">
                              {getSentimentIcon(Number(mention.sentimentScore))}
                              <p className="text-xs text-muted-foreground mt-1">
                                {(Number(mention.sentimentScore) * 100).toFixed(0)}%
                              </p>
                            </div>
                            {mention.sourceUrl && (
                              <Button variant="ghost" size="icon" asChild>
                                <a href={mention.sourceUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="providers">
            <Card>
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : providerSentimentSummary.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No provider sentiment data available.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Mentions (7d)</TableHead>
                      <TableHead>Avg Sentiment</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Alert Level</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providerSentimentSummary.map((provider) => (
                      <TableRow key={provider.providerId} data-testid={`provider-${provider.providerId}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{provider.providerName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{provider.mentionCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSentimentIcon(provider.avgSentiment)}
                            <span>{(provider.avgSentiment * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {provider.trendDirection === "up" && <TrendingUp className="w-4 h-4 text-green-600" />}
                          {provider.trendDirection === "down" && <TrendingDown className="w-4 h-4 text-red-600" />}
                          {provider.trendDirection === "stable" && <Minus className="w-4 h-4 text-gray-500" />}
                        </TableCell>
                        <TableCell>
                          <Badge className={alertColors[provider.alertLevel]}>{provider.alertLevel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" data-testid={`button-view-provider-${provider.providerId}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="news-portal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  بوابة الأخبار السعودية / Saudi News Portal
                </CardTitle>
                <CardDescription>
                  روابط مباشرة للصحف والمصادر الإخبارية السعودية الرسمية لمتابعة أخبار القطاع الصحي
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {saudiNewspapers.map((newspaper) => {
                    const SourceIcon = getSourceIcon(newspaper.id);
                    return (
                      <a
                        key={newspaper.id}
                        href={newspaper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 rounded-lg border hover-elevate transition-all"
                        data-testid={`link-newspaper-${newspaper.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${newspaper.color}`}>
                            <SourceIcon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-right" dir="rtl">{newspaper.nameAr}</div>
                            <div className="text-sm text-muted-foreground">{newspaper.name}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </a>
                    );
                  })}
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    مصادر إضافية / Additional Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                      href="https://www.moh.gov.sa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover-elevate"
                      data-testid="link-moh"
                    >
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" dir="rtl">وزارة الصحة السعودية</div>
                        <div className="text-sm text-muted-foreground">Ministry of Health</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <a
                      href="https://www.chi.gov.sa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover-elevate"
                      data-testid="link-chi"
                    >
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" dir="rtl">مجلس الضمان الصحي</div>
                        <div className="text-sm text-muted-foreground">Council of Health Insurance (CHI)</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <a
                      href="https://www.sfda.gov.sa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover-elevate"
                      data-testid="link-sfda"
                    >
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Building2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" dir="rtl">هيئة الغذاء والدواء</div>
                        <div className="text-sm text-muted-foreground">Saudi FDA</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <a
                      href="https://smj.org.sa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover-elevate"
                      data-testid="link-smj"
                    >
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <BookOpen className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" dir="rtl">المجلة الطبية السعودية</div>
                        <div className="text-sm text-muted-foreground">Saudi Medical Journal</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
