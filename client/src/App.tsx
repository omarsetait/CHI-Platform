import { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { SkipLink } from "@/components/ui/skip-link";
import { initializeClientTelemetry, trackClientEvent } from "@/lib/telemetry";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

import { FWALayout } from "@/components/fwa/fwa-layout";
import { IntelligenceLayout } from "@/pillars/layouts/intelligence-layout";
import { BusinessLayout } from "@/pillars/layouts/business-layout";
import { MembersLayout } from "@/pillars/layouts/members-layout";

import IntelligenceDashboard from "@/pages/intelligence/dashboard";
import IntelligenceProviderScorecardsPage from "@/pages/intelligence/provider-scorecards";
import IntelligenceRejectionDecoderPage from "@/pages/intelligence/rejection-decoder";
import IntelligenceSelfAuditPage from "@/pages/intelligence/self-audit";

import BusinessDashboard from "@/pages/business/dashboard";
import BusinessEmployerProfilingPage from "@/pages/business/employer-profiling";
import BusinessPolicySimulatorPage from "@/pages/business/policy-simulator";
import BusinessDigitalBrokerPage from "@/pages/business/digital-broker";

import MembersDashboard from "@/pages/members/dashboard";
import MembersMyHealthPage from "@/pages/members/my-health";
import MembersEducationPage from "@/pages/members/education";
import MembersHelpFeedbackPage from "@/pages/members/help-feedback";
import MembersReportIssuePage from "@/pages/members/report-issue";

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
import FWAAgentOrchestration from "@/pages/fwa/agent-orchestration";
import FWASettings from "@/pages/fwa/settings";
import FWARLHFDashboard from "@/pages/fwa/rlhf-dashboard";
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
import FWAFlaggedClaims from "@/pages/fwa/flagged-claims";
import CodingIntelligencePage from "@/pages/fwa/coding-intelligence";

function IntelligenceRouter() {
  return (
    <IntelligenceLayout>
      <Switch>
        <Route path="/intelligence">{() => <Redirect to="/intelligence/dashboard" />}</Route>
        <Route path="/intelligence/dashboard">{() => <IntelligenceDashboard />}</Route>
        <Route path="/intelligence/provider-scorecards" component={IntelligenceProviderScorecardsPage} />
        <Route path="/intelligence/rejection-decoder" component={IntelligenceRejectionDecoderPage} />
        <Route path="/intelligence/self-audit" component={IntelligenceSelfAuditPage} />
        <Route component={NotFound} />
      </Switch>
    </IntelligenceLayout>
  );
}

function BusinessRouter() {
  return (
    <BusinessLayout>
      <Switch>
        <Route path="/business">{() => <Redirect to="/business/dashboard" />}</Route>
        <Route path="/business/dashboard">{() => <BusinessDashboard />}</Route>
        <Route path="/business/employer-profiling" component={BusinessEmployerProfilingPage} />
        <Route path="/business/policy-simulator" component={BusinessPolicySimulatorPage} />
        <Route path="/business/digital-broker" component={BusinessDigitalBrokerPage} />
        <Route component={NotFound} />
      </Switch>
    </BusinessLayout>
  );
}

function MembersRouter() {
  return (
    <MembersLayout>
      <Switch>
        <Route path="/members">{() => <Redirect to="/members/dashboard" />}</Route>
        <Route path="/members/dashboard">{() => <MembersDashboard />}</Route>
        <Route path="/members/my-health" component={MembersMyHealthPage} />
        <Route path="/members/education" component={MembersEducationPage} />
        <Route path="/members/help-feedback" component={MembersHelpFeedbackPage} />
        <Route path="/members/report-issue" component={MembersReportIssuePage} />
        <Route component={NotFound} />
      </Switch>
    </MembersLayout>
  );
}

function FWARouter() {
  return (
    <FWALayout>
      <Switch>
        <Route path="/fwa">{() => <Redirect to="/fwa/dashboard" />}</Route>
        <Route path="/fwa/dashboard" component={FWADashboard} />
        <Route path="/fwa/kpi-dashboard" component={FWAKPIDashboard} />
        <Route path="/fwa/case-management" component={FWACaseManagement} />
        <Route path="/fwa/cases" component={FWACaseManagement} />
        <Route path="/fwa/cases/:id" component={FWACaseDetail} />
        <Route path="/fwa/claim/:id" component={FWAClaimView} />
        <Route path="/fwa/flagged-claims" component={FWAFlaggedClaims} />
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
        <Route path="/fwa/coding-intelligence" component={CodingIntelligencePage} />
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

function HomeRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  const [location] = useLocation();

  useEffect(() => {
    trackClientEvent("route.view", { location });
  }, [location]);

  if (location === "/") {
    return <HomeRouter />;
  }

  if (location.startsWith("/fwa")) {
    return <FWARouter />;
  }

  if (location.startsWith("/intelligence")) {
    return <IntelligenceRouter />;
  }

  if (location.startsWith("/business")) {
    return <BusinessRouter />;
  }

  if (location.startsWith("/members")) {
    return <MembersRouter />;
  }

  return <NotFound />;
}

export default function App() {
  useEffect(() => {
    initializeClientTelemetry();
  }, []);

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
