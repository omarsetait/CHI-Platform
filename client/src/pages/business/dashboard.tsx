import React, { useState } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
    Building2, TrendingUp, TrendingDown, Users, Wallet, Activity, ShieldAlert, LineChart, PieChart as PieChartIcon, Settings2
} from "lucide-react";

// Mock Data
const spendTrendData = [
    { month: "Jan", actual: 1200000, projected: 1150000 },
    { month: "Feb", actual: 1350000, projected: 1200000 },
    { month: "Mar", actual: 1420000, projected: 1250000 },
    { month: "Apr", actual: 1280000, projected: 1300000 },
    { month: "May", actual: 1550000, projected: 1350000 },
    { month: "Jun", actual: 1680000, projected: 1400000 },
];

const departmentSpendData = [
    { name: "Engineering", spend: 450000, employees: 320 },
    { name: "Sales", spend: 380000, employees: 250 },
    { name: "Operations", spend: 290000, employees: 180 },
    { name: "Executive", spend: 120000, employees: 45 },
    { name: "Marketing", spend: 180000, employees: 110 },
];

const categoryData = [
    { name: "Inpatient", value: 45 },
    { name: "Outpatient", value: 30 },
    { name: "Pharmacy", value: 15 },
    { name: "Dental/Optical", value: 10 },
];
const COLORS = ["#0284c7", "#38bdf8", "#7dd3fc", "#e0f2fe"];

export default function BusinessDashboard() {
    const [activeTab, setActiveTab] = useState("overview");

    // Simulator State
    const [copayPercent, setCopayPercent] = useState([20]);
    const [pharmacyLimit, setPharmacyLimit] = useState([5000]);

    // Calculate simulated savings based on slider values
    const baseSpend = 16800000; // Annual projected
    const copaySavings = (copayPercent[0] - 20) * 0.005 * baseSpend;
    const pharmacySavings = (5000 - pharmacyLimit[0]) * 100;
    const totalSimulatedSpend = baseSpend - copaySavings - pharmacySavings;
    const savingsAmount = baseSpend - totalSimulatedSpend;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-sky-700 dark:text-sky-400 flex items-center gap-3">
                        <Building2 className="h-8 w-8" />
                        Daman Business
                    </h1>
                    <p className="text-muted-foreground mt-1">Employer profiling, cost analysis, and AI policy simulation.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-sm font-medium mr-2">Viewing Enterprise:</span>
                    <Select defaultValue="acme">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="acme">Acme Corp (5,200 Lives)</SelectItem>
                            <SelectItem value="globex">Globex Inc (1,400 Lives)</SelectItem>
                            <SelectItem value="soylent">Soylent Corp (850 Lives)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-4 items-center flex flex-row justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">YTD Healthcare Spend</CardTitle>
                        <Wallet className="w-4 h-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">8.4M SAR</div>
                        <p className="text-xs text-rose-500 flex items-center mt-1 font-medium">
                            <TrendingUp className="h-3 w-3 mr-1" /> +12.5% vs Last Year
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-4 items-center flex flex-row justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
                        <Users className="w-4 h-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">5,204</div>
                        <p className="text-xs text-emerald-500 flex items-center mt-1 font-medium">
                            <TrendingUp className="h-3 w-3 mr-1" /> +42 New Hires
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="py-4 items-center flex flex-row justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Overall Risk Factor</CardTitle>
                        <Activity className="w-4 h-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">Elevated</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Driven by high inpatient utilization
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/10">
                    <CardHeader className="py-4 items-center flex flex-row justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-rose-600 dark:text-rose-400">Potential FWA Leakage</CardTitle>
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">~850K SAR</div>
                        <p className="text-xs text-rose-600/80 mt-1">
                            Identified by Daman AI Audits
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full md:w-auto grid-cols-2 mb-6 bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-sky-600 data-[state=active]:shadow-sm">
                        <LineChart className="w-4 h-4 mr-2" /> Cost Profiling
                    </TabsTrigger>
                    <TabsTrigger value="simulator" className="data-[state=active]:bg-white data-[state=active]:text-sky-600 data-[state=active]:shadow-sm">
                        <Settings2 className="w-4 h-4 mr-2" /> AI Policy Simulator
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 shadow-sm border border-border/50">
                            <CardHeader>
                                <CardTitle>Spend Trend Analysis (YTD)</CardTitle>
                                <CardDescription>Actual utilization costs vs. Initial Actuarial Projections</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={spendTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [`${(value / 1000).toFixed(0)}k SAR`, undefined]}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="top" height={36} />
                                        <Area type="monotone" name="Actual Spend" dataKey="actual" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                                        <Area type="monotone" name="Projected Spend" dataKey="projected" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProjected)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border border-border/50">
                            <CardHeader>
                                <CardTitle>Spend Distribution</CardTitle>
                                <CardDescription>Cost broken down by service category</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="h-[220px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value}%`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full mt-4 space-y-2">
                                    {categoryData.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                                <span>{item.name}</span>
                                            </div>
                                            <span className="font-medium text-muted-foreground">{item.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm border border-border/50">
                        <CardHeader>
                            <CardTitle>Department-Level Cost Profiling</CardTitle>
                            <CardDescription>Identify high-utilization groups within your workforce</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentSpendData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.3} />
                                    <XAxis type="number" tickFormatter={(val) => `${val / 1000}k`} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value) => [`${value} SAR`, 'Spend']} />
                                    <Bar dataKey="spend" name="Total Spend" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Simulator Tab */}
                <TabsContent value="simulator" className="animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="shadow-sm border-2 border-sky-500/20">
                                <CardHeader className="bg-sky-50/50 dark:bg-sky-950/20 pb-4">
                                    <CardTitle className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
                                        <Settings2 className="w-5 h-5" />
                                        Policy Parameters
                                    </CardTitle>
                                    <CardDescription>
                                        Adjust these policy levers to simulate the impact on your annual healthcare budget.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8 pt-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Outpatient Copay %</label>
                                            <span className="text-sm font-bold text-sky-600">{copayPercent[0]}%</span>
                                        </div>
                                        <Slider
                                            value={copayPercent}
                                            onValueChange={setCopayPercent}
                                            max={50}
                                            min={0}
                                            step={5}
                                        />
                                        <p className="text-xs text-muted-foreground">Current Baseline: 20%</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Pharmacy Annual Limit</label>
                                            <span className="text-sm font-bold text-sky-600">{pharmacyLimit[0]} SAR</span>
                                        </div>
                                        <Slider
                                            value={pharmacyLimit}
                                            onValueChange={setPharmacyLimit}
                                            max={10000}
                                            min={1000}
                                            step={500}
                                        />
                                        <p className="text-xs text-muted-foreground">Current Baseline: 5,000 SAR</p>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="text-xs text-amber-800 dark:text-amber-200">
                                                <strong>AI Insight:</strong> Increasing copay above 30% typically reduces preventative care visits, leading to a 15% long-term increase in inpatient admissions.
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border border-border/50 h-full flex flex-col">
                                <CardHeader>
                                    <CardTitle>Budget Impact Simulation</CardTitle>
                                    <CardDescription>Projected annual effects based on selected policy parameters</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-center gap-8">
                                    <div className="grid grid-cols-2 gap-8 text-center p-8 bg-muted/20 rounded-2xl">
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground mb-2">Original Projected Annual Spend</div>
                                            <div className="text-3xl font-bold text-foreground">{(baseSpend / 1000000).toFixed(2)}M SAR</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground mb-2">Simulated Annual Spend</div>
                                            <div className="text-3xl font-bold text-sky-600">{(totalSimulatedSpend / 1000000).toFixed(2)}M SAR</div>
                                        </div>
                                    </div>

                                    <div className="text-center p-8 rounded-2xl border bg-card relative overflow-hidden">
                                        <div className={`absolute inset-0 opacity-10 ${savingsAmount >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <div className="relative z-10">
                                            <div className="text-sm font-medium text-muted-foreground mb-2">Projected Annual Savings</div>
                                            <div className={`text-5xl font-extrabold ${savingsAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {savingsAmount >= 0 ? '+' : ''}{(savingsAmount / 1000).toFixed(0)}K SAR
                                            </div>
                                            <p className="text-sm mt-4 text-muted-foreground max-w-sm mx-auto">
                                                This involves a reduction in short-term pharmacy and outpatient costs.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
}
