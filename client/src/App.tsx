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
import AccreditationScorecardsPage from "@/pages/intelligence/accreditation-scorecards";
import SbsCompliancePage from "@/pages/intelligence/sbs-compliance";
import DrgReadinessPage from "@/pages/intelligence/drg-readiness";
import RejectionPatternsPage from "@/pages/intelligence/rejection-patterns";
import DocumentationQualityPage from "@/pages/intelligence/documentation-quality";
import ProviderProfilePage from "@/pages/intelligence/provider-profile";
import ProviderRejectionsPage from "@/pages/intelligence/provider-rejections";
import ProviderDrgPage from "@/pages/intelligence/provider-drg";

import BusinessDashboard from "@/pages/business/dashboard";
import BusinessEmployerCompliancePage from "@/pages/business/employer-compliance";
import BusinessInsurerHealthPage from "@/pages/business/insurer-health";
import BusinessMarketConcentrationPage from "@/pages/business/market-concentration";
import BusinessCoverageExpansionPage from "@/pages/business/coverage-expansion";
import BusinessCostContainmentPage from "@/pages/business/cost-containment";
import EmployerProfilePage from "@/pages/business/employer-profile";
import EmployerHealthPage from "@/pages/business/employer-health";
import EmployerCostsPage from "@/pages/business/employer-costs";

import MembersDashboard from "@/pages/members/dashboard";
import MembersComplaintsPage from "@/pages/members/complaints";
import MembersCoverageGapsPage from "@/pages/members/coverage-gaps";
import MembersProviderQualityPage from "@/pages/members/provider-quality";
import MembersReportFraudPage from "@/pages/members/report-fraud";
import MembersBenefitsAwarenessPage from "@/pages/members/benefits-awareness";
import MyCoveragePage from "@/pages/members/my-coverage";
import FindProviderPage from "@/pages/members/find-provider";
import MyComplaintsPage from "@/pages/members/my-complaints";

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
import KnowledgeHub from "@/pages/fwa/knowledge-hub";

function IntelligenceRouter() {
  return (
    <IntelligenceLayout>
      <Switch>
        <Route path="/intelligence">{() => <Redirect to="/intelligence/dashboard" />}</Route>
        <Route path="/intelligence/dashboard">{() => <IntelligenceDashboard />}</Route>
        <Route path="/intelligence/accreditation-scorecards" component={AccreditationScorecardsPage} />
        <Route path="/intelligence/sbs-compliance" component={SbsCompliancePage} />
        <Route path="/intelligence/drg-readiness" component={DrgReadinessPage} />
        <Route path="/intelligence/rejection-patterns" component={RejectionPatternsPage} />
        <Route path="/intelligence/documentation-quality" component={DocumentationQualityPage} />
        <Route path="/intelligence/my-hospital" component={ProviderProfilePage} />
        <Route path="/intelligence/my-hospital/rejections" component={ProviderRejectionsPage} />
        <Route path="/intelligence/my-hospital/drg" component={ProviderDrgPage} />
        <Route path="/intelligence/provider/:code" component={ProviderProfilePage} />
        <Route path="/intelligence/provider/:code/rejections" component={ProviderRejectionsPage} />
        <Route path="/intelligence/provider/:code/drg" component={ProviderDrgPage} />
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
        <Route path="/business/employer-compliance" component={BusinessEmployerCompliancePage} />
        <Route path="/business/insurer-health" component={BusinessInsurerHealthPage} />
        <Route path="/business/market-concentration" component={BusinessMarketConcentrationPage} />
        <Route path="/business/coverage-expansion" component={BusinessCoverageExpansionPage} />
        <Route path="/business/cost-containment" component={BusinessCostContainmentPage} />
        <Route path="/business/my-company" component={EmployerProfilePage} />
        <Route path="/business/my-company/health" component={EmployerHealthPage} />
        <Route path="/business/my-company/costs" component={EmployerCostsPage} />
        <Route path="/business/employer/:code" component={EmployerProfilePage} />
        <Route path="/business/employer/:code/health" component={EmployerHealthPage} />
        <Route path="/business/employer/:code/costs" component={EmployerCostsPage} />
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
        <Route path="/members/complaints" component={MembersComplaintsPage} />
        <Route path="/members/coverage-gaps" component={MembersCoverageGapsPage} />
        <Route path="/members/provider-quality" component={MembersProviderQualityPage} />
        <Route path="/members/report-fraud" component={MembersReportFraudPage} />
        <Route path="/members/benefits-awareness" component={MembersBenefitsAwarenessPage} />
        <Route path="/members/my-health" component={MyCoveragePage} />
        <Route path="/members/my-health/providers" component={FindProviderPage} />
        <Route path="/members/my-health/complaints" component={MyComplaintsPage} />
        <Route path="/members/member/:code" component={MyCoveragePage} />
        <Route path="/members/member/:code/providers" component={FindProviderPage} />
        <Route path="/members/member/:code/complaints" component={MyComplaintsPage} />
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
        <Route path="/fwa/knowledge-hub" component={KnowledgeHub} />
        <Route path="/fwa/chat">{() => <Redirect to="/fwa/dashboard" />}</Route>
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
