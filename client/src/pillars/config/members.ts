import { HeartPulse, Activity, BookOpen, MessageSquare, ShieldAlert } from "lucide-react";
import type { PillarConfig } from "@/pillars/types";

export const membersPillarConfig: PillarConfig = {
  id: "members",
  label: "Daman Members",
  basePath: "/members",
  defaultRoute: "/members/dashboard",
  icon: HeartPulse,
  subtitle: "Member support, education, and safety reporting experiences.",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/members/dashboard", icon: HeartPulse },
      ],
    },
    {
      title: "Core Journeys",
      items: [
        { label: "My Health", href: "/members/my-health", icon: Activity },
        { label: "Education", href: "/members/education", icon: BookOpen },
        { label: "Help & Feedback", href: "/members/help-feedback", icon: MessageSquare },
        { label: "Report Issue", href: "/members/report-issue", icon: ShieldAlert },
      ],
    },
  ],
  footer: {
    title: "Members Unit",
    subtitle: "Empathy-first member guidance and protection",
  },
  theme: {
    borderClass: "border-teal-200 dark:border-teal-900/50",
    sectionLabelClass: "text-teal-700 dark:text-teal-300",
    headerIconClass: "text-teal-600 dark:text-teal-400",
    headerTextClass: "text-teal-700 dark:text-teal-200",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    accentBackgroundClass: "from-teal-500/10 via-transparent to-teal-500/5",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
