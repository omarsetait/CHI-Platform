import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Brain,
  Settings,
  Activity,
  Scale,
  Users,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  Upload,
  Library,
  BookOpen,
  FileCheck,
  Stethoscope,
  ClipboardList,
  UserCheck,
  Bell,
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
    url: "/pre-auth/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Claims Queue",
    url: "/pre-auth/claims",
    icon: FileText,
    badge: "12",
  },
  {
    title: "Pending Review",
    url: "/pre-auth/pending",
    icon: Clock,
    badge: "5",
  },
  {
    title: "Analytics",
    url: "/pre-auth/analytics",
    icon: BarChart3,
  },
  {
    title: "Batch Upload",
    url: "/pre-auth/batch-upload",
    icon: Upload,
  },
];

const workflowItems = [
  {
    title: "Ingest (Phase 1)",
    url: "/pre-auth/workflow/ingest",
    icon: FileText,
  },
  {
    title: "Analysis (Phase 2)",
    url: "/pre-auth/workflow/analysis",
    icon: Brain,
  },
  {
    title: "Aggregation (Phase 3)",
    url: "/pre-auth/workflow/aggregation",
    icon: Scale,
  },
  {
    title: "Recommendation (Phase 4)",
    url: "/pre-auth/workflow/recommendation",
    icon: TrendingUp,
  },
  {
    title: "Adjudicator (Phase 5)",
    url: "/pre-auth/workflow/adjudicator",
    icon: Users,
  },
  {
    title: "RLHF (Phase 6)",
    url: "/pre-auth/workflow/rlhf",
    icon: Activity,
  },
];

const knowledgeBaseItems = [
  {
    title: "All Documents",
    url: "/pre-auth/knowledge-base",
    icon: Library,
  },
  {
    title: "Regulatory",
    url: "/pre-auth/knowledge-base/regulatory",
    icon: Shield,
  },
  {
    title: "Policy T&Cs",
    url: "/pre-auth/knowledge-base/policy",
    icon: FileCheck,
  },
  {
    title: "Medical Guidelines",
    url: "/pre-auth/knowledge-base/medical",
    icon: Stethoscope,
  },
  {
    title: "Patient History",
    url: "/pre-auth/knowledge-base/history",
    icon: ClipboardList,
  },
  {
    title: "Declarations",
    url: "/pre-auth/knowledge-base/declarations",
    icon: UserCheck,
  },
];

const configItems = [
  {
    title: "Policy Rules",
    url: "/pre-auth/config/rules",
    icon: Shield,
  },
  {
    title: "Agent Config",
    url: "/pre-auth/config/agents",
    icon: Brain,
  },
  {
    title: "Settings",
    url: "/pre-auth/settings",
    icon: Settings,
  },
];

function PreAuthSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/pre-auth/knowledge-base") {
      return location === url;
    }
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
            data-testid="img-preauth-sidebar-logo"
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
                    data-testid={`nav-preauth-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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
                    data-testid={`nav-preauth-${item.title.toLowerCase().replace(/\s/g, "-").replace(/[()]/g, "")}`}
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
                    data-testid={`nav-preauth-${item.title.toLowerCase().replace(/\s/g, "-").replace(/[&]/g, "")}`}
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
                    data-testid={`nav-preauth-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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
          <p>Pre-Authorization Module</p>
          <p className="mt-1">6-Phase Agentic System</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface PreAuthLayoutProps {
  children: React.ReactNode;
}

export function PreAuthLayout({ children }: PreAuthLayoutProps) {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <PreAuthSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 h-16 px-4 border-b bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-preauth-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">Pre-Authorization</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="button-preauth-notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
