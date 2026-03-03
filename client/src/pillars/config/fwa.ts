import {
  Shield,
  AlertTriangle,
  FileSearch,
  Rss,
  Gavel,
  BarChart3,
  Stethoscope,
  Database,
  MessageCircle,
  Settings2,
} from "lucide-react";
import type { PillarConfig } from "@/pillars/types";

export const fwaPillarConfig: PillarConfig = {
  id: "fwa",
  label: "Audit & FWA Unit",
  basePath: "/fwa",
  defaultRoute: "/fwa/dashboard",
  icon: Shield,
  subtitle: "National fraud intelligence command center",
  navSections: [
    {
      title: "Detection & Analysis",
      items: [
        { label: "Detection Engine", href: "/fwa/detection-engine", icon: Shield },
        { label: "5 Detection Methods", href: "/fwa/engine-config", icon: Settings2 },
        { label: "Coding Intelligence", href: "/fwa/coding-intelligence", icon: Stethoscope },
        { label: "Flagged Claims", href: "/fwa/flagged-claims", icon: FileSearch },
      ],
    },
    {
      title: "Risk & Entities",
      items: [
        { label: "High-Risk Entities", href: "/fwa/high-risk-entities", icon: AlertTriangle },
        { label: "Online Listening", href: "/fwa/online-listening", icon: Rss, badge: "Live" },
      ],
    },
    {
      title: "Enforcement & Compliance",
      items: [
        { label: "Enforcement & Compliance", href: "/fwa/enforcement", icon: Gavel },
        { label: "Intelligence Reports", href: "/fwa/kpi-dashboard", icon: BarChart3 },
      ],
    },
    {
      title: "Knowledge & AI",
      items: [
        { label: "Knowledge Hub", href: "/fwa/knowledge-hub", icon: Database },
        { label: "Daman AI Chat", href: "/fwa/chat", icon: MessageCircle },
      ],
    },
  ],
  footer: {
    title: "Audit & FWA Unit",
    subtitle: "Council of Health Insurance",
  },
  theme: {
    borderClass: "border-purple-200 dark:border-purple-800",
    sectionLabelClass: "text-purple-500 dark:text-purple-400",
    headerIconClass: "text-purple-600 dark:text-purple-400",
    headerTextClass: "text-purple-700 dark:text-purple-300",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    accentBackgroundClass: "bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17rem",
  sidebarIconWidth: "3.5rem",
};
