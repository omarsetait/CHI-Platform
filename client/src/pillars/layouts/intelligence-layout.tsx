import React from "react";
import { PillarLayout } from "@/pillars/pillar-shell";
import { intelligencePillarConfig } from "@/pillars/config/intelligence";

interface IntelligenceLayoutProps {
  children: React.ReactNode;
}

export function IntelligenceLayout({ children }: IntelligenceLayoutProps) {
  return <PillarLayout config={intelligencePillarConfig}>{children}</PillarLayout>;
}
