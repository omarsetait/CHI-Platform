import React from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { SkipLink } from "@/components/ui/skip-link";
import Home from "@/pages/home";

import IntelligenceDashboard from "@/pages/intelligence/dashboard";
import BusinessDashboard from "@/pages/business/dashboard";
import MembersDashboard from "@/pages/members/dashboard";

import NotFound from "@/pages/not-found";
import { FWALayout } from "@/components/fwa/fwa-layout";
import FWADashboard from "@/pages/fwa/dashboard";
import FWAKPIDashboard from "@/pages/fwa/kpi-dashboard";
import FWACaseManagement from "@/pages/fwa/case-management";
import FWACaseDetail from "@/pages/fwa/case-detail";
import FWAPhaseA1 from "@/pages/fwa/phase-a1";
import FWAPhaseA2 from "@/pages/fwa/phase-a2";
import FWAPhaseA3 from "@/pages/fwa/phase-a3";
import FWARegulatoryKB from "@/pages/fwa/regulatory-kb";
import FWAMedicalKB from "@/pages/fwa/medical-kb";
import FWAHistoryAgents from "@/pages/fwa/history-agents";
import FWAAgentConfig from "@/pages/fwa/agent-config";
import FWAAgentOrchestration from "@/pages/fwa/agent-orchestration";
import FWASettings from "@/pages/fwa/settings";
import FWARLHFDashboard from "@/pages/fwa/rlhf-dashboard";
import FWAProviders from "@/pages/fwa/providers";
import FWAPatients from "@/pages/fwa/patients";
import FWADoctors from "@/pages/fwa/doctors";
import FWAHighRiskEntities from "@/pages/fwa/high-risk-entities";
import FWABehaviors from "@/pages/fwa/fwa-behaviors";
import FWAAgentWorkflow from "@/pages/fwa/agent-workflow";
import FWAKnowledgeBase from "@/pages/fwa/knowledge-base";
import FWAOnlineListening from "@/pages/fwa/online-listening";
import FWAEnforcement from "@/pages/fwa/enforcement";
import FWAReconciliationFindings from "@/pages/fwa/reconciliation-findings";
import FWAAuditSessions from "@/pages/fwa/audit-sessions";
import FWARegulatoryCirculars from "@/pages/fwa/regulatory-circulars";
import FWADetectionEngine from "@/pages/fwa/detection-engine";
import FWARegulatoryOversight from "@/pages/fwa/regulatory-oversight";
import FWAEngineConfig from "@/pages/fwa/engine-config";
import FWAClaimsImport from "@/pages/fwa/claims-import";
import FWARuleStudio from "@/pages/fwa/rule-studio";
import FWAProviderProfile from "@/pages/fwa/provider-profile";
import FWAMLAnalysis from "@/pages/fwa/ml-analysis";
import GraphAnalysisPage from "@/pages/graph-analysis/graph-analysis";
import SimulationLabPage from "@/pages/simulation/simulation-lab";

import FWAClaimView from "@/pages/fwa/claim-view";

function MainAppRouter() {
  return (
    <Switch>
      <Route path="/intelligence" component={IntelligenceDashboard} />
      <Route path="/business" component={BusinessDashboard} />
      <Route path="/members" component={MembersDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainAppLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full print:block">
        <div className="print:hidden">
          <AppSidebar />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-16 px-4 border-b bg-card print:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>Daman Intelligence Engine</span>
              </div>
            </div>
          </header>
          <main id="main-content" className="flex-1 overflow-auto p-6 print:p-0 print:overflow-visible" role="main">
            <div className="max-w-7xl mx-auto print:max-w-none">
              <MainAppRouter />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function FWARouter() {
  return (
    <FWALayout>
      <Switch>
        <Route path="/fwa" component={FWADashboard} />
        <Route path="/fwa/dashboard" component={FWADashboard} />
        <Route path="/fwa/kpi-dashboard" component={FWAKPIDashboard} />
        <Route path="/fwa/case-management" component={FWACaseManagement} />
        <Route path="/fwa/cases" component={FWACaseManagement} />
        <Route path="/fwa/cases/:id" component={FWACaseDetail} />
        <Route path="/fwa/claim/:id" component={FWAClaimView} />
        <Route path="/fwa/batch-upload">{() => <Redirect to="/fwa/detection-engine" />}</Route>
        <Route path="/fwa/claims-import" component={FWAClaimsImport} />
        <Route path="/fwa/high-risk-entities" component={FWAHighRiskEntities} />
        <Route path="/fwa/providers">{() => <Redirect to="/fwa/high-risk-entities" />}</Route>
        <Route path="/fwa/patients">{() => <Redirect to="/fwa/high-risk-entities" />}</Route>
        <Route path="/fwa/doctors">{() => <Redirect to="/fwa/high-risk-entities" />}</Route>
        <Route path="/fwa/phase-a1" component={FWAPhaseA1} />
        <Route path="/fwa/phase-a2" component={FWAPhaseA2} />
        <Route path="/fwa/phase-a3" component={FWAPhaseA3} />
        <Route path="/fwa/behaviors" component={FWABehaviors} />
        <Route path="/fwa/regulatory-kb" component={FWARegulatoryKB} />
        <Route path="/fwa/medical-kb" component={FWAMedicalKB} />
        <Route path="/fwa/knowledge-base" component={FWAKnowledgeBase} />
        <Route path="/fwa/online-listening" component={FWAOnlineListening} />
        <Route path="/fwa/enforcement" component={FWAEnforcement} />
        <Route path="/fwa/history-agents" component={FWAHistoryAgents} />
        <Route path="/fwa/agent-config" component={FWAAgentOrchestration} />
        <Route path="/fwa/agent-workflow" component={FWAAgentWorkflow} />
        <Route path="/fwa/reconciliation-findings" component={FWAReconciliationFindings} />
        <Route path="/fwa/audit-sessions" component={FWAAuditSessions} />
        <Route path="/fwa/regulatory-circulars" component={FWARegulatoryCirculars} />
        <Route path="/fwa/detection-engine" component={FWADetectionEngine} />
        <Route path="/fwa/regulatory-oversight" component={FWARegulatoryOversight} />
        <Route path="/fwa/ml-analysis" component={FWAMLAnalysis} />
        <Route path="/fwa/engine-config" component={FWAEngineConfig} />
        <Route path="/fwa/rule-studio" component={FWARuleStudio} />
        <Route path="/fwa/provider/:providerId" component={FWAProviderProfile} />
        <Route path="/fwa/graph-analysis" component={GraphAnalysisPage} />
        <Route path="/fwa/simulation-lab" component={SimulationLabPage} />
        <Route path="/fwa/rlhf-dashboard" component={FWARLHFDashboard} />
        <Route path="/fwa/settings" component={FWASettings} />
        <Route component={NotFound} />
      </Switch>
    </FWALayout>
  );
}

function AppRouter() {
  const [location] = useLocation();

  const isFWAPage = location.startsWith("/fwa");
  const isStandalonePage = location === "/";

  if (isStandalonePage) {
    return (
      <Switch>
        <Route path="/" component={Home} />

        <Route component={NotFound} />
      </Switch>
    );
  }

  if (isFWAPage) {
    return <FWARouter />;
  }

  // Covers /intelligence, /business, /members
  return <MainAppLayout />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SkipLink />
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
