import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export interface FilterState {
  search: string;
  riskLevel: string;
  amountMin: number;
  amountMax: number;
  claimType?: string;
  specialty?: string;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  type: "claims" | "providers" | "patients";
}

export function FilterBar({ filters, onFilterChange, type }: FilterBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const activeFiltersCount = [
    filters.riskLevel !== "all",
    filters.amountMin > 0,
    filters.amountMax < 10000000,
    filters.claimType && filters.claimType !== "all",
    filters.specialty && filters.specialty !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFilterChange({
      search: "",
      riskLevel: "all",
      amountMin: 0,
      amountMax: 10000000,
      claimType: "all",
      specialty: "all",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${type}...`}
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
            data-testid={`input-search-${type}`}
          />
        </div>

        <Select
          value={filters.riskLevel}
          onValueChange={(value) => onFilterChange({ ...filters, riskLevel: value })}
        >
          <SelectTrigger className="w-[160px]" data-testid="select-risk-level">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="high">High Risk (0.7+)</SelectItem>
            <SelectItem value="medium">Medium Risk (0.4-0.7)</SelectItem>
            <SelectItem value="low">Low Risk (&lt;0.4)</SelectItem>
          </SelectContent>
        </Select>

        {type === "claims" && (
          <Select
            value={filters.claimType || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, claimType: value })}
          >
            <SelectTrigger className="w-[160px]" data-testid="select-claim-type">
              <SelectValue placeholder="Claim Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Inpatient">Inpatient</SelectItem>
              <SelectItem value="Outpatient">Outpatient</SelectItem>
              <SelectItem value="Day Surgery">Day Surgery</SelectItem>
            </SelectContent>
          </Select>
        )}

        {type === "providers" && (
          <Select
            value={filters.specialty || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, specialty: value })}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-specialty">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              <SelectItem value="Cardiology">Cardiology</SelectItem>
              <SelectItem value="Orthopedic Surgery">Orthopedic Surgery</SelectItem>
              <SelectItem value="General Surgery">General Surgery</SelectItem>
              <SelectItem value="Neurology">Neurology</SelectItem>
              <SelectItem value="Oncology">Oncology</SelectItem>
              <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
              <SelectItem value="Pulmonology">Pulmonology</SelectItem>
              <SelectItem value="Cardiothoracic Surgery">Cardiothoracic Surgery</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-advanced-filters">
              <SlidersHorizontal className="h-4 w-4" />
              Advanced
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount Range</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span>${(filters.amountMin / 1000).toFixed(0)}k</span>
                  <span className="text-muted-foreground">to</span>
                  <span>${(filters.amountMax / 1000).toFixed(0)}k</span>
                </div>
                <Slider
                  value={[filters.amountMin, filters.amountMax]}
                  onValueChange={([min, max]) => 
                    onFilterChange({ ...filters, amountMin: min, amountMax: max })
                  }
                  min={0}
                  max={10000000}
                  step={50000}
                  className="mt-2"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
