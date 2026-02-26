import { ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PillarConfig } from "@/pillars/types";
import { trackClientEvent } from "@/lib/telemetry";

interface PillarSwitcherProps {
  activePillar: PillarConfig;
  pillars: PillarConfig[];
}

export function PillarSwitcher({ activePillar, pillars }: PillarSwitcherProps) {
  const [, setLocation] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {activePillar.label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Pillar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          const isActive = pillar.id === activePillar.id;

          return (
            <DropdownMenuItem
              key={pillar.id}
              className="cursor-pointer"
              onSelect={() => {
                if (!isActive) {
                  trackClientEvent("pillar.switch", {
                    from: activePillar.id,
                    to: pillar.id,
                  });
                  setLocation(pillar.defaultRoute);
                }
              }}
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{pillar.label}</span>
                <span className="text-xs text-muted-foreground">{pillar.subtitle}</span>
              </div>
              {isActive ? <span className="ml-auto text-xs text-muted-foreground">Current</span> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
