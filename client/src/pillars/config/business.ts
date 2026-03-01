import { Building2, LayoutDashboard, ShieldCheck, Landmark, GitMerge, Users, PiggyBank, HeartPulse, TrendingDown } from "lucide-react";
import type { PillarConfig } from "../types";

export const businessPillarConfig: PillarConfig = {
  id: "business",
  label: "Daman Business",
  basePath: "/business",
  defaultRoute: "/business/dashboard",
  icon: Building2,
  subtitle: "Market oversight, employer compliance, and cost intelligence",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/business/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "My Company",
      items: [
        { label: "Company Profile", href: "/business/my-company", icon: Building2 },
        { label: "Workforce Health", href: "/business/my-company/health", icon: HeartPulse },
        { label: "Cost Intelligence", href: "/business/my-company/costs", icon: TrendingDown },
      ],
    },
    {
      title: "Market Oversight",
      items: [
        { label: "Employer Compliance", href: "/business/employer-compliance", icon: ShieldCheck },
        { label: "Insurer Health Monitor", href: "/business/insurer-health", icon: Landmark },
        { label: "Market Concentration", href: "/business/market-concentration", icon: GitMerge },
        { label: "Coverage Expansion", href: "/business/coverage-expansion", icon: Users },
        { label: "Cost Containment", href: "/business/cost-containment", icon: PiggyBank },
      ],
    },
  ],
  footer: { title: "Daman Business", subtitle: "Market & Employer Oversight" },
  theme: {
    borderClass: "border-sky-200 dark:border-sky-900/50",
    sectionLabelClass: "text-sky-700 dark:text-sky-300",
    headerIconClass: "text-sky-600 dark:text-sky-400",
    headerTextClass: "text-sky-700 dark:text-sky-200",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    accentBackgroundClass: "bg-gradient-to-br from-sky-50/50 to-white dark:from-sky-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
