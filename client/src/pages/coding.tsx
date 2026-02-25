import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Code,
  FileText,
  Handshake,
  Construction
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";

export default function Coding() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("service-mapping");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <img 
              src={tachyHealthLogo} 
              alt="TachyHealth" 
              className="h-8 cursor-pointer"
              onClick={() => setLocation("/")}
              data-testid="img-header-logo"
            />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-[#0d9488]" />
              <h1 className="font-semibold">Coding</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="service-mapping" className="gap-2" data-testid="tab-service-mapping">
              <FileText className="h-4 w-4" />
              Service Mapping
            </TabsTrigger>
            <TabsTrigger value="provider-negotiations" className="gap-2" data-testid="tab-provider-negotiations">
              <Handshake className="h-4 w-4" />
              Provider Negotiations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="service-mapping" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Service Mapping</h2>
              <p className="text-muted-foreground">
                Map service codes, validate coding accuracy, and manage code relationships
              </p>
            </div>

            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Construction className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Service Mapping module is under development. This module will provide tools for 
                  ICD/CPT code mapping, service code validation, and bundling rules management.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="provider-negotiations" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Provider Negotiations</h2>
              <p className="text-muted-foreground">
                Manage provider contracts, fee schedules, and negotiation workflows
              </p>
            </div>

            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Construction className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Provider Negotiations module is under development. This module will provide tools for 
                  contract management, fee schedule analysis, and negotiation tracking.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
