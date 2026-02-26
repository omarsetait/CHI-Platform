import { Brain, BarChart3, FileSearch, Shield } from "lucide-react";
import type { PillarConfig } from "@/pillars/types";

export const intelligencePillarConfig: PillarConfig = {
  id: "intelligence",
  label: "Daman Intelligence",
  basePath: "/intelligence",
  defaultRoute: "/intelligence/dashboard",
  icon: Brain,
  subtitle: "Provider scorecards, rejection decoding, and self-audit intelligence.",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/intelligence/dashboard", icon: Brain },
      ],
    },
    {
      title: "Core Journeys",
      items: [
        { label: "Provider Scorecards", href: "/intelligence/provider-scorecards", icon: BarChart3 },
        { label: "Rejection Decoder", href: "/intelligence/rejection-decoder", icon: FileSearch },
        { label: "Self-Audit", href: "/intelligence/self-audit", icon: Shield },
      ],
    },
  ],
  footer: {
    title: "Intelligence Unit",
    subtitle: "Provider benchmark and correction workflows",
  },
  theme: {
    borderClass: "border-violet-200 dark:border-violet-900/50",
    sectionLabelClass: "text-violet-700 dark:text-violet-300",
    headerIconClass: "text-violet-600 dark:text-violet-400",
    headerTextClass: "text-violet-700 dark:text-violet-200",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    accentBackgroundClass: "from-violet-500/10 via-transparent to-violet-500/5",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
