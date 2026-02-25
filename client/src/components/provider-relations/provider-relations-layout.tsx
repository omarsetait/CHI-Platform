import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Building2,
  BarChart3,
  DollarSign,
  MessageSquare,
  FileCheck,
  TrendingUp,
  Package,
  CalendarDays,
  Sparkles,
  Upload,
  Calculator,
  Target,
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
import tachyHealthLogo from "@assets/logo.svg";

const overviewItems = [
  {
    title: "Dashboard",
    url: "/provider-relations/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Provider Directory",
    url: "/provider-relations/providers",
    icon: Building2,
  },
];

const intelligenceItems = [
  {
    title: "Dream Reports",
    url: "/provider-relations/dream-report",
    icon: Sparkles,
  },
];

const operationsItems = [
  {
    title: "Data Import",
    url: "/provider-relations/data-import",
    icon: Upload,
  },
  {
    title: "Reconciliation Reports",
    url: "/provider-relations/reconciliation",
    icon: FileCheck,
  },
  {
    title: "Sessions",
    url: "/provider-relations/sessions",
    icon: CalendarDays,
  },
  {
    title: "Evidence Packs",
    url: "/provider-relations/evidence-packs",
    icon: Package,
  },
  {
    title: "Contract Management",
    url: "/provider-relations/contracts",
    icon: FileText,
  },
  {
    title: "Communication Log",
    url: "/provider-relations/communications",
    icon: MessageSquare,
  },
];

const analyticsItems = [
  {
    title: "KPI Dashboard",
    url: "/provider-relations/kpi-dashboard",
    icon: Target,
  },
  {
    title: "Provider Benchmarking",
    url: "/provider-relations/benchmarking",
    icon: BarChart3,
  },
  {
    title: "CPM Analytics",
    url: "/provider-relations/cpm",
    icon: TrendingUp,
  },
  {
    title: "Settlement Reports",
    url: "/provider-relations/settlement",
    icon: DollarSign,
  },
];

const configItems = [
  {
    title: "KPI Builder",
    url: "/provider-relations/kpi-builder",
    icon: Calculator,
  },
  {
    title: "Settings",
    url: "/provider-relations/settings",
    icon: Settings,
  },
];

function ProviderRelationsSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    return location === url || location.startsWith(url + "/");
  };

  return (
    <Sidebar className="border-r border-indigo-200 dark:border-indigo-900">
      <SidebarHeader className="p-4 border-b border-indigo-200 dark:border-indigo-900">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={tachyHealthLogo}
            alt="TachyHealth"
            className="h-8"
            data-testid="img-provider-relations-sidebar-logo"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-indigo-600 dark:text-indigo-400">Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-provider-relations-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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
          <SidebarGroupLabel className="text-indigo-600 dark:text-indigo-400">Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-provider-relations-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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
          <SidebarGroupLabel className="text-indigo-600 dark:text-indigo-400">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-provider-relations-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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
          <SidebarGroupLabel className="text-indigo-600 dark:text-indigo-400">Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-provider-relations-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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
          <SidebarGroupLabel className="text-indigo-600 dark:text-indigo-400">Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-provider-relations-${item.title.toLowerCase().replace(/\s/g, "-")}`}
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

      <SidebarFooter className="p-4 border-t border-indigo-200 dark:border-indigo-900">
        <div className="text-xs text-muted-foreground">
          <p>Provider Relations Unit</p>
          <p className="mt-1">Contracts & Settlements</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface ProviderRelationsLayoutProps {
  children: React.ReactNode;
}

export function ProviderRelationsLayout({ children }: ProviderRelationsLayoutProps) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <ProviderRelationsSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 h-16 px-4 border-b bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-provider-relations-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">Provider Relations</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
