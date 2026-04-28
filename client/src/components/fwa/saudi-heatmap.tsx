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
//
// Geometry source: Natural Earth 1:10m Admin-1 States/Provinces (public domain),
// filtered to Saudi Arabia (adm0_a3 = "SAU"), simplified with Douglas-Peucker
// (~0.04 degrees) and projected via an equirectangular projection (preserving
// the country's aspect ratio) into a 580x660 area inside the 800x700 SVG
// viewBox below, leaving room on the right for the risk-level legend.
// ---------------------------------------------------------------------------

interface RegionMeta {
  code: string;
  nameEn: string;
  nameAr: string;
  /** SVG path `d` attribute (M/L/Z commands) */
  d: string;
  /** Label centre position [x, y] in viewBox units */
  labelPos: [number, number];
  /** Whether to always show the label (major regions) */
  showLabel: boolean;
}

const REGIONS: RegionMeta[] = [
  {
    code: "TBK",
    nameEn: "Tabuk",
    nameAr: "تبوك",
    d: "M97.4,341.9 L90.9,333.3 L93.9,332.8 L93.5,324.4 L85.1,311.5 L78.6,307.8 L78.5,301.1 L73.4,298.7 L60.2,276.7 L47.2,261.6 L40.7,250.0 L36.3,246.4 L37.7,245.1 L33.2,243.3 L26.4,244.7 L26.8,243.5 L23.8,242.8 L21.1,245.8 L20.0,244.1 L26.4,232.1 L25.7,228.3 L27.4,222.3 L37.8,222.9 L55.3,219.5 L62.6,221.7 L72.8,231.2 L82.8,228.9 L98.6,230.8 L101.8,225.9 L107.2,222.9 L108.4,234.0 L111.9,238.0 L117.9,239.9 L130.8,240.4 L133.2,242.9 L139.9,240.9 L154.9,246.0 L163.6,252.3 L167.5,264.8 L174.0,269.0 L164.4,283.6 L161.7,281.6 L146.1,283.1 L137.3,278.9 L135.3,276.2 L133.8,278.8 L128.8,277.4 L123.3,279.8 L119.8,273.3 L112.7,271.6 L107.5,263.3 L100.6,266.1 L92.8,263.7 L80.9,268.2 L86.4,270.9 L87.3,282.1 L93.8,285.4 L91.4,292.5 L94.3,299.6 L97.0,298.6 L102.3,301.5 L108.5,308.7 L111.0,315.4 L115.0,316.9 L114.0,333.7 L98.7,338.7 L97.4,341.9 Z M87.6,317.7 L85.5,316.4 L87.6,317.7 Z M85.2,317.7 L84.1,319.3 L80.7,315.6 L85.2,317.7 Z M81.1,315.5 L78.1,314.0 L81.1,315.5 Z M84.1,314.1 L84.5,312.5 L84.1,314.1 Z M78.1,313.5 L72.8,311.5 L74.3,309.9 L73.9,311.5 L78.1,313.5 Z M74.3,309.1 L75.6,305.5 L74.6,307.3 L76.1,309.7 L74.3,309.1 Z",
    labelPos: [95, 263],
    showLabel: true,
  },
{
    code: "JOF",
    nameEn: "Al Jouf",
    nameAr: "الجوف",
    d: "M59.8,213.9 L72.4,205.5 L79.4,195.6 L99.8,191.7 L104.7,182.5 L113.9,177.8 L85.7,150.5 L114.0,143.3 L110.9,157.3 L119.6,166.7 L147.2,165.2 L165.8,167.7 L174.3,171.3 L193.7,171.4 L201.8,176.1 L211.6,177.8 L215.7,183.8 L221.9,188.8 L191.1,207.6 L189.0,219.7 L184.4,224.2 L171.6,227.6 L146.2,238.3 L141.9,242.0 L139.2,240.9 L132.6,242.8 L130.8,240.4 L117.9,239.9 L111.9,238.0 L108.4,234.0 L108.1,224.4 L106.6,222.8 L101.8,225.9 L98.6,230.8 L82.8,228.9 L72.8,231.2 L62.6,221.7 L55.3,219.5 L37.8,222.9 L27.4,222.3 L30.4,209.4 L59.8,213.9 Z",
    labelPos: [135, 200],
    showLabel: false,
  },
{
    code: "NBR",
    nameEn: "Northern Borders",
    nameAr: "الحدود الشمالية",
    d: "M146.2,133.2 L181.1,138.7 L226.6,161.8 L298.6,213.5 L346.4,217.0 L329.2,223.6 L324.3,227.9 L306.4,253.8 L305.4,257.1 L306.8,259.5 L304.4,261.6 L294.0,253.6 L282.2,251.0 L271.7,235.2 L265.1,238.0 L255.2,236.1 L252.9,234.7 L251.2,230.2 L242.9,232.1 L235.2,226.1 L224.5,223.8 L216.1,224.7 L206.4,222.5 L189.8,225.7 L184.4,224.2 L189.0,219.7 L191.1,207.6 L217.7,192.6 L221.7,188.2 L215.7,183.8 L211.6,177.8 L201.8,176.1 L193.7,171.4 L174.3,171.3 L165.8,167.7 L147.2,165.2 L119.0,166.4 L110.9,157.3 L114.0,143.3 L140.9,136.7 L146.2,133.2 Z",
    labelPos: [227, 193],
    showLabel: false,
  },
{
    code: "HAL",
    nameEn: "Hail",
    nameAr: "حائل",
    d: "M292.2,272.3 L286.2,271.6 L277.9,265.4 L274.0,265.8 L261.5,271.8 L257.0,277.5 L239.2,287.7 L234.2,294.2 L229.9,295.0 L228.4,303.3 L223.4,302.5 L221.6,304.0 L222.6,309.6 L208.3,314.5 L192.6,313.1 L186.4,317.9 L170.7,320.6 L168.0,317.6 L166.8,303.8 L168.2,293.2 L163.3,290.5 L167.4,277.4 L174.0,269.0 L167.5,264.8 L164.2,253.4 L162.0,250.8 L153.9,245.5 L141.9,242.0 L146.2,238.3 L182.1,223.9 L189.8,225.7 L206.4,222.5 L216.1,224.7 L224.5,223.8 L235.2,226.1 L242.9,232.1 L251.2,230.2 L254.4,235.9 L265.1,238.0 L270.8,235.3 L273.1,235.9 L282.2,251.0 L294.0,253.6 L301.2,259.0 L296.8,264.2 L296.9,268.1 L292.2,272.3 Z",
    labelPos: [214, 265],
    showLabel: false,
  },
{
    code: "MDN",
    nameEn: "Madinah",
    nameAr: "المدينة المنورة",
    d: "M132.1,372.8 L126.4,362.2 L112.6,353.0 L113.9,352.2 L112.9,351.1 L110.7,352.7 L105.4,348.8 L101.2,349.4 L98.7,346.7 L99.6,345.1 L97.4,341.9 L98.7,338.7 L114.0,333.7 L115.0,316.9 L111.0,315.4 L108.5,308.7 L102.3,301.5 L97.0,298.6 L94.3,299.6 L91.4,292.5 L94.1,286.1 L87.3,282.1 L86.4,270.9 L80.9,269.2 L81.4,267.8 L92.8,263.7 L100.6,266.1 L107.5,263.3 L112.7,271.6 L119.8,273.3 L123.3,279.8 L128.8,277.4 L133.8,278.8 L134.8,276.2 L146.1,283.1 L162.3,281.7 L165.0,285.3 L163.7,291.7 L168.2,293.2 L166.8,303.8 L169.3,320.0 L186.4,317.9 L193.4,313.0 L213.8,315.9 L214.9,326.4 L221.0,329.3 L223.9,337.4 L227.2,339.9 L224.5,345.6 L224.1,358.2 L217.6,358.4 L216.7,366.6 L204.6,373.9 L209.2,378.7 L203.2,381.7 L187.1,396.0 L181.5,394.7 L176.0,398.1 L172.2,398.1 L171.3,392.1 L166.3,389.2 L168.2,383.0 L167.0,380.3 L155.3,382.4 L153.3,379.3 L146.9,379.3 L139.9,372.1 L132.1,372.8 Z",
    labelPos: [156, 332],
    showLabel: true,
  },
{
    code: "QSM",
    nameEn: "Qassim",
    nameAr: "القصيم",
    d: "M296.9,268.1 L301.6,270.9 L302.7,274.6 L290.4,283.9 L289.9,291.1 L298.2,301.7 L299.2,313.3 L280.1,313.6 L271.9,321.5 L260.2,324.7 L255.0,330.3 L255.7,335.3 L253.4,337.9 L238.6,337.5 L231.9,335.1 L227.2,339.9 L224.3,337.9 L221.0,329.3 L214.9,326.4 L214.7,316.7 L208.3,314.5 L223.1,309.3 L221.6,304.0 L223.4,302.5 L228.4,303.3 L229.9,295.0 L234.2,294.2 L239.2,287.7 L257.0,277.5 L263.5,270.6 L276.0,265.2 L286.9,271.8 L292.7,272.2 L296.9,268.1 Z",
    labelPos: [258, 303],
    showLabel: false,
  },
{
    code: "RIY",
    nameEn: "Riyadh",
    nameAr: "الرياض",
    d: "M298.1,313.6 L299.9,311.0 L298.2,301.8 L290.1,291.7 L290.3,284.5 L302.7,274.6 L302.0,271.5 L296.4,266.7 L298.0,262.2 L301.6,259.8 L304.4,261.6 L307.1,259.6 L313.9,267.8 L326.2,272.7 L332.2,278.0 L341.0,279.2 L350.8,284.9 L357.5,284.6 L363.9,290.5 L374.6,295.5 L375.8,335.1 L393.6,349.3 L398.1,360.1 L382.7,479.8 L314.6,487.4 L304.9,486.3 L293.8,480.3 L282.5,470.6 L277.8,464.0 L281.1,451.5 L262.9,429.4 L263.8,417.4 L266.0,413.1 L265.4,398.0 L253.7,397.1 L251.9,395.2 L251.1,387.6 L237.2,386.3 L234.2,384.3 L227.4,366.1 L223.9,362.5 L224.5,345.6 L229.5,336.4 L231.9,335.1 L238.6,337.5 L253.4,337.9 L255.7,335.3 L255.0,330.3 L260.2,324.7 L271.9,321.5 L280.1,313.6 L298.1,313.6 Z",
    labelPos: [322, 382],
    showLabel: true,
  },
{
    code: "EST",
    nameEn: "Eastern Province",
    nameAr: "المنطقة الشرقية",
    d: "M467.0,336.2 L471.7,341.1 L479.7,339.6 L480.6,342.5 L483.2,339.4 L486.0,340.7 L481.6,344.4 L480.0,348.3 L488.0,349.7 L488.7,354.6 L515.2,386.0 L585.3,394.7 L587.6,392.5 L600.0,412.4 L581.8,467.0 L499.3,494.6 L418.2,506.0 L394.2,517.9 L378.4,536.8 L374.0,547.0 L397.9,366.3 L397.7,356.8 L393.6,349.3 L375.8,335.1 L374.0,294.5 L363.9,290.5 L357.5,284.6 L350.8,284.9 L341.0,279.2 L332.8,278.2 L326.2,272.7 L313.9,267.8 L310.6,262.2 L305.8,258.2 L305.7,255.4 L326.4,225.8 L346.4,217.0 L374.1,219.3 L380.6,232.0 L401.6,231.8 L403.4,233.1 L402.6,236.0 L404.5,235.4 L407.7,245.4 L411.5,246.4 L410.2,247.7 L414.0,251.4 L412.8,254.1 L412.1,251.4 L411.2,254.4 L413.9,255.2 L412.6,257.3 L423.8,259.2 L425.9,261.8 L420.5,262.0 L424.5,262.8 L423.4,265.1 L425.9,264.7 L426.1,268.5 L428.6,268.6 L427.6,270.1 L431.7,270.5 L430.7,269.4 L433.0,268.8 L432.9,271.3 L436.5,275.3 L444.0,278.5 L449.1,283.4 L444.9,281.1 L444.3,282.2 L445.6,288.1 L450.0,290.6 L450.7,292.8 L448.7,300.7 L445.7,296.2 L444.1,297.9 L444.5,301.7 L447.6,302.0 L451.9,311.8 L448.9,310.0 L454.4,316.0 L455.3,315.1 L457.8,317.2 L460.3,327.7 L464.8,332.5 L465.7,336.5 L467.0,336.2 Z M432.8,264.5 L436.2,265.4 L432.8,266.0 L431.9,264.6 L429.8,266.2 L432.8,264.5 Z",
    labelPos: [449, 386],
    showLabel: true,
  },
{
    code: "MAK",
    nameEn: "Makkah",
    nameAr: "مكة المكرمة",
    d: "M213.4,518.6 L210.6,515.8 L208.9,508.9 L202.8,502.8 L203.8,499.0 L200.7,496.2 L201.8,492.6 L198.9,491.0 L195.4,480.5 L190.4,477.7 L191.4,475.4 L189.9,473.1 L187.5,473.5 L184.2,468.0 L171.7,459.2 L166.8,458.4 L167.8,459.8 L162.8,457.3 L157.5,451.3 L155.8,446.4 L153.6,445.7 L154.3,444.1 L150.1,441.5 L146.7,436.4 L144.1,430.7 L146.6,428.3 L144.4,423.5 L144.9,418.8 L143.7,419.4 L140.0,411.7 L142.1,411.8 L143.0,405.4 L145.8,400.7 L143.8,401.8 L142.3,390.7 L140.4,389.0 L141.1,391.3 L139.2,388.6 L137.8,385.9 L140.9,387.9 L139.0,385.3 L136.4,384.3 L136.3,380.2 L132.1,372.8 L139.9,372.1 L146.9,379.3 L153.3,379.3 L155.3,382.4 L167.0,380.3 L168.2,383.0 L166.3,389.2 L171.3,392.1 L171.6,397.7 L175.3,398.3 L180.7,394.9 L187.7,395.7 L203.2,381.7 L208.6,379.2 L209.3,377.3 L204.8,373.2 L216.7,366.6 L217.6,358.4 L224.1,358.2 L224.1,363.1 L227.4,366.1 L234.9,385.1 L250.4,387.3 L252.2,388.8 L251.7,394.5 L253.0,396.7 L265.4,398.0 L266.0,413.1 L263.8,417.4 L262.7,428.9 L270.4,440.0 L262.2,443.8 L249.9,444.9 L231.7,457.4 L229.2,456.5 L223.8,448.4 L210.9,451.1 L208.2,446.8 L205.4,446.0 L203.4,447.8 L204.0,453.3 L200.8,459.6 L194.6,461.6 L191.5,464.6 L195.6,468.2 L196.4,479.0 L202.9,484.3 L206.6,483.5 L210.9,473.3 L218.6,472.0 L220.6,473.5 L219.9,479.4 L221.5,483.9 L220.3,487.2 L207.7,490.2 L208.4,499.5 L216.4,501.1 L219.3,508.3 L217.7,514.4 L213.4,518.6 Z",
    labelPos: [203, 422],
    showLabel: true,
  },
{
    code: "BAH",
    nameEn: "Al Baha",
    nameAr: "الباحة",
    d: "M225.4,449.7 L224.1,453.9 L225.3,458.0 L220.2,462.0 L216.2,472.5 L210.6,473.5 L206.6,483.5 L202.3,484.0 L196.1,478.5 L195.6,468.2 L191.5,464.6 L194.6,461.6 L200.8,459.6 L203.8,454.0 L203.3,448.3 L204.8,446.2 L208.2,446.8 L210.9,451.1 L222.6,448.2 L225.4,449.7 Z",
    labelPos: [208, 464],
    showLabel: false,
  },
{
    code: "ASR",
    nameEn: "Asir",
    nameAr: "عسير",
    d: "M269.6,537.4 L265.4,535.3 L261.5,536.2 L251.0,525.6 L250.0,522.2 L245.8,524.0 L241.8,531.3 L236.1,525.1 L229.7,524.4 L227.3,521.1 L222.9,520.6 L222.7,513.8 L218.2,513.3 L219.3,508.3 L216.9,501.5 L208.1,498.9 L208.0,489.4 L210.0,490.3 L220.5,486.7 L220.8,474.1 L219.1,472.1 L216.2,472.5 L220.2,462.0 L225.3,458.0 L224.1,453.9 L225.4,449.7 L228.7,455.9 L231.7,457.4 L249.9,444.9 L262.2,443.8 L270.4,440.0 L281.1,451.5 L277.8,464.0 L282.5,470.6 L293.8,480.3 L293.7,484.7 L289.6,488.4 L289.7,498.5 L281.8,502.3 L269.9,515.9 L269.6,537.4 Z",
    labelPos: [252, 487],
    showLabel: true,
  },
{
    code: "JZN",
    nameEn: "Jazan",
    nameAr: "جازان",
    d: "M257.1,558.2 L254.4,558.5 L253.0,562.3 L246.2,566.8 L244.8,558.6 L239.4,552.9 L239.5,549.4 L234.3,544.5 L234.5,548.8 L233.0,537.3 L216.8,524.5 L213.3,519.3 L214.6,516.6 L218.2,513.3 L222.4,513.4 L222.5,520.2 L227.3,521.1 L229.7,524.4 L236.1,525.1 L241.8,531.3 L245.8,524.0 L250.0,522.2 L251.0,525.6 L261.5,536.2 L256.6,540.5 L259.0,542.0 L256.3,543.7 L255.3,547.1 L255.1,552.0 L257.9,555.1 L257.1,558.2 Z M229.6,557.6 L229.4,561.0 L226.5,559.5 L226.9,558.0 L223.3,558.6 L217.8,552.4 L221.9,556.5 L225.5,557.3 L226.2,554.6 L229.6,557.6 Z M222.3,555.3 L220.0,552.5 L222.5,550.8 L220.7,549.1 L224.1,553.5 L222.6,554.0 L224.6,556.1 L222.3,555.3 Z",
    labelPos: [242, 538],
    showLabel: false,
  },
{
    code: "NJR",
    nameEn: "Najran",
    nameAr: "نجران",
    d: "M374.0,547.0 L366.6,551.0 L361.7,550.9 L354.2,541.9 L343.5,543.3 L319.0,540.9 L311.7,537.7 L283.7,538.4 L277.2,541.2 L276.5,539.8 L272.7,540.0 L269.6,537.4 L269.6,516.6 L281.8,502.3 L289.7,498.5 L289.5,489.1 L293.5,485.3 L293.8,480.3 L304.9,486.3 L314.6,487.4 L382.7,479.8 L374.0,547.0 Z",
    labelPos: [330, 514],
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
                <path
                  d={region.d}
                  fill={fill}
                  stroke="#94a3b8"
                  strokeWidth={isHovered ? 1.6 : 0.8}
                  strokeLinejoin="round"
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
                  data-testid={`region-${region.code}`}
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
            fontSize={13}
            fontWeight={600}
            stroke="#ffffff"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {region.code}
          </text>
        ))}

        {/* Legend */}
        <g transform="translate(640, 470)">
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
