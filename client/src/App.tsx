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
import Dashboard from "@/pages/dashboard";
import Claims from "@/pages/claims";
import ClaimDetail from "@/pages/claim-detail";
import Providers from "@/pages/providers";
import Patients from "@/pages/patients";
import Reconciliation from "@/pages/reconciliation";
import Coding from "@/pages/coding";
import NotFound from "@/pages/not-found";
import { PreAuthLayout } from "@/components/pre-auth/pre-auth-layout";
import PreAuthDashboard from "@/pages/pre-auth/dashboard";
import PreAuthClaims from "@/pages/pre-auth/claims";
import PreAuthClaimDetail from "@/pages/pre-auth/claim-detail";
import PreAuthPending from "@/pages/pre-auth/pending";
import PreAuthNewClaim from "@/pages/pre-auth/new-claim";
import PreAuthAnalytics from "@/pages/pre-auth/analytics";
import PreAuthBatchUpload from "@/pages/pre-auth/batch-upload";
import PreAuthRlhf from "@/pages/pre-auth/rlhf";
import PreAuthSettings from "@/pages/pre-auth/settings";
import PreAuthKnowledgeBase from "@/pages/pre-auth/knowledge-base";
import PreAuthPolicyRules from "@/pages/pre-auth/policy-rules";
import PreAuthAgentConfig from "@/pages/pre-auth/agent-config";
import PreAuthWorkflowPhase from "@/pages/pre-auth/workflow-phase";
import { ClaimsGovernanceLayout } from "@/components/claims-governance/claims-governance-layout";
import ClaimsGovernanceDashboard from "@/pages/claims-governance/dashboard";
import ClaimsGovernanceClaims from "@/pages/claims-governance/claims";
import ClaimsGovernancePending from "@/pages/claims-governance/pending";
import ClaimsGovernanceRuleStudio from "@/pages/claims-governance/rule-studio";
import ClaimsGovernanceQAValidation from "@/pages/claims-governance/qa-validation";
import ClaimsGovernanceWorkflowPhase from "@/pages/claims-governance/workflow-phase";
import ClaimsGovernanceKnowledgeBase from "@/pages/claims-governance/knowledge-base";
import ClaimsGovernanceAgentConfig from "@/pages/claims-governance/agent-config";
import ClaimsGovernancePolicyRules from "@/pages/claims-governance/policy-rules";
import ClaimsGovernanceSettings from "@/pages/claims-governance/settings";
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
import { ProviderRelationsLayout } from "@/components/provider-relations/provider-relations-layout";
import ProviderRelationsDashboard from "@/pages/provider-relations/dashboard";
import ProviderRelationsProviders from "@/pages/provider-relations/providers";
import ProviderRelationsReconciliation from "@/pages/provider-relations/reconciliation";
import ProviderRelationsContracts from "@/pages/provider-relations/contracts";
import ProviderRelationsCommunications from "@/pages/provider-relations/communications";
import ProviderRelationsBenchmarking from "@/pages/provider-relations/benchmarking";
import ProviderRelationsCPM from "@/pages/provider-relations/cpm";
import ProviderRelationsSettlement from "@/pages/provider-relations/settlement";
import ProviderRelationsSettings from "@/pages/provider-relations/settings";
import ProviderRelationsDreamReport from "@/pages/provider-relations/dream-report";
import ProviderRelationsEvidencePacks from "@/pages/provider-relations/evidence-packs";
import ProviderRelationsSessions from "@/pages/provider-relations/sessions";
import ProviderRelationsDataImport from "@/pages/provider-relations/data-import";
import ProviderRelationsKpiBuilder from "@/pages/provider-relations/kpi-builder";
import ProviderRelationsKpiDashboard from "@/pages/provider-relations/kpi-dashboard";
import ClaimsUploadDemo from "@/pages/demo/claims-upload";
import Patient360Page from "@/pages/context/patient-360";
import Provider360Page from "@/pages/context/provider-360";
import Doctor360Page from "@/pages/context/doctor-360";
import ViewAllClaimsPage from "@/pages/findings/view-all-claims";
import FWAClaimView from "@/pages/fwa/claim-view";

function MainAppRouter() {
  return (
    <Switch>
      <Route path="/audit-fwa" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/claims" component={Claims} />
      <Route path="/claims/:id" component={ClaimDetail} />
      <Route path="/providers" component={Providers} />
      <Route path="/patients" component={Patients} />
      <Route path="/reconciliation/:hospitalId" component={Reconciliation} />
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
                <span>Audit & FWA Unit</span>
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

function PreAuthRouter() {
  return (
    <PreAuthLayout>
      <Switch>
        <Route path="/pre-auth" component={PreAuthDashboard} />
        <Route path="/pre-auth/dashboard" component={PreAuthDashboard} />
        <Route path="/pre-auth/claims" component={PreAuthClaims} />
        <Route path="/pre-auth/claims/new" component={PreAuthNewClaim} />
        <Route path="/pre-auth/claims/:id" component={PreAuthClaimDetail} />
        <Route path="/pre-auth/pending" component={PreAuthPending} />
        <Route path="/pre-auth/analytics" component={PreAuthAnalytics} />
        <Route path="/pre-auth/batch-upload" component={PreAuthBatchUpload} />
        <Route path="/pre-auth/rlhf" component={PreAuthRlhf} />
        <Route path="/pre-auth/settings" component={PreAuthSettings} />
        <Route path="/pre-auth/knowledge-base" component={PreAuthKnowledgeBase} />
        <Route path="/pre-auth/knowledge-base/:type" component={PreAuthKnowledgeBase} />
        <Route path="/pre-auth/config/rules" component={PreAuthPolicyRules} />
        <Route path="/pre-auth/config/agents" component={PreAuthAgentConfig} />
        <Route path="/pre-auth/workflow/:phase" component={PreAuthWorkflowPhase} />
        <Route component={NotFound} />
      </Switch>
    </PreAuthLayout>
  );
}

function ClaimsGovernanceRouter() {
  return (
    <ClaimsGovernanceLayout>
      <Switch>
        <Route path="/claims-governance" component={ClaimsGovernanceDashboard} />
        <Route path="/claims-governance/dashboard" component={ClaimsGovernanceDashboard} />
        <Route path="/claims-governance/claims" component={ClaimsGovernanceClaims} />
        <Route path="/claims-governance/pending" component={ClaimsGovernancePending} />
        <Route path="/claims-governance/workflow/:phase" component={ClaimsGovernanceWorkflowPhase} />
        <Route path="/claims-governance/knowledge-base/:type" component={ClaimsGovernanceKnowledgeBase} />
        <Route path="/claims-governance/rule-studio" component={ClaimsGovernanceRuleStudio} />
        <Route path="/claims-governance/qa-validation" component={ClaimsGovernanceQAValidation} />
        <Route path="/claims-governance/config/agents" component={ClaimsGovernanceAgentConfig} />
        <Route path="/claims-governance/config/rules" component={ClaimsGovernancePolicyRules} />
        <Route path="/claims-governance/settings" component={ClaimsGovernanceSettings} />
        <Route component={NotFound} />
      </Switch>
    </ClaimsGovernanceLayout>
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

function ProviderRelationsRouter() {
  return (
    <ProviderRelationsLayout>
      <Switch>
        <Route path="/provider-relations" component={ProviderRelationsDashboard} />
        <Route path="/provider-relations/dashboard" component={ProviderRelationsDashboard} />
        <Route path="/provider-relations/providers" component={ProviderRelationsProviders} />
        <Route path="/provider-relations/reconciliation" component={ProviderRelationsReconciliation} />
        <Route path="/provider-relations/evidence-packs" component={ProviderRelationsEvidencePacks} />
        <Route path="/provider-relations/sessions" component={ProviderRelationsSessions} />
        <Route path="/provider-relations/contracts" component={ProviderRelationsContracts} />
        <Route path="/provider-relations/communications" component={ProviderRelationsCommunications} />
        <Route path="/provider-relations/benchmarking" component={ProviderRelationsBenchmarking} />
        <Route path="/provider-relations/cpm" component={ProviderRelationsCPM} />
        <Route path="/provider-relations/settlement" component={ProviderRelationsSettlement} />
        <Route path="/provider-relations/settings" component={ProviderRelationsSettings} />
        <Route path="/provider-relations/dream-report" component={ProviderRelationsDreamReport} />
        <Route path="/provider-relations/dream-report/:providerId" component={ProviderRelationsDreamReport} />
        <Route path="/provider-relations/data-import" component={ProviderRelationsDataImport} />
        <Route path="/provider-relations/kpi-builder" component={ProviderRelationsKpiBuilder} />
        <Route path="/provider-relations/kpi-dashboard" component={ProviderRelationsKpiDashboard} />
        <Route component={NotFound} />
      </Switch>
    </ProviderRelationsLayout>
  );
}

function AppRouter() {
  const [location] = useLocation();
  
  const isPreAuthPage = location.startsWith("/pre-auth");
  const isClaimsGovernancePage = location.startsWith("/claims-governance");
  const isFWAPage = location.startsWith("/fwa");
  const isProviderRelationsPage = location.startsWith("/provider-relations");
  const isContextPage = location.startsWith("/context");
  const isFindingsPage = location.startsWith("/findings");
  
  const isDemoPage = location.startsWith("/demo");
  const isStandalonePage = 
    location === "/" || 
    location === "/coding" ||
    location === "/analytics";

  if (isDemoPage) {
    return (
      <Switch>
        <Route path="/demo/claims-upload" component={ClaimsUploadDemo} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (isPreAuthPage) {
    return <PreAuthRouter />;
  }

  if (isClaimsGovernancePage) {
    return <ClaimsGovernanceRouter />;
  }

  if (isFWAPage) {
    return <FWARouter />;
  }

  if (isProviderRelationsPage) {
    return <ProviderRelationsRouter />;
  }

  if (isContextPage) {
    return (
      <Switch>
        <Route path="/context/patient-360/:patientId" component={Patient360Page} />
        <Route path="/context/provider-360/:providerId" component={Provider360Page} />
        <Route path="/context/doctor-360/:doctorId" component={Doctor360Page} />
        <Route path="/context/doctor-360">{() => <Redirect to="/fwa/high-risk-entities?tab=doctors" />}</Route>
        <Route path="/context/patient-360">{() => <Redirect to="/fwa/high-risk-entities?tab=patients" />}</Route>
        <Route path="/context/provider-360">{() => <Redirect to="/fwa/high-risk-entities?tab=providers" />}</Route>
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (isFindingsPage) {
    return (
      <Switch>
        <Route path="/findings/:findingId/claims" component={ViewAllClaimsPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (isStandalonePage) {
    return (
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/coding" component={Coding} />
        <Route component={NotFound} />
      </Switch>
    );
  }

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
