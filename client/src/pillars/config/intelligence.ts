import { Brain, LayoutDashboard, Award, FileCode, Activity, BarChart, ClipboardCheck } from "lucide-react";
import type { PillarConfig } from "../types";

export const intelligencePillarConfig: PillarConfig = {
  id: "intelligence",
  label: "Daman Intelligence",
  basePath: "/intelligence",
  defaultRoute: "/intelligence/dashboard",
  icon: Brain,
  subtitle: "Provider oversight, coding compliance, and DRG readiness",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/intelligence/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Provider Oversight",
      items: [
        { label: "Accreditation Scorecards", href: "/intelligence/accreditation-scorecards", icon: Award },
        { label: "SBS V3.0 Compliance", href: "/intelligence/sbs-compliance", icon: FileCode },
        { label: "DRG Readiness", href: "/intelligence/drg-readiness", icon: Activity },
        { label: "Rejection Patterns", href: "/intelligence/rejection-patterns", icon: BarChart },
        { label: "Documentation Quality", href: "/intelligence/documentation-quality", icon: ClipboardCheck },
      ],
    },
  ],
  footer: { title: "Daman Intelligence", subtitle: "Provider Oversight Platform" },
  theme: {
    borderClass: "border-violet-200 dark:border-violet-800",
    sectionLabelClass: "text-violet-500 dark:text-violet-400",
    headerIconClass: "text-violet-600 dark:text-violet-400",
    headerTextClass: "text-violet-700 dark:text-violet-300",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
    accentBackgroundClass: "bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
