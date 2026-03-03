import { HeartPulse, LayoutDashboard, MessageSquare, MapPin, Star, ShieldAlert, BookOpen, Shield, Search } from "lucide-react";
import type { PillarConfig } from "../types";

export const membersPillarConfig: PillarConfig = {
  id: "members",
  label: "Daman Members",
  basePath: "/members",
  defaultRoute: "/members/dashboard",
  icon: HeartPulse,
  subtitle: "Beneficiary protection, coverage transparency, and fraud reporting",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/members/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "My Health",
      items: [
        { label: "My Coverage", href: "/members/my-health", icon: Shield },
        { label: "Find a Provider", href: "/members/my-health/providers", icon: Search },
        { label: "My Complaints", href: "/members/my-health/complaints", icon: MessageSquare },
      ],
    },
    {
      title: "Beneficiary Services",
      items: [
        { label: "Complaints & Disputes", href: "/members/complaints", icon: MessageSquare },
        { label: "Report Fraud", href: "/members/report-fraud", icon: ShieldAlert },
        { label: "Coverage Gap Monitor", href: "/members/coverage-gaps", icon: MapPin },
        { label: "Provider Quality", href: "/members/provider-quality", icon: Star },
        { label: "Benefits Awareness", href: "/members/benefits-awareness", icon: BookOpen },
      ],
    },
  ],
  footer: { title: "Daman Members", subtitle: "Beneficiary Protection" },
  theme: {
    borderClass: "border-teal-200 dark:border-teal-900/50",
    sectionLabelClass: "text-teal-700 dark:text-teal-300",
    headerIconClass: "text-teal-600 dark:text-teal-400",
    headerTextClass: "text-teal-700 dark:text-teal-200",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    accentBackgroundClass: "bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
