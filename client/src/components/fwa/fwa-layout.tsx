import { Link, useLocation } from "wouter";
import {
  Brain,
  Settings,
  Shield,
  AlertTriangle,
  ClipboardList,
  FileWarning,
  BarChart3,
  BookOpen,
  Rss,
  Gavel,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Target,
  Search,
  Cog,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import tachyHealthLogo from "@assets/logo.svg";

// Stage 1: Monitor & Triage - Live overview and system health
const monitorItems = [
  {
    title: "Operations Center",
    url: "/fwa/dashboard",
    icon: LayoutDashboard,
    description: "Live overview of FWA alerts, workload, and system health",
  },
  {
    title: "Analytics & Reports",
    url: "/fwa/kpi-dashboard",
    icon: BarChart3,
    description: "Trend analysis, impact metrics, and regulator-ready reporting",
  },
];

// Stage 2: Ingestion and Detection - Import claims and analyze for FWA patterns
const detectionItems = [
  {
    title: "Detection Engine",
    url: "/fwa/detection-engine",
    icon: Brain,
    badge: "5 Methods",
    description: "Run multi-method FWA screening on claims and batches",
  },
  {
    title: "Regulatory Oversight",
    url: "/fwa/regulatory-oversight",
    icon: Shield,
    badge: "5 Phases",
    description: "CHI 5-phase regulatory analysis with behavioral patterns",
  },
];

// Stage 3: Investigation - Deep dive into flagged cases
const investigationItems = [
  {
    title: "Case Management",
    url: "/fwa/case-management",
    icon: ClipboardList,
    badge: "20",
    description: "Investigate flagged claims, assign cases, and document outcomes",
  },
  {
    title: "High-Risk Entities",
    url: "/fwa/high-risk-entities",
    icon: AlertTriangle,
    description: "Monitor providers, members, and clinicians with elevated risk",
  },
];

// Stage 4: Action & Compliance - Regulatory enforcement
const actionItems = [
  {
    title: "Enforcement Cases",
    url: "/fwa/enforcement",
    icon: Gavel,
    badge: "3",
    description: "Track enforcement actions, penalties, and compliance escalation",
  },
  {
    title: "Audit Sessions",
    url: "/fwa/audit-sessions",
    icon: ClipboardCheck,
    description: "Plan, execute, and document compliance audits",
  },
  {
    title: "Regulatory Communications",
    url: "/fwa/regulatory-circulars",
    icon: FileText,
    description: "Central library of CHI communications and compliance updates",
  },
];

// Stage 5: Intelligence & Reference - External signals and knowledge resources
const intelligenceItems = [
  {
    title: "Online Listening",
    url: "/fwa/online-listening",
    icon: Rss,
    badge: "Beta",
    description: "Monitor social media and external reputation signals",
  },
  {
    title: "Knowledge Hub",
    url: "/fwa/knowledge-base",
    icon: BookOpen,
    description: "Clinical and policy reference for investigation decisions",
  },
];

// System Configuration - Platform settings and engine controls
const adminItems = [
  {
    title: "Engine Configuration",
    url: "/fwa/engine-config",
    icon: Cog,
    badge: "5 Methods",
    description: "Adjust method weights, thresholds, and detection settings",
  },
  {
    title: "Unsupervised Lab",
    url: "/fwa/ml-analysis",
    icon: Sparkles,
    badge: "ML Studio",
    description: "Train and review ML models, features, and learned patterns",
  },
  {
    title: "Rule Management Studio",
    url: "/fwa/rule-studio",
    icon: FileWarning,
    badge: "102 Rules",
    description: "Create, test, and manage FWA detection rules",
  },
  {
    title: "Agent Orchestration",
    url: "/fwa/agent-config",
    icon: Brain,
    description: "Configure AI agents and automation workflows",
  },
  {
    title: "Settings",
    url: "/fwa/settings",
    icon: Settings,
    description: "Module preferences, alerts, and operational defaults",
  },
];

function FWASidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    return location === url || location.startsWith(url + "/");
  };

  return (
    <Sidebar className="border-r border-purple-200 dark:border-purple-900">
      <SidebarHeader className="p-4 border-b border-purple-200 dark:border-purple-900">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={tachyHealthLogo}
            alt="TachyHealth"
            className="h-8"
            data-testid="img-fwa-sidebar-logo"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Stage 1: Monitor & Triage */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-600 dark:text-purple-400">1. Monitor & Triage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitorItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-fwa-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Stage 2: Ingestion and Detection */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-600 dark:text-purple-400">2. Ingestion and Detection</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {detectionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-fwa-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Stage 3: Investigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-600 dark:text-purple-400">3. Investigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {investigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-fwa-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Stage 4: Action & Compliance */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-600 dark:text-purple-400">4. Action & Compliance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {actionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-fwa-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Stage 5: Intelligence & Reference */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-600 dark:text-purple-400">5. Intelligence & Reference</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-fwa-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-600 dark:text-purple-400">System Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-fwa-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-purple-200 dark:border-purple-900">
        <div className="text-xs text-muted-foreground">
          <p>Audit & FWA Unit</p>
          <p className="mt-1">5-Stage Workflow Pipeline</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface FWALayoutProps {
  children: React.ReactNode;
}

export function FWALayout({ children }: FWALayoutProps) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <FWASidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 h-16 px-4 border-b bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-fwa-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-sm text-purple-700 dark:text-purple-300">Audit & FWA Unit</span>
              </div>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
