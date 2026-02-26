import { Building2, LineChart, Settings2, Landmark } from "lucide-react";
import type { PillarConfig } from "@/pillars/types";

export const businessPillarConfig: PillarConfig = {
  id: "business",
  label: "Daman Business",
  basePath: "/business",
  defaultRoute: "/business/dashboard",
  icon: Building2,
  subtitle: "Employer profiling, policy simulation, and broker intelligence.",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/business/dashboard", icon: Building2 },
      ],
    },
    {
      title: "Core Journeys",
      items: [
        { label: "Employer Profiling", href: "/business/employer-profiling", icon: LineChart },
        { label: "Policy Simulator", href: "/business/policy-simulator", icon: Settings2 },
        { label: "Digital Broker", href: "/business/digital-broker", icon: Landmark },
      ],
    },
  ],
  footer: {
    title: "Business Unit",
    subtitle: "Enterprise economics and policy levers",
  },
  theme: {
    borderClass: "border-sky-200 dark:border-sky-900/50",
    sectionLabelClass: "text-sky-700 dark:text-sky-300",
    headerIconClass: "text-sky-600 dark:text-sky-400",
    headerTextClass: "text-sky-700 dark:text-sky-200",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    accentBackgroundClass: "from-sky-500/10 via-transparent to-sky-500/5",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
