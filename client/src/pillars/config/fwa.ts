import {
  Brain,
  Settings,
  Shield,
  AlertTriangle,
  ClipboardList,
  FileWarning,
  BarChart3,
  BookOpen,
  Rss,
  Gavel,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Cog,
  Sparkles,
} from "lucide-react";
import type { PillarConfig } from "@/pillars/types";

export const fwaPillarConfig: PillarConfig = {
  id: "fwa",
  label: "Audit & FWA Unit",
  basePath: "/fwa",
  defaultRoute: "/fwa/dashboard",
  icon: Shield,
  subtitle: "Detection, investigation, action, and compliance workflows.",
  navSections: [
    {
      title: "1. Monitor & Triage",
      items: [
        { label: "Operations Center", href: "/fwa/dashboard", icon: LayoutDashboard },
        { label: "Analytics & Reports", href: "/fwa/kpi-dashboard", icon: BarChart3 },
      ],
    },
    {
      title: "2. Ingestion & Detection",
      items: [
        { label: "Detection Engine", href: "/fwa/detection-engine", icon: Brain, badge: "5 Methods" },
        { label: "Regulatory Oversight", href: "/fwa/regulatory-oversight", icon: Shield, badge: "5 Phases" },
      ],
    },
    {
      title: "3. Investigation",
      items: [
        { label: "Case Management", href: "/fwa/case-management", icon: ClipboardList, badge: "20" },
        { label: "High-Risk Entities", href: "/fwa/high-risk-entities", icon: AlertTriangle },
      ],
    },
    {
      title: "4. Action & Compliance",
      items: [
        { label: "Enforcement Cases", href: "/fwa/enforcement", icon: Gavel, badge: "3" },
        { label: "Audit Sessions", href: "/fwa/audit-sessions", icon: ClipboardCheck },
        { label: "Regulatory Communications", href: "/fwa/regulatory-circulars", icon: FileText },
      ],
    },
    {
      title: "5. Intelligence & Reference",
      items: [
        { label: "Online Listening", href: "/fwa/online-listening", icon: Rss, badge: "Beta" },
        { label: "Knowledge Hub", href: "/fwa/knowledge-base", icon: BookOpen },
      ],
    },
    {
      title: "System Configuration",
      items: [
        { label: "Engine Configuration", href: "/fwa/engine-config", icon: Cog, badge: "5 Methods" },
        { label: "Unsupervised Lab", href: "/fwa/ml-analysis", icon: Sparkles, badge: "ML Studio" },
        { label: "Rule Management Studio", href: "/fwa/rule-studio", icon: FileWarning, badge: "102 Rules" },
        { label: "Agent Orchestration", href: "/fwa/agent-config", icon: Brain },
        { label: "Settings", href: "/fwa/settings", icon: Settings },
      ],
    },
  ],
  footer: {
    title: "Audit & FWA Unit",
    subtitle: "5-stage workflow pipeline",
  },
  theme: {
    borderClass: "border-purple-200 dark:border-purple-900/50",
    sectionLabelClass: "text-purple-700 dark:text-purple-300",
    headerIconClass: "text-purple-600 dark:text-purple-400",
    headerTextClass: "text-purple-700 dark:text-purple-200",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    accentBackgroundClass: "from-purple-500/10 via-transparent to-purple-500/5",
  },
  sidebarWidth: "18rem",
  sidebarIconWidth: "3.5rem",
};
