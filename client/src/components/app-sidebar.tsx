import { Shield, Home, Brain, BarChart3, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
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
} from "@/components/ui/sidebar";
import tachyHealthLogo from "@assets/logo.svg";

const mainMenuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Audit & FWA Detection", url: "/fwa", icon: Shield },
  { title: "Daman Intelligence", url: "/intelligence", icon: Brain },
  { title: "Daman Business", url: "/business", icon: BarChart3 },
  { title: "Daman Members", url: "/members", icon: Users },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <img
            src={tachyHealthLogo}
            alt="TachyHealth"
            className="h-8"
            data-testid="img-sidebar-logo"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url || location.startsWith(item.url + "/")}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

