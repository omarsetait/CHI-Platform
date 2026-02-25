import { Link, useLocation } from "wouter";
import {
  BookOpen,
  ClipboardCheck,
  FileCheck,
  LayoutDashboard,
  FileText,
  Clock,
  Brain,
  Scale,
  TrendingUp,
  Users,
  Activity,
  Shield,
  Stethoscope,
  Library,
  Settings,
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
import { Button } from "@/components/ui/button";
import tachyHealthLogo from "@assets/logo.svg";

const overviewItems = [
  {
    title: "Dashboard",
    url: "/claims-governance/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Claims Queue",
    url: "/claims-governance/claims",
    icon: FileText,
    badge: "12",
  },
  {
    title: "Pending Review",
    url: "/claims-governance/pending",
    icon: Clock,
    badge: "5",
  },
];

const workflowItems = [
  {
    title: "Phase 1: Ingest",
    url: "/claims-governance/workflow/1",
    icon: FileText,
  },
  {
    title: "Phase 2: Analysis",
    url: "/claims-governance/workflow/2",
    icon: Brain,
  },
  {
    title: "Phase 3: Aggregation",
    url: "/claims-governance/workflow/3",
    icon: Scale,
  },
  {
    title: "Phase 4: Recommendation",
    url: "/claims-governance/workflow/4",
    icon: TrendingUp,
  },
  {
    title: "Phase 5: Adjudicator",
    url: "/claims-governance/workflow/5",
    icon: Users,
  },
  {
    title: "Phase 6: RLHF",
    url: "/claims-governance/workflow/6",
    icon: Activity,
  },
];

const knowledgeBaseItems = [
  {
    title: "Regulatory Guidelines",
    url: "/claims-governance/knowledge-base/regulatory",
    icon: Shield,
  },
  {
    title: "Medical Guidelines",
    url: "/claims-governance/knowledge-base/medical",
    icon: Stethoscope,
  },
  {
    title: "Policy Documents",
    url: "/claims-governance/knowledge-base/policy",
    icon: Library,
  },
];

const rulesValidationItems = [
  {
    title: "Rule Management Studio",
    url: "/claims-governance/rule-studio",
    icon: BookOpen,
  },
  {
    title: "QA Validation",
    url: "/claims-governance/qa-validation",
    icon: ClipboardCheck,
  },
];

const configItems = [
  {
    title: "Agent Config",
    url: "/claims-governance/config/agents",
    icon: Brain,
  },
  {
    title: "Policy Rules",
    url: "/claims-governance/config/rules",
    icon: Shield,
  },
  {
    title: "Settings",
    url: "/claims-governance/settings",
    icon: Settings,
  },
];

function ClaimsGovernanceSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    return location === url || location.startsWith(url + "/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={tachyHealthLogo}
            alt="TachyHealth"
            className="h-8"
            data-testid="img-claims-governance-sidebar-logo"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-claims-governance-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
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

        <SidebarGroup>
          <SidebarGroupLabel>Workflow Phases</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflowItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-claims-governance-${item.title.toLowerCase().replace(/\s/g, "-").replace(/[():]/g, "")}`}
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

        <SidebarGroup>
          <SidebarGroupLabel>Knowledge Base</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {knowledgeBaseItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-claims-governance-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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

        <SidebarGroup>
          <SidebarGroupLabel>Rules & Validation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rulesValidationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-claims-governance-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-claims-governance-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
          <p>Claims Management</p>
          <p className="mt-1">6-Phase Agentic Workflow</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface ClaimsGovernanceLayoutProps {
  children: React.ReactNode;
}

export function ClaimsGovernanceLayout({ children }: ClaimsGovernanceLayoutProps) {
  const [, setLocation] = useLocation();
  
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <ClaimsGovernanceSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 h-16 px-4 border-b bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-claims-governance-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">Claims Management</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="gap-2"
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
