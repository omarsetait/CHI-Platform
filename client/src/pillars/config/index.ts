import type { PillarConfig, PillarId } from "@/pillars/types";
import { fwaPillarConfig } from "@/pillars/config/fwa";
import { intelligencePillarConfig } from "@/pillars/config/intelligence";
import { businessPillarConfig } from "@/pillars/config/business";
import { membersPillarConfig } from "@/pillars/config/members";

export const pillarConfigs: PillarConfig[] = [
  fwaPillarConfig,
  intelligencePillarConfig,
  businessPillarConfig,
  membersPillarConfig,
];

export const pillarConfigById: Record<PillarId, PillarConfig> = {
  fwa: fwaPillarConfig,
  intelligence: intelligencePillarConfig,
  business: businessPillarConfig,
  members: membersPillarConfig,
};
