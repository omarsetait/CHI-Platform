import type { LucideIcon } from "lucide-react";

export type PillarId = "fwa" | "intelligence" | "business" | "members";

export type PillarNavItemStatus = "active" | "coming_soon";

export interface PillarThemeTokens {
  borderClass: string;
  sectionLabelClass: string;
  headerIconClass: string;
  headerTextClass: string;
  badgeClass: string;
  accentBackgroundClass: string;
}

export interface PillarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  status?: PillarNavItemStatus;
}

export interface PillarNavSection {
  title: string;
  items: PillarNavItem[];
}

export interface PillarConfig {
  id: PillarId;
  label: string;
  basePath: string;
  defaultRoute: string;
  icon: LucideIcon;
  subtitle: string;
  navSections: PillarNavSection[];
  footer: {
    title: string;
    subtitle: string;
  };
  theme: PillarThemeTokens;
  sidebarWidth?: string;
  sidebarIconWidth?: string;
}
