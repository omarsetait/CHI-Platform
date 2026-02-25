import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    HeartPulse, FileText, Send, MessageSquare, AlertCircle, BookOpen, ShieldAlert, Activity, Info, CheckCircle2
} from "lucide-react";

const educationTopics = [
    {
        title: "Understanding Vitamin D Tests",
        icon: Activity,
        color: "bg-orange-500/10 text-orange-500",
        description: "Why did your doctor order a Vitamin D test? When is it medically necessary?",
        content: "Vitamin D testing is usually only needed if you have symptoms of a deficiency, osteoporosis, or a condition that affects how your body absorbs vitamins. Routine screening for healthy individuals without symptoms is generally not recommended by CHI guidelines. Ask your doctor if this test is right for you."
    },
    {
        title: "Breast Cancer Screening Guidelines",
        icon: HeartPulse,
        color: "bg-pink-500/10 text-pink-500",
        description: "When should you get a mammogram? Learn about the standard CHI guidelines.",
        content: "Regular screening mammograms usually begin at age 40 for average-risk women and are done every 1-2 years. If you have a family history or are at high risk, your doctor might recommend starting earlier or adding an MRI. It is important to know that diagnostic imaging is different from routine screening."
    },
    {
        title: "Urine Culture Tests",
        icon: FileText,
        color: "bg-blue-500/10 text-blue-500",
        description: "When does a simple UTI require a full culture?",
        content: "For a simple, uncomplicated urinary tract infection (UTI), a basic urinalysis is often enough to start treatment. A full urine culture is typically reserved for complicated cases, recurrent infections, or if you don't respond to initial antibiotics. Unnecessary cultures add costs without changing your treatment."
    }
];

const mockClaims = [
    { date: "Oct 12, 2023", provider: "Riyadh Care Hospital", service: "General Consultation", status: "Approved", copay: "50 SAR" },
    { date: "Oct 05, 2023", provider: "Al Habib Pharmacy", service: "Prescription Medication", status: "Approved", copay: "15 SAR" },
    { date: "Sep 22, 2023", provider: "Specialized Orthopedic Clinic", service: "X-Ray & Consult", status: "Requires Info", copay: "Wait" },
];

export default function MembersDashboard() {
    const [activeTab, setActiveTab] = useState("my-health");
    const [chatMessage, setChatMessage] = useState("");
    const [reportSubmitted, setReportSubmitted] = useState(false);

    const handleReportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setReportSubmitted(true);
        setTimeout(() => setReportSubmitted(false), 5000);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#0d9488] flex items-center gap-3">
                        <HeartPulse className="h-8 w-8" />
                        Hello, Sarah
                    </h1>
                    <p className="text-muted-foreground mt-1">Welcome to your patient portal. Manage your health simplified.</p>
                </div>
                <div className="flex gap-2">
                    <Badge className="bg-[#0d9488]/10 text-[#0d9488] hover:bg-[#0d9488]/20 text-sm px-4 py-1.5 border-0">
                        Policy Valid: Premium Plus
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="my-health" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50 p-1">
                    <TabsTrigger value="my-health" className="data-[state=active]:bg-white data-[state=active]:text-[#0d9488] data-[state=active]:shadow-sm">
                        <Activity className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">My Health</span>
                    </TabsTrigger>
                    <TabsTrigger value="education" className="data-[state=active]:bg-white data-[state=active]:text-[#0d9488] data-[state=active]:shadow-sm">
                        <BookOpen className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Learn & Know</span>
                    </TabsTrigger>
                    <TabsTrigger value="chatbot" className="data-[state=active]:bg-white data-[state=active]:text-[#0d9488] data-[state=active]:shadow-sm">
                        <MessageSquare className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Help & Feedback</span>
                    </TabsTrigger>
                    <TabsTrigger value="report" className="data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm">
                        <ShieldAlert className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Report Issue</span>
                    </TabsTrigger>
                </TabsList>

                {/* My Health Tab */}
                <TabsContent value="my-health" className="space-y-6 animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <Card className="shadow-sm border border-border/50">
                                <CardHeader>
                                    <CardTitle>Recent Visits & Claims</CardTitle>
                                    <CardDescription>Your recent healthcare activity</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {mockClaims.map((claim, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-border/50 bg-card hover:border-[#0d9488]/30 transition-colors">
                                                <div className="flex gap-4 items-center">
                                                    <div className="p-2 bg-muted rounded-full">
                                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-foreground">{claim.service}</div>
                                                        <div className="text-sm text-muted-foreground">{claim.provider} • {claim.date}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-foreground">{claim.copay}</div>
                                                    <Badge variant="outline" className={claim.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border-0' : 'bg-amber-500/10 text-amber-600 border-0'}>
                                                        {claim.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="ghost" className="w-full text-[#0d9488] hover:text-[#0f766e] hover:bg-[#0d9488]/10">
                                        View All Activity
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="shadow-sm border border-border/50 bg-gradient-to-br from-[#0d9488]/10 to-transparent">
                                <CardHeader>
                                    <CardTitle className="text-lg">Health Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Upcoming Appointments</div>
                                        <div className="font-medium">None scheduled</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Active Prescriptions</div>
                                        <div className="font-medium">1 (Vitamin D Supplements)</div>
                                    </div>
                                    <Button className="w-full bg-[#0d9488] hover:bg-[#0f766e]">Find a Doctor</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Education Tab */}
                <TabsContent value="education" className="animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-3 mb-2">
                            <h2 className="text-2xl font-bold">Know Your Rights & Guidelines</h2>
                            <p className="text-muted-foreground text-sm mt-1">We translate complex medical policies into simple language so you can make informed decisions.</p>
                        </div>
                        {educationTopics.map((topic, idx) => (
                            <Card key={idx} className="shadow-sm border border-border/50 hover:shadow-md transition-shadow h-full flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${topic.color}`}>
                                        <topic.icon className="w-6 h-6" />
                                    </div>
                                    <CardTitle className="text-lg leading-tight">{topic.title}</CardTitle>
                                    <CardDescription>{topic.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 text-sm text-foreground/80 leading-relaxed">
                                    {topic.content}
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Button variant="ghost" size="sm" className="w-full justify-start px-0 text-[#0d9488] hover:text-[#0f766e] hover:bg-transparent -ml-2">
                                        <Info className="w-4 h-4 mr-2" /> Learn more
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Chatbot Tab */}
                <TabsContent value="chatbot" className="animate-in fade-in-50 duration-500">
                    <Card className="shadow-sm border border-border/50 flex flex-col h-[600px] max-h-[70vh]">
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-[#0d9488]">
                                <MessageSquare className="w-5 h-5" />
                                Daman AI Assistant
                            </CardTitle>
                            <CardDescription>Ask questions about your coverage or leave feedback.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                            <div className="flex gap-4 max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-muted p-3 rounded-2xl rounded-tl-sm text-sm">
                                    Hello Sarah! I'm your digital assistant. You can ask me about your recent claims, understand your policy benefits, or leave a review of your last hospital visit. How can I assist you today?
                                </div>
                            </div>

                            <div className="flex gap-4 max-w-[80%] self-end flex-row-reverse">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                    <span className="text-white text-xs font-bold">SA</span>
                                </div>
                                <div className="bg-[#0d9488] text-white p-3 rounded-2xl rounded-tr-sm text-sm">
                                    I had a visit yesterday but the doctor ordered a lot of tests that weren't explained to me.
                                </div>
                            </div>

                            <div className="flex gap-4 max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-muted p-3 rounded-2xl rounded-tl-sm text-sm">
                                    I'm sorry to hear that. You have the right to understand every test ordered for you. I've logged this feedback for our quality team. If you feel these tests were unnecessary and you were billed inappropriately, you can report this as an issue using the "Report Issue" tab. Would you like me to guide you there?
                                </div>
                            </div>
                        </CardContent>
                        <div className="p-4 border-t bg-muted/10">
                            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setChatMessage(""); }}>
                                <Input
                                    placeholder="Type your message..."
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    className="rounded-full shadow-inner bg-background"
                                />
                                <Button type="submit" size="icon" className="rounded-full bg-[#0d9488] hover:bg-[#0f766e] shrink-0">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </Card>
                </TabsContent>

                {/* Report Tab */}
                <TabsContent value="report" className="animate-in fade-in-50 duration-500">
                    <Card className="shadow-sm border-2 border-rose-500/20 max-w-2xl mx-auto">
                        <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 pb-8">
                            <CardTitle className="flex items-center gap-2 text-rose-600">
                                <ShieldAlert className="w-6 h-6" />
                                Report Suspicious Activity
                            </CardTitle>
                            <CardDescription className="text-rose-600/80">
                                Help us keep healthcare honest. If you notice a claim you didn't receive services for, or feel you were subjected to unnecessary medical procedures, report it here securely.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="-mt-4">
                            {reportSubmitted ? (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-xl flex flex-col items-center justify-center text-center mt-4">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                                    <h3 className="text-lg font-bold mb-2">Report Submitted Successfully</h3>
                                    <p className="text-sm">Thank you for your vigilance. Our compliance team will securely review your report. A tracking number has been sent to your email.</p>
                                </div>
                            ) : (
                                <form className="space-y-5 pt-4" onSubmit={handleReportSubmit}>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">What is the issue regarding?</label>
                                        <Select defaultValue="unrendered">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select issue type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unrendered">Billed for a service I didn't receive</SelectItem>
                                                <SelectItem value="unnecessary">Unnecessary tests or procedures</SelectItem>
                                                <SelectItem value="overcharged">Overcharged copay or out-of-pocket costs</SelectItem>
                                                <SelectItem value="other">Other compliance issue</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Select the related visit/claim (Optional)</label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Latest: Oct 12, 2023 - Riyadh Care Hospital" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="claim1">Oct 12, 2023 - Riyadh Care Hospital</SelectItem>
                                                <SelectItem value="claim2">Oct 05, 2023 - Al Habib Pharmacy</SelectItem>
                                                <SelectItem value="claim3">Sep 22, 2023 - Specialized Orthopedic Clinic</SelectItem>
                                                <SelectItem value="none">Not related to a specific claim</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Please describe the details</label>
                                        <Textarea
                                            placeholder="e.g. My claim shows I received a Vitamin D injection, but the doctor only talked to me and didn't give me an injection."
                                            className="min-h-[120px]"
                                            required
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                                        <Info className="w-4 h-4 shrink-0" />
                                        <span>Your report is entirely confidential and will be reviewed directly by the Audit & FWA Unit.</span>
                                    </div>

                                    <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-sm">
                                        Submit Secure Report
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
