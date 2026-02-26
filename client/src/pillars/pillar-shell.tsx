import React from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { pillarConfigs } from "@/pillars/config";
import { PillarSwitcher } from "@/pillars/pillar-switcher";
import type { PillarConfig } from "@/pillars/types";
import { trackClientEvent } from "@/lib/telemetry";
import tachyHealthLogo from "@assets/logo.svg";

interface PillarLayoutProps {
  config: PillarConfig;
  children: React.ReactNode;
}

export function PillarLayout({ config, children }: PillarLayoutProps) {
  const [location] = useLocation();
  const Icon = config.icon;

  const style = {
    "--sidebar-width": config.sidebarWidth || "17rem",
    "--sidebar-width-icon": config.sidebarIconWidth || "3.5rem",
  };

  const isActive = (url: string) => location === url || location.startsWith(url + "/");

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar className={cn("border-r bg-sidebar/80 backdrop-blur-md", config.theme.borderClass)}>
          <SidebarHeader className={cn("p-4 border-b", config.theme.borderClass)}>
            <Link href="/" className="flex items-center gap-3">
              <img src={tachyHealthLogo} alt="TachyHealth" className="h-8" data-testid={`img-${config.id}-sidebar-logo`} />
            </Link>
          </SidebarHeader>

          <SidebarContent>
            {config.navSections.map((section) => (
              <SidebarGroup key={section.title}>
                <SidebarGroupLabel className={config.theme.sectionLabelClass}>{section.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href)}
                          data-testid={`nav-${config.id}-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Link
                            href={item.href}
                            onClick={() => {
                              trackClientEvent("pillar.navigation", {
                                pillar: config.id,
                                href: item.href,
                              });
                            }}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                            {item.badge ? <Badge className={cn("ml-auto text-xs", config.theme.badgeClass)}>{item.badge}</Badge> : null}
                            {item.status === "coming_soon" ? (
                              <Badge variant="secondary" className="ml-auto text-[10px]">
                                Soon
                              </Badge>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className={cn("p-4 border-t text-xs text-muted-foreground", config.theme.borderClass)}>
            <p>{config.footer.title}</p>
            <p className="mt-1">{config.footer.subtitle}</p>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className={cn("flex items-center justify-between gap-4 h-16 px-4 border-b bg-card/80 backdrop-blur-md", config.theme.borderClass)}>
            <div className="flex items-center gap-4 min-w-0">
              <SidebarTrigger data-testid={`button-${config.id}-sidebar-toggle`} />
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={cn("w-5 h-5 shrink-0", config.theme.headerIconClass)} />
                <div className="flex flex-col min-w-0">
                  <span
                    className={cn("font-semibold text-sm truncate", config.theme.headerTextClass)}
                    data-testid={`text-${config.id}-header-title`}
                  >
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground truncate hidden md:block">{config.subtitle}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PillarSwitcher activePillar={config} pillars={pillarConfigs} />
              <ThemeToggle />
            </div>
          </header>

          <main
            id="main-content"
            role="main"
            className={cn(
              "relative flex-1 overflow-auto p-6",
              "bg-gradient-to-b",
              config.theme.accentBackgroundClass
            )}
          >
            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
