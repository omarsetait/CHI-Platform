import React from "react";
import { PillarLayout } from "@/pillars/pillar-shell";
import { businessPillarConfig } from "@/pillars/config/business";

interface BusinessLayoutProps {
  children: React.ReactNode;
}

export function BusinessLayout({ children }: BusinessLayoutProps) {
  return <PillarLayout config={businessPillarConfig}>{children}</PillarLayout>;
}
