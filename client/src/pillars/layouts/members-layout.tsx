import React from "react";
import { PillarLayout } from "@/pillars/pillar-shell";
import { membersPillarConfig } from "@/pillars/config/members";

interface MembersLayoutProps {
  children: React.ReactNode;
}

export function MembersLayout({ children }: MembersLayoutProps) {
  return <PillarLayout config={membersPillarConfig}>{children}</PillarLayout>;
}
