import { useState, useMemo, useCallback } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegionData {
  regionCode: string;
  fwaCount: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface SaudiHeatmapProps {
  data: RegionData[];
  onRegionClick?: (regionCode: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Region metadata (bilingual names, SVG paths, label positions)
// ---------------------------------------------------------------------------

interface RegionMeta {
  code: string;
  nameEn: string;
  nameAr: string;
  /** SVG polygon points string */
  points: string;
  /** Label centre position [x, y] */
  labelPos: [number, number];
  /** Whether to always show the label (major regions) */
  showLabel: boolean;
}

const REGIONS: RegionMeta[] = [
  // Northwest -- Tabuk
  {
    code: "TBK",
    nameEn: "Tabuk",
    nameAr: "تبوك",
    points: "70,60 175,40 210,80 210,160 170,210 100,220 50,200 30,140",
    labelPos: [120, 135],
    showLabel: true,
  },
  // North -- Al Jouf
  {
    code: "JOF",
    nameEn: "Al Jouf",
    nameAr: "الجوف",
    points: "210,40 330,30 370,60 370,120 330,160 210,160 210,80",
    labelPos: [285, 95],
    showLabel: false,
  },
  // Northeast -- Northern Borders
  {
    code: "NBR",
    nameEn: "Northern Borders",
    nameAr: "الحدود الشمالية",
    points: "370,30 540,20 580,60 580,140 530,170 370,160 370,60",
    labelPos: [475, 95],
    showLabel: false,
  },
  // North-central -- Hail
  {
    code: "HAL",
    nameEn: "Hail",
    nameAr: "حائل",
    points: "210,160 370,160 380,220 350,280 250,280 190,250 170,210",
    labelPos: [280, 215],
    showLabel: false,
  },
  // West-central -- Madinah
  {
    code: "MDN",
    nameEn: "Madinah",
    nameAr: "المدينة المنورة",
    points: "50,200 170,210 190,250 250,280 230,350 160,390 90,380 40,320 30,260",
    labelPos: [135, 300],
    showLabel: true,
  },
  // Central -- Qassim
  {
    code: "QSM",
    nameEn: "Qassim",
    nameAr: "القصيم",
    points: "250,280 350,280 390,310 380,370 310,370 230,350",
    labelPos: [310, 325],
    showLabel: false,
  },
  // Large central -- Riyadh
  {
    code: "RIY",
    nameEn: "Riyadh",
    nameAr: "الرياض",
    points: "310,370 380,370 390,310 350,280 380,220 530,170 580,200 600,310 580,420 530,490 430,530 350,510 290,460 270,410 230,350",
    labelPos: [430, 380],
    showLabel: true,
  },
  // East coast -- Eastern Province
  {
    code: "EST",
    nameEn: "Eastern Province",
    nameAr: "المنطقة الشرقية",
    points: "580,60 700,50 750,120 760,230 740,330 700,380 640,400 600,310 580,200 580,140",
    labelPos: [680, 220],
    showLabel: true,
  },
  // West coast -- Makkah
  {
    code: "MAK",
    nameEn: "Makkah",
    nameAr: "مكة المكرمة",
    points: "40,320 90,380 160,390 180,440 150,490 100,510 60,490 30,430",
    labelPos: [100, 430],
    showLabel: true,
  },
  // Small southwest -- Al Baha
  {
    code: "BAH",
    nameEn: "Al Baha",
    nameAr: "الباحة",
    points: "100,510 150,490 180,510 170,550 130,560 100,540",
    labelPos: [140, 530],
    showLabel: false,
  },
  // Southwest -- Asir
  {
    code: "ASR",
    nameEn: "Asir",
    nameAr: "عسير",
    points: "130,560 170,550 180,510 230,500 290,460 310,500 280,560 220,600 150,610",
    labelPos: [220, 550],
    showLabel: true,
  },
  // Far southwest -- Jazan
  {
    code: "JZN",
    nameEn: "Jazan",
    nameAr: "جازان",
    points: "80,580 150,610 220,600 200,650 140,670 80,640",
    labelPos: [145, 630],
    showLabel: false,
  },
  // South-central -- Najran
  {
    code: "NJR",
    nameEn: "Najran",
    nameAr: "نجران",
    points: "220,600 280,560 310,500 430,530 440,580 380,640 300,660",
    labelPos: [340, 590],
    showLabel: false,
  },
];

// ---------------------------------------------------------------------------
// Risk-level colour palette
// ---------------------------------------------------------------------------

const RISK_COLORS: Record<RegionData["riskLevel"], string> = {
  low: "#bbf7d0",
  medium: "#fef08a",
  high: "#fdba74",
  critical: "#f87171",
};

const NO_DATA_COLOR = "#f3f4f6";

const RISK_LABELS: Record<RegionData["riskLevel"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SaudiHeatmap({
  data,
  onRegionClick,
  className,
}: SaudiHeatmapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Index data by regionCode for O(1) lookups
  const dataMap = useMemo(() => {
    const map = new Map<string, RegionData>();
    for (const d of data) {
      map.set(d.regionCode, d);
    }
    return map;
  }, [data]);

  const getFill = useCallback(
    (code: string) => {
      const d = dataMap.get(code);
      return d ? RISK_COLORS[d.riskLevel] : NO_DATA_COLOR;
    },
    [dataMap],
  );

  const handleClick = useCallback(
    (code: string) => {
      onRegionClick?.(code);
    },
    [onRegionClick],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <svg
        viewBox="0 0 800 700"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-full h-auto", className)}
        role="img"
        aria-label="Saudi Arabia regional heatmap"
      >
        {/* Regions */}
        {REGIONS.map((region) => {
          const regionData = dataMap.get(region.code);
          const fill = getFill(region.code);
          const isHovered = hoveredRegion === region.code;

          return (
            <Tooltip key={region.code}>
              <TooltipTrigger asChild>
                <polygon
                  points={region.points}
                  fill={fill}
                  stroke="#94a3b8"
                  strokeWidth={isHovered ? 2.5 : 1.2}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    filter: isHovered
                      ? "brightness(0.9) drop-shadow(0px 2px 4px rgba(0,0,0,0.2))"
                      : "none",
                  }}
                  onMouseEnter={() => setHoveredRegion(region.code)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => handleClick(region.code)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${region.nameEn} region`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClick(region.code);
                    }
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-sm leading-relaxed">
                <p className="font-semibold">
                  {region.nameEn}{" "}
                  <span className="font-normal text-muted-foreground">
                    / {region.nameAr}
                  </span>
                </p>
                {regionData ? (
                  <>
                    <p>
                      FWA Count:{" "}
                      <span className="font-medium">
                        {regionData.fwaCount.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Risk Level:{" "}
                      <span className="font-medium">
                        {RISK_LABELS[regionData.riskLevel]}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Region labels */}
        {REGIONS.filter((r) => r.showLabel).map((region) => (
          <text
            key={`label-${region.code}`}
            x={region.labelPos[0]}
            y={region.labelPos[1]}
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none select-none"
            fill="#334155"
            fontSize={14}
            fontWeight={600}
          >
            {region.code}
          </text>
        ))}

        {/* Legend */}
        <g transform="translate(620, 520)">
          <text
            x={0}
            y={0}
            fontSize={13}
            fontWeight={600}
            fill="#334155"
          >
            Risk Level
          </text>
          {(
            [
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["critical", "Critical"],
            ] as const
          ).map(([level, label], i) => (
            <g key={level} transform={`translate(0, ${20 + i * 24})`}>
              <rect
                width={18}
                height={18}
                rx={3}
                fill={RISK_COLORS[level]}
                stroke="#94a3b8"
                strokeWidth={0.5}
              />
              <text
                x={26}
                y={13}
                fontSize={12}
                fill="#475569"
              >
                {label}
              </text>
            </g>
          ))}
          <g transform={`translate(0, ${20 + 4 * 24})`}>
            <rect
              width={18}
              height={18}
              rx={3}
              fill={NO_DATA_COLOR}
              stroke="#94a3b8"
              strokeWidth={0.5}
            />
            <text
              x={26}
              y={13}
              fontSize={12}
              fill="#475569"
            >
              No Data
            </text>
          </g>
        </g>
      </svg>
    </TooltipProvider>
  );
}
