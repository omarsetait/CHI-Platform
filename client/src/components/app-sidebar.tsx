import { Shield, FileText, UserCheck, Users, Home, Upload, FlaskConical, Network, User, Building2, Stethoscope } from "lucide-react";
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
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Claims Upload Demo",
    url: "/demo/claims-upload",
    icon: Upload,
  },
  {
    title: "Claims",
    url: "/claims",
    icon: FileText,
  },
  {
    title: "Providers",
    url: "/providers",
    icon: UserCheck,
  },
  {
    title: "Patients",
    url: "/patients",
    icon: Users,
  },
];

const fwaMenuItems = [
  {
    title: "Inappropriate Care Unit",
    url: "/fwa",
    icon: Shield,
  },
  {
    title: "Simulation Lab",
    url: "/fwa/simulation-lab",
    icon: FlaskConical,
  },
  {
    title: "Graph Analysis",
    url: "/fwa/graph-analysis",
    icon: Network,
  },
];

const context360Items = [
  {
    title: "Patient 360",
    url: "/context/patient-360/PAT-1001",
    icon: User,
  },
  {
    title: "Provider 360",
    url: "/context/provider-360/FAC-001",
    icon: Building2,
  },
  {
    title: "Doctor 360",
    url: "/context/doctor-360/DOC-001",
    icon: Stethoscope,
  },
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
                  <SidebarMenuButton asChild isActive={location === item.url}>
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

        <SidebarGroup>
          <SidebarGroupLabel>Inappropriate Care</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {fwaMenuItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Context 360</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {context360Items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.startsWith(item.url.replace(/\/[^/]+$/, ''))}>
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
