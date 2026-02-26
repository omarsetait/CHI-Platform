import React from "react";
import { PillarLayout } from "@/pillars/pillar-shell";
import { fwaPillarConfig } from "@/pillars/config/fwa";

interface FWALayoutProps {
  children: React.ReactNode;
}

export function FWALayout({ children }: FWALayoutProps) {
  return <PillarLayout config={fwaPillarConfig}>{children}</PillarLayout>;
}
