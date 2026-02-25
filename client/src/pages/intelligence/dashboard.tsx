import React, { useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Brain, FileText, CheckCircle2, AlertTriangle, UploadCloud, FileSearch, Shield, TrendingUp, Activity, BarChart3, ChevronRight, Download, User
} from "lucide-react";

// Mock Data
const benchmarkData = [
    { subject: 'Coding Quality', A: 85, B: 65, fullMark: 100 },
    { subject: 'Medical Docs', A: 78, B: 70, fullMark: 100 },
    { subject: 'Med Necessity', A: 92, B: 75, fullMark: 100 },
    { subject: 'Protocol Adherence', A: 88, B: 80, fullMark: 100 },
    { subject: 'FWA Safety Score', A: 95, B: 85, fullMark: 100 },
];

const rejectionData = [
    { id: "CLM-2023-8821", date: "2023-11-20", code: "E11.9", amount: "1,250 SAR", reason: "Medical Necessity Not Met", aiDecoder: "Missing supporting labs for HbA1c > 8.0", action: "Attach lab results" },
    { id: "CLM-2023-8845", date: "2023-11-21", code: "J01.90", amount: "450 SAR", reason: "Unbundling detected", aiDecoder: "Consultation billed separately from minor procedure on same day", action: "Bundle codes" },
    { id: "CLM-2023-8910", date: "2023-11-22", code: "M54.5", amount: "3,200 SAR", reason: "Experimental Treatment", aiDecoder: "Therapy code 97039 not recognized for primary diagnosis without prior authorization", action: "Request pre-auth retrospectively" },
];

export default function IntelligenceDashboard() {
    const [activeTab, setActiveTab] = useState("benchmarking");

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                        <Brain className="h-8 w-8 text-[#8b5cf6]" />
                        Daman Intelligence
                    </h1>
                    <p className="text-muted-foreground mt-1">Provider scorecards, analytics, and self-audit capabilities.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-[#8b5cf6] text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white transition-colors">
                        <Download className="mr-2 h-4 w-4" /> Download Report
                    </Button>
                    <Button className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
                        <User className="mr-2 h-4 w-4" /> Provider Profile
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Overall Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">87.6%</div>
                        <p className="text-xs text-emerald-500 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" /> +2.4% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Peer Rank</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Top 15%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Out of 450 regional facilities
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#8b5cf6] shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">FWA Safety Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[#8b5cf6]">95/100</div>
                        <p className="text-xs text-[#8b5cf6] flex items-center mt-1">
                            <Shield className="h-3 w-3 mr-1" /> Low Risk
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Claim Rejection Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.2%</div>
                        <p className="text-xs text-rose-500 flex items-center mt-1">
                            <Activity className="h-3 w-3 mr-1" /> -0.8% from last month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="benchmarking" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1">
                    <TabsTrigger value="benchmarking" className="data-[state=active]:bg-white data-[state=active]:text-[#8b5cf6] data-[state=active]:shadow-sm">
                        <BarChart3 className="w-4 h-4 mr-2" /> Benchmark Analysis
                    </TabsTrigger>
                    <TabsTrigger value="decoder" className="data-[state=active]:bg-white data-[state=active]:text-[#8b5cf6] data-[state=active]:shadow-sm">
                        <Brain className="w-4 h-4 mr-2" /> Rejection Decoder
                    </TabsTrigger>
                    <TabsTrigger value="self-audit" className="data-[state=active]:bg-white data-[state=active]:text-[#8b5cf6] data-[state=active]:shadow-sm">
                        <Shield className="w-4 h-4 mr-2" /> Pre-Submission Self-Audit
                    </TabsTrigger>
                </TabsList>

                {/* Benchmarking Tab */}
                <TabsContent value="benchmarking" className="space-y-4 animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="shadow-sm border border-border/50">
                            <CardHeader>
                                <CardTitle>Performance vs. Market Average</CardTitle>
                                <CardDescription>Your scores (A) compared to the regional market average (B)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={benchmarkData}>
                                        <PolarGrid strokeOpacity={0.4} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--foreground)', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Your Facility" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                                        <Radar name="Market Average" dataKey="B" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                                        <Legend />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border border-border/50">
                            <CardHeader>
                                <CardTitle>Detailed Metric Breakdown</CardTitle>
                                <CardDescription>Identify areas for targeted improvement</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {benchmarkData.map((item, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium flex items-center gap-2">
                                                {item.A > item.B ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                )}
                                                {item.subject}
                                            </span>
                                            <span className="font-bold text-[#8b5cf6]">{item.A}% <span className="text-muted-foreground font-normal text-xs">(Avg: {item.B}%)</span></span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden relative">
                                            <div
                                                className={`absolute top-0 bottom-0 left-0 ${item.A >= item.B ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                style={{ width: `${item.A}%`, borderRadius: '9999px' }}
                                            />
                                            <div
                                                className="absolute top-0 bottom-0 w-1 bg-black/30 z-10"
                                                style={{ left: `${item.B}%` }}
                                                title={`Market Avg: ${item.B}%`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Decoder Tab */}
                <TabsContent value="decoder" className="animate-in fade-in-50 duration-500">
                    <Card className="shadow-sm border border-border/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-[#8b5cf6]" />
                                AI Rejection Decoder
                            </CardTitle>
                            <CardDescription>
                                Understand exactly why claims were flagged or denied, and learn how to fix them.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Claim ID</th>
                                            <th className="px-4 py-3">Code / Amt</th>
                                            <th className="px-4 py-3">Payer Reason</th>
                                            <th className="px-4 py-3 text-[#8b5cf6] font-semibold">AI Decoder Insight</th>
                                            <th className="px-4 py-3 rounded-tr-lg">Recommended Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rejectionData.map((row, idx) => (
                                            <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-4 font-medium text-primary">
                                                    {row.id}
                                                    <div className="text-xs text-muted-foreground font-normal">{row.date}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge variant="outline" className="mb-1">{row.code}</Badge>
                                                    <div className="text-xs font-medium">{row.amount}</div>
                                                </td>
                                                <td className="px-4 py-4 text-rose-600/80 font-medium">
                                                    {row.reason}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex gap-2 items-start bg-[#8b5cf6]/10 p-3 rounded-md border border-[#8b5cf6]/20">
                                                        <Brain className="w-4 h-4 text-[#8b5cf6] shrink-0 mt-0.5" />
                                                        <span className="text-[#8b5cf6] leading-snug">{row.aiDecoder}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Button size="sm" variant="secondary" className="w-full justify-between group">
                                                        {row.action} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Self-Audit Tab */}
                <TabsContent value="self-audit" className="animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 shadow-sm border border-border/50 bg-gradient-to-br from-card to-muted/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSearch className="w-5 h-5 text-[#8b5cf6]" />
                                    Pre-Submission Simulator
                                </CardTitle>
                                <CardDescription>
                                    Upload a batch of draft claims to run them through our AI audit engine before sending to payers. Avoid penalties and denials proactively.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-8 pt-4">
                                <div className="border-2 border-dashed border-[#8b5cf6]/40 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-[#8b5cf6]/5 transition-colors cursor-pointer group">
                                    <div className="p-4 bg-muted rounded-full mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-border/50">
                                        <UploadCloud className="w-8 h-8 text-[#8b5cf6]" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2 text-foreground">Drag & Drop claim batches here</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                                        Supports HL7, XML, or standard CSV/Excel formats. Maximum 5,000 claims per simulation batch.
                                    </p>
                                    <Button className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md">
                                        Browse Files
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border border-border/50">
                            <CardHeader>
                                <CardTitle>Recent Simulations</CardTitle>
                                <CardDescription>History of your self-audits</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[
                                        { date: "Today, 09:41 AM", size: "342 Claims", risk: "Low", blocks: 2 },
                                        { date: "Yesterday, 14:20 PM", size: "1,205 Claims", risk: "Medium", blocks: 14 },
                                        { date: "Nov 15, 11:05 AM", size: "85 claims", risk: "High", blocks: 11 },
                                    ].map((sim, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-card hover:border-[#8b5cf6]/50 transition-colors cursor-pointer group">
                                            <div>
                                                <div className="text-sm font-medium group-hover:text-[#8b5cf6] transition-colors">{sim.date}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <FileText className="w-3 h-3" /> {sim.size}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={sim.risk === "Low" ? "default" : sim.risk === "Medium" ? "secondary" : "destructive"}
                                                    className={sim.risk === "Low" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}>
                                                    {sim.blocks} Flags
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2">View Full History <ChevronRight className="w-3 h-3 ml-1" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
