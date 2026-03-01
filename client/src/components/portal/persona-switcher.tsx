import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Persona {
  code: string;
  name: string;
  subtitle: string;
}

interface PersonaSwitcherProps {
  personas: Persona[];
  activeCode: string;
  onSelect: (code: string) => void;
  pillarTheme: string;
}

export function PersonaSwitcher({
  personas,
  activeCode,
  onSelect,
  pillarTheme,
}: PersonaSwitcherProps) {
  const active = personas.find((p) => p.code === activeCode);

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <Users className={cn("h-3.5 w-3.5", pillarTheme)} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Demo Persona
        </span>
      </div>
      <Select value={activeCode} onValueChange={onSelect}>
        <SelectTrigger className={cn("w-full text-left", pillarTheme)}>
          <SelectValue>
            {active ? (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium truncate">{active.name}</span>
              </div>
            ) : (
              "Select persona..."
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {personas.map((persona) => (
            <SelectItem key={persona.code} value={persona.code}>
              <div className="flex flex-col">
                <span className="font-medium">{persona.name}</span>
                <span className="text-xs text-muted-foreground">
                  {persona.subtitle}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
